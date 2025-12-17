package api

import (
	"nas-renamer/design"
	"nas-renamer/internal/analyzer"
	"nas-renamer/internal/config"
	"nas-renamer/internal/fs"
	"nas-renamer/internal/history"
	"nas-renamer/internal/middleware"
	"nas-renamer/internal/renamer"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	renamer *renamer.Engine
	history *history.Manager
	config  *config.Manager
	rootDir string
}

func NewHandler(rootDir string) (*Handler, error) {
	hm, err := history.NewManager()
	if err != nil {
		return nil, err
	}
	// Verify rootDir exists
	if _, err := os.Stat(rootDir); os.IsNotExist(err) {
		// Just warn or ignore
	}

	cm := config.NewManager(rootDir)

	return &Handler{
		renamer: renamer.NewEngine(),
		history: hm,
		config:  cm,
		rootDir: rootDir,
	}, nil
}

// HandleLogin authenticates the user.
func (h *Handler) HandleLogin(c *gin.Context) {
	var req design.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	appPwd := os.Getenv("APP_PASSWORD")
	if appPwd == "" {
		// Fail safe: if no password set, reject all (or accept all? secure by default -> reject)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Server misconfiguration: APP_PASSWORD not set"})
		return
	}

	if req.Password != appPwd {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid password"})
		return
	}

	token := middleware.Store.CreateSession()
	c.JSON(http.StatusOK, design.LoginResponse{
		Token:     token,
		ExpiresAt: time.Now().Add(24 * time.Hour),
	})
}

// HandleListFiles lists files in a directory.
func (h *Handler) HandleListFiles(c *gin.Context) {
	dir := c.Query("dir")
	if dir == "" {
		dir = h.rootDir
	}

	// Security Check: Prevent Path Traversal
	cleanRootDir := filepath.Clean(h.rootDir)
	cleanDir := filepath.Clean(dir)

	// Calculate relative path
	rel, err := filepath.Rel(cleanRootDir, cleanDir)
	if err != nil {
		// e.g. different drives on Windows
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied: Invalid path"})
		return
	}

	// If relative path starts with ".." or is absolute path outside, reject
	// Note: filepath.Rel returns ".." if outside.
	// We also check if it's outside by checking if it contains ".." components at start
	if strings.HasPrefix(rel, "..") || strings.HasPrefix(rel, string(filepath.Separator)+"..") {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied: Path traversal detected"})
		return
	}

	ignored, _ := h.config.GetIgnoredExtensions()
	resp, err := fs.ScanDirectory(cleanDir, ignored)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resp)
}

// HandlePreview computes a rename preview.
func (h *Handler) HandlePreview(c *gin.Context) {
	var req design.RenameRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Inject ignored extensions
	ignored, _ := h.config.GetIgnoredExtensions()

	resp, err := h.renamer.ComputePreview(&req, ignored)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, resp)
}

// HandleExecute performs the rename.
func (h *Handler) HandleExecute(c *gin.Context) {
	var req design.RenameRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ignored, _ := h.config.GetIgnoredExtensions()

	// Updated signature: returns response, log, error
	resp, log, err := h.renamer.ExecuteRename(&req, ignored)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Save History
	if log != nil && len(log.Items) > 0 {
		if err := h.history.SaveHistory(log); err != nil {
			// Log error but generally success
			// fmt.Printf("Failed to save history: %v\n", err)
		}
	}

	c.JSON(http.StatusOK, resp)
}

func (h *Handler) HandleGetHistory(c *gin.Context) {
	logs, err := h.history.GetHistory()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, logs)
}

func (h *Handler) HandleUndo(c *gin.Context) {
	var req design.UndoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.history.Undo(req.BatchID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Optimization Guide: Undo Bug Fix
	c.JSON(http.StatusOK, gin.H{
		"restored_count": resp.SuccessCount, // Mapping success_count to restored_count
		"success":        true,
		"error_count":    resp.FailCount,
	})
}

func (h *Handler) HandleGetConfig(c *gin.Context) {
	exts, err := h.config.GetIgnoredExtensions()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, exts)
}

func (h *Handler) HandleSetConfig(c *gin.Context) {
	var exts []string
	if err := c.ShouldBindJSON(&exts); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.config.SetIgnoredExtensions(exts); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "updated"})
}

func (h *Handler) HandleScanFrequent(c *gin.Context) {
	dir := c.Query("dir")
	if dir == "" {
		dir = h.rootDir // default to root
	}

	// Security check for scan as well
	cleanRootDir := filepath.Clean(h.rootDir)
	cleanDir := filepath.Clean(dir)
	rel, err := filepath.Rel(cleanRootDir, cleanDir)
	if err != nil || strings.HasPrefix(rel, "..") || strings.HasPrefix(rel, string(filepath.Separator)+"..") {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied: Path traversal detected"})
		return
	}

	tokens, err := analyzer.AnalyzeFrequentStrings(cleanDir)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, tokens)
}

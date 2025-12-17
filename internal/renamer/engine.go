package renamer

import (
	"fmt"
	"nas-renamer/design"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
)

// Engine handles renaming logic.
type Engine struct{}

func NewEngine() *Engine {
	return &Engine{}
}

// ComputePreview calculates the potential changes without modifying files.
func (e *Engine) ComputePreview(req *design.RenameRequest, ignoredExts []string) (*design.PreviewResponse, error) {
	// 1. Identify target files
	targets, err := e.identifyTargets(req)
	if err != nil {
		return nil, err
	}

	var items []design.PreviewItem
	seenNewNames := make(map[string]bool)

	for _, path := range targets {
		originalName := filepath.Base(path)

		// Check ignored extensions
		ext := strings.ToLower(filepath.Ext(originalName))
		isIgnored := false
		for _, ignored := range ignoredExts {
			if strings.EqualFold(ext, ignored) || strings.EqualFold(ext, "."+ignored) || strings.EqualFold(originalName, ignored) {
				isIgnored = true
				break
			}
		}

		if isIgnored {
			// Skip entirely? Or show as skipped?
			// Guide says: "visually grayed out or excluded".
			// Let's add as "skipped" status.
			items = append(items, design.PreviewItem{
				OriginalName: originalName,
				NewName:      originalName,
				Status:       "skipped",
				Message:      "Ignored extension",
			})
			continue
		}

		newName := originalName

		// 2. Apply rules based on mode
		if req.Mode == design.ModeQuick {
			newName = e.applyQuickRules(originalName, req.QuickRules)
		} else {
			newName = e.applyCustomRules(originalName, req.CustomRules)
		}

		status := "ok"
		message := ""

		// 3. Check for conflicts
		// a. Check against other new names in this batch
		if seenNewNames[newName] && newName != originalName {
			status = "conflict"
			message = "New name conflicts with another file in this batch"
		}
		seenNewNames[newName] = true

		// b. Check against file system (unless it's the same file)
		if newName != originalName {
			newPath := filepath.Join(filepath.Dir(path), newName)
			if _, err := os.Stat(newPath); err == nil {
				status = "conflict"
				message = "Target filename already exists"
			}
		} else {
			status = "ok" // No change
		}

		items = append(items, design.PreviewItem{
			OriginalName: originalName,
			NewName:      newName,
			Status:       status,
			Message:      message,
		})
	}

	return &design.PreviewResponse{Items: items}, nil
}

// ExecuteRename performs the actual renaming.
func (e *Engine) ExecuteRename(req *design.RenameRequest, ignoredExts []string) (*design.ExecuteResponse, *design.HistoryLog, error) {
	// Re-calculate to ensure consistency (or we could pass the preview result if state was guaranteed)
	preview, err := e.ComputePreview(req, ignoredExts)
	if err != nil {
		return nil, nil, err
	}

	batchID := uuid.New().String()
	successCount := 0
	failCount := 0
	var errors []string
	var historyItems []design.HistoryItem
	timestamp := time.Now().Unix()

	for _, item := range preview.Items {
		if item.Status != "ok" {
			failCount++
			if item.Status == "conflict" {
				errors = append(errors, fmt.Sprintf("%s: %s", item.OriginalName, item.Message))
			}
			continue
		}

		if item.NewName == item.OriginalName {
			continue
		}

		oldPath := filepath.Join(req.DirPath, item.OriginalName)
		newPath := filepath.Join(req.DirPath, item.NewName)

		// Get file size for history safety check
		info, err := os.Stat(oldPath)
		var size int64
		if err == nil {
			size = info.Size()
		}

		if err := os.Rename(oldPath, newPath); err != nil {
			failCount++
			errors = append(errors, fmt.Sprintf("Failed to rename %s: %v", item.OriginalName, err))
		} else {
			successCount++
			historyItems = append(historyItems, design.HistoryItem{
				OriginalName: item.OriginalName,
				NewName:      item.NewName,
				Size:         size,
			})
		}
	}

	executeResp := &design.ExecuteResponse{
		BatchID:      batchID,
		SuccessCount: successCount,
		FailCount:    failCount,
		Errors:       errors,
	}

	historyLog := &design.HistoryLog{
		ID:        batchID,
		Timestamp: timestamp,
		BasePath:  req.DirPath,
		Mode:      req.Mode,
		Items:     historyItems,
	}

	return executeResp, historyLog, nil
}

// Internal helpers

func (e *Engine) identifyTargets(req *design.RenameRequest) ([]string, error) {
	if len(req.TargetPaths) > 0 {
		return req.TargetPaths, nil
	}
	// If no specific targets, list all file in dir
	entries, err := os.ReadDir(req.DirPath)
	if err != nil {
		return nil, err
	}

	var paths []string
	for _, entry := range entries {
		if !entry.IsDir() {
			paths = append(paths, filepath.Join(req.DirPath, entry.Name()))
		}
	}
	return paths, nil
}

func (e *Engine) applyQuickRules(name string, rules design.QuickOptions) string {
	ext := filepath.Ext(name)
	base := name
	if rules.ProtectExtension && ext != "" {
		base = strings.TrimSuffix(name, ext)
	}

	// 1. Remove Brackets [...] 【...】
	if rules.RemoveBrackets {
		re := regexp.MustCompile(`\[.*?\]|【.*?】`)
		base = re.ReplaceAllString(base, "")
	}

	// 2. Remove Parens (...) （...）
	if rules.RemoveParens {
		re := regexp.MustCompile(`\(.*?\)|（.*?）`)
		base = re.ReplaceAllString(base, "")
	}

	// 3. Remove URL (Simple heuristic)
	if rules.RemoveURL {
		// Matches typical domains like .com, .net, etc. at the end of words
		// This is a simplified regex.
		re := regexp.MustCompile(`(?i)\b[a-z0-9-]+\.(com|net|org|cn|cc|me|io|xyz)\b`)
		base = re.ReplaceAllString(base, "")
	}

	// 4. Normalize Delimiters (_ -> .)
	if rules.NormalizeDelim {
		base = strings.ReplaceAll(base, "_", ".")
	}

	// Cleanup: Trim extra spaces/dots potentially left behind
	base = strings.TrimSpace(base)
	base = regexp.MustCompile(`\s+`).ReplaceAllString(base, " ")
	base = regexp.MustCompile(`\.+`).ReplaceAllString(base, ".")
	base = strings.Trim(base, ".") // Don't start/end with dot

	if rules.ProtectExtension {
		return base + ext
	}
	return base
}

func (e *Engine) applyCustomRules(name string, rules []design.RenameRule) string {
	res := name
	for _, rule := range rules {
		switch rule.Type {
		case "replace":
			res = strings.ReplaceAll(res, rule.Target, rule.Replacement)
		case "regex":
			re, err := regexp.Compile(rule.Target)
			if err == nil {
				res = re.ReplaceAllString(res, rule.Replacement)
			}
		case "prefix":
			res = rule.Target + res
		case "suffix":
			ext := filepath.Ext(res)
			base := strings.TrimSuffix(res, ext)
			res = base + rule.Target + ext
		}
	}
	return res
}

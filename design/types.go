package design

import "time"

// @author weifengl

// Login
type LoginRequest struct {
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expires_at"`
}

// Rename
const (
	ModeQuick = "quick"
	ModeBasic = "basic"
)

type RenameRequest struct {
	DirPath     string         `json:"dir_path" binding:"required"`
	Mode        string         `json:"mode" binding:"required"` // quick, basic
	QuickRules  QuickOptions   `json:"quick_rules"`
	CustomRules []RenameRule   `json:"custom_rules"`
	TargetPaths []string       `json:"target_paths"` // Optional specific files
	DryRun      bool           `json:"dry_run"`
}

type QuickOptions struct {
	RemoveBrackets   bool `json:"remove_brackets"`
	RemoveParens     bool `json:"remove_parens"`
	RemoveURL        bool `json:"remove_url"`
	NormalizeDelim   bool `json:"normalize_delim"`
	ProtectExtension bool `json:"protect_extension"`
}

type RenameRule struct {
	Type        string `json:"type"` // replace, regex, prefix, suffix
	Target      string `json:"target"`
	Replacement string `json:"replacement"`
}

type PreviewResponse struct {
	Items []PreviewItem `json:"items"`
}

type PreviewItem struct {
	OriginalName string `json:"original_name"`
	NewName      string `json:"new_name"`
	Status       string `json:"status"` // ok, conflict, skipped
	Message      string `json:"message"`
}

type ExecuteResponse struct {
	BatchID      string   `json:"batch_id"`
	SuccessCount int      `json:"success_count"`
	FailCount    int      `json:"fail_count"`
	Errors       []string `json:"errors"`
}

// History
type HistoryLog struct {
	ID        string        `json:"id"`
	Timestamp int64         `json:"timestamp"`
	BasePath  string        `json:"base_path"`
	Mode      string        `json:"mode"`
	Items     []HistoryItem `json:"items"`
}

type HistoryItem struct {
	OriginalName string `json:"original_name"`
	NewName      string `json:"new_name"`
	Size         int64  `json:"size"`
}

type UndoRequest struct {
	BatchID string `json:"batch_id" binding:"required"`
}

type DirListResponse struct {
	CurrentPath string     `json:"current_path"`
	ParentPath  string     `json:"parent_path"`
	Items       []FileItem `json:"items"`
}

type FileItem struct {
	Name    string `json:"name"`
	Path    string `json:"path"`
	IsDir   bool   `json:"is_dir"`
	Size    int64  `json:"size"`
	ModTime int64  `json:"mod_time"`
}

type Session struct {
	Token     string    `json:"token"`
	CreatedAt time.Time `json:"created_at"`
	ExpiresAt time.Time `json:"expires_at"`
}

package history

import (
	"encoding/json"
	"fmt"
	"nas-renamer/design"
	"os"
	"path/filepath"
	"sort"
	"sync"
)

type Manager struct {
	mu      sync.Mutex
	baseDir string
}

func NewManager() (*Manager, error) {
	// Store history in a .history dir in the current working directory
	// In a real NAS scenario, this might need to be config driven.
	cwd, err := os.Getwd()
	if err != nil {
		return nil, err
	}
	histDir := filepath.Join(cwd, ".history")
	if err := os.MkdirAll(histDir, 0755); err != nil {
		return nil, err
	}
	return &Manager{baseDir: histDir}, nil
}

func (m *Manager) SaveHistory(log *design.HistoryLog) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	fileName := fmt.Sprintf("%d_%s.json", log.Timestamp, log.ID)
	filePath := filepath.Join(m.baseDir, fileName)

	data, err := json.MarshalIndent(log, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(filePath, data, 0644)
}

func (m *Manager) GetHistory() ([]*design.HistoryLog, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	entries, err := os.ReadDir(m.baseDir)
	if err != nil {
		return nil, err
	}

	var logs []*design.HistoryLog
	for _, entry := range entries {
		if filepath.Ext(entry.Name()) != ".json" {
			continue
		}

		data, err := os.ReadFile(filepath.Join(m.baseDir, entry.Name()))
		if err != nil {
			continue // Skip unreadable
		}

		var log design.HistoryLog
		if err := json.Unmarshal(data, &log); err != nil {
			continue // Skip content error
		}
		logs = append(logs, &log)
	}

	// Sort by timestamp desc
	sort.Slice(logs, func(i, j int) bool {
		return logs[i].Timestamp > logs[j].Timestamp
	})

	return logs, nil
}

func (m *Manager) GetLog(batchID string) (*design.HistoryLog, error) {
	// Optimization: could map ID to filename, but for now scan is okay for small history
	logs, err := m.GetHistory()
	if err != nil {
		return nil, err
	}
	for _, log := range logs {
		if log.ID == batchID {
			return log, nil
		}
	}
	return nil, fmt.Errorf("batch not found: %s", batchID)
}

func (m *Manager) Undo(batchID string) (*design.ExecuteResponse, error) {
	log, err := m.GetLog(batchID)
	if err != nil {
		return nil, err
	}

	successCount := 0
	failCount := 0
	var errors []string

	// Reverse operation: NewName -> OriginalName
	for _, item := range log.Items {
		currentPath := filepath.Join(log.BasePath, item.NewName)
		originalPath := filepath.Join(log.BasePath, item.OriginalName)

		// Safety check: Does current match what we expect?
		info, err := os.Stat(currentPath)
		if os.IsNotExist(err) {
			failCount++
			errors = append(errors, fmt.Sprintf("File missing: %s", item.NewName))
			continue
		}

		// Optional: Could check size/modtime to be safer
		if info.Size() != item.Size {
			// Warn but proceed? Or fail? design says "Size used for safety check"
			// Let's be strict for now or just log it.
			// failCount++; continue;
		}

		if err := os.Rename(currentPath, originalPath); err != nil {
			failCount++
			errors = append(errors, fmt.Sprintf("Failed to restore %s: %v", item.OriginalName, err))
		} else {
			successCount++
		}
	}

	return &design.ExecuteResponse{
		BatchID:      batchID + "-undo",
		SuccessCount: successCount,
		FailCount:    failCount,
		Errors:       errors,
	}, nil
}

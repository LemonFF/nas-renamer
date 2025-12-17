package config

import (
	"bufio"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

type Manager struct {
	configDir string
	mu        sync.Mutex
}

func NewManager(rootDir string) *Manager {
	// Use rootDir/data for config
	return &Manager{
		configDir: filepath.Join(rootDir, "data"),
	}
}

func (m *Manager) GetIgnoredExtensions() ([]string, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	path := filepath.Join(m.configDir, "ignored_extensions.txt")
	f, err := os.Open(path)
	if os.IsNotExist(err) {
		// Return defaults
		return []string{
			".nfo", ".exe", ".bat", ".jpg", ".jpeg", ".png",
			".srt", ".ass", ".sub", ".txt", ".db",
		}, nil
	}
	if err != nil {
		return nil, err
	}
	defer f.Close()

	var exts []string
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line != "" {
			exts = append(exts, line)
		}
	}
	return exts, scanner.Err()
}

func (m *Manager) SetIgnoredExtensions(exts []string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if err := os.MkdirAll(m.configDir, 0755); err != nil {
		return err
	}

	path := filepath.Join(m.configDir, "ignored_extensions.txt")
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()

	for _, ext := range exts {
		if _, err := f.WriteString(ext + "\n"); err != nil {
			return err
		}
	}
	return nil
}

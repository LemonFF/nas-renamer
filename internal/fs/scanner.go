package fs

import (
	"nas-renamer/design"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// ScanDirectory lists files in the given directory.
// It returns a DirListResponse containing file items.
func ScanDirectory(dirPath string, ignoredExts []string) (*design.DirListResponse, error) {
	// If path is empty, default to current directory or a sensible root
	if dirPath == "" {
		var err error
		dirPath, err = os.Getwd()
		if err != nil {
			return nil, err
		}
	}

	entries, err := os.ReadDir(dirPath)
	if err != nil {
		return nil, err
	}

	var items []design.FileItem
	for _, entry := range entries {
		info, err := entry.Info()
		if err != nil {
			// Skip files where info cannot be read
			continue
		}

		// Filtering logic
		if !entry.IsDir() {
			name := entry.Name()
			ext := strings.ToLower(filepath.Ext(name))
			isIgnored := false
			for _, ignored := range ignoredExts {
				// Exact match or extension match
				if strings.EqualFold(ext, ignored) || strings.EqualFold(ext, "."+ignored) || strings.EqualFold(name, ignored) {
					isIgnored = true
					break
				}
			}
			if isIgnored {
				continue
			}
		}

		// Calculate full path
		fullPath := filepath.Join(dirPath, entry.Name())

		item := design.FileItem{
			Name:    entry.Name(),
			Path:    fullPath,
			IsDir:   entry.IsDir(),
			Size:    info.Size(),
			ModTime: info.ModTime().Unix(),
		}
		items = append(items, item)
	}

	// Sort: Directories first, then files. Alphabetical within groups.
	sort.Slice(items, func(i, j int) bool {
		if items[i].IsDir != items[j].IsDir {
			return items[i].IsDir // Directories (true) come before Files (false)
		}
		return strings.ToLower(items[i].Name) < strings.ToLower(items[j].Name)
	})

	parentPath := filepath.Dir(dirPath)
	// Handle root directory case (parent of root is root on some OS, or empty)
	if parentPath == dirPath {
		parentPath = ""
	}

	return &design.DirListResponse{
		CurrentPath: dirPath,
		ParentPath:  parentPath,
		Items:       items,
	}, nil
}

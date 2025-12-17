package analyzer

import (
	"os"
	"path/filepath"
	"testing"
)

func TestAnalyzeFrequentStrings(t *testing.T) {
	// Setup temp dir
	tmpDir := t.TempDir()

	// Create dummy files
	files := []string{
		"[SunMovie] Avatar.mkv",
		"[SunMovie] Titanic.mkv",
		"[SunMovie] Inception.mp4",
		"www.xxx.com_Video1.avi",
		"www.xxx.com_Video2.avi",
		"JustAFile.txt",
	}

	for _, name := range files {
		f, err := os.Create(filepath.Join(tmpDir, name))
		if err != nil {
			t.Fatal(err)
		}
		f.Close()
	}

	// Create a directory to ensure it is skipped
	if err := os.Mkdir(filepath.Join(tmpDir, "SubDir"), 0755); err != nil {
		t.Fatal(err)
	}

	results, err := AnalyzeFrequentStrings(tmpDir)
	if err != nil {
		t.Fatalf("AnalyzeFrequentStrings failed: %v", err)
	}

	// Expected high frequency tokens: "SunMovie", "www.xxx.com"
	// "mkv", "avi", "mp4" are in commonExts (ignored)
	// "Video1", "Video2" (count=1, ignored)
	// "Avatar", "Titanic", "Inception" (count=1)

	// Check if "SunMovie" and parts of "www.xxx.com" (like "xxx") are in top results
	foundSun := false
	foundPart := false

	for _, token := range results {
		if token == "SunMovie" {
			foundSun = true
		}
		if token == "xxx" {
			foundPart = true
		}
	}

	if !foundSun {
		t.Errorf("Expected 'SunMovie' in results, got %v", results)
	}
	if !foundPart {
		t.Errorf("Expected 'xxx' in results, got %v", results)
	}
}

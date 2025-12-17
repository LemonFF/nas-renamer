package renamer

import (
	"nas-renamer/design"
	"os"
	"path/filepath"
	"testing"
)

func TestApplyQuickRules(t *testing.T) {
	engine := NewEngine()

	// 1. 中括号去除 (Remove Brackets)
	t.Run("Remove Brackets", func(t *testing.T) {
		input := "[Auto]File_Name【Full】.txt"
		options := design.QuickOptions{
			RemoveBrackets: true,
		}
		expected := "File_Name.txt"
		result := engine.applyQuickRules(input, options)
		if result != expected {
			t.Errorf("Expected %s, got %s", expected, result)
		}
	})

	// 2. 点号替换 (Normalize Delimiters: _ -> .)
	t.Run("Normalize Delimiters", func(t *testing.T) {
		input := "My_File_Name.txt"
		options := design.QuickOptions{
			NormalizeDelim: true,
		}
		// The logic in engine.go: base = strings.ReplaceAll(base, "_", ".")
		// It might replace the last one too if extension is not protected carefully,
		// but applyQuickRules separates extension first if ProtectedExtension is true.
		// Let's assume protect extension is OFF by default unless specified.
		// Wait, look at code:
		// if rules.ProtectExtension && ext != "" { base = strings.TrimSuffix(name, ext) }
		// ... processing base ...
		// if rules.ProtectExtension { return base + ext }

		// If ProtectExtension is FALSE (default bool):
		// It operates on FULL name.
		// input "My_File_Name.txt" -> "My.File.Name.txt"
		expected := "My.File.Name.txt"
		result := engine.applyQuickRules(input, options)
		if result != expected {
			t.Errorf("Expected %s, got %s", expected, result)
		}
	})

	// 3. 扩展名保护 (Extension Protection) + Normalize
	t.Run("Extension Protection", func(t *testing.T) {
		input := "My_File_Name.txt"
		options := design.QuickOptions{
			NormalizeDelim:   true,
			ProtectExtension: true,
		}
		// input "My_File_Name.txt"
		// base = "My_File_Name"
		// replace _ -> . => "My.File.Name"
		// result => "My.File.Name.txt"
		expected := "My.File.Name.txt"
		result := engine.applyQuickRules(input, options)
		if result != expected {
			t.Errorf("Expected %s, got %s", expected, result)
		}

		// Test case where protection matters strictly implies we shouldn't modify the extension part if it had matching chars?
		// e.g. "File.tar.gz" -> NormalizeDelim might not affect dots, but what if ext was "_bak"? "File_bak"
		input2 := "Image_Final.jpeg"
		options2 := design.QuickOptions{
			NormalizeDelim:   true,
			ProtectExtension: true,
		}
		// base="Image_Final" -> "Image.Final" -> "Image.Final.jpeg"
		expected2 := "Image.Final.jpeg"
		result2 := engine.applyQuickRules(input2, options2)
		if result2 != expected2 {
			t.Errorf("Expected %s, got %s", expected2, result2)
		}
	})

	// Test Remove Parens as well for completeness
	t.Run("Remove Parens", func(t *testing.T) {
		input := "File(1)（2）.txt"
		options := design.QuickOptions{
			RemoveParens: true,
		}
		expected := "File.txt"
		result := engine.applyQuickRules(input, options)
		if result != expected {
			t.Errorf("Expected %s, got %s", expected, result)
		}
	})

	// Test Combined
	t.Run("Combined Rules", func(t *testing.T) {
		input := "[Tag] File_Name (v1).txt"
		options := design.QuickOptions{
			RemoveBrackets:   true,
			RemoveParens:     true,
			NormalizeDelim:   true, // _ -> .
			ProtectExtension: true,
		}
		// Remove Brackets: " File_Name (v1).txt"
		// Remove Parens: " File_Name .txt"
		// Normalize: " File.Name .txt"
		// Cleanup (trim space/dot, squeze space): "File.Name.txt"
		expected := "File.Name.txt"
		result := engine.applyQuickRules(input, options)
		if result != expected {
			t.Errorf("Expected %s, got %s", expected, result)
		}
	})
}

// 4. 文件名冲突检测 (Filename Conflict)
func TestComputePreview_Conflict(t *testing.T) {
	engine := NewEngine()

	// Setup a temporary directory with some files
	tmpDir := t.TempDir()

	// Create "existing.txt"
	f, err := os.Create(filepath.Join(tmpDir, "existing.txt"))
	if err != nil {
		t.Fatal(err)
	}
	f.Close()

	// Create "conflict_candidate.txt" (will try to rename to existing.txt)
	f2, err := os.Create(filepath.Join(tmpDir, "conflict_source.txt"))
	if err != nil {
		t.Fatal(err)
	}
	f2.Close()

	req := &design.RenameRequest{
		Mode:    design.ModeAdvanced,
		DirPath: tmpDir,
		// Explicitly target conflict_source.txt
		TargetPaths: []string{filepath.Join(tmpDir, "conflict_source.txt")},
		CustomRules: []design.RenameRule{
			{
				Type:        "replace",
				Target:      "conflict_source",
				Replacement: "existing",
			},
		},
	}

	preview, err := engine.ComputePreview(req, nil)
	if err != nil {
		t.Fatalf("ComputePreview failed: %v", err)
	}

	if len(preview.Items) != 1 {
		t.Fatalf("Expected 1 preview item, got %d", len(preview.Items))
	}

	item := preview.Items[0]
	if item.NewName != "existing.txt" {
		t.Errorf("Expected NewName to be existing.txt, got %s", item.NewName)
	}

	if item.Status != "conflict" {
		t.Errorf("Expected Status 'conflict', got '%s'", item.Status)
	}

	// Test Batch Conflict (Two files renaming to same name)
	// Create file A.txt and B.txt
	// Rename both to C.txt
	fA, _ := os.Create(filepath.Join(tmpDir, "A.txt"))
	fA.Close()
	fB, _ := os.Create(filepath.Join(tmpDir, "B.txt"))
	fB.Close()

	reqBatch := &design.RenameRequest{
		Mode:        design.ModeAdvanced,
		DirPath:     tmpDir,
		TargetPaths: []string{filepath.Join(tmpDir, "A.txt"), filepath.Join(tmpDir, "B.txt")},
		CustomRules: []design.RenameRule{
			{
				Type:        "regex",
				Target:      ".*",
				Replacement: "C",
			},
		},
	}

	previewBatch, err := engine.ComputePreview(reqBatch, nil)
	if err != nil {
		t.Fatal(err)
	}

	// We expect one to be OK (or both OK if we don't check intra-batch conflict? code says we do)
	conflictCount := 0
	for _, it := range previewBatch.Items {
		if it.Status == "conflict" {
			conflictCount++
		}
	}

	if conflictCount < 1 {
		t.Errorf("Expected at least one conflict in batch collision, got %d", conflictCount)
	}
}

func TestIgnoredExtensions(t *testing.T) {
	engine := NewEngine()
	tmpDir := t.TempDir()

	// Create files
	f1, _ := os.Create(filepath.Join(tmpDir, "movie.mkv"))
	f1.Close()
	f2, _ := os.Create(filepath.Join(tmpDir, "info.nfo"))
	f2.Close()
	f3, _ := os.Create(filepath.Join(tmpDir, "logo.jpg"))
	f3.Close()

	req := &design.RenameRequest{
		Mode:    design.ModeAdvanced,
		DirPath: tmpDir,
		CustomRules: []design.RenameRule{
			{Type: "prefix", Target: "New_", Replacement: ""},
		},
	}

	ignored := []string{".nfo", "jpg"} // .nfo (dot included), jpg (no dot) - should handle both logic?
	// Engine logic: strings.EqualFold(ext, ignored) || strings.EqualFold(ext, "."+ignored)

	preview, err := engine.ComputePreview(req, ignored)
	if err != nil {
		t.Fatal(err)
	}

	for _, item := range preview.Items {
		if item.OriginalName == "info.nfo" {
			if item.Status != "skipped" {
				t.Errorf("Expected info.nfo to be skipped, got %s", item.Status)
			}
		}
		if item.OriginalName == "logo.jpg" {
			if item.Status != "skipped" {
				t.Errorf("Expected logo.jpg to be skipped, got %s", item.Status)
			}
		}
		if item.OriginalName == "movie.mkv" {
			if item.Status == "skipped" {
				t.Errorf("Expected movie.mkv NOT to be skipped")
			}
			if item.NewName != "New_movie.mkv" {
				t.Errorf("Expected rename for movie.mkv")
			}
		}
	}
}

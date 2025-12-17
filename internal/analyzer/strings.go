package analyzer

import (
	"os"
	"regexp"
	"sort"
	"strings"
)

// AnalyzeFrequentStrings scans a directory and returns top frequent tokens.
func AnalyzeFrequentStrings(dirPath string) ([]string, error) {
	entries, err := os.ReadDir(dirPath)
	if err != nil {
		return nil, err
	}

	// Tokenizer regex: Split by common delimiters
	// We want to capture [Token], (Token), www.xxx.com, keywords
	// Simple approach: Split by dot, underscore, space, brackets
	splitRe := regexp.MustCompile(`[\.\_\-\s\[\]\(\)（）]+`)

	freqMap := make(map[string]int)

	commonExts := map[string]bool{
		"mkv": true, "mp4": true, "avi": true, "wmv": true, "mov": true,
		"iso": true, "rmvb": true, "mp3": true, "flac": true, "jpg": true,
		"png": true, "nfo": true, "txt": true, "srt": true, "ass": true,
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()

		// Tokenize
		tokens := splitRe.Split(name, -1)
		for _, token := range tokens {
			token = strings.TrimSpace(token)
			if len(token) < 3 {
				continue
			}
			// Skip extension-like tokens
			if commonExts[strings.ToLower(token)] {
				continue
			}
			freqMap[token]++
		}
	}

	// Sort by frequency
	type result struct {
		Token string
		Count int
	}
	var results []result
	for token, count := range freqMap {
		if count > 1 { // Only list if appears more than once
			results = append(results, result{Token: token, Count: count})
		}
	}

	sort.Slice(results, func(i, j int) bool {
		return results[i].Count > results[j].Count
	})

	// Return top 10
	limit := 10
	if len(results) < limit {
		limit = len(results)
	}

	var top []string
	for i := 0; i < limit; i++ {
		top = append(top, results[i].Token)
	}

	return top, nil
}

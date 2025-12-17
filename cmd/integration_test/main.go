package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
)

const (
	baseURL  = "http://localhost:8080/api"
	password = "admin"
)

func main() {
	fmt.Println(">>> Starting Optimization Integration Test (Go)")

	// 1. Login
	token, err := login()
	if err != nil {
		fmt.Printf("❌ Login Failed: %v\n", err)
		os.Exit(1)
	}
	fmt.Println("✅ Login OK")

	// 2. Test Ignored Extensions
	if err := testIgnoredExtensions(token); err != nil {
		fmt.Printf("❌ Ignored Extensions Test Failed: %v\n", err)
		os.Exit(1)
	}
	fmt.Println("✅ Ignored Extensions Test Passed")

	// 3. Test Frequent Strings
	if err := testFrequentStrings(token); err != nil {
		fmt.Printf("❌ Frequent Strings Test Failed: %v\n", err)
		os.Exit(1)
	}
	fmt.Println("✅ Frequent Strings Test Passed")

	// 4. Test Undo Response
	if err := testUndoResponse(token); err != nil {
		fmt.Printf("❌ Undo Response Test Failed: %v\n", err)
		os.Exit(1)
	}
	fmt.Println("✅ Undo Response Test Passed")

	fmt.Println(">>> Optimization Tests Validation Complete")
}

func login() (string, error) {
	body, _ := json.Marshal(map[string]string{"password": password})
	resp, err := http.Post(baseURL+"/login", "application/json", bytes.NewBuffer(body))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return "", fmt.Errorf("status code %d", resp.StatusCode)
	}

	var res map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return "", err
	}
	return res["token"].(string), nil
}

func testIgnoredExtensions(token string) error {
	client := &http.Client{}

	// Set Config
	data := []string{"xyz", "abc"}
	body, _ := json.Marshal(data)
	req, _ := http.NewRequest("POST", baseURL+"/config/ignored-extensions", bytes.NewBuffer(body))
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	resp.Body.Close()
	if resp.StatusCode != 200 {
		return fmt.Errorf("failed to set config, status: %d", resp.StatusCode)
	}

	// Get Config
	req, _ = http.NewRequest("GET", baseURL+"/config/ignored-extensions", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err = client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	var res []string
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return err
	}

	found := false
	for _, v := range res {
		if v == "xyz" {
			found = true
			break
		}
	}
	if !found {
		return fmt.Errorf("expected 'xyz' in config, got %v", res)
	}
	return nil
}

func testFrequentStrings(token string) error {
	// Setup dummy files
	os.MkdirAll("test_data", 0755)
	os.WriteFile("test_data/[Tag] File1.mkv", []byte(""), 0644)
	os.WriteFile("test_data/[Tag] File2.mkv", []byte(""), 0644)
	defer func() {
		os.Remove("test_data/[Tag] File1.mkv")
		os.Remove("test_data/[Tag] File2.mkv")
	}()

	client := &http.Client{}
	req, _ := http.NewRequest("GET", baseURL+"/scan/frequent-strings?dir=test_data", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("status %d", resp.StatusCode)
	}

	raw, _ := io.ReadAll(resp.Body)
	// Response is []string
	if !strings.Contains(string(raw), "Tag") {
		return fmt.Errorf("expected 'Tag' in response, got %s", string(raw))
	}
	return nil
}

func testUndoResponse(token string) error {
	// Setup File
	os.MkdirAll("test_data", 0755)
	os.WriteFile("test_data/UndoTest.txt", []byte("content"), 0644)
	defer func() {
		os.Remove("test_data/UndoDone.txt")
		os.Remove("test_data/UndoTest.txt")
	}()

	client := &http.Client{}

	// Execute Rename
	renameReq := map[string]interface{}{
		"dir_path":     "test_data",
		"mode":         "basic",
		"target_paths": []string{"test_data/UndoTest.txt"},
		"custom_rules": []map[string]string{
			{"type": "replace", "target": "UndoTest", "replacement": "UndoDone"},
		},
	}
	body, _ := json.Marshal(renameReq)
	req, _ := http.NewRequest("POST", baseURL+"/rename/execute", bytes.NewBuffer(body))
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := client.Do(req)
	if err != nil {
		return err
	}

	var execRes map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&execRes)
	resp.Body.Close()

	batchID, ok := execRes["batch_id"].(string)
	if !ok {
		return fmt.Errorf("failed to get batch_id from rename execution")
	}

	// Undo
	undoReq := map[string]string{"batch_id": batchID}
	body, _ = json.Marshal(undoReq)
	req, _ = http.NewRequest("POST", baseURL+"/history/undo", bytes.NewBuffer(body))
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err = client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	var undoRes map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&undoRes); err != nil {
		return err
	}

	if _, ok := undoRes["restored_count"]; !ok {
		return fmt.Errorf("response missing 'restored_count', got %v", undoRes)
	}

	return nil
}

package crypto

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"os"
)

// ComputeSHA256 returns hex-encoded SHA-256 hash of a byte slice
func ComputeSHA256(data []byte) string {
	hash := sha256.Sum256(data)
	return hex.EncodeToString(hash[:])
}

// ComputeFileSHA256 streams a file from disk and calculates its overall SHA-256 checksum
func ComputeFileSHA256(filePath string) (string, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return "", fmt.Errorf("failed to open file for hashing: %w", err)
	}
	defer file.Close()

	hasher := sha256.New()
	buf := make([]byte, 64*1024) // 64KB read buffer
	if _, err := io.CopyBuffer(hasher, file, buf); err != nil {
		return "", fmt.Errorf("error reading file during hashing: %w", err)
	}

	return hex.EncodeToString(hasher.Sum(nil)), nil
}

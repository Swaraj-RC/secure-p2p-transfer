package utils

import (
	"fmt"
	"os"
)

// EnsureDir creates parent directories if not present
func EnsureDir(dirPath string) error {
	return os.MkdirAll(dirPath, 0755)
}

// FileExists checks if a path exists
func FileExists(path string) bool {
	_, err := os.Stat(path)
	return !os.IsNotExist(err)
}

// FormatBytes converts raw bytes to human readable string (KB, MB, GB)
func FormatBytes(b int64) string {
	const unit = 1024
	if b < unit {
		return fmt.Sprintf("%d B", b)
	}
	div, exp := int64(unit), 0
	for n := b / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.2f %cB", float64(b)/float64(div), "KMGTPE"[exp])
}

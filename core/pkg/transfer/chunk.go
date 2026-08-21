package transfer

import (
	"crypto/sha256"
	"encoding/hex"
)

// DefaultChunkSize is 1 MB for high throughput streaming
const DefaultChunkSize = 1024 * 1024

// Chunk represents a discrete encrypted or raw block of a file transfer
type Chunk struct {
	TransferID [16]byte
	Index      uint32
	Total      uint32
	Offset     int64
	Size       uint32
	Data       []byte
	Checksum   string // SHA-256 hex string of raw data
}

// CalculateTotalChunks determines the number of chunks for a given file size
func CalculateTotalChunks(fileSize int64, chunkSize int) uint32 {
	if chunkSize <= 0 {
		chunkSize = DefaultChunkSize
	}
	if fileSize <= 0 {
		return 1
	}
	total := fileSize / int64(chunkSize)
	if fileSize%int64(chunkSize) != 0 {
		total++
	}
	return uint32(total)
}

// ComputeChunkChecksum calculates SHA-256 of chunk data
func ComputeChunkChecksum(data []byte) string {
	h := sha256.Sum256(data)
	return hex.EncodeToString(h[:])
}

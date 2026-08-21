package transfer

import (
	"context"
	"fmt"
	"io"
	"os"

	"secure-p2p-transfer/core/pkg/crypto"
	"secure-p2p-transfer/core/pkg/protocol"
)

// FileReceiver processes incoming binary protocol frames, decrypts them, and writes to target file
type FileReceiver struct {
	transferID [16]byte
	outputPath string
	aesKey     []byte
	expectedHash string
}

// NewFileReceiver creates a new FileReceiver instance
func NewFileReceiver(transferID [16]byte, outputPath string, aesKey []byte, expectedHash string) *FileReceiver {
	return &FileReceiver{
		transferID:   transferID,
		outputPath:   outputPath,
		aesKey:       aesKey,
		expectedHash: expectedHash,
	}
}

// ReceiveStreams reads packets from reader until FIN, decrypts chunks and writes to output file
func (r *FileReceiver) ReceiveStreams(ctx context.Context, reader io.Reader, tracker *ProgressTracker) error {
	outFile, err := os.OpenFile(r.outputPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0644)
	if err != nil {
		return fmt.Errorf("failed to create destination file: %w", err)
	}
	defer outFile.Close()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		packet, err := protocol.ReadPacket(reader)
		if err != nil {
			if err == io.EOF {
				break
			}
			return fmt.Errorf("error reading protocol packet: %w", err)
		}

		if packet.Header.Type == protocol.TypeFIN {
			break
		}

		if packet.Header.Type != protocol.TypeDATA {
			continue
		}

		// Decrypt chunk data using AES-256-GCM
		decrypted, err := crypto.DecryptAESGCM(r.aesKey, packet.Payload)
		if err != nil {
			return fmt.Errorf("chunk #%d decryption failed: %w", packet.Header.ChunkIndex, err)
		}

		if _, err := outFile.Write(decrypted); err != nil {
			return fmt.Errorf("failed to write decrypted chunk #%d to disk: %w", packet.Header.ChunkIndex, err)
		}

		if tracker != nil {
			tracker.AddBytes(int64(len(decrypted)), packet.Header.ChunkIndex)
		}
	}

	// Verify complete file hash if provided
	if r.expectedHash != "" {
		computedHash, err := crypto.ComputeFileSHA256(r.outputPath)
		if err != nil {
			return fmt.Errorf("failed to compute received file hash: %w", err)
		}
		if computedHash != r.expectedHash {
			return fmt.Errorf("integrity check failed: expected hash %s, got %s", r.expectedHash, computedHash)
		}
	}

	return nil
}

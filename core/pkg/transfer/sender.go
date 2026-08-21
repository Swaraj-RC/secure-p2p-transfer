package transfer

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"

	"secure-p2p-transfer/core/pkg/crypto"
	"secure-p2p-transfer/core/pkg/protocol"
)

// FileSender manages encrypted chunk streaming to a peer connection
type FileSender struct {
	transferID [16]byte
	filePath   string
	aesKey     []byte
	chunkSize  int
}

// NewFileSender creates a new FileSender instance
func NewFileSender(transferID [16]byte, filePath string, aesKey []byte, chunkSize int) *FileSender {
	if chunkSize <= 0 {
		chunkSize = DefaultChunkSize
	}
	return &FileSender{
		transferID: transferID,
		filePath:   filePath,
		aesKey:     aesKey,
		chunkSize:  chunkSize,
	}
}

// SendStreams reads the file, encrypts each chunk with AES-256-GCM, frames it, and writes to writer
func (s *FileSender) SendStreams(ctx context.Context, writer io.Writer, tracker *ProgressTracker) error {
	file, err := os.Open(s.filePath)
	if err != nil {
		return fmt.Errorf("failed to open source file: %w", err)
	}
	defer file.Close()

	stat, err := file.Stat()
	if err != nil {
		return fmt.Errorf("failed to stat source file: %w", err)
	}

	totalChunks := CalculateTotalChunks(stat.Size(), s.chunkSize)
	rawBuf := make([]byte, s.chunkSize)

	for chunkIndex := uint32(0); chunkIndex < totalChunks; chunkIndex++ {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		n, err := io.ReadFull(file, rawBuf)
		if err != nil && err != io.EOF && err != io.ErrUnexpectedEOF {
			return fmt.Errorf("read chunk #%d failed: %w", chunkIndex, err)
		}
		if n == 0 {
			break
		}

		chunkData := rawBuf[:n]

		// Encrypt chunk using AES-256-GCM
		encryptedChunk, err := crypto.EncryptAESGCM(s.aesKey, chunkData)
		if err != nil {
			return fmt.Errorf("encryption error on chunk #%d: %w", chunkIndex, err)
		}

		// Frame into binary packet
		packet := &protocol.Packet{
			Header: protocol.Header{
				Version:    protocol.ProtocolVersion,
				Type:       protocol.TypeDATA,
				Flags:      0,
				TransferID: s.transferID,
				ChunkIndex: chunkIndex,
				ChunkSize:  uint32(len(encryptedChunk)),
			},
			Payload: encryptedChunk,
		}

		encoded := protocol.EncodePacket(packet)
		if _, err := writer.Write(encoded); err != nil {
			return fmt.Errorf("failed to write chunk #%d to peer: %w", chunkIndex, err)
		}

		if tracker != nil {
			tracker.AddBytes(int64(n), chunkIndex)
		}
	}

	// Send FIN packet
	finPacket := &protocol.Packet{
		Header: protocol.Header{
			Version:    protocol.ProtocolVersion,
			Type:       protocol.TypeFIN,
			TransferID: s.transferID,
			ChunkIndex: totalChunks,
			ChunkSize:  0,
		},
	}
	if _, err := writer.Write(protocol.EncodePacket(finPacket)); err != nil {
		return fmt.Errorf("failed to write FIN packet: %w", err)
	}

	return nil
}

// GetMetadata builds handshake info for the file
func (s *FileSender) GetMetadata() (*protocol.HandshakeMetadata, error) {
	stat, err := os.Stat(s.filePath)
	if err != nil {
		return nil, err
	}

	hash, err := crypto.ComputeFileSHA256(s.filePath)
	if err != nil {
		return nil, err
	}

	return &protocol.HandshakeMetadata{
		FileName:    filepath.Base(s.filePath),
		FileSize:    stat.Size(),
		FileHash:    hash,
		TotalChunks: int(CalculateTotalChunks(stat.Size(), s.chunkSize)),
		ChunkSize:   s.chunkSize,
		Accepted:    true,
	}, nil
}

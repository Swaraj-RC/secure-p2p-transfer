package transfer

import (
	"bytes"
	"context"
	"os"
	"testing"

	"secure-p2p-transfer/core/pkg/crypto"
)

func TestSendAndReceivePipeline(t *testing.T) {
	// Create sample source file
	srcFile, err := os.CreateTemp("", "p2p_src_*.dat")
	if err != nil {
		t.Fatal(err)
	}
	defer os.Remove(srcFile.Name())

	sampleData := bytes.Repeat([]byte("Decentralized P2P File Streaming Engine with AES-256-GCM chunk security! "), 1000)
	if _, err := srcFile.Write(sampleData); err != nil {
		t.Fatal(err)
	}
	srcFile.Close()

	destPath := srcFile.Name() + ".received"
	defer os.Remove(destPath)

	key, _ := crypto.GenerateRandomKey()
	var transferID [16]byte
	copy(transferID[:], "pipeline-test-id")

	// 1. Sender streams into in-memory buffer
	sender := NewFileSender(transferID, srcFile.Name(), key, 4096) // 4KB chunk size
	meta, err := sender.GetMetadata()
	if err != nil {
		t.Fatalf("Sender GetMetadata failed: %v", err)
	}

	var streamBuffer bytes.Buffer
	ctx := context.Background()

	if err := sender.SendStreams(ctx, &streamBuffer, nil); err != nil {
		t.Fatalf("SendStreams failed: %v", err)
	}

	// 2. Receiver consumes buffer and writes to destination
	receiver := NewFileReceiver(transferID, destPath, key, meta.FileHash)
	if err := receiver.ReceiveStreams(ctx, &streamBuffer, nil); err != nil {
		t.Fatalf("ReceiveStreams failed: %v", err)
	}

	// 3. Verify destination file integrity
	receivedData, err := os.ReadFile(destPath)
	if err != nil {
		t.Fatalf("ReadFile failed: %v", err)
	}

	if !bytes.Equal(receivedData, sampleData) {
		t.Fatalf("Received file content does not match source file!")
	}
}

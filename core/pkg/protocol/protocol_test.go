package protocol

import (
	"bytes"
	"testing"
)

func TestPacketEncodeDecode(t *testing.T) {
	var transferID [16]byte
	copy(transferID[:], []byte("1234567890123456"))

	payload := []byte("Encrypted chunk binary payload test data")
	origPacket := &Packet{
		Header: Header{
			Version:    ProtocolVersion,
			Type:       TypeDATA,
			Flags:      0x0001,
			TransferID: transferID,
			ChunkIndex: 42,
			ChunkSize:  uint32(len(payload)),
		},
		Payload: payload,
	}

	encoded := EncodePacket(origPacket)
	reader := bytes.NewReader(encoded)

	decoded, err := ReadPacket(reader)
	if err != nil {
		t.Fatalf("ReadPacket failed: %v", err)
	}

	if decoded.Header.Version != origPacket.Header.Version {
		t.Errorf("Version mismatch: got %d, want %d", decoded.Header.Version, origPacket.Header.Version)
	}
	if decoded.Header.Type != origPacket.Header.Type {
		t.Errorf("Type mismatch: got %d, want %d", decoded.Header.Type, origPacket.Header.Type)
	}
	if decoded.Header.ChunkIndex != 42 {
		t.Errorf("ChunkIndex mismatch: got %d, want 42", decoded.Header.ChunkIndex)
	}
	if !bytes.Equal(decoded.Payload, payload) {
		t.Errorf("Payload mismatch")
	}
}

func TestHandshakeMetadata(t *testing.T) {
	var transferID [16]byte
	copy(transferID[:], []byte("transfer-uuid-16"))

	meta := &HandshakeMetadata{
		TransferID:  "transfer-uuid-16",
		FileName:    "report.pdf",
		FileSize:    1048576,
		FileHash:    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
		TotalChunks: 1,
		ChunkSize:   1048576,
		Accepted:    true,
	}

	pkt, err := CreateOfferPacket(transferID, meta)
	if err != nil {
		t.Fatalf("CreateOfferPacket failed: %v", err)
	}

	parsed, err := ParseHandshakeMetadata(pkt)
	if err != nil {
		t.Fatalf("ParseHandshakeMetadata failed: %v", err)
	}

	if parsed.FileName != "report.pdf" || parsed.FileSize != 1048576 {
		t.Fatalf("Parsed metadata mismatch: %+v", parsed)
	}
}

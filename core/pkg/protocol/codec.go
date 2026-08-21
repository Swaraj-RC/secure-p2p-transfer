package protocol

import (
	"encoding/binary"
	"errors"
	"fmt"
	"io"
)

const HeaderSize = 28 // 1 + 1 + 2 + 16 + 4 + 4

var (
	ErrHeaderTooShort   = errors.New("protocol: packet header too short")
	ErrInvalidVersion   = errors.New("protocol: unsupported protocol version")
	ErrPayloadSizeLimit = errors.New("protocol: payload size exceeds maximum limit")
)

const MaxPayloadSize = 16 * 1024 * 1024 // 16 MB max chunk limit

// EncodePacket serializes a Packet into a binary byte slice
func EncodePacket(p *Packet) []byte {
	p.Header.ChunkSize = uint32(len(p.Payload))
	buf := make([]byte, HeaderSize+len(p.Payload))

	buf[0] = p.Header.Version
	buf[1] = byte(p.Header.Type)
	binary.BigEndian.PutUint16(buf[2:4], p.Header.Flags)
	copy(buf[4:20], p.Header.TransferID[:])
	binary.BigEndian.PutUint32(buf[20:24], p.Header.ChunkIndex)
	binary.BigEndian.PutUint32(buf[24:28], p.Header.ChunkSize)

	if len(p.Payload) > 0 {
		copy(buf[28:], p.Payload)
	}

	return buf
}

// ReadPacket reads a complete binary framed Packet from an io.Reader
func ReadPacket(r io.Reader) (*Packet, error) {
	headerBuf := make([]byte, HeaderSize)
	if _, err := io.ReadFull(r, headerBuf); err != nil {
		return nil, fmt.Errorf("failed to read packet header: %w", err)
	}

	header := Header{
		Version:    headerBuf[0],
		Type:       MessageType(headerBuf[1]),
		Flags:      binary.BigEndian.Uint16(headerBuf[2:4]),
		ChunkIndex: binary.BigEndian.Uint32(headerBuf[20:24]),
		ChunkSize:  binary.BigEndian.Uint32(headerBuf[24:28]),
	}
	copy(header.TransferID[:], headerBuf[4:20])

	if header.Version != ProtocolVersion {
		return nil, fmt.Errorf("%w (got 0x%02X, expected 0x%02X)", ErrInvalidVersion, header.Version, ProtocolVersion)
	}

	if header.ChunkSize > MaxPayloadSize {
		return nil, ErrPayloadSizeLimit
	}

	payload := make([]byte, header.ChunkSize)
	if header.ChunkSize > 0 {
		if _, err := io.ReadFull(r, payload); err != nil {
			return nil, fmt.Errorf("failed to read packet payload (%d bytes): %w", header.ChunkSize, err)
		}
	}

	return &Packet{
		Header:  header,
		Payload: payload,
	}, nil
}

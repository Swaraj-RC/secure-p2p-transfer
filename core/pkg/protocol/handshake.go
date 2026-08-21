package protocol

import (
	"encoding/json"
	"fmt"
)

// CreateOfferPacket creates a SYN packet with handshake metadata
func CreateOfferPacket(transferID [16]byte, meta *HandshakeMetadata) (*Packet, error) {
	payload, err := json.Marshal(meta)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal offer metadata: %w", err)
	}

	return &Packet{
		Header: Header{
			Version:    ProtocolVersion,
			Type:       TypeSYN,
			Flags:      0,
			TransferID: transferID,
			ChunkIndex: 0,
			ChunkSize:  uint32(len(payload)),
		},
		Payload: payload,
	}, nil
}

// CreateAnswerPacket creates an ACK/NACK packet in response to an offer
func CreateAnswerPacket(transferID [16]byte, accepted bool, recipientKey, reason string) (*Packet, error) {
	msgType := TypeACK
	if !accepted {
		msgType = TypeNACK
	}

	meta := HandshakeMetadata{
		Accepted:     accepted,
		RecipientKey: recipientKey,
		Reason:       reason,
	}

	payload, err := json.Marshal(meta)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal answer metadata: %w", err)
	}

	return &Packet{
		Header: Header{
			Version:    ProtocolVersion,
			Type:       msgType,
			Flags:      0,
			TransferID: transferID,
			ChunkIndex: 0,
			ChunkSize:  uint32(len(payload)),
		},
		Payload: payload,
	}, nil
}

// ParseHandshakeMetadata extracts the JSON metadata from SYN or ACK packet payload
func ParseHandshakeMetadata(p *Packet) (*HandshakeMetadata, error) {
	var meta HandshakeMetadata
	if err := json.Unmarshal(p.Payload, &meta); err != nil {
		return nil, fmt.Errorf("failed to unmarshal handshake metadata: %w", err)
	}
	return &meta, nil
}

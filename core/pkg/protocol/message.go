package protocol

// Protocol Version
const ProtocolVersion byte = 0x01

// Message Types
type MessageType byte

const (
	TypeSYN      MessageType = 0x01 // Transfer initiation / offer
	TypeACK      MessageType = 0x02 // Transfer acknowledgment / accept
	TypeNACK     MessageType = 0x03 // Rejection or retry request
	TypeDATA     MessageType = 0x04 // Encrypted file chunk
	TypeDATA_ACK MessageType = 0x05 // Chunk received & verified
	TypeFIN      MessageType = 0x06 // Transfer complete
	TypeRESUME   MessageType = 0x07 // Transfer resumption query
	TypeERROR    MessageType = 0xFF // Error notification
)

// Header represents the fixed 28-byte binary framing header:
// [1B Version][1B Type][2B Flags][16B TransferID][4B ChunkIndex][4B ChunkSize]
type Header struct {
	Version    byte
	Type       MessageType
	Flags      uint16
	TransferID [16]byte
	ChunkIndex uint32
	ChunkSize  uint32
}

// Packet encapsulates a Header and variable encrypted Payload data
type Packet struct {
	Header  Header
	Payload []byte
}

// HandshakeMetadata contains JSON-encoded offer/answer details exchanged during SYN/ACK
type HandshakeMetadata struct {
	TransferID   string `json:"transferId"`
	FileName     string `json:"fileName"`
	FileSize     int64  `json:"fileSize"`
	FileHash     string `json:"fileHash"`
	TotalChunks  int    `json:"totalChunks"`
	ChunkSize    int    `json:"chunkSize"`
	MimeType     string `json:"mimeType,omitempty"`
	SenderKey    string `json:"senderKey,omitempty"`
	RecipientKey string `json:"recipientKey,omitempty"`
	Accepted     bool   `json:"accepted"`
	Reason       string `json:"reason,omitempty"`
}

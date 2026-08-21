package transfer

import (
	"encoding/json"
	"fmt"
	"os"
)

// TransferState preserves chunk completion state for interrupted transfers
type TransferState struct {
	TransferID       string          `json:"transferId"`
	FileName         string          `json:"fileName"`
	FileSize         int64           `json:"fileSize"`
	FileHash         string          `json:"fileHash"`
	TotalChunks      uint32          `json:"totalChunks"`
	ChunkSize        int             `json:"chunkSize"`
	CompletedChunks  map[uint32]bool `json:"completedChunks"`
	BytesTransferred int64           `json:"bytesTransferred"`
}

// SaveTransferState writes state to a `.p2p_part` file
func SaveTransferState(statePath string, state *TransferState) error {
	data, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal transfer state: %w", err)
	}
	return os.WriteFile(statePath, data, 0644)
}

// LoadTransferState reads state from a `.p2p_part` file
func LoadTransferState(statePath string) (*TransferState, error) {
	data, err := os.ReadFile(statePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read transfer state file: %w", err)
	}

	var state TransferState
	if err := json.Unmarshal(data, &state); err != nil {
		return nil, fmt.Errorf("corrupt transfer state file: %w", err)
	}

	if state.CompletedChunks == nil {
		state.CompletedChunks = make(map[uint32]bool)
	}

	return &state, nil
}

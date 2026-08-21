package transfer

import (
	"sync"
	"time"
)

// ProgressSnapshot contains point-in-time statistics of an active transfer
type ProgressSnapshot struct {
	TransferID       string        `json:"transferId"`
	BytesTransferred int64         `json:"bytesTransferred"`
	TotalBytes       int64         `json:"totalBytes"`
	Percentage       float64       `json:"percentage"`
	SpeedBytesPerSec float64       `json:"speedBytesPerSec"`
	SpeedMBPerSec    float64       `json:"speedMBPerSec"`
	ETA              time.Duration `json:"eta"`
	Elapsed          time.Duration `json:"elapsed"`
	ChunksCompleted  uint32        `json:"chunksCompleted"`
	TotalChunks      uint32        `json:"totalChunks"`
}

// ProgressTracker provides thread-safe real-time speed, byte counters, and ETA calculations
type ProgressTracker struct {
	mu               sync.Mutex
	transferID       string
	totalBytes       int64
	totalChunks      uint32
	bytesTransferred int64
	chunksCompleted  uint32
	startTime        time.Time
	lastSampleTime   time.Time
	lastSampleBytes  int64
	currentSpeed     float64
	onProgress       func(ProgressSnapshot)
}

// NewProgressTracker creates a new tracker instance
func NewProgressTracker(transferID string, totalBytes int64, totalChunks uint32, onProgress func(ProgressSnapshot)) *ProgressTracker {
	now := time.Now()
	return &ProgressTracker{
		transferID:       transferID,
		totalBytes:       totalBytes,
		totalChunks:      totalChunks,
		startTime:        now,
		lastSampleTime:   now,
		onProgress:       onProgress,
	}
}

// AddBytes records progress and triggers listener
func (pt *ProgressTracker) AddBytes(n int64, chunkIndex uint32) ProgressSnapshot {
	pt.mu.Lock()
	defer pt.mu.Unlock()

	pt.bytesTransferred += n
	pt.chunksCompleted = chunkIndex + 1

	now := time.Now()
	sampleDuration := now.Sub(pt.lastSampleTime).Seconds()

	if sampleDuration >= 0.25 || pt.bytesTransferred >= pt.totalBytes {
		bytesDelta := pt.bytesTransferred - pt.lastSampleBytes
		if sampleDuration > 0 {
			pt.currentSpeed = float64(bytesDelta) / sampleDuration
		}
		pt.lastSampleTime = now
		pt.lastSampleBytes = pt.bytesTransferred
	}

	percentage := 0.0
	if pt.totalBytes > 0 {
		percentage = (float64(pt.bytesTransferred) / float64(pt.totalBytes)) * 100.0
	}
	if percentage > 100.0 {
		percentage = 100.0
	}

	var eta time.Duration
	if pt.currentSpeed > 0 && pt.bytesTransferred < pt.totalBytes {
		remainingBytes := pt.totalBytes - pt.bytesTransferred
		etaSeconds := float64(remainingBytes) / pt.currentSpeed
		eta = time.Duration(etaSeconds * float64(time.Second))
	}

	snapshot := ProgressSnapshot{
		TransferID:       pt.transferID,
		BytesTransferred: pt.bytesTransferred,
		TotalBytes:       pt.totalBytes,
		Percentage:       percentage,
		SpeedBytesPerSec: pt.currentSpeed,
		SpeedMBPerSec:    pt.currentSpeed / (1024 * 1024),
		ETA:              eta,
		Elapsed:          now.Sub(pt.startTime),
		ChunksCompleted:  pt.chunksCompleted,
		TotalChunks:      pt.totalChunks,
	}

	if pt.onProgress != nil {
		pt.onProgress(snapshot)
	}

	return snapshot
}

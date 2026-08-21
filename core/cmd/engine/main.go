package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"flag"
	"fmt"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"secure-p2p-transfer/core/pkg/crypto"
	"secure-p2p-transfer/core/pkg/network/nat"
	"secure-p2p-transfer/core/pkg/network/tcp"
	"secure-p2p-transfer/core/pkg/transfer"
	"secure-p2p-transfer/core/pkg/utils"
)

func main() {
	mode := flag.String("mode", "help", "Operation mode: send, receive, stun, benchmark")
	file := flag.String("file", "", "Path to source file for sending, or destination directory for receiving")
	target := flag.String("target", "127.0.0.1:9090", "Target peer host:port for sending")
	port := flag.Int("port", 9090, "Listening TCP port for receiving")
	keyHex := flag.String("key", "", "Hex-encoded 32-byte AES key (or generated automatically if empty)")
	chunkSize := flag.Int("chunk-size", transfer.DefaultChunkSize, "Chunk size in bytes (default 1MB)")
	flag.Parse()

	log := utils.NewLogger(utils.LogLevelInfo)

	fmt.Println("================================================================")
	fmt.Println("🚀 Secure Cross-Platform Decentralized File Transfer Engine v1.0")
	fmt.Println("🔒 AES-256-GCM End-to-End Encrypted • Direct P2P Stream Mesh")
	fmt.Println("================================================================")

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Handle graceful interrupt
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-sigChan
		log.Warn("Termination signal received. Aborting transfer...")
		cancel()
	}()

	switch *mode {
	case "stun":
		log.Info("Discovering public IP & NAT mapping via STUN...")
		endpoint, err := nat.DiscoverPublicEndpoint("stun.l.google.com:19302", 5*time.Second)
		if err != nil {
			log.Error("STUN discovery failed: %v", err)
			os.Exit(1)
		}
		log.Info("NAT Public IP: %s | Mapped Port: %d", endpoint.IP.String(), endpoint.Port)

	case "send":
		if *file == "" {
			log.Error("Please specify file path to send using -file <path>")
			os.Exit(1)
		}

		var aesKey []byte
		var err error
		if *keyHex != "" {
			aesKey, err = hex.DecodeString(*keyHex)
			if err != nil || len(aesKey) != 32 {
				log.Error("Invalid 32-byte hex key: %v", err)
				os.Exit(1)
			}
		} else {
			aesKey, _ = crypto.GenerateRandomKey()
		}

		var transferID [16]byte
		_, _ = rand.Read(transferID[:])

		log.Info("Initiating transfer ID: %x", transferID)
		log.Info("File: %s", *file)
		log.Info("AES-256 Key: %x", aesKey)
		log.Info("Connecting to target peer %s...", *target)

		conn, err := tcp.ConnectPeer(*target, 10*time.Second)
		if err != nil {
			log.Error("Failed to connect to peer: %v", err)
			os.Exit(1)
		}
		defer conn.Close()

		sender := transfer.NewFileSender(transferID, *file, aesKey, *chunkSize)
		meta, err := sender.GetMetadata()
		if err != nil {
			log.Error("Failed to read file info: %v", err)
			os.Exit(1)
		}

		log.Info("File Size: %s | Total Chunks: %d | SHA-256: %s", utils.FormatBytes(meta.FileSize), meta.TotalChunks, meta.FileHash)

		tracker := transfer.NewProgressTracker(fmt.Sprintf("%x", transferID), meta.FileSize, uint32(meta.TotalChunks), func(p transfer.ProgressSnapshot) {
			fmt.Printf("\r⚡ Progress: %5.1f%% [%s / %s] | Speed: %6.2f MB/s | ETA: %v   ",
				p.Percentage,
				utils.FormatBytes(p.BytesTransferred),
				utils.FormatBytes(p.TotalBytes),
				p.SpeedMBPerSec,
				p.ETA.Round(time.Second),
			)
		})

		startTime := time.Now()
		if err := sender.SendStreams(ctx, conn, tracker); err != nil {
			fmt.Println()
			log.Error("Transfer failed: %v", err)
			os.Exit(1)
		}
		fmt.Println()
		log.Info("Transfer complete in %v! All chunks delivered and verified.", time.Since(startTime).Round(time.Millisecond))

	case "receive":
		if *file == "" {
			*file = "./received_file"
		}

		var aesKey []byte
		var err error
		if *keyHex != "" {
			aesKey, err = hex.DecodeString(*keyHex)
			if err != nil || len(aesKey) != 32 {
				log.Error("Invalid 32-byte hex key: %v", err)
				os.Exit(1)
			}
		} else {
			log.Error("AES-256 decryption key must be supplied via -key <hex32bytes> for receiving")
			os.Exit(1)
		}

		listener, err := tcp.StartListener(*port)
		if err != nil {
			log.Error("Failed to bind listener: %v", err)
			os.Exit(1)
		}
		defer listener.Close()

		log.Info("Listening on TCP port %d for incoming peer transfer...", listener.Port())
		log.Info("Destination path: %s", *file)

		conn, err := listener.AcceptConnection()
		if err != nil {
			log.Error("Accept failed: %v", err)
			os.Exit(1)
		}
		defer conn.Close()
		log.Info("Peer connected from %s!", conn.RemoteAddr())

		var dummyTransferID [16]byte
		receiver := transfer.NewFileReceiver(dummyTransferID, *file, aesKey, "")

		tracker := transfer.NewProgressTracker("rx", 0, 0, func(p transfer.ProgressSnapshot) {
			fmt.Printf("\r📥 Receiving: %s | Speed: %6.2f MB/s | Elapsed: %v   ",
				utils.FormatBytes(p.BytesTransferred),
				p.SpeedMBPerSec,
				p.Elapsed.Round(time.Second),
			)
		})

		startTime := time.Now()
		if err := receiver.ReceiveStreams(ctx, conn, tracker); err != nil {
			fmt.Println()
			log.Error("Receive failed: %v", err)
			os.Exit(1)
		}
		fmt.Println()

		hash, _ := crypto.ComputeFileSHA256(*file)
		log.Info("File successfully received & decrypted in %v!", time.Since(startTime).Round(time.Millisecond))
		log.Info("Saved to: %s | SHA-256 Checksum: %s", filepath.Clean(*file), hash)

	case "benchmark":
		log.Info("Running internal cryptographic throughput benchmark...")
		key, _ := crypto.GenerateRandomKey()
		data := make([]byte, 1024*1024) // 1MB block
		_, _ = rand.Read(data)

		iterations := 100
		start := time.Now()
		for i := 0; i < iterations; i++ {
			enc, err := crypto.EncryptAESGCM(key, data)
			if err != nil {
				log.Error("Benchmark encryption failed: %v", err)
				return
			}
			_, err = crypto.DecryptAESGCM(key, enc)
			if err != nil {
				log.Error("Benchmark decryption failed: %v", err)
				return
			}
		}
		duration := time.Since(start)
		totalMB := float64(iterations * 2) // 100MB enc + 100MB dec
		speed := totalMB / duration.Seconds()
		log.Info("Benchmark completed: %d MB processed in %v (%.2f MB/s)", int(totalMB), duration, speed)

	default:
		flag.Usage()
	}
}

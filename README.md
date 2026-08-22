# ⚡ SLRV BEAM: Quantum Peer-to-Peer File Transfer Mesh

**Engineered with pride by Swaraj, Laxmikant, Rahul, and Vaibhav**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Go Version](https://img.shields.io/badge/Go-1.21+-00ADD8?logo=go)](https://golang.org)
[![Node.js Version](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react)](https://reactjs.org)
[![Security: AES--256--GCM](https://img.shields.io/badge/Security-AES--256--GCM-red)](SECURITY.md)

**SLRV BEAM** is a high-speed, zero-cloud, cross-platform decentralized peer-to-peer file beaming system engineered with zero central storage, bit-for-bit lossless transfers, WebCrypto AES-256-GCM encryption, WebSockets signaling, and direct WebRTC SCTP data channels.

---

## 🌟 Key Features

- 🔒 **End-to-End Encryption (E2EE)**: Every file chunk is encrypted in-flight using AES-256-GCM with ephemeral keys and SHA-256 cryptographic checksums.
- ⚡ **Zero Cloud Intermediaries**: Files stream directly device-to-device via WebRTC Data Channels / TCP socket mesh.
- 📡 **Real-Time Signaling**: Node.js + TypeScript WebSocket signaling hub providing automatic device discovery, session keep-alives, and connection negotiation.
- 🚀 **Go Core Engine**: Native Go 1.21+ CLI engine with concurrent worker pools, chunk stream pipeline, resuming, and NAT STUN traversal.
- 💻 **Modern React UI**: Sleek, glassmorphic dark-mode web application for desktop and mobile browsers.
- 🐳 **Complete DevOps Pipeline**: Multi-container Docker Compose, Kubernetes manifests, Terraform infrastructure, and GitHub Actions CI/CD.

---

## 🏗️ Architecture Overview

```
                      ┌─────────────────────────────────┐
                      │   Node.js Signaling Server      │
                      │  (Device Registry, JWT, WSS)    │
                      └────────┬───────────────┬────────┘
                               │ WebSocket     │ WebSocket
                               │ Signaling     │ Signaling
             ┌─────────────────▼───┐       ┌───▼─────────────────┐
             │   Peer Device A     │       │   Peer Device B     │
             │ (React Web / Go CLI)│       │ (React Web / Go CLI)│
             └──────────┬──────────┘       └──────────▲──────────┘
                        │                             │
                        └────── Encrypted P2P ────────┘
                          (WebRTC DataChannel / TCP)
                           [AES-256-GCM + SHA-256]
```

---

## 📁 Repository Structure

```
├── backend/            # Node.js + TypeScript WebSocket Signaling & REST API Server
├── core/               # Go High-Performance File Transfer Core & CLI Daemon
├── frontend/           # React + Vite + TypeScript P2P Web Client
├── infrastructure/     # Docker Compose, Kubernetes manifests, and Terraform
├── docs/               # Architecture, API specs, UML, protocols & weekly logs
├── scripts/            # Build, test, and deployment helper scripts
└── .github/            # GitHub Actions CI/CD workflows
```

---

## 🚀 Quick Start

### 1. Start the Signaling Backend
```bash
cd backend
npm install
npm run dev
# Server listening on http://localhost:8080 & ws://localhost:8080/ws
```

### 2. Start the React Frontend
```bash
cd frontend
npm install
npm run dev
# Web client available at http://localhost:5173
```

### 3. Run the Go Core Engine
```bash
cd core
go run cmd/engine/main.go --help
```

---

## 🧪 Testing

```bash
# Test Go Core Engine
cd core && go test -v ./...

# Test Backend Server
cd backend && npm test
```

---

## 📜 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

# Developer Getting Started Guide

## Prerequisites

- **Go**: 1.21 or higher
- **Node.js**: 20.x LTS or higher
- **npm**: 10.x or higher

---

## 1. Setup Backend Signaling Server

```bash
cd backend
npm install
npm run dev
```
The server will bind to `http://localhost:8080` (REST) and `ws://localhost:8080/ws` (WebSocket).

---

## 2. Setup React Web Frontend

```bash
cd frontend
npm install
npm run dev
```
The interactive HUD application will be accessible at `http://localhost:5173`.

---

## 3. Run the Go Core CLI Engine

```bash
cd core

# Run cryptographic benchmark
go run cmd/engine/main.go -mode benchmark

# Discover NAT mapped endpoint via STUN
go run cmd/engine/main.go -mode stun

# Start a receiver listener on port 9090
go run cmd/engine/main.go -mode receive -port 9090 -file ./downloaded.dat -key <32-byte-hex-key>

# Send file to receiver
go run cmd/engine/main.go -mode send -target 127.0.0.1:9090 -file ./sample.pdf -key <32-byte-hex-key>
```

---

## 4. Run Automated Test Suites

```bash
# Go Core Tests
cd core && go test -v ./...

# Backend TypeScript Build & Tests
cd backend && npm test
```

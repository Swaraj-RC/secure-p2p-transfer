# System Architecture Specification

## 1. High-Level Architecture

The Secure Cross-Platform Decentralized File Sharing System enables zero-server file transfers with end-to-end cryptographic protection.

```
                           ┌───────────────────────────────────┐
                           │ Node.js / TS Signaling Server     │
                           │  - WebSocket Presence Hub         │
                           │  - JWT Device Authentication      │
                           │  - Session & Relay Fallback       │
                           └─────────┬───────────────┬─────────┘
                                     │               │
                                  Signaling       Signaling
                                  (WSS/JSON)      (WSS/JSON)
                                     │               │
           ┌─────────────────────────▼─┐           ┌─▼─────────────────────────┐
           │ Peer A (Sender)           │           │ Peer B (Receiver)         │
           │  - React HUD / Go Engine  │           │  - React HUD / Go Engine  │
           │  - WebCrypto AES-256-GCM  │           │  - WebCrypto AES-256-GCM  │
           │  - SHA-256 Chunker        │           │  - SHA-256 Integrity Verif│
           └─────────────┬─────────────┘           └─────────────▲─────────────┘
                         │                                       │
                         └─────────── Direct P2P Mesh ───────────┘
                             (WebRTC DataChannel / TCP Socket)
```

## 2. Component Domains

### 2.1 Backend Signaling Server (`backend/`)
- Express 4.x REST APIs for device authentication (`POST /api/auth/register`) and active peer discovery (`GET /api/devices`).
- WebSocket (`ws`) real-time messaging pipeline for exchange of ICE candidates, SDP offers, and fallback relay chunks.

### 2.2 Core Transfer Engine (`core/`)
- Written in Go 1.21+ for raw network performance and zero-dependency cross-compilation.
- Encrypts each binary chunk using authenticated AES-256-GCM (12-byte random nonce + 16-byte authentication tag).
- Assembles binary protocol packets (`SYN`, `ACK`, `DATA`, `FIN`, `RESUME`).

### 2.3 Frontend Application (`frontend/`)
- React 18 + Vite + TypeScript.
- Sci-fi cybernetic HUD matching the design specifications with pitch black dot grid, neon orange glowing stencil logo, and sound synthesizer.
- Browser-native WebCrypto and WebRTC for direct in-browser peer streaming.

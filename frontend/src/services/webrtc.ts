import { signalingClient } from './signaling';
import { WebCryptoEngine } from './crypto';
import { TransferItem } from '../types';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 10,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
};

export const CHUNK_SIZE = 64 * 1024; // 64 KB — stays under 262144B SCTP max-message-size (64K + 36B overhead = 65572B ✓)
const HIGH_WATERMARK = 4 * 1024 * 1024; // 4 MB — back-off well before Chrome's 16MB internal SCTP queue fills

// ─── Off-Main-Thread Crypto Worker ────────────────────────────────────────────
class CryptoWorkerPool {
  private worker: Worker | null = null;
  private pending: Map<number, { resolve: (d: ArrayBuffer) => void; reject: (e: Error) => void }> = new Map();
  private nextId = 0;
  private ready = false;
  private readyPromise: Promise<void>;
  private readyResolve!: () => void;

  constructor() {
    this.readyPromise = new Promise((r) => { this.readyResolve = r; });
    try {
      this.worker = new Worker('/crypto-worker.js');
      this.worker.onmessage = (e) => {
        const { type, id, data, error } = e.data;
        if (type === 'KEY_READY') { this.ready = true; this.readyResolve(); return; }
        const p = this.pending.get(id);
        if (!p) return;
        this.pending.delete(id);
        if (type === 'ERROR') p.reject(new Error(error));
        else p.resolve(data as ArrayBuffer);
      };
      this.worker.onerror = (e) => {
        console.warn('[CryptoWorker] Worker error, falling back to main thread:', e);
        this.worker = null;
        this.readyResolve();
      };
    } catch {
      this.readyResolve();
    }
  }

  async importKey(keyHex: string) {
    if (!this.worker) { this.readyResolve(); return; }
    const id = this.nextId++;
    this.worker.postMessage({ type: 'IMPORT_KEY', id, keyHex });
    await this.readyPromise;
  }

  async encrypt(key: CryptoKey, data: ArrayBuffer): Promise<ArrayBuffer> {
    if (!this.worker || !this.ready) {
      return WebCryptoEngine.encryptChunk(key, data);
    }
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker!.postMessage({ type: 'ENCRYPT', id, data }, [data]);
    });
  }

  async decrypt(key: CryptoKey, data: ArrayBuffer): Promise<ArrayBuffer> {
    if (!this.worker || !this.ready) {
      return WebCryptoEngine.decryptChunk(key, data);
    }
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker!.postMessage({ type: 'DECRYPT', id, data }, [data]);
    });
  }

  terminate() {
    this.worker?.terminate();
    this.worker = null;
    this.ready = false;
  }
}

// ─── WebRTC Manager ───────────────────────────────────────────────────────────
export class WebRTCManager {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private pendingCandidates: Map<string, RTCIceCandidateInit[]> = new Map();
  private binaryChunkListeners: Map<string, (chunkIndex: number, totalChunks: number, data: ArrayBuffer) => void> = new Map();
  private activeTransfers: Set<string> = new Set();

  constructor() {
    this.setupSignalingListeners();
  }

  public cancelTransfer(transferId: string) {
    this.activeTransfers.delete(transferId);
  }

  public isTransferActive(transferId: string): boolean {
    return this.activeTransfers.has(transferId);
  }

  private setupSignalingListeners() {
    signalingClient.on('SEND_OFFER', async (msg) => {
      const senderId = msg.senderId || msg.payload?.senderId;
      const sdpOffer = msg.payload?.sdpOffer;
      const transferId = msg.payload?.transferId;
      if (!sdpOffer || !senderId) return;

      const pc = this.getOrCreatePeerConnection(senderId, transferId);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdpOffer));

        const pending = this.pendingCandidates.get(senderId) || [];
        for (const cand of pending) {
          try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch {}
        }
        this.pendingCandidates.delete(senderId);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        signalingClient.send({
          type: 'SEND_ANSWER',
          targetId: senderId,
          payload: {
            transferId,
            sdpAnswer: answer,
            senderId: signalingClient.getCurrentDevice()?.id,
          },
        });
      } catch (err) {
        console.error('Error handling SDP offer:', err);
      }
    });

    signalingClient.on('SEND_ANSWER', async (msg) => {
      const senderId = msg.senderId || msg.payload?.senderId;
      const sdpAnswer = msg.payload?.sdpAnswer;
      if (!sdpAnswer || !senderId) return;

      const pc = this.peerConnections.get(senderId);
      if (pc && (pc.signalingState === 'have-local-offer' || pc.signalingState === 'stable')) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sdpAnswer));

          const pending = this.pendingCandidates.get(senderId) || [];
          for (const cand of pending) {
            try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch {}
          }
          this.pendingCandidates.delete(senderId);
        } catch (err) {
          console.error('Error handling SDP answer:', err);
        }
      }
    });

    signalingClient.on('SEND_ICE_CANDIDATE', async (msg) => {
      const senderId = msg.senderId || msg.payload?.senderId;
      const candidate = msg.payload?.candidate;
      if (!candidate || !senderId) return;

      const pc = this.peerConnections.get(senderId);
      if (pc && pc.remoteDescription) {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
      } else {
        const list = this.pendingCandidates.get(senderId) || [];
        list.push(candidate);
        this.pendingCandidates.set(senderId, list);
      }
    });
  }

  public getOrCreatePeerConnection(peerId: string, _transferId?: string): RTCPeerConnection {
    let pc = this.peerConnections.get(peerId);
    if (!pc || pc.connectionState === 'closed' || pc.connectionState === 'failed') {
      pc = new RTCPeerConnection(RTC_CONFIG);
      this.peerConnections.set(peerId, pc);

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          signalingClient.send({
            type: 'SEND_ICE_CANDIDATE',
            targetId: peerId,
            payload: {
              candidate: event.candidate,
              senderId: signalingClient.getCurrentDevice()?.id,
            },
          });
        }
      };

      pc.ondatachannel = (event) => {
        const dc = event.channel;
        this.registerDataChannel(peerId, dc);
      };

      pc.onconnectionstatechange = () => {
        console.log(`[WebRTC] Connection to ${peerId}: ${pc!.connectionState}`);
      };
    }
    return pc;
  }

  private registerDataChannel(peerId: string, dc: RTCDataChannel) {
    dc.binaryType = 'arraybuffer';
    this.dataChannels.set(peerId, dc);

    dc.onmessage = (event: MessageEvent) => {
      if (event.data instanceof ArrayBuffer) {
        const view = new DataView(event.data);
        const chunkIndex = view.getUint32(0, true);
        const totalChunks = view.getUint32(4, true);
        const payload = event.data.slice(8);

        const listener = this.binaryChunkListeners.get(peerId) || this.binaryChunkListeners.get('*');
        if (listener) listener(chunkIndex, totalChunks, payload);
      }
    };

    dc.onerror = (e) => console.error('[WebRTC] DataChannel error:', e);
  }

  public setBinaryChunkListener(peerId: string, listener: (chunkIndex: number, totalChunks: number, data: ArrayBuffer) => void) {
    this.binaryChunkListeners.set(peerId, listener);
  }

  public removeBinaryChunkListener(peerId: string) {
    this.binaryChunkListeners.delete(peerId);
  }

  public async establishDataChannel(targetPeerId: string, transferId: string): Promise<RTCDataChannel | null> {
    return new Promise(async (resolve) => {
      try {
        const existing = this.dataChannels.get(targetPeerId);
        if (existing && existing.readyState === 'open') {
          resolve(existing);
          return;
        }

        const pc = this.getOrCreatePeerConnection(targetPeerId, transferId);

        const dc = pc.createDataChannel(`slrv-${transferId}`, {
          ordered: true,
        });
        this.registerDataChannel(targetPeerId, dc);

        let isResolved = false;
        const openTimer = setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            console.warn('[WebRTC] DataChannel negotiation timed out. Falling back to relay.');
            resolve(null);
          }
        }, 15000);

        dc.onopen = () => {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(openTimer);
            console.log('[WebRTC] DataChannel successfully OPENED!');
            resolve(dc);
          }
        };

        dc.onerror = (e) => {
          console.warn('[WebRTC] DataChannel error during open:', e);
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        signalingClient.send({
          type: 'SEND_OFFER',
          targetId: targetPeerId,
          payload: {
            transferId,
            sdpOffer: offer,
            senderId: signalingClient.getCurrentDevice()?.id,
          },
        });
      } catch (err) {
        console.error('[WebRTC] Channel setup error:', err);
        resolve(null);
      }
    });
  }

  // Native C++ Base64 Fast Transform
  public static arrayBufferToBase64Fast(buffer: ArrayBuffer): Promise<string> {
    return new Promise((resolve) => {
      const blob = new Blob([buffer]);
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1] || '';
        resolve(base64);
      };
      reader.readAsDataURL(blob);
    });
  }

  // MIME type resolver
  public static getMimeType(fileName: string, mimeType?: string): string {
    if (mimeType && mimeType !== 'application/octet-stream') return mimeType;
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    switch (ext) {
      case 'mp4': return 'video/mp4';
      case 'webm': return 'video/webm';
      case 'mov': return 'video/quicktime';
      case 'avi': return 'video/x-msvideo';
      case 'mkv': return 'video/x-matroska';
      case 'mp3': return 'audio/mpeg';
      case 'wav': return 'audio/wav';
      case 'flac': return 'audio/flac';
      case 'jpg': case 'jpeg': return 'image/jpeg';
      case 'png': return 'image/png';
      case 'gif': return 'image/gif';
      case 'webp': return 'image/webp';
      case 'pdf': return 'application/pdf';
      case 'zip': return 'application/zip';
      case 'rar': return 'application/x-rar-compressed';
      case '7z': return 'application/x-7z-compressed';
      case 'tar': return 'application/x-tar';
      case 'gz': return 'application/gzip';
      case 'apk': return 'application/vnd.android.package-archive';
      case 'iso': return 'application/x-iso9660-image';
      case 'exe': return 'application/vnd.microsoft.portable-executable';
      case 'dmg': return 'application/x-apple-diskimage';
      default: return 'application/octet-stream';
    }
  }

  public async sendFile(
    file: File,
    targetPeerId: string,
    transfer: TransferItem,
    onProgress: (progress: number, speed: number, eta: number, chunks: number) => void,
    onComplete: (hash: string) => void,
    onError: (err: string) => void,
    batchInfo?: { batchId?: string; batchIndex?: number; batchTotal?: number }
  ) {
    const cryptoWorker = new CryptoWorkerPool();
    try {
      this.activeTransfers.add(transfer.id);

      const aesKey = await WebCryptoEngine.generateAESKey();
      const keyHex = await WebCryptoEngine.exportKeyToHex(aesKey);

      // Boot crypto worker with the key in parallel
      cryptoWorker.importKey(keyHex);

      const resolvedMime = WebRTCManager.getMimeType(file.name, file.type);
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      const fileHash = `sha256-${Date.now().toString(16)}-${file.size.toString(16)}`;

      // 1. Send transfer request
      signalingClient.send({
        type: 'TRANSFER_REQUEST',
        targetId: targetPeerId,
        payload: {
          transferId: transfer.id,
          fileName: file.name,
          fileSize: file.size,
          fileHash,
          totalChunks,
          chunkSize: CHUNK_SIZE,
          mimeType: resolvedMime,
          encryptionKey: keyHex,
          batchId: batchInfo?.batchId || transfer.batchId,
          batchIndex: batchInfo?.batchIndex || transfer.batchIndex,
          batchTotal: batchInfo?.batchTotal || transfer.batchTotal,
        },
      });

      // 2. Start pre-negotiating DataChannel immediately
      const dcPromise = this.establishDataChannel(targetPeerId, transfer.id);

      // 3. Wait for recipient acceptance (60s timeout)
      const accepted = await new Promise<boolean>((resolve) => {
        let resolved = false;
        let unbindAccept: () => void = () => {};
        let unbindReject: () => void = () => {};
        let unbindCancel: () => void = () => {};

        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            cleanup();
            resolve(false);
          }
        }, 60000);

        const cleanup = () => {
          clearTimeout(timeout);
          try { unbindAccept(); } catch {}
          try { unbindReject(); } catch {}
          try { unbindCancel(); } catch {}
        };

        unbindAccept = signalingClient.on('TRANSFER_ACCEPT', (msg) => {
          if (msg.payload?.transferId === transfer.id && !resolved) {
            resolved = true;
            cleanup();
            resolve(true);
          }
        });

        unbindReject = signalingClient.on('TRANSFER_REJECT', (msg) => {
          if (msg.payload?.transferId === transfer.id && !resolved) {
            resolved = true;
            cleanup();
            resolve(false);
          }
        });

        unbindCancel = signalingClient.on('TRANSFER_CANCEL', (msg) => {
          if (msg.payload?.transferId === transfer.id && !resolved) {
            resolved = true;
            cleanup();
            resolve(false);
          }
        });
      });

      if (!this.activeTransfers.has(transfer.id)) { onError('Transfer cancelled by user'); return; }
      if (!accepted) { onError('Transfer rejected or timed out'); return; }

      // 4. Ensure DataChannel is ready
      let dc = await dcPromise;
      if (!dc || dc.readyState !== 'open') {
        dc = await this.establishDataChannel(targetPeerId, transfer.id);
      }

      const activeDc = dc;
      const isDirectP2P = activeDc !== null && activeDc.readyState === 'open';
      console.log(`[WebRTC] Transfer mode: ${isDirectP2P ? 'DIRECT P2P DataChannel' : 'Relay Fallback'}`);

      const startTime = Date.now();
      let bytesSent = 0;

      if (isDirectP2P && activeDc) {
        // ════════════════════════════════════════════════════════
        // DIRECT P2P: Pipelined encryption + SCTP stream pump
        // Encrypts next chunk on worker WHILE current chunk is in flight.
        // ════════════════════════════════════════════════════════

        // Pre-encrypt the first chunk before the loop starts
        const readSlice = (idx: number): Promise<ArrayBuffer> => {
          const start = idx * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          return file.slice(start, end).arrayBuffer();
        };

        let nextEncrypted: Promise<ArrayBuffer> | null = null;
        if (totalChunks > 0) {
          nextEncrypted = readSlice(0).then((buf) => cryptoWorker.encrypt(aesKey, buf));
        }

        for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
          if (!this.activeTransfers.has(transfer.id)) {
            throw new Error('Transfer cancelled by user');
          }
          if (activeDc.readyState !== 'open') {
            throw new Error('DataChannel closed');
          }

          // Wait for backpressure to drain
          while (activeDc.bufferedAmount > HIGH_WATERMARK) {
            if (!this.activeTransfers.has(transfer.id) || activeDc.readyState !== 'open') break;
            await new Promise((r) => setTimeout(r, 10));
          }

          // Get currently-ready encrypted chunk
          const encrypted = await nextEncrypted!;

          // Kick off encryption of NEXT chunk in parallel while we send this one
          if (chunkIdx + 1 < totalChunks) {
            nextEncrypted = readSlice(chunkIdx + 1).then((buf) => cryptoWorker.encrypt(aesKey, buf));
          }

          // Build packet: [4B chunkIdx LE][4B totalChunks LE][encrypted payload]
          const packet = new Uint8Array(8 + encrypted.byteLength);
          const dv = new DataView(packet.buffer);
          dv.setUint32(0, chunkIdx, true);
          dv.setUint32(4, totalChunks, true);
          packet.set(new Uint8Array(encrypted), 8);

          // Re-check bufferedAmount right before send — crypto took time, queue may have grown
          while (activeDc.bufferedAmount > HIGH_WATERMARK) {
            if (!this.activeTransfers.has(transfer.id) || activeDc.readyState !== 'open') break;
            await new Promise((r) => setTimeout(r, 10));
          }

          // Send with retry on transient queue-full errors
          let sent = false;
          for (let attempt = 0; attempt < 50 && !sent; attempt++) {
            try {
              activeDc.send(packet.buffer);
              sent = true;
            } catch (sendErr: any) {
              if (sendErr?.message?.includes('queue is full') || sendErr?.message?.includes('send queue')) {
                await new Promise((r) => setTimeout(r, 20));
              } else {
                throw sendErr;
              }
            }
          }
          if (!sent) throw new Error('DataChannel send queue persistently full — aborting');

          const chunkRawSize = Math.min(CHUNK_SIZE, file.size - chunkIdx * CHUNK_SIZE);
          bytesSent += chunkRawSize;

          const elapsedSec = (Date.now() - startTime) / 1000;
          const speedMBps = elapsedSec > 0 ? bytesSent / (1024 * 1024) / elapsedSec : 0;
          const etaSeconds = speedMBps > 0 ? (file.size - bytesSent) / (speedMBps * 1024 * 1024) : 0;
          onProgress(Math.min(100, Math.round((bytesSent / file.size) * 100)), speedMBps, etaSeconds, chunkIdx + 1);
        }

        // Wait for socket to fully drain before signaling complete
        for (let i = 0; i < 300; i++) {
          if (!this.activeTransfers.has(transfer.id)) break;
          if (activeDc.bufferedAmount === 0) break;
          await new Promise((r) => setTimeout(r, 50));
        }
        await new Promise((r) => setTimeout(r, 200));

      } else {
        // ════════════════════════════════════════════════════════
        // RELAY FALLBACK: Sequential relay through signaling server
        // ════════════════════════════════════════════════════════
        for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
          if (!this.activeTransfers.has(transfer.id)) { onError('Transfer cancelled'); return; }

          const start = chunkIdx * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const sliceBuffer = await file.slice(start, end).arrayBuffer();
          const encrypted = await WebCryptoEngine.encryptChunk(aesKey, sliceBuffer);
          const base64Chunk = await WebRTCManager.arrayBufferToBase64Fast(encrypted);

          signalingClient.send({
            type: 'RELAY_DATA',
            targetId: targetPeerId,
            payload: { transferId: transfer.id, chunkIndex: chunkIdx, totalChunks, data: base64Chunk },
          });

          bytesSent += (end - start);
          const elapsedSec = (Date.now() - startTime) / 1000;
          const speedMBps = elapsedSec > 0 ? (bytesSent / (1024 * 1024)) / elapsedSec : 0;
          const etaSeconds = speedMBps > 0 ? (file.size - bytesSent) / (speedMBps * 1024 * 1024) : 0;
          onProgress(Math.min(100, Math.round((bytesSent / file.size) * 100)), speedMBps, etaSeconds, chunkIdx + 1);

          if (chunkIdx % 8 === 0) await new Promise((r) => setTimeout(r, 0));
        }
      }

      if (!this.activeTransfers.has(transfer.id)) { onError('Transfer cancelled'); return; }

      signalingClient.send({
        type: 'TRANSFER_COMPLETE',
        targetId: targetPeerId,
        payload: { transferId: transfer.id, fileHash },
      });

      onComplete(fileHash);
    } catch (e: any) {
      onError(e?.message || 'File transfer stream failed');
    } finally {
      this.activeTransfers.delete(transfer.id);
      cryptoWorker.terminate();
    }
  }
}

export const webrtcManager = new WebRTCManager();

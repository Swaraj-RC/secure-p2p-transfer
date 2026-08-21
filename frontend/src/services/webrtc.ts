import { signalingClient } from './signaling';
import { WebCryptoEngine } from './crypto';
import { TransferItem } from '../types';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
};

// 256 KB chunk size: Optimal balance between WebCrypto hardware saturation and memory efficiency
const CHUNK_SIZE = 256 * 1024;
const MAX_BUFFERED_AMOUNT = 8 * 1024 * 1024; // 8 MB backpressure threshold

export class WebRTCManager {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private channelReadyCallbacks: Map<string, (dc: RTCDataChannel) => void> = new Map();
  private binaryChunkListeners: Map<string, (chunkIndex: number, totalChunks: number, data: ArrayBuffer) => void> = new Map();

  constructor() {
    this.setupSignalingListeners();
  }

  private setupSignalingListeners() {
    signalingClient.on('SEND_OFFER', async (msg) => {
      const { sdpOffer, senderId, transferId } = msg.payload || {};
      if (!sdpOffer || !senderId) return;

      const pc = this.getOrCreatePeerConnection(senderId, transferId);
      await pc.setRemoteDescription(new RTCSessionDescription(sdpOffer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      signalingClient.send({
        type: 'SEND_ANSWER',
        targetId: senderId,
        payload: {
          transferId,
          sdpAnswer: answer,
        },
      });
    });

    signalingClient.on('SEND_ANSWER', async (msg) => {
      const { sdpAnswer, senderId } = msg.payload || {};
      if (!sdpAnswer || !senderId) return;

      const pc = this.peerConnections.get(senderId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(sdpAnswer));
      }
    });

    signalingClient.on('SEND_ICE_CANDIDATE', async (msg) => {
      const { candidate, senderId } = msg.payload || {};
      if (!candidate || !senderId) return;

      const pc = this.peerConnections.get(senderId);
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn('ICE candidate ignored:', e);
        }
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
            },
          });
        }
      };

      pc.ondatachannel = (event) => {
        const dc = event.channel;
        this.setupDataChannel(peerId, dc);
      };
    }
    return pc;
  }

  private setupDataChannel(peerId: string, dc: RTCDataChannel) {
    dc.binaryType = 'arraybuffer';
    this.dataChannels.set(peerId, dc);

    dc.onopen = () => {
      const cb = this.channelReadyCallbacks.get(peerId);
      if (cb) {
        cb(dc);
        this.channelReadyCallbacks.delete(peerId);
      }
    };

    dc.onmessage = (event: MessageEvent) => {
      if (event.data instanceof ArrayBuffer) {
        // Direct binary packet format: [4B chunkIndex][4B totalChunks][Raw Encrypted Payload]
        const view = new DataView(event.data);
        const chunkIndex = view.getUint32(0, true);
        const totalChunks = view.getUint32(4, true);
        const payload = event.data.slice(8);

        const listener = this.binaryChunkListeners.get(peerId) || this.binaryChunkListeners.get('*');
        if (listener) {
          listener(chunkIndex, totalChunks, payload);
        }
      }
    };
  }

  public setBinaryChunkListener(peerId: string, listener: (chunkIndex: number, totalChunks: number, data: ArrayBuffer) => void) {
    this.binaryChunkListeners.set(peerId, listener);
  }

  public removeBinaryChunkListener(peerId: string) {
    this.binaryChunkListeners.delete(peerId);
  }

  // Attempt direct P2P DataChannel connection with fast fallback
  public async establishDirectDataChannel(targetPeerId: string, transferId: string): Promise<RTCDataChannel | null> {
    return new Promise(async (resolve) => {
      try {
        const pc = this.getOrCreatePeerConnection(targetPeerId, transferId);
        const dc = pc.createDataChannel(`p2p-direct-${transferId}`, { ordered: true });
        this.setupDataChannel(targetPeerId, dc);

        const timeout = setTimeout(() => {
          resolve(null); // Fall back to high-speed relay if P2P takes > 2s
        }, 2000);

        if (dc.readyState === 'open') {
          clearTimeout(timeout);
          resolve(dc);
          return;
        }

        dc.onopen = () => {
          clearTimeout(timeout);
          resolve(dc);
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        signalingClient.send({
          type: 'SEND_OFFER',
          targetId: targetPeerId,
          payload: {
            transferId,
            sdpOffer: offer,
          },
        });
      } catch {
        resolve(null);
      }
    });
  }

  // Fast chunk-to-base64 converter
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    const len = bytes.length;
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < len; i += chunkSize) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, Math.min(i + chunkSize, len))));
    }
    return btoa(binary);
  }

  // Resolve accurate MIME type from filename
  public static getMimeType(fileName: string, mimeType?: string): string {
    if (mimeType && mimeType !== 'application/octet-stream' && mimeType !== '') {
      return mimeType;
    }
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'mp4': return 'video/mp4';
      case 'mkv': return 'video/x-matroska';
      case 'webm': return 'video/webm';
      case 'mov': return 'video/quicktime';
      case 'avi': return 'video/x-msvideo';
      case 'mp3': return 'audio/mpeg';
      case 'wav': return 'audio/wav';
      case 'aac': return 'audio/aac';
      case 'jpg': case 'jpeg': return 'image/jpeg';
      case 'png': return 'image/png';
      case 'gif': return 'image/gif';
      case 'pdf': return 'application/pdf';
      case 'zip': return 'application/zip';
      case 'rar': return 'application/x-rar-compressed';
      case 'tar': return 'application/x-tar';
      case 'gz': return 'application/gzip';
      case 'apk': return 'application/vnd.android.package-archive';
      case 'iso': return 'application/x-iso9660-image';
      default: return 'application/octet-stream';
    }
  }

  // Turbocharged AES-256-GCM Streaming Pipeline
  public async sendFile(
    file: File,
    targetPeerId: string,
    transfer: TransferItem,
    onProgress: (progress: number, speed: number, eta: number, chunks: number) => void,
    onComplete: (hash: string) => void,
    onError: (err: string) => void
  ) {
    try {
      // 1. Hardware AES-256 Key & Pre-Transfer SHA-256 Digest
      const aesKey = await WebCryptoEngine.generateAESKey();
      const keyHex = await WebCryptoEngine.exportKeyToHex(aesKey);
      const fileBuffer = await file.arrayBuffer();
      const fileHash = await WebCryptoEngine.computeHash(fileBuffer);

      const resolvedMime = WebRTCManager.getMimeType(file.name, file.type);
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

      // 2. Handshake Offer
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
        },
      });

      // 3. Wait for Recipient Acceptance
      const accepted = await new Promise<boolean>((resolve) => {
        let resolved = false;
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve(false);
          }
        }, 60000);

        const cleanupAccept = signalingClient.on('TRANSFER_ACCEPT', (msg) => {
          if (msg.payload?.transferId === transfer.id && !resolved) {
            resolved = true;
            clearTimeout(timeout);
            cleanupAccept();
            resolve(true);
          }
        });
        const cleanupReject = signalingClient.on('TRANSFER_REJECT', (msg) => {
          if (msg.payload?.transferId === transfer.id && !resolved) {
            resolved = true;
            clearTimeout(timeout);
            cleanupReject();
            resolve(false);
          }
        });
      });

      if (!accepted) {
        onError('Transfer was rejected by recipient or timed out');
        return;
      }

      // 4. Try Direct P2P DataChannel first for Maximum Line Speed
      const directChannel = await this.establishDirectDataChannel(targetPeerId, transfer.id);
      const isDirectP2P = directChannel !== null && directChannel.readyState === 'open';

      const startTime = Date.now();
      let bytesSent = 0;

      // 5. MAX SPEED STREAMING LOOP
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const slice = fileBuffer.slice(start, end);

        // Hardware-Accelerated AES-256-GCM Chunk Encryption (96-bit random IV + 128-bit Tag)
        const encrypted = await WebCryptoEngine.encryptChunk(aesKey, slice);

        if (isDirectP2P && directChannel.readyState === 'open') {
          // Direct WebRTC SCTP Binary Packet: [8B Header + Encrypted Payload]
          const packet = new Uint8Array(8 + encrypted.byteLength);
          const view = new DataView(packet.buffer);
          view.setUint32(0, i, true);
          view.setUint32(4, totalChunks, true);
          packet.set(new Uint8Array(encrypted), 8);

          // Flow control backpressure: pause if buffer is congested
          while (directChannel.bufferedAmount > MAX_BUFFERED_AMOUNT) {
            await new Promise((r) => setTimeout(r, 10));
          }

          directChannel.send(packet.buffer);
        } else {
          // High-Speed Relay Stream
          const base64Chunk = this.arrayBufferToBase64(encrypted);
          signalingClient.send({
            type: 'RELAY_DATA',
            targetId: targetPeerId,
            payload: {
              transferId: transfer.id,
              chunkIndex: i,
              totalChunks,
              data: base64Chunk,
            },
          });
        }

        bytesSent += slice.byteLength;
        const elapsedSec = (Date.now() - startTime) / 1000;
        const speedMBps = elapsedSec > 0 ? (bytesSent / (1024 * 1024)) / elapsedSec : 0;
        const remainingBytes = file.size - bytesSent;
        const etaSeconds = speedMBps > 0 ? remainingBytes / (speedMBps * 1024 * 1024) : 0;
        const progress = Math.min(100, Math.round((bytesSent / file.size) * 100));

        onProgress(progress, speedMBps, etaSeconds, i + 1);

        // Non-blocking micro-yield every 12 chunks
        if (i % 12 === 0) {
          await new Promise((r) => setTimeout(r, 0));
        }
      }

      // 6. Signal Transfer Complete
      await new Promise((r) => setTimeout(r, 120));
      signalingClient.send({
        type: 'TRANSFER_COMPLETE',
        targetId: targetPeerId,
        payload: {
          transferId: transfer.id,
          fileHash,
        },
      });

      onComplete(fileHash);
    } catch (e: any) {
      onError(e?.message || 'File transfer failed');
    }
  }
}

export const webrtcManager = new WebRTCManager();

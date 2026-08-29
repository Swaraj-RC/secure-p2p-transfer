import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HudBackground } from './components/HudBackground';
import { HeaderNav } from './components/HeaderNav';
import { HeroHome } from './components/HeroHome';
import { BottomHudBar } from './components/BottomHudBar';
import { SendModal } from './components/SendModal';
import { ReceiveModal } from './components/ReceiveModal';
import { ActiveTransferHUD } from './components/ActiveTransferHUD';
import { PeersDrawer } from './components/PeersDrawer';
import { HistoryDrawer } from './components/HistoryDrawer';
import { TechMatrixModal } from './components/TechMatrixModal';
import { signalingClient } from './services/signaling';

import { webrtcManager, WebRTCManager, CHUNK_SIZE } from './services/webrtc';
import { WebCryptoEngine } from './services/crypto';
import { OPFSEngine } from './services/opfs';
import { ResumableEngine } from './services/resumable';

import { soundFX } from './services/sound';
import { Device, TransferItem } from './types';
import './styles/hud.css';

// Ultra-fast native base64 decoder using browser C++ data-URL streaming
async function base64ToArrayBuffer(base64: string): Promise<ArrayBuffer> {
  const res = await fetch(`data:application/octet-stream;base64,${base64}`);
  return await res.arrayBuffer();
}


export const App: React.FC = () => {
  // State
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [peers, setPeers] = useState<Device[]>([]);
  const [currentDevice, setCurrentDevice] = useState<Device | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Modals & Drawers
  const [isSendOpen, setIsSendOpen] = useState<boolean>(false);
  const [isReceiveOpen, setIsReceiveOpen] = useState<boolean>(false);
  const [isPeersOpen, setIsPeersOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isMatrixOpen, setIsMatrixOpen] = useState<boolean>(false);


  // Transfers
  const [activeTransfer, setActiveTransfer] = useState<TransferItem | null>(null);
  const [incomingRequest, setIncomingRequest] = useState<any | null>(null);
  const [transferHistory, setTransferHistory] = useState<TransferItem[]>([]);

  // Batch transfer management refs
  const isBatchCancelledRef = useRef<boolean>(false);
  const autoAcceptedBatches = useRef<Set<string>>(new Set());
  const lastUiUpdateRef = useRef<number>(0);

  // Incoming chunk assembly buffers — NO chunks array to prevent RAM accumulation (OPFS handles disk storage)
  const receivingBuffers = useRef<Map<string, { meta: any; key: CryptoKey; receivedBytes: number; startTime: number; receivedCount: number; receivedSet: Set<number> }>>(
    new Map()
  );

  // Accept incoming transfer handler ref for auto-accept access
  const handleAcceptTransferRef = useRef<(req: any) => Promise<void>>();

  // 1. Initialize Signaling WebSocket
  useEffect(() => {
    signalingClient.connect(undefined, (connected) => {
      setIsConnected(connected);
    });

    // Listen for peer list updates
    const unbindList = signalingClient.on('DEVICE_LIST', (msg) => {
      if (msg.payload?.devices) {
        setPeers(msg.payload.devices);
      }
    });

    const unbindJoin = signalingClient.on('DEVICE_JOINED', (msg) => {
      if (msg.payload?.device) {
        const newPeer: Device = msg.payload.device;
        setPeers((prev) => [...prev.filter((p) => p.id !== newPeer.id), newPeer]);
        soundFX.playConnect();
      }
    });

    const unbindLeft = signalingClient.on('DEVICE_LEFT', (msg) => {
      if (msg.payload?.deviceId) {
        const leftId: string = msg.payload.deviceId;
        setPeers((prev) => prev.filter((p) => p.id !== leftId));
      }
    });

    const unbindReg = signalingClient.on('REGISTER', (msg) => {
      if (msg.payload?.device) {
        setCurrentDevice(msg.payload.device);
      }
    });

    // 2. Incoming Transfer Offer — AUTO-POPUP notification or AUTO-ACCEPT if part of accepted batch
    const unbindTransferReq = signalingClient.on('TRANSFER_REQUEST', (msg) => {
      if (msg.payload) {
        const request = {
          ...msg.payload,
          senderId: msg.senderId,
        };

        // If this transfer is part of a batch that was already approved by user, auto-accept seamlessly!
        if (request.batchId && autoAcceptedBatches.current.has(request.batchId) && handleAcceptTransferRef.current) {
          handleAcceptTransferRef.current(request);
          return;
        }

        setIncomingRequest(request);
        setIsReceiveOpen(true); // Force open the receive modal for new session
        soundFX.playSuccess();  // Alert chime
      }
    });

    // 3A. Incoming Direct WebRTC Binary SCTP Chunk Stream (MAX Line Speed)
    webrtcManager.setBinaryChunkListener('*', async (chunkIndex, _totalChunks, encryptedData) => {
      for (const [tId, session] of receivingBuffers.current.entries()) {
        // Deduplicate using Set — no ArrayBuffer stored in RAM
        if (session.receivedSet.has(chunkIndex)) continue;
        try {
          const decryptedChunk = await WebCryptoEngine.decryptChunk(session.key, encryptedData);
          session.receivedSet.add(chunkIndex);
          session.receivedBytes += decryptedChunk.byteLength;
          session.receivedCount++;

          const chunkSize = session.meta.chunkSize || CHUNK_SIZE;

          // Stream directly to physical disk via OPFS (Zero-RAM Memory Protection)
          OPFSEngine.writeChunk(tId, chunkIndex * chunkSize, decryptedChunk);

          // Batched IndexedDB checkpoint — every 50 chunks or at completion
          if (session.receivedCount % 50 === 0 || session.receivedCount >= _totalChunks) {
            ResumableEngine.recordChunk(tId, chunkIndex, _totalChunks, session.meta);
          }

          const elapsedSec = (Date.now() - session.startTime) / 1000;
          const speedMBps = elapsedSec > 0 ? session.receivedBytes / (1024 * 1024) / elapsedSec : 0;
          const progress = Math.min(100, Math.round((session.receivedBytes / session.meta.fileSize) * 100));
          const remainingBytes = session.meta.fileSize - session.receivedBytes;
          const etaSeconds = speedMBps > 0 ? remainingBytes / (speedMBps * 1024 * 1024) : 0;

          // Throttled UI update — max 60fps
          const now = Date.now();
          if (now - lastUiUpdateRef.current > 40 || session.receivedCount >= _totalChunks) {
            lastUiUpdateRef.current = now;
            setActiveTransfer((prev) => {
              if (!prev || prev.id !== tId) return prev;
              return { ...prev, progress, bytesTransferred: session.receivedBytes, speedMBps, etaSeconds, chunksCompleted: session.receivedCount };
            });
          }
        } catch (err) {
          console.error('Binary chunk decrypt error:', err);
        }
      }
    });

    // 3B. Incoming Relayed Encrypted Chunk Stream (Fallback)
    const unbindRelay = signalingClient.on('RELAY_DATA', async (msg) => {
      const { transferId, chunkIndex, totalChunks, data } = msg.payload || {};
      if (!transferId || data === undefined) return;

      const session = receivingBuffers.current.get(transferId);
      if (!session) return;

      if (session.receivedSet.has(chunkIndex)) return; // deduplicate

      try {
        const rawEncrypted = await base64ToArrayBuffer(data);
        const decryptedChunk = await WebCryptoEngine.decryptChunk(session.key, rawEncrypted);

        session.receivedSet.add(chunkIndex);
        session.receivedBytes += decryptedChunk.byteLength;
        session.receivedCount++;

        const chunkSize = session.meta.chunkSize || CHUNK_SIZE;
        OPFSEngine.writeChunk(transferId, chunkIndex * chunkSize, decryptedChunk);

        if (session.receivedCount % 50 === 0 || session.receivedCount >= totalChunks) {
          ResumableEngine.recordChunk(transferId, chunkIndex, totalChunks, session.meta);
        }

        const elapsedSec = (Date.now() - session.startTime) / 1000;
        const speedMBps = elapsedSec > 0 ? session.receivedBytes / (1024 * 1024) / elapsedSec : 0;
        const progress = Math.min(100, Math.round((session.receivedBytes / session.meta.fileSize) * 100));
        const remainingBytes = session.meta.fileSize - session.receivedBytes;
        const etaSeconds = speedMBps > 0 ? remainingBytes / (speedMBps * 1024 * 1024) : 0;

        const now = Date.now();
        if (now - lastUiUpdateRef.current > 40 || session.receivedCount >= totalChunks) {
          lastUiUpdateRef.current = now;
          setActiveTransfer((prev) => {
            if (!prev || prev.id !== transferId) return prev;
            return { ...prev, progress, bytesTransferred: session.receivedBytes, speedMBps, etaSeconds, chunksCompleted: session.receivedCount };
          });
        }
      } catch (err) {
        console.error('Relay chunk decrypt error #', chunkIndex, err);
      }
    });


    // 4. Transfer Complete signal
    const unbindComplete = signalingClient.on('TRANSFER_COMPLETE', async (msg) => {
      const { transferId, fileHash: senderHash } = msg.payload || {};
      if (!transferId) return;

      const session = receivingBuffers.current.get(transferId);
      if (!session) return;

      // Wait up to 5s for any in-flight chunks that haven't arrived yet
      const waitForInFlight = async () => {
        for (let i = 0; i < 100; i++) {
          if (session.receivedCount >= session.meta.totalChunks) break;
          await new Promise((r) => setTimeout(r, 50));
        }
      };
      await waitForInFlight();

      const finalizeAssembly = async () => {
        try {
          const resolvedMime = WebRTCManager.getMimeType(session.meta.fileName, session.meta.mimeType);
          let blobUrl: string | undefined;

          // Always use OPFS — never fall back to RAM Blob assembly for large files
          const opfsResult = await OPFSEngine.finalizeBlob(transferId, resolvedMime);
          if (opfsResult) {
            blobUrl = opfsResult.blobUrl;
          } else {
            // OPFS not available (e.g. insecure context) — graceful degradation message
            console.warn('[OPFS] Finalize failed, file may be incomplete');
            return;
          }


          // Instant Zero-Delay Auto-Download to user's disk!
          try {
            const dlAnchor = document.createElement('a');
            dlAnchor.href = blobUrl;
            dlAnchor.setAttribute('download', session.meta.fileName || 'downloaded_file');
            document.body.appendChild(dlAnchor);
            dlAnchor.click();
            setTimeout(() => {
              if (document.body.contains(dlAnchor)) {
                document.body.removeChild(dlAnchor);
              }
            }, 1500);
          } catch (dlErr) {
            console.warn('Auto download trigger:', dlErr);
          }

          const updatedItem: TransferItem = {
            id: transferId,
            direction: 'receive',
            fileName: session.meta.fileName,
            fileSize: session.meta.fileSize,
            mimeType: resolvedMime,
            peerId: session.meta.senderId,
            peerName: `Node-${session.meta.senderId.slice(0, 6)}`,
            status: 'completed',
            progress: 100,
            bytesTransferred: session.meta.fileSize,
            totalBytes: session.meta.fileSize,
            speedMBps: 0,
            etaSeconds: 0,
            chunksCompleted: session.meta.totalChunks,
            totalChunks: session.meta.totalChunks,
            fileHash: senderHash,
            startedAt: session.startTime,
            completedAt: Date.now(),
            blobUrl,
            batchId: session.meta.batchId,
            batchIndex: session.meta.batchIndex,
            batchTotal: session.meta.batchTotal,
          };

          setActiveTransfer(updatedItem);
          setTransferHistory((prev) => [updatedItem, ...prev]);
          soundFX.playSuccess();
          receivingBuffers.current.delete(transferId);
          ResumableEngine.clearCheckpoint(transferId);
        } catch (err) {
          console.error('Error assembling completed file:', err);
        }
      };

      finalizeAssembly();
    });

    // 5. Transfer Cancel signal from remote peer
    const unbindCancel = signalingClient.on('TRANSFER_CANCEL', (msg) => {
      const { transferId } = msg.payload || {};
      if (!transferId) return;

      if (receivingBuffers.current.has(transferId)) {
        receivingBuffers.current.delete(transferId);
      }
      webrtcManager.cancelTransfer(transferId);
      OPFSEngine.cleanup(transferId);

      setActiveTransfer((prev) => {
        if (!prev || prev.id !== transferId) return prev;
        return {
          ...prev,
          status: 'cancelled',
          error: 'Transfer was cancelled by remote peer.',
        };
      });
      soundFX.playClick();
    });

    return () => {
      unbindList();
      unbindJoin();
      unbindLeft();
      unbindReg();
      unbindTransferReq();
      unbindRelay();
      unbindComplete();
      unbindCancel();
    };
  }, []);

  // Accept incoming transfer
  const handleAcceptTransfer = useCallback(async (req: any) => {
    if (req.batchId) {
      autoAcceptedBatches.current.add(req.batchId);
    }

    const key = await WebCryptoEngine.importKeyFromHex(req.encryptionKey);

    // Initialize Direct-to-Disk OPFS file handle (zero RAM accumulation)
    await OPFSEngine.initFile(req.transferId, req.fileName);

    receivingBuffers.current.set(req.transferId, {
      meta: req,
      key,
      receivedBytes: 0,
      startTime: Date.now(),
      receivedCount: 0,
      receivedSet: new Set<number>(), // lightweight dedup set — no ArrayBuffer storage
    });

    const item: TransferItem = {
      id: req.transferId,
      direction: 'receive',
      fileName: req.fileName,
      fileSize: req.fileSize,
      peerId: req.senderId,
      peerName: `Node-${req.senderId.slice(0, 6)}`,
      status: 'transferring',
      progress: 0,
      bytesTransferred: 0,
      totalBytes: req.fileSize,
      speedMBps: 0,
      etaSeconds: 0,
      chunksCompleted: 0,
      totalChunks: req.totalChunks,
      fileHash: req.fileHash,
      startedAt: Date.now(),
      batchId: req.batchId,
      batchIndex: req.batchIndex,
      batchTotal: req.batchTotal,
    };

    setActiveTransfer(item);
    setIncomingRequest(null);
    setIsReceiveOpen(false);

    signalingClient.send({
      type: 'TRANSFER_ACCEPT',
      targetId: req.senderId,
      payload: {
        transferId: req.transferId,
      },
    });
  }, []);

  handleAcceptTransferRef.current = handleAcceptTransfer;

  const handleRejectTransfer = useCallback((req: any) => {
    if (req.batchId) {
      autoAcceptedBatches.current.delete(req.batchId);
    }
    signalingClient.send({
      type: 'TRANSFER_REJECT',
      targetId: req.senderId,
      payload: {
        transferId: req.transferId,
      },
    });
    setIncomingRequest(null);
  }, []);

  // Start Sending Single or Multiple Files (Sequential Continuous Pipeline)
  const handleStartSend = useCallback(async (files: File[], targetPeerId: string) => {
    if (!files || files.length === 0) return;

    isBatchCancelledRef.current = false;

    const targetPeer = peers.find(
      (p) =>
        p.id === targetPeerId ||
        p.ipAddress === targetPeerId ||
        p.localIp === targetPeerId ||
        p.name.toLowerCase() === targetPeerId.toLowerCase()
    );
    const effectivePeerId = targetPeer ? targetPeer.id : targetPeerId;
    const peerDisplayName = targetPeer
      ? targetPeer.name
      : targetPeerId.includes('.') || targetPeerId.includes(':')
      ? `IP: ${targetPeerId}`
      : `Node-${targetPeerId.slice(0, 8)}`;

    const batchId = `btx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const totalFiles = files.length;

    for (let i = 0; i < totalFiles; i++) {
      if (isBatchCancelledRef.current) break;

      const file = files[i];
      const transferId = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      const item: TransferItem = {
        id: transferId,
        direction: 'send',
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        peerId: effectivePeerId,
        peerName: peerDisplayName,
        status: 'offering',
        progress: 0,
        bytesTransferred: 0,
        totalBytes: file.size,
        speedMBps: 0,
        etaSeconds: 0,
        chunksCompleted: 0,
        totalChunks: Math.ceil(file.size / (64 * 1024)),
        startedAt: Date.now(),
        batchId,
        batchIndex: i + 1,
        batchTotal: totalFiles,
      };

      setActiveTransfer(item);

      await new Promise<void>((resolveFile) => {
        webrtcManager.sendFile(
          file,
          effectivePeerId,
          item,
          (progress, speedMBps, etaSeconds, chunksCompleted) => {
            setActiveTransfer((prev) => {
              if (!prev || prev.id !== transferId) return prev;
              return {
                ...prev,
                status: 'transferring',
                progress,
                speedMBps,
                etaSeconds,
                chunksCompleted,
                bytesTransferred: Math.round((progress / 100) * file.size),
              };
            });
          },
          (fileHash) => {
            const completedItem: TransferItem = {
              ...item,
              status: 'completed',
              progress: 100,
              bytesTransferred: file.size,
              speedMBps: 0,
              etaSeconds: 0,
              fileHash,
              completedAt: Date.now(),
            };
            setActiveTransfer(completedItem);
            setTransferHistory((prev) => [completedItem, ...prev]);
            soundFX.playSuccess();
            resolveFile();
          },
          (error) => {
            setActiveTransfer((prev) => (prev ? { ...prev, status: 'failed', error } : null));
            resolveFile();
          },
          { batchId, batchIndex: i + 1, batchTotal: totalFiles }
        );
      });

      // Brief micro-pause between files to allow receiver file stream flush
      if (i < totalFiles - 1 && !isBatchCancelledRef.current) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
  }, [peers]);

  // Cancel active transfer (initiated by user)
  const handleCancelActiveTransfer = useCallback(() => {
    isBatchCancelledRef.current = true;
    if (!activeTransfer) return;
    const transferId = activeTransfer.id;
    const targetPeerId = activeTransfer.peerId;

    webrtcManager.cancelTransfer(transferId);

    if (receivingBuffers.current.has(transferId)) {
      receivingBuffers.current.delete(transferId);
    }

    if (targetPeerId) {
      signalingClient.send({
        type: 'TRANSFER_CANCEL',
        targetId: targetPeerId,
        payload: {
          transferId,
        },
      });
    }

    setActiveTransfer((prev) => {
      if (!prev || prev.id !== transferId) return prev;
      return {
        ...prev,
        status: 'cancelled',
        error: 'Transfer cancelled by user.',
      };
    });
    soundFX.playClick();
  }, [activeTransfer]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundFX.setEnabled(next);
    if (next) soundFX.playClick();
  };

  return (
    <div className="hud-container">
      {/* Sci-Fi Dot Matrix & Coordinates */}
      <HudBackground />

      {/* Top Header Navbar */}
      <HeaderNav
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenPeers={() => setIsPeersOpen(true)}
        onOpenMatrix={() => setIsMatrixOpen(true)}
        peerCount={peers.length}
      />


      {/* Center Hero matching the user's reference image */}
      <HeroHome
        currentDevice={currentDevice}
        onSendClick={() => setIsSendOpen(true)}
        onReceiveClick={() => setIsReceiveOpen(true)}
      />


      {/* Bottom Technical Status Bar */}
      <BottomHudBar
        status={
          isConnected
            ? activeTransfer && activeTransfer.status === 'transferring'
              ? 'TRANSFERRING DATA...'
              : activeTransfer && activeTransfer.status === 'offering'
                ? 'WAITING FOR PEER ACCEPT...'
                : 'READY TO CONNECT'
            : 'CONNECTING MESH...'
        }
        isOnline={isConnected}
        peerCount={peers.length}
        onReticleClick={() => setIsPeersOpen(true)}
      />

      {/* Modals & Drawers */}
      <SendModal
        isOpen={isSendOpen}
        onClose={() => setIsSendOpen(false)}
        peers={peers}
        onStartSend={handleStartSend}
      />

      <ReceiveModal
        isOpen={isReceiveOpen}
        onClose={() => setIsReceiveOpen(false)}
        currentDevice={currentDevice}
        incomingRequest={incomingRequest}
        onAcceptTransfer={handleAcceptTransfer}
        onRejectTransfer={handleRejectTransfer}
      />

      <ActiveTransferHUD
        transfer={activeTransfer}
        onDismiss={() => setActiveTransfer(null)}
        onCancel={handleCancelActiveTransfer}
      />

      <PeersDrawer
        isOpen={isPeersOpen}
        onClose={() => setIsPeersOpen(false)}
        peers={peers}
        onSelectPeer={(peer) => {
          setIsPeersOpen(false);
          setIsSendOpen(true);
        }}
      />

      <TechMatrixModal
        isOpen={isMatrixOpen}
        onClose={() => setIsMatrixOpen(false)}
      />

      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={transferHistory}
      />
    </div>
  );
};

export default App;

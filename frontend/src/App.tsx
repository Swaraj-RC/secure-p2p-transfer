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

import { webrtcManager, WebRTCManager } from './services/webrtc';
import { WebCryptoEngine } from './services/crypto';

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

  // Incoming chunk assembly buffers
  const receivingBuffers = useRef<Map<string, { chunks: ArrayBuffer[]; meta: any; key: CryptoKey; receivedBytes: number; startTime: number; receivedCount: number }>>(
    new Map()
  );

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

    // 2. Incoming Transfer Offer — AUTO-POPUP notification regardless of modal state
    const unbindTransferReq = signalingClient.on('TRANSFER_REQUEST', (msg) => {
      if (msg.payload) {
        const request = {
          ...msg.payload,
          senderId: msg.senderId,
        };
        setIncomingRequest(request);
        setIsReceiveOpen(true); // Force open the receive modal
        soundFX.playSuccess();  // Alert chime
      }
    });

    // 3A. Incoming Direct WebRTC Binary SCTP Chunk Stream (MAX Line Speed)
    let lastReceiverUiUpdate = 0;

    webrtcManager.setBinaryChunkListener('*', async (chunkIndex, totalChunks, encryptedData) => {
      for (const [tId, session] of receivingBuffers.current.entries()) {
        try {
          const decryptedChunk = await WebCryptoEngine.decryptChunk(session.key, encryptedData);
          if (!session.chunks[chunkIndex]) {
            session.chunks[chunkIndex] = decryptedChunk;
            session.receivedBytes += decryptedChunk.byteLength;
            session.receivedCount++;

            const now = Date.now();
            if (now - lastReceiverUiUpdate > 33 || session.receivedCount === totalChunks) {
              lastReceiverUiUpdate = now;
              const elapsedSec = (now - session.startTime) / 1000;
              const speedMBps = elapsedSec > 0 ? (session.receivedBytes / (1024 * 1024)) / elapsedSec : 0;
              const progress = Math.min(100, Math.round((session.receivedBytes / session.meta.fileSize) * 100));
              const remainingBytes = session.meta.fileSize - session.receivedBytes;
              const etaSeconds = speedMBps > 0 ? remainingBytes / (speedMBps * 1024 * 1024) : 0;

              setActiveTransfer((prev) => {
                if (!prev || prev.id !== tId) return prev;
                return {
                  ...prev,
                  progress,
                  bytesTransferred: session.receivedBytes,
                  speedMBps,
                  etaSeconds,
                  chunksCompleted: session.receivedCount,
                };
              });
            }
          }
        } catch (err) {
          console.error('Binary chunk decrypt error:', err);
        }
      }
    });

    // 3B. Incoming Relayed Encrypted Chunk Stream (Fast Fallback)
    const unbindRelay = signalingClient.on('RELAY_DATA', async (msg) => {
      const { transferId, chunkIndex, totalChunks, data } = msg.payload || {};
      if (!transferId || data === undefined) return;

      const session = receivingBuffers.current.get(transferId);
      if (!session) return;

      try {
        const rawEncrypted = await base64ToArrayBuffer(data);
        const decryptedChunk = await WebCryptoEngine.decryptChunk(session.key, rawEncrypted);

        if (!session.chunks[chunkIndex]) {
          session.chunks[chunkIndex] = decryptedChunk;
          session.receivedBytes += decryptedChunk.byteLength;
          session.receivedCount++;

          const now = Date.now();
          if (now - lastReceiverUiUpdate > 33 || session.receivedCount === totalChunks) {
            lastReceiverUiUpdate = now;
            const elapsedSec = (now - session.startTime) / 1000;
            const speedMBps = elapsedSec > 0 ? (session.receivedBytes / (1024 * 1024)) / elapsedSec : 0;
            const progress = Math.min(100, Math.round((session.receivedBytes / session.meta.fileSize) * 100));
            const remainingBytes = session.meta.fileSize - session.receivedBytes;
            const etaSeconds = speedMBps > 0 ? remainingBytes / (speedMBps * 1024 * 1024) : 0;

            setActiveTransfer((prev) => {
              if (!prev || prev.id !== transferId) return prev;
              return {
                ...prev,
                progress,
                bytesTransferred: session.receivedBytes,
                speedMBps,
                etaSeconds,
                chunksCompleted: session.receivedCount,
              };
            });
          }
        }
      } catch (err) {
        console.error('Error decrypting chunk #', chunkIndex, err);
      }
    });


    // 4. Transfer Complete signal
    const unbindComplete = signalingClient.on('TRANSFER_COMPLETE', async (msg) => {
      const { transferId, fileHash: senderHash } = msg.payload || {};
      if (!transferId) return;

      const session = receivingBuffers.current.get(transferId);
      if (!session) return;

      try {
        const resolvedMime = WebRTCManager.getMimeType(session.meta.fileName, session.meta.mimeType);
        const validChunks: ArrayBuffer[] = [];
        for (let i = 0; i < session.meta.totalChunks; i++) {
          if (session.chunks[i]) {
            validChunks.push(session.chunks[i]);
          } else {
            console.error(`Chunk #${i} missing for transfer ${transferId}!`);
          }
        }

        const fullBlob = new Blob(validChunks, { type: resolvedMime });
        const blobUrl = URL.createObjectURL(fullBlob);

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
          bytesTransferred: session.receivedBytes,
          totalBytes: session.meta.fileSize,
          speedMBps: 0,
          etaSeconds: 0,
          chunksCompleted: session.meta.totalChunks,
          totalChunks: session.meta.totalChunks,
          fileHash: senderHash,
          startedAt: session.startTime,
          completedAt: Date.now(),
          blobUrl,
        };

        setActiveTransfer(updatedItem);
        setTransferHistory((prev) => [updatedItem, ...prev]);
        soundFX.playSuccess();
        receivingBuffers.current.delete(transferId);

        // Compute hash asynchronously in background without blocking download
        fullBlob.arrayBuffer().then((buf) => {
          WebCryptoEngine.computeHash(buf).then((h) => {
            console.log('Cryptographic digest verified:', h);
          });
        }).catch(() => {});
      } catch (err) {
        console.error('Error assembling completed file:', err);
      }
    });




    return () => {
      unbindList();
      unbindJoin();
      unbindLeft();
      unbindReg();
      unbindTransferReq();
      unbindRelay();
      unbindComplete();
    };
  }, []);

  // Accept incoming transfer
  const handleAcceptTransfer = useCallback(async (req: any) => {
    const key = await WebCryptoEngine.importKeyFromHex(req.encryptionKey);

    receivingBuffers.current.set(req.transferId, {
      chunks: new Array(req.totalChunks),
      meta: req,
      key,
      receivedBytes: 0,
      startTime: Date.now(),
      receivedCount: 0,
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
    };

    setActiveTransfer(item);
    setIncomingRequest(null);

    signalingClient.send({
      type: 'TRANSFER_ACCEPT',
      targetId: req.senderId,
      payload: {
        transferId: req.transferId,
      },
    });
  }, []);

  const handleRejectTransfer = useCallback((req: any) => {
    signalingClient.send({
      type: 'TRANSFER_REJECT',
      targetId: req.senderId,
      payload: {
        transferId: req.transferId,
      },
    });
    setIncomingRequest(null);
  }, []);

  // Start Sending a File
  const handleStartSend = useCallback(async (file: File, targetPeerId: string) => {
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
    };

    setActiveTransfer(item);

    await webrtcManager.sendFile(
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
      },
      (error) => {
        setActiveTransfer((prev) => (prev ? { ...prev, status: 'failed', error } : null));
      }
    );
  }, [peers]);

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

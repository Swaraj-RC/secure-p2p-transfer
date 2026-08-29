import React from 'react';
import { DownloadCloud, Radio, CheckCircle, X, ShieldAlert } from 'lucide-react';
import { Device } from '../types';
import { soundFX } from '../services/sound';

interface IncomingRequest {
  transferId: string;
  senderId: string;
  senderName?: string;
  fileName: string;
  fileSize: number;
  fileHash: string;
  totalChunks: number;
  encryptionKey: string;
  batchId?: string;
  batchIndex?: number;
  batchTotal?: number;
}

interface ReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDevice: Device | null;
  incomingRequest: IncomingRequest | null;
  onAcceptTransfer: (req: IncomingRequest) => void;
  onRejectTransfer: (req: IncomingRequest) => void;
}

export const ReceiveModal: React.FC<ReceiveModalProps> = ({
  isOpen,
  onClose,
  currentDevice,
  incomingRequest,
  onAcceptTransfer,
  onRejectTransfer,
}) => {
  if (!isOpen) return null;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <div className="hud-modal-overlay" onClick={onClose}>
      <div className="hud-modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="hud-corner-tl" />
        <div className="hud-corner-tr" />
        <div className="hud-corner-bl" />
        <div className="hud-corner-br" />

        <div className="hud-modal-header">
          <div className="hud-modal-title">
            <Radio size={20} className="hud-status-active" />
            <span>BEACON RADAR // RECEIVE MODE</span>
          </div>
          <button className="hud-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {incomingRequest ? (
          /* Incoming File Offer Prompt */
          <div
            style={{
              padding: '1.5rem',
              background: 'rgba(255,107,0,0.08)',
              border: '1px solid var(--hud-orange)',
              textAlign: 'center',
            }}
          >
            <ShieldAlert size={44} color="var(--hud-orange)" style={{ margin: '0 auto 0.75rem' }} />
            <div style={{ color: 'var(--hud-orange)', fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.1em' }}>
              {incomingRequest.batchTotal && incomingRequest.batchTotal > 1
                ? `INCOMING BATCH TRANSMISSION (FILE ${incomingRequest.batchIndex || 1} OF ${incomingRequest.batchTotal})`
                : 'INCOMING FILE TRANSMISSION DETECTED!'}
            </div>
            <div style={{ color: '#fff', fontSize: '1.15rem', fontWeight: 600, marginTop: '0.5rem' }}>
              {incomingRequest.fileName}
            </div>
            <div style={{ color: 'var(--hud-text-dim)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              SIZE: {formatFileSize(incomingRequest.fileSize)} • CHUNKS: {incomingRequest.totalChunks}
            </div>
            <div style={{ color: 'var(--hud-text-dim)', fontSize: '0.75rem', marginTop: '0.5rem', wordBreak: 'break-all' }}>
              SHA-256: {incomingRequest.fileHash}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '1.75rem' }}>
              <button
                className="hud-btn"
                onClick={() => {
                  soundFX.playClick();
                  onRejectTransfer(incomingRequest);
                }}
                style={{ padding: '0.85rem 1.75rem', fontSize: '0.85rem', borderColor: 'var(--hud-red)' }}
              >
                REJECT
              </button>
              <button
                className="hud-btn hud-btn-orange"
                onClick={() => {
                  soundFX.playConnect();
                  onAcceptTransfer(incomingRequest);
                  onClose();
                }}
                style={{ padding: '0.85rem 2.25rem', fontSize: '0.85rem' }}
              >
                ACCEPT & DOWNLOAD ➔
              </button>
            </div>
          </div>
        ) : (
          /* Radar Listening State */
          <div>
            <div
              style={{
                padding: '2.5rem 1.5rem',
                border: '1px solid var(--hud-orange-dim)',
                background: 'rgba(0,0,0,0.4)',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  border: '2px solid var(--hud-orange)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 25px rgba(255,107,0,0.3)',
                  animation: 'pulse 1.5s infinite alternate',
                }}
              >
                <DownloadCloud size={32} color="var(--hud-orange)" />
              </div>

              <div style={{ color: '#fff', fontSize: '1rem', fontWeight: 600, letterSpacing: '0.1em' }}>
                DEVICE BEACON BROADCASTING ONLINE
              </div>

              <div style={{ color: 'var(--hud-text-dim)', fontSize: '0.8rem', maxWidth: '420px', lineHeight: '1.4' }}>
                Other active peers on this network can send files directly to your device. Keep this window open or in background.
              </div>

              {currentDevice && (
                <div
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.6rem 1rem',
                    background: 'rgba(255,107,0,0.06)',
                    border: '1px solid rgba(255,107,0,0.2)',
                    fontSize: '0.75rem',
                    color: 'var(--hud-orange)',
                  }}
                >
                  YOUR NODE NAME: <strong>{currentDevice.name}</strong> &nbsp; // &nbsp; ID: {currentDevice.id.slice(0, 10)}...
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="hud-btn" onClick={onClose} style={{ padding: '0.75rem 1.75rem', fontSize: '0.8rem' }}>
                CLOSE RADAR
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

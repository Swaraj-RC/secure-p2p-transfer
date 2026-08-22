import React from 'react';
import { TransferItem } from '../types';
import { Activity, ShieldCheck, Download, AlertTriangle, CheckCircle } from 'lucide-react';
import { soundFX } from '../services/sound';

interface ActiveTransferHUDProps {
  transfer: TransferItem | null;
  onDismiss: () => void;
}

export const ActiveTransferHUD: React.FC<ActiveTransferHUDProps> = ({
  transfer,
  onDismiss,
}) => {
  if (!transfer) return null;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const isComplete = transfer.status === 'completed';
  const isFailed = transfer.status === 'failed' || transfer.status === 'cancelled';

  return (
    <div className="hud-modal-overlay">
      <div className="hud-modal-panel" style={{ maxWidth: '640px' }}>
        <div className="hud-corner-tl" />
        <div className="hud-corner-tr" />
        <div className="hud-corner-bl" />
        <div className="hud-corner-br" />

        {/* Modal Header */}
        <div className="hud-modal-header">
          <div className="hud-modal-title">
            <Activity size={20} className="hud-status-active" />
            <span>
              {transfer.direction === 'send' ? 'TRANSMITTING CHUNKS' : 'RECEIVING CHUNKS'} //{' '}
              {transfer.status.toUpperCase()}
            </span>
          </div>
          {isComplete || isFailed ? (
            <button className="hud-close-btn" onClick={onDismiss}>
              DISMISS
            </button>
          ) : null}
        </div>

        {/* File & Peer Info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: '#fff', fontSize: '1.15rem', fontWeight: 600 }}>
              {transfer.fileName}
            </div>
            <div style={{ color: 'var(--hud-text-dim)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
              TARGET NODE: {transfer.peerName.startsWith('IP:') ? `Node-${transfer.peerId.slice(0, 6).toUpperCase()}` : transfer.peerName || `Node-${transfer.peerId.slice(0, 6)}`}
            </div>

          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: 'var(--hud-orange)', fontSize: '1.25rem', fontWeight: 700 }}>
              {transfer.progress}%
            </div>
            <div style={{ color: 'var(--hud-text-dim)', fontSize: '0.8rem' }}>
              {formatFileSize(transfer.bytesTransferred)} / {formatFileSize(transfer.totalBytes)}
            </div>
          </div>
        </div>

        {/* Linear Progress Bar */}
        <div className="hud-progress-track">
          <div className="hud-progress-fill" style={{ width: `${transfer.progress}%` }} />
        </div>

        {/* Real-Time Metrics HUD */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1rem',
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid var(--hud-orange-dim)',
            padding: '0.85rem 1rem',
            fontSize: '0.75rem',
            textAlign: 'center',
          }}
        >
          <div>
            <div style={{ color: 'var(--hud-text-dim)' }}>SPEED</div>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem', marginTop: '0.2rem' }}>
              {transfer.speedMBps.toFixed(2)} MB/s
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--hud-text-dim)' }}>ETA</div>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem', marginTop: '0.2rem' }}>
              {isComplete ? '0s' : `${Math.ceil(transfer.etaSeconds)}s`}
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--hud-text-dim)' }}>CHUNKS</div>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem', marginTop: '0.2rem' }}>
              {transfer.chunksCompleted} / {transfer.totalChunks}
            </div>
          </div>
        </div>

        {/* Chunk Matrix Bitfield Visualizer */}
        <div style={{ marginTop: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--hud-text-dim)', marginBottom: '0.35rem' }}>
            CHUNK ASSEMBLY BITFIELD:
          </div>
          <div className="hud-chunk-matrix">
            {Array.from({ length: Math.min(transfer.totalChunks || 1, 100) }).map((_, idx) => {
              const isChunkDone = idx < transfer.chunksCompleted;
              const isChunkCurrent = idx === transfer.chunksCompleted && !isComplete;
              return (
                <div
                  key={idx}
                  className={`hud-chunk-bit ${
                    isChunkDone ? 'completed' : isChunkCurrent ? 'transferring' : ''
                  }`}
                  title={`Chunk #${idx + 1}`}
                />
              );
            })}
          </div>
        </div>

        {/* Cryptographic SHA-256 Verification Result */}
        {isComplete && (
          <div
            style={{
              marginTop: '1.25rem',
              padding: '0.85rem 1rem',
              background: 'rgba(0, 255, 136, 0.08)',
              border: '1px solid var(--hud-green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--hud-green)', fontSize: '0.85rem' }}>
              <CheckCircle size={18} />
              <span>SHA-256 CHECKSUM VERIFIED & AUTHENTICATED!</span>
            </div>

            {transfer.blobUrl && (
              <a
                href={transfer.blobUrl}
                download={transfer.fileName}
                className="hud-btn hud-btn-orange"
                onClick={() => soundFX.playClick()}
                style={{ padding: '0.4rem 1rem', fontSize: '0.75rem', textDecoration: 'none' }}
              >
                <Download size={14} /> SAVE FILE
              </a>
            )}
          </div>
        )}

        {isFailed && (
          <div
            style={{
              marginTop: '1.25rem',
              padding: '0.85rem 1rem',
              background: 'rgba(255, 51, 68, 0.08)',
              border: '1px solid var(--hud-red)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              color: 'var(--hud-red)',
              fontSize: '0.85rem',
            }}
          >
            <AlertTriangle size={18} />
            <span>TRANSFER FAILED: {transfer.error || 'Connection broken or stream timed out.'}</span>
          </div>
        )}

        {/* Bottom Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          {isComplete || isFailed ? (
            <button
              className="hud-btn hud-btn-orange"
              onClick={onDismiss}
              style={{ padding: '0.65rem 1.75rem', fontSize: '0.8rem' }}
            >
              CLOSE
            </button>
          ) : (
            <div style={{ color: 'var(--hud-orange)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={14} /> AES-256-GCM ENCRYPTED IN-FLIGHT
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

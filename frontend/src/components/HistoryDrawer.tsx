import React from 'react';
import { TransferItem } from '../types';
import { History, X, CheckCircle, ArrowUpRight, ArrowDownLeft, AlertCircle } from 'lucide-react';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: TransferItem[];
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
}) => {
  if (!isOpen) return null;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="hud-modal-overlay" onClick={onClose}>
      <div className="hud-modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
        <div className="hud-corner-tl" />
        <div className="hud-corner-tr" />
        <div className="hud-corner-bl" />
        <div className="hud-corner-br" />

        <div className="hud-modal-header">
          <div className="hud-modal-title">
            <History size={20} />
            <span>TRANSFER AUDIT LOGS ({history.length})</span>
          </div>
          <button className="hud-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {history.length === 0 ? (
          <div
            style={{
              padding: '2.5rem 1rem',
              textAlign: 'center',
              color: 'var(--hud-text-dim)',
              fontSize: '0.85rem',
              border: '1px solid rgba(255,107,0,0.15)',
              background: 'rgba(0,0,0,0.3)',
            }}
          >
            NO TRANSFERS RECORDED IN CURRENT SESSION.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto' }}>
            {history.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.85rem 1rem',
                  border: '1px solid rgba(255,107,0,0.15)',
                  background: 'rgba(255,255,255,0.02)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {item.direction === 'send' ? (
                    <ArrowUpRight size={20} color="var(--hud-orange)" />
                  ) : (
                    <ArrowDownLeft size={20} color="var(--hud-green)" />
                  )}
                  <div>
                    <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>
                      {item.fileName}
                    </div>
                    <div style={{ color: 'var(--hud-text-dim)', fontSize: '0.7rem' }}>
                      {formatFileSize(item.totalBytes)} • PEER: {item.peerName || item.peerId.slice(0, 8)} •{' '}
                      {new Date(item.startedAt).toLocaleTimeString()}
                    </div>
                    {item.fileHash && (
                      <div style={{ color: 'var(--hud-orange)', fontSize: '0.65rem', marginTop: '0.15rem' }}>
                        HASH: {item.fileHash.slice(0, 24)}...
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  {item.status === 'completed' ? (
                    <div style={{ color: 'var(--hud-green)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <CheckCircle size={14} /> VERIFIED
                    </div>
                  ) : (
                    <div style={{ color: 'var(--hud-red)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <AlertCircle size={14} /> {item.status.toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <button className="hud-btn" onClick={onClose} style={{ padding: '0.65rem 1.5rem', fontSize: '0.8rem' }}>
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};

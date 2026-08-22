import React from 'react';
import { Device } from '../types';
import { Users, X, Smartphone, Laptop, Globe, Signal } from 'lucide-react';

interface PeersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  peers: Device[];
  onSelectPeer?: (peer: Device) => void;
}

export const PeersDrawer: React.FC<PeersDrawerProps> = ({
  isOpen,
  onClose,
  peers,
  onSelectPeer,
}) => {
  if (!isOpen) return null;

  return (
    <div className="hud-modal-overlay" onClick={onClose}>
      <div className="hud-modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="hud-corner-tl" />
        <div className="hud-corner-tr" />
        <div className="hud-corner-bl" />
        <div className="hud-corner-br" />

        <div className="hud-modal-header">
          <div className="hud-modal-title">
            <Users size={20} />
            <span>ACTIVE MESH NODES ({peers.length})</span>
          </div>
          <button className="hud-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {peers.length === 0 ? (
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
            NO OTHER NODES DETECTED ON THIS LOCAL/SIGNALING MESH.
            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--hud-orange)' }}>
              Open another browser tab or launch another device to discover peers!
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto' }}>
            {peers.map((peer) => (
              <div
                key={peer.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.85rem 1rem',
                  border: '1px solid rgba(255,107,0,0.2)',
                  background: 'rgba(255,255,255,0.02)',
                  cursor: onSelectPeer ? 'pointer' : 'default',
                }}
                onClick={() => {
                  if (onSelectPeer) {
                    onSelectPeer(peer);
                    onClose();
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {peer.type === 'android' ? (
                    <Smartphone size={20} color="var(--hud-orange)" />
                  ) : peer.type === 'windows' ? (
                    <Laptop size={20} color="var(--hud-orange)" />
                  ) : (
                    <Globe size={20} color="var(--hud-orange)" />
                  )}
                  <div>
                    <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>
                      {peer.name}
                    </div>
                    <div style={{ color: 'var(--hud-text-dim)', fontSize: '0.7rem' }}>
                      PAIRING CODE: #{peer.id.slice(0, 6).toUpperCase()} • {peer.platform || peer.type.toUpperCase()}
                    </div>
                  </div>
                </div>


                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--hud-green)', fontSize: '0.75rem' }}>
                  <Signal size={14} />
                  <span>ONLINE</span>
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

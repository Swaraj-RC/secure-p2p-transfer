import React from 'react';
import { Lock, Crosshair } from 'lucide-react';
import { soundFX } from '../services/sound';

interface BottomHudBarProps {
  status: string;
  isOnline: boolean;
  peerCount: number;
  onReticleClick?: () => void;
}

export const BottomHudBar: React.FC<BottomHudBarProps> = ({
  status,
  isOnline,
  peerCount,
  onReticleClick,
}) => {
  return (
    <footer className="hud-bottom-bar">
      {/* Status Item */}
      <div className="hud-bar-item">
        <span className="hud-bar-label">STATUS</span>
        <span className={`hud-bar-val ${isOnline ? 'hud-status-online' : 'hud-status-active'}`}>
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: isOnline ? 'var(--hud-green)' : 'var(--hud-orange)',
              boxShadow: `0 0 6px ${isOnline ? 'var(--hud-green)' : 'var(--hud-orange)'}`,
            }}
          />
          {status.toUpperCase()}
        </span>
      </div>

      {/* Peers Count */}
      <div className="hud-bar-item">
        <span className="hud-bar-label">PEERS</span>
        <span className="hud-bar-val">
          {peerCount} CONNECTED
        </span>
      </div>

      {/* Center Reticle Icon */}
      <div
        className="hud-center-reticle"
        onClick={() => {
          soundFX.playClick();
          if (onReticleClick) onReticleClick();
        }}
        title="Node Telemetry & Network Reticle"
      >
        <Crosshair size={24} />
      </div>

      {/* Encryption Indicator */}
      <div className="hud-bar-item">
        <span className="hud-bar-label">ENCRYPTION</span>
        <span className="hud-bar-val" style={{ color: 'var(--hud-orange)' }}>
          <Lock size={12} />
          END-TO-END
        </span>
      </div>

      {/* Version Item */}
      <div className="hud-bar-item" style={{ textAlign: 'right' }}>
        <span className="hud-bar-label">VERSION</span>
        <span className="hud-bar-val">
          1.0.0
        </span>
      </div>
    </footer>
  );
};

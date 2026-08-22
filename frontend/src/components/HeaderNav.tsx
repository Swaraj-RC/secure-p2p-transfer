import React from 'react';
import { Volume2, VolumeX, ShieldCheck, History, Users, Award, Server } from 'lucide-react';
import { soundFX } from '../services/sound';

interface HeaderNavProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenHistory: () => void;
  onOpenPeers: () => void;
  onOpenMatrix: () => void;
  onOpenServerConfig?: () => void;
  peerCount: number;
  isConnected: boolean;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  soundEnabled,
  onToggleSound,
  onOpenHistory,
  onOpenPeers,
  onOpenMatrix,
  onOpenServerConfig,
  peerCount,
  isConnected,
}) => {
  return (
    <header className="hud-header">
      {/* Top Left Branding Bracket */}
      <div className="hud-header-left">
        <span style={{ color: 'rgba(255,107,0,0.5)' }}>┌</span>
        <span className="hud-dot" />
        <span style={{ fontWeight: 700, letterSpacing: '0.1em', color: 'var(--hud-orange)' }}>SLRV // BEAM</span>
        <span style={{ color: 'rgba(255,107,0,0.5)' }}>| ┐</span>
      </div>

      {/* Top Center Core Attributes */}
      <div className="hud-header-center">
        <span>SWARAJ</span>
        <span className="hud-dot" />
        <span>LAXMIKANT</span>
        <span className="hud-dot" />
        <span>RAHUL</span>
        <span className="hud-dot" />
        <span>VAIBHAV</span>
      </div>

      {/* Top Right Controls */}
      <div className="hud-header-right" style={{ gap: '0.75rem' }}>
        {onOpenServerConfig && (
          <button
            onClick={() => {
              soundFX.playClick();
              onOpenServerConfig();
            }}
            style={{
              background: isConnected ? 'rgba(0, 255, 136, 0.08)' : 'rgba(255, 107, 0, 0.15)',
              border: isConnected ? '1px solid rgba(0, 255, 136, 0.4)' : '1px solid var(--hud-orange)',
              color: isConnected ? '#00ff88' : 'var(--hud-orange)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.72rem',
              fontFamily: 'inherit',
              fontWeight: 600,
              padding: '0.25rem 0.55rem',
            }}
            title="Configure Signaling Server URL (Render / Localhost)"
          >
            <Server size={13} />
            <span>SERVER {isConnected ? '●' : '○'}</span>
          </button>
        )}
        <button
          onClick={() => {
            soundFX.playClick();
            onOpenMatrix();
          }}
          style={{
            background: 'rgba(255, 107, 0, 0.12)',
            border: '1px solid var(--hud-orange)',
            color: 'var(--hud-orange)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.72rem',
            fontFamily: 'inherit',
            fontWeight: 700,
            padding: '0.25rem 0.6rem',
            boxShadow: '0 0 10px rgba(255, 107, 0, 0.25)',
          }}
          title="Competitive Benchmark & Architecture"
        >
          <Award size={13} />
          <span>BENCHMARKS</span>
        </button>

        <button
          onClick={() => {
            soundFX.playClick();
            onOpenPeers();
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--hud-text-orange)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.75rem',
            fontFamily: 'inherit',
          }}
          title="View Online Mesh Peers"
        >
          <Users size={14} />
          <span>NODES ({peerCount})</span>
        </button>

        <button
          onClick={() => {
            soundFX.playClick();
            onOpenHistory();
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--hud-text-orange)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.75rem',
            fontFamily: 'inherit',
          }}
          title="Transfer History Logs"
        >
          <History size={14} />
          <span>LOGS</span>
        </button>

        <button
          onClick={onToggleSound}
          style={{
            background: 'transparent',
            border: 'none',
            color: soundEnabled ? 'var(--hud-orange)' : 'var(--hud-text-dim)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
          title={soundEnabled ? 'Mute Audio FX' : 'Enable Audio FX'}
        >
          {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
        </button>

        <span style={{ color: 'var(--hud-text-orange)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <ShieldCheck size={14} />
          <span>OPEN SOURCE +</span>
        </span>
      </div>
    </header>
  );
};

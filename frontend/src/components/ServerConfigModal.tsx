import React, { useState } from 'react';
import { Server, Check, X, RefreshCw, Globe, ShieldAlert } from 'lucide-react';
import { signalingClient } from '../services/signaling';
import { soundFX } from '../services/sound';

interface ServerConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  isConnected: boolean;
}

export const ServerConfigModal: React.FC<ServerConfigModalProps> = ({
  isOpen,
  onClose,
  isConnected,
}) => {
  const [urlInput, setUrlInput] = useState<string>(signalingClient.getUrl());
  const [isSaved, setIsSaved] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!urlInput.trim()) return;
    soundFX.playClick();
    signalingClient.setUrl(urlInput.trim());
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1200);
  };

  const handlePreset = (presetUrl: string) => {
    soundFX.playClick();
    setUrlInput(presetUrl);
  };

  return (
    <div className="hud-modal-overlay" onClick={onClose}>
      <div className="hud-modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="hud-corner-tl" />
        <div className="hud-corner-tr" />
        <div className="hud-corner-bl" />
        <div className="hud-corner-br" />

        <div className="hud-modal-header">
          <div className="hud-modal-title">
            <Server size={18} color="var(--hud-orange)" />
            <span>SIGNALING SERVER CONFIGURATION</span>
          </div>
          <button className="hud-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div style={{ margin: '1rem 0', fontSize: '0.82rem', color: 'var(--hud-text-dim)', lineHeight: '1.5' }}>
          When hosted on <strong style={{ color: '#fff' }}>Vercel</strong>, connect to your <strong style={{ color: 'var(--hud-orange)' }}>Render Backend</strong> signaling server. Enter your Render service WebSocket URL below.
        </div>

        {/* Live Status Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 1rem',
            background: 'rgba(0,0,0,0.5)',
            border: isConnected ? '1px solid rgba(0, 255, 136, 0.4)' : '1px solid rgba(255, 107, 0, 0.4)',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: isConnected ? 'var(--hud-green)' : 'var(--hud-orange)',
                boxShadow: `0 0 8px ${isConnected ? 'var(--hud-green)' : 'var(--hud-orange)'}`,
              }}
            />
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#fff' }}>
              CURRENT STATUS: {isConnected ? 'ONLINE & CONNECTED' : 'DISCONNECTED / RECONNECTING'}
            </span>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--hud-text-dim)', wordBreak: 'break-all' }}>
            {signalingClient.getUrl()}
          </span>
        </div>

        {/* Input Form */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--hud-orange)', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>
            WEBSOCKET SIGNALING URL (WSS / WS):
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="wss://your-render-app.onrender.com/ws"
              style={{
                flex: 1,
                padding: '0.65rem 0.85rem',
                background: 'rgba(0, 0, 0, 0.7)',
                border: '1px solid var(--hud-orange-dim)',
                color: '#fff',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            />
            <button
              className="hud-btn hud-btn-orange"
              onClick={handleSave}
              style={{ padding: '0.65rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              {isSaved ? <Check size={16} /> : <RefreshCw size={16} />}
              <span>{isSaved ? 'SAVED!' : 'CONNECT'}</span>
            </button>
          </div>
        </div>

        {/* Preset Quick Links */}
        <div style={{ fontSize: '0.75rem', color: 'var(--hud-text-dim)', marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: 600, color: '#fff', marginBottom: '0.4rem' }}>Quick Presets:</div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => handlePreset('ws://localhost:8080/ws')}
              style={{
                background: 'rgba(255, 107, 0, 0.1)',
                border: '1px solid var(--hud-orange-dim)',
                color: 'var(--hud-text-orange)',
                padding: '0.3rem 0.6rem',
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontSize: '0.72rem',
              }}
            >
              ws://localhost:8080/ws
            </button>
            <button
              onClick={() => {
                const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                handlePreset(`${proto}//${window.location.host}/ws`);
              }}
              style={{
                background: 'rgba(255, 107, 0, 0.1)',
                border: '1px solid var(--hud-orange-dim)',
                color: 'var(--hud-text-orange)',
                padding: '0.3rem 0.6rem',
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontSize: '0.72rem',
              }}
            >
              Same Host (/ws)
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="hud-btn" onClick={onClose} style={{ padding: '0.5rem 1.25rem' }}>
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};

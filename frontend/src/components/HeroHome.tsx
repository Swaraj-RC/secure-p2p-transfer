import React, { useState } from 'react';
import { soundFX } from '../services/sound';
import { Device } from '../types';
import { Copy, Check, QrCode } from 'lucide-react';

interface HeroHomeProps {
  currentDevice: Device | null;
  onSendClick: () => void;
  onReceiveClick: () => void;
}

export const HeroHome: React.FC<HeroHomeProps> = ({
  currentDevice,
  onSendClick,
  onReceiveClick,
}) => {
  const [copied, setCopied] = useState(false);

  const deviceShortCode = currentDevice ? currentDevice.id.slice(0, 6).toUpperCase() : '------';
  const shareUrl = currentDevice
    ? `${window.location.origin}/?target=${currentDevice.id}`
    : window.location.href;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    soundFX.playClick();
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <section className="hud-hero-section">
      {/* Target Reticle Frame around Logo */}
      <div className="hud-target-frame">
        {/* Frame Outer Corner Brackets */}
        <div className="hud-corner-tl" />
        <div className="hud-corner-tr" />
        <div className="hud-corner-bl" />
        <div className="hud-corner-br" />

        {/* Reticle Crosshairs */}
        <div style={{ position: 'absolute', top: '-15px', color: 'rgba(255,107,0,0.5)', fontSize: '0.8rem' }}>
          +
        </div>
        <div style={{ position: 'absolute', bottom: '-15px', color: 'rgba(255,107,0,0.5)', fontSize: '0.8rem' }}>
          +
        </div>
        <div style={{ position: 'absolute', left: '-15px', color: 'rgba(255,107,0,0.5)', fontSize: '0.8rem' }}>
          +
        </div>
        <div style={{ position: 'absolute', right: '-15px', color: 'rgba(255,107,0,0.5)', fontSize: '0.8rem' }}>
          +
        </div>

        {/* High-Precision Stylized Stencil Vector Logo for SLRV */}
        <svg
          className="hud-logo-svg"
          viewBox="0 0 540 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="p2p-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#FF6B00" floodOpacity="0.85" />
              <feDropShadow dx="0" dy="0" stdDeviation="20" floodColor="#FF6B00" floodOpacity="0.4" />
            </filter>

            <linearGradient id="p2p-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF851A" />
              <stop offset="40%" stopColor="#FF6B00" />
              <stop offset="100%" stopColor="#D94E00" />
            </linearGradient>
          </defs>

          <g filter="url(#p2p-glow)">
            {/* 'S' GLYPH */}
            <path
              d="M 115 20 
                 L 35 20 
                 L 15 45 
                 L 15 75 
                 L 95 85 
                 L 115 95 
                 L 115 130 
                 L 35 140 
                 L 15 115
                 M 115 45
                 L 45 45
                 M 95 115
                 L 15 115"
              stroke="url(#p2p-gradient)"
              strokeWidth="22"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />

            {/* 'L' GLYPH */}
            <path
              d="M 160 20 
                 L 160 140 
                 L 245 140"
              stroke="url(#p2p-gradient)"
              strokeWidth="22"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />

            {/* 'R' GLYPH */}
            <path
              d="M 290 140 
                 L 290 20 
                 L 355 20 
                 C 385 20, 385 75, 355 75 
                 L 290 75 
                 M 340 75 
                 L 380 140"
              stroke="url(#p2p-gradient)"
              strokeWidth="22"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />

            {/* 'V' GLYPH */}
            <path
              d="M 420 20 
                 L 468 140 
                 L 516 20"
              stroke="url(#p2p-gradient)"
              strokeWidth="22"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </g>

          {/* Stencil Inner Inset Details */}
          <line x1="15" y1="80" x2="35" y2="80" stroke="#FFF" strokeWidth="2" opacity="0.9" />
          <line x1="160" y1="80" x2="180" y2="80" stroke="#FFF" strokeWidth="2" opacity="0.9" />
          <line x1="290" y1="80" x2="310" y2="80" stroke="#FFF" strokeWidth="2" opacity="0.9" />
          <line x1="458" y1="110" x2="478" y2="110" stroke="#FFF" strokeWidth="2" opacity="0.9" />
        </svg>

        {/* Cyberpunk Crosshair Corner Accent Lines */}
        <div className="hud-corner-accent-tl" />
        <div className="hud-corner-accent-tr" />
        <div className="hud-corner-accent-bl" />
        <div className="hud-corner-accent-br" />
      </div>

      {/* Subtitles & Mission Tags */}
      <div className="hud-subtitles-wrapper">
        <div className="hud-title-main">SLRV BEAM // DIRECT P2P QUANTUM TRANSFER</div>
        <div className="hud-title-sub">
          <span>ZERO-CLOUD</span>
          <span className="hud-dot" />
          <span>AES-256</span>
          <span className="hud-dot" />
          <span>LOSSLESS</span>
          <span className="hud-dot" />
          <span>DIRECT BEAM</span>
          <span className="hud-dot" />
          <span>MESH</span>
        </div>

        {/* Team Attribution Capsule */}
        <div
          style={{
            marginTop: '0.65rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.3rem 0.85rem',
            background: 'rgba(255, 107, 0, 0.08)',
            border: '1px solid rgba(255, 107, 0, 0.3)',
            borderRadius: '2px',
            fontSize: '0.72rem',
            letterSpacing: '0.12em',
            color: 'var(--hud-text-orange)',
          }}
        >
          <span style={{ color: 'var(--hud-orange)', fontWeight: 700 }}>ENGINEERED BY:</span>
          <span>SWARAJ</span>
          <span className="hud-dot" style={{ backgroundColor: 'rgba(255,107,0,0.5)' }} />
          <span>LAXMIKANT</span>
          <span className="hud-dot" style={{ backgroundColor: 'rgba(255,107,0,0.5)' }} />
          <span>RAHUL</span>
          <span className="hud-dot" style={{ backgroundColor: 'rgba(255,107,0,0.5)' }} />
          <span>VAIBHAV</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="hud-actions-row">
        <button
          className="hud-btn hud-btn-orange"
          onMouseEnter={() => soundFX.playHover()}
          onClick={() => {
            soundFX.playClick();
            onSendClick();
          }}
        >
          <span style={{ color: 'var(--hud-orange)' }}>⚡</span>
          <span>BEAM FILES</span>
        </button>

        <button
          className="hud-btn"
          onMouseEnter={() => soundFX.playHover()}
          onClick={() => {
            soundFX.playClick();
            onReceiveClick();
          }}
        >
          <span>RECEIVE BEAM</span>
          <span style={{ color: 'var(--hud-orange)' }}>📡</span>
        </button>
      </div>

      {/* Quick Direct Pairing Telemetry Bar */}
      {currentDevice && (
        <div
          style={{
            marginTop: '1.75rem',
            padding: '0.65rem 1.25rem',
            background: 'rgba(0, 0, 0, 0.65)',
            border: '1px solid var(--hud-orange-dim)',
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
            fontSize: '0.75rem',
            letterSpacing: '0.08em',
            color: 'var(--hud-text-dim)',
            boxShadow: '0 0 20px rgba(0,0,0,0.5)',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <div>
            NODE ID:{' '}
            <strong style={{ color: '#fff', fontSize: '0.85rem' }}>
              {currentDevice.name}
            </strong>
          </div>
          <span className="hud-dot" />
          <div>
            PAIRING CODE:{' '}
            <strong style={{ color: 'var(--hud-orange)', fontSize: '0.9rem', letterSpacing: '0.15em' }}>
              #{deviceShortCode}
            </strong>
          </div>
          <span className="hud-dot" />
          <button
            onClick={handleCopyLink}
            style={{
              background: 'rgba(255,107,0,0.1)',
              border: '1px solid var(--hud-orange-dim)',
              color: copied ? 'var(--hud-green)' : 'var(--hud-orange)',
              fontFamily: 'inherit',
              fontSize: '0.7rem',
              fontWeight: 600,
              padding: '0.35rem 0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s ease',
            }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span>{copied ? 'LINK COPIED!' : 'COPY 1-CLICK SHARE LINK'}</span>
          </button>
        </div>
      )}

    </section>
  );
};

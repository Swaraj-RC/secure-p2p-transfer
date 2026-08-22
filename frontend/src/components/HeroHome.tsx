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

        {/* High-Precision Stylized Stencil Vector Logo for SLRV BEAM */}
        <svg
          className="hud-logo-svg"
          viewBox="0 0 540 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="p2p-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#FF6B00" floodOpacity="0.85" />
              <feDropShadow dx="0" dy="0" stdDeviation="16" floodColor="#FF6B00" floodOpacity="0.35" />
            </filter>

            <linearGradient id="beam-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFA048" />
              <stop offset="40%" stopColor="#FF6B00" />
              <stop offset="100%" stopColor="#D94E00" />
            </linearGradient>

            <linearGradient id="laser-line" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FF6B00" stopOpacity="0" />
              <stop offset="30%" stopColor="#FF851A" />
              <stop offset="50%" stopColor="#FFFFFF" />
              <stop offset="70%" stopColor="#FF851A" />
              <stop offset="100%" stopColor="#FF6B00" stopOpacity="0" />
            </linearGradient>
          </defs>

          <g filter="url(#p2p-glow)">
            {/* 'S' GLYPH */}
            <path
              d="M 80 22 L 32 22 L 20 40 L 20 62 L 72 74 L 84 86 L 84 110 L 72 122 L 20 122 L 18 108"
              stroke="url(#beam-gradient)"
              strokeWidth="14"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />

            {/* 'L' GLYPH */}
            <path
              d="M 112 22 L 112 122 L 168 122"
              stroke="url(#beam-gradient)"
              strokeWidth="14"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />

            {/* 'R' GLYPH */}
            <path
              d="M 198 122 L 198 22 L 244 22 C 266 22, 266 64, 244 64 L 198 64 M 234 64 L 262 122"
              stroke="url(#beam-gradient)"
              strokeWidth="14"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />

            {/* 'V' GLYPH */}
            <path
              d="M 292 22 L 326 122 L 360 22"
              stroke="url(#beam-gradient)"
              strokeWidth="14"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />

            {/* DIVIDER BEAM RAY */}
            <line x1="384" y1="20" x2="384" y2="124" stroke="var(--hud-orange)" strokeWidth="3" strokeDasharray="6 4" opacity="0.6" />

            {/* 'BEAM' WORDMARK IN VECTOR GLYPHS */}
            <text
              x="400"
              y="58"
              fontFamily="'Orbitron', 'Chakra Petch', sans-serif"
              fontSize="38"
              fontWeight="900"
              letterSpacing="3"
              fill="url(#beam-gradient)"
              stroke="#FFA048"
              strokeWidth="1"
            >
              BEAM
            </text>

            <text
              x="402"
              y="88"
              fontFamily="'Share Tech Mono', monospace"
              fontSize="12"
              fontWeight="700"
              letterSpacing="5"
              fill="#FFFFFF"
              opacity="0.85"
            >
              QUANTUM P2P
            </text>

            <text
              x="402"
              y="108"
              fontFamily="'Share Tech Mono', monospace"
              fontSize="10"
              letterSpacing="3"
              fill="var(--hud-orange)"
              opacity="0.75"
            >
              DIRECT MESH
            </text>
          </g>

          {/* Glowing Laser Scanline Bottom Accent */}
          <line x1="15" y1="140" x2="525" y2="140" stroke="url(#laser-line)" strokeWidth="2.5" />
          <circle cx="270" cy="140" r="3" fill="#FFFFFF" />
        </svg>

        {/* Cyberpunk Crosshair Corner Accent Lines */}
        <div className="hud-corner-accent-tl" />
        <div className="hud-corner-accent-tr" />
        <div className="hud-corner-accent-bl" />
        <div className="hud-corner-accent-br" />
      </div>

      {/* Subtitles & Mission Tags */}
      <div className="hud-subtitles-wrapper">
        <div className="hud-title-main">SLRV BEAM // DIRECT PEER-TO-PEER TRANSFER</div>
        <div className="hud-title-sub">
          <span>FAST</span>
          <span className="hud-dot" />
          <span>SECURE</span>
          <span className="hud-dot" />
          <span>DIRECT</span>
          <span className="hud-dot" />
          <span>NO SERVERS</span>
          <span className="hud-dot" />
          <span>LOSSLESS</span>
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
          <span style={{ color: 'var(--hud-orange)' }}>➔</span>
          <span>SEND FILES</span>
        </button>

        <button
          className="hud-btn"
          onMouseEnter={() => soundFX.playHover()}
          onClick={() => {
            soundFX.playClick();
            onReceiveClick();
          }}
        >
          <span>RECEIVE FILES</span>
          <span style={{ color: 'var(--hud-orange)' }}>⬅</span>
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
            YOUR PAIRING CODE:{' '}
            <strong style={{ color: 'var(--hud-orange)', fontSize: '0.9rem', letterSpacing: '0.15em' }}>
              #{deviceShortCode}
            </strong>
          </div>
          <span className="hud-dot" />
          <div>
            IP:{' '}
            <strong style={{ color: '#fff' }}>
              {currentDevice.ipAddress || '127.0.0.1'}
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

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

        {/* High-Precision Stylized Stencil Vector Logo */}
        <svg
          className="hud-logo-svg"
          viewBox="0 0 540 180"
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

            <linearGradient id="p2p-highlight" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6" />
              <stop offset="15%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
          </defs>

          <g filter="url(#p2p-glow)">
            {/* FIRST 'P' */}
            <path
              d="M 20 20 
                 L 115 20 
                 L 145 50 
                 L 145 95 
                 L 115 125 
                 L 55 125 
                 L 55 160 
                 L 20 160 
                 Z 
                 M 55 52 
                 L 105 52 
                 L 115 62 
                 L 115 85 
                 L 105 95 
                 L 55 95 
                 Z"
              fill="url(#p2p-gradient)"
              stroke="#FFA048"
              strokeWidth="2"
            />
            <path
              d="M 20 20 L 115 20 L 145 50"
              stroke="#FFF"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.8"
            />

            {/* DIGIT '2' */}
            <path
              d="M 185 20 
                 L 285 20 
                 L 315 50 
                 L 315 90 
                 L 230 130 
                 L 315 130 
                 L 315 160 
                 L 185 160 
                 L 185 130 
                 L 270 90 
                 L 270 52 
                 L 205 52 
                 L 185 32 
                 Z"
              fill="url(#p2p-gradient)"
              stroke="#FFA048"
              strokeWidth="2"
            />
            <path
              d="M 185 20 L 285 20 L 315 50"
              stroke="#FFF"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.8"
            />

            {/* SECOND 'P' */}
            <path
              d="M 355 20 
                 L 450 20 
                 L 480 50 
                 L 480 95 
                 L 450 125 
                 L 390 125 
                 L 390 160 
                 L 355 160 
                 Z 
                 M 390 52 
                 L 440 52 
                 L 450 62 
                 L 450 85 
                 L 440 95 
                 L 390 95 
                 Z"
              fill="url(#p2p-gradient)"
              stroke="#FFA048"
              strokeWidth="2"
            />
            <path
              d="M 355 20 L 450 20 L 480 50"
              stroke="#FFF"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.8"
            />
          </g>

          {/* Stencil Inner Inset Details */}
          <line x1="20" y1="90" x2="35" y2="90" stroke="#FF6B00" strokeWidth="3" />
          <line x1="185" y1="90" x2="200" y2="90" stroke="#FF6B00" strokeWidth="3" />
          <line x1="355" y1="90" x2="370" y2="90" stroke="#FF6B00" strokeWidth="3" />
        </svg>

        {/* Cyberpunk Crosshair Corner Accent Lines */}
        <div className="hud-corner-accent-tl" />
        <div className="hud-corner-accent-tr" />
        <div className="hud-corner-accent-bl" />
        <div className="hud-corner-accent-br" />
      </div>

      {/* Subtitles & Mission Tags */}
      <div className="hud-subtitles-wrapper">
        <div className="hud-title-main">PEER-TO-PEER FILE TRANSFER</div>
        <div className="hud-title-sub">
          <span>FAST</span>
          <span className="hud-dot" />
          <span>SECURE</span>
          <span className="hud-dot" />
          <span>DIRECT</span>
          <span className="hud-dot" />
          <span>NO SERVERS</span>
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

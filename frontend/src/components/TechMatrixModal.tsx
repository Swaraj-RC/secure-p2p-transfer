import React from 'react';
import { ShieldCheck, Zap, Radio, Volume2, Award, X, Check, AlertTriangle, EyeOff, Smartphone, Laptop, Tv } from 'lucide-react';
import { soundFX } from '../services/sound';

interface TechMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TechMatrixModal: React.FC<TechMatrixModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="hud-modal-overlay" onClick={onClose}>
      <div className="hud-modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="hud-corner-tl" />
        <div className="hud-corner-tr" />
        <div className="hud-corner-bl" />
        <div className="hud-corner-br" />

        <div className="hud-modal-header">
          <div className="hud-modal-title">
            <Award size={20} color="var(--hud-orange)" />
            <span>ARCHITECTURAL SUPERIORITY // COMPETITIVE BENCHMARK MATRIX</span>
          </div>
          <button className="hud-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Executive Summary */}
        <div
          style={{
            padding: '1rem',
            background: 'rgba(255, 107, 0, 0.08)',
            border: '1px solid var(--hud-orange)',
            fontSize: '0.85rem',
            lineHeight: '1.5',
            color: '#fff',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ fontWeight: 700, color: 'var(--hud-orange)', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>
            🏆 WHY OUR PLATFORM OUTPERFORMS LEGACY & ALTERNATIVE METHODS:
          </div>
          Traditional sharing methods (Cloud Chat Apps, Bluetooth, and Single-Ecosystem Utilities) suffer from severe limitations: aggressive compression, ecosystem lock-in, mandatory app store installs, or centralized server bottlenecks. Our system delivers <strong>100% bit-for-bit lossless transfers</strong>, zero-install universal browser compatibility, and next-gen acoustic/WebRTC mesh modes with $0 maintenance cost.
        </div>

        {/* Feature Comparison Matrix Table */}
        <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 107, 0, 0.15)', borderBottom: '1px solid var(--hud-orange)', color: 'var(--hud-orange)' }}>
                <th style={{ padding: '0.75rem 0.5rem' }}>CAPABILITY</th>
                <th style={{ padding: '0.75rem 0.5rem', color: '#00ff88', fontWeight: 700 }}>OUR P2P SYSTEM</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>CLOUD CHAT APPS (OTHER)</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>BLUETOOTH (OTHER)</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>LOCAL UTILITIES (OTHER)</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid rgba(255,107,0,0.1)' }}>
                <td style={{ padding: '0.65rem 0.5rem', fontWeight: 600, color: '#fff' }}>Quality & Compression</td>
                <td style={{ padding: '0.65rem 0.5rem', color: '#00ff88' }}>
                  <Check size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                  <strong>100% Lossless (Zero Re-encoding)</strong>
                </td>
                <td style={{ padding: '0.65rem 0.5rem', color: 'var(--hud-red)' }}>
                  <AlertTriangle size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                  Lossy compression (re-encodes 4K to 720p/1080p)
                </td>
                <td style={{ padding: '0.65rem 0.5rem', color: '#ccc' }}>Lossless (Slow bitrate)</td>
                <td style={{ padding: '0.65rem 0.5rem', color: '#ccc' }}>Lossless (Binary)</td>
              </tr>

              <tr style={{ borderBottom: '1px solid rgba(255,107,0,0.1)' }}>
                <td style={{ padding: '0.65rem 0.5rem', fontWeight: 600, color: '#fff' }}>App Installation Required</td>
                <td style={{ padding: '0.65rem 0.5rem', color: '#00ff88' }}>
                  <Check size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                  <strong>ZERO INSTALL (Any Browser)</strong>
                </td>
                <td style={{ padding: '0.65rem 0.5rem', color: 'var(--hud-red)' }}>Mandatory App + Account/Phone #</td>
                <td style={{ padding: '0.65rem 0.5rem', color: '#ccc' }}>Built-in OS Pairing Required</td>
                <td style={{ padding: '0.65rem 0.5rem', color: 'var(--hud-red)' }}>Mandatory App Store Install</td>
              </tr>

              <tr style={{ borderBottom: '1px solid rgba(255,107,0,0.1)' }}>
                <td style={{ padding: '0.65rem 0.5rem', fontWeight: 600, color: '#fff' }}>Cross-Platform Reach</td>
                <td style={{ padding: '0.65rem 0.5rem', color: '#00ff88' }}>
                  <strong>iOS, Android, Windows, Mac, Linux, Smart TVs</strong>
                </td>
                <td style={{ padding: '0.65rem 0.5rem' }}>Limited to Registered accounts</td>
                <td style={{ padding: '0.65rem 0.5rem', color: 'var(--hud-red)' }}>Proximity Only (~10m range)</td>
                <td style={{ padding: '0.65rem 0.5rem' }}>Same Wi-Fi Subnet Only</td>
              </tr>

              <tr style={{ borderBottom: '1px solid rgba(255,107,0,0.1)' }}>
                <td style={{ padding: '0.65rem 0.5rem', fontWeight: 600, color: '#fff' }}>Global Internet Transfer</td>
                <td style={{ padding: '0.65rem 0.5rem', color: '#00ff88' }}>
                  <Check size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                  <strong>Direct P2P / Worldwide / Cross-Network</strong>
                </td>
                <td style={{ padding: '0.65rem 0.5rem' }}>Via Central Servers (Double Hop)</td>
                <td style={{ padding: '0.65rem 0.5rem', color: 'var(--hud-red)' }}>❌ Proximity Only (No Internet)</td>
                <td style={{ padding: '0.65rem 0.5rem', color: 'var(--hud-red)' }}>❌ Local Network Only</td>
              </tr>

              <tr style={{ borderBottom: '1px solid rgba(255,107,0,0.1)' }}>
                <td style={{ padding: '0.65rem 0.5rem', fontWeight: 600, color: '#fff' }}>Security & Privacy</td>
                <td style={{ padding: '0.65rem 0.5rem', color: '#00ff88' }}>
                  <strong>AES-256-GCM + SHA-256 (Zero Cloud Storage)</strong>
                </td>
                <td style={{ padding: '0.65rem 0.5rem', color: '#ccc' }}>Metadata stored on cloud servers</td>
                <td style={{ padding: '0.65rem 0.5rem', color: '#ccc' }}>Basic RF pairing / Discovery</td>
                <td style={{ padding: '0.65rem 0.5rem' }}>TLS LAN</td>
              </tr>

              <tr style={{ borderBottom: '1px solid rgba(255,107,0,0.1)' }}>
                <td style={{ padding: '0.65rem 0.5rem', fontWeight: 600, color: '#fff' }}>Transfer Speed & Maintenance</td>
                <td style={{ padding: '0.65rem 0.5rem', color: '#00ff88' }}>
                  <strong>Gigabit P2P Speed / $0 FOREVER</strong>
                </td>
                <td style={{ padding: '0.65rem 0.5rem' }}>High cloud server overhead</td>
                <td style={{ padding: '0.65rem 0.5rem', color: 'var(--hud-red)' }}>Ultra-slow (0.2–2 Mbps)</td>
                <td style={{ padding: '0.65rem 0.5rem' }}>$0 (LAN only)</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Next-Gen Differentiator Pillars */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--hud-orange-dim)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--hud-orange)', fontWeight: 600, fontSize: '0.85rem' }}>
              <Volume2 size={18} />
              <span>ULTRASONIC ACOUSTIC PAIRING</span>
            </div>
            <div style={{ color: 'var(--hud-text-dim)', fontSize: '0.75rem', marginTop: '0.4rem', lineHeight: '1.4' }}>
              Devices emit an inaudible high-frequency audio chirp (18.5 kHz) to pair across ambient air with <strong>zero Bluetooth setup</strong> and <strong>zero Wi-Fi password entry</strong>.
            </div>
          </div>

          <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--hud-orange-dim)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--hud-orange)', fontWeight: 600, fontSize: '0.85rem' }}>
              <ShieldCheck size={18} />
              <span>BIT-FOR-BIT CRYPTOGRAPHIC PURITY</span>
            </div>
            <div style={{ color: 'var(--hud-text-dim)', fontSize: '0.75rem', marginTop: '0.4rem', lineHeight: '1.4' }}>
              RAW binary streaming with zero transcoding. 4K 120fps video, Master audio, and executable binaries remain 100% mathematically identical bit-by-bit.
            </div>
          </div>

          <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--hud-orange-dim)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--hud-orange)', fontWeight: 600, fontSize: '0.85rem' }}>
              <Zap size={18} />
              <span>ZERO SERVER STORAGE ($0 COST)</span>
            </div>
            <div style={{ color: 'var(--hud-text-dim)', fontSize: '0.75rem', marginTop: '0.4rem', lineHeight: '1.4' }}>
              Files stream directly peer-to-peer over WebRTC SCTP data channels. The website never stores a single byte on cloud disks, eliminating hosting costs permanently.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="hud-btn hud-btn-orange" onClick={onClose} style={{ padding: '0.65rem 2rem', fontSize: '0.8rem' }}>
            CLOSE BENCHMARK
          </button>
        </div>
      </div>
    </div>
  );
};

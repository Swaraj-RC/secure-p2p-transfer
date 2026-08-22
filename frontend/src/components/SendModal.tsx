import React, { useState, useRef } from 'react';
import { UploadCloud, Shield, FileCheck, X, Laptop, Smartphone, Globe, Radio, Terminal } from 'lucide-react';
import { Device } from '../types';
import { soundFX } from '../services/sound';

interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
  peers: Device[];
  onStartSend: (file: File, targetPeerId: string) => void;
}

export const SendModal: React.FC<SendModalProps> = ({
  isOpen,
  onClose,
  peers,
  onStartSend,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetMode, setTargetMode] = useState<'detected' | 'direct'>('direct');
  const [selectedPeerId, setSelectedPeerId] = useState<string>('');
  const [customIpAddress, setCustomIpAddress] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      soundFX.playClick();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      soundFX.playClick();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const effectiveTargetId = targetMode === 'direct' ? customIpAddress.trim() : selectedPeerId;

  const handleSubmit = () => {
    if (!selectedFile || !effectiveTargetId) return;
    soundFX.playClick();
    onStartSend(selectedFile, effectiveTargetId);
    onClose();
  };

  return (
    <div className="hud-modal-overlay" onClick={onClose}>
      <div className="hud-modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        {/* Corner Reticles */}
        <div className="hud-corner-tl" />
        <div className="hud-corner-tr" />
        <div className="hud-corner-bl" />
        <div className="hud-corner-br" />

        <div className="hud-modal-header">
          <div className="hud-modal-title">
            <UploadCloud size={20} />
            <span>TRANSMIT PAYLOAD // SEND</span>
          </div>
          <button className="hud-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* 1. Drag & Drop File Zone */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />

        <div
          className={`hud-dropzone ${isDragging ? 'active' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {selectedFile ? (
            <>
              <FileCheck size={36} color="var(--hud-orange)" />
              <div style={{ color: '#fff', fontWeight: 600, fontSize: '1.05rem' }}>
                {selectedFile.name}
              </div>
              <div style={{ color: 'var(--hud-text-dim)', fontSize: '0.8rem' }}>
                SIZE: {formatFileSize(selectedFile.size)} &nbsp; // &nbsp; MIME: {selectedFile.type || 'application/octet-stream'}
              </div>
              <div style={{ color: 'var(--hud-orange)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                [ CLICK TO CHANGE FILE ]
              </div>
            </>
          ) : (
            <>
              <UploadCloud size={40} color="var(--hud-orange)" />
              <div style={{ color: '#fff', fontSize: '0.95rem', letterSpacing: '0.1em' }}>
                DRAG & DROP FILE OR <span style={{ color: 'var(--hud-orange)' }}>BROWSE DISK</span>
              </div>
              <div style={{ color: 'var(--hud-text-dim)', fontSize: '0.75rem' }}>
                AUTOMATIC AES-256-GCM CHUNKING & SHA-256 INTEGRITY HASHING
              </div>
            </>
          )}
        </div>

        {/* 2. Target Mode Tabs */}
        <div style={{ marginTop: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--hud-text-dim)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
            SELECT TARGETING METHOD:
          </div>

          <div className="hud-tab-row">
            <button
              className={`hud-tab-btn ${targetMode === 'direct' ? 'active' : ''}`}
              onClick={() => {
                soundFX.playClick();
                setTargetMode('direct');
              }}
            >
              <Terminal size={15} />
              <span>PAIRING CODE / NODE ID</span>
            </button>
            <button
              className={`hud-tab-btn ${targetMode === 'detected' ? 'active' : ''}`}
              onClick={() => {
                soundFX.playClick();
                setTargetMode('detected');
              }}
            >
              <Radio size={15} />
              <span>DETECTED PEERS ({peers.length})</span>
            </button>
          </div>

          {/* Mode A: Direct Pairing Code / Node ID Input */}
          {targetMode === 'direct' && (
            <div style={{ marginTop: '0.75rem' }}>
              <div className="hud-input-group">
                <input
                  type="text"
                  className="hud-input"
                  value={customIpAddress}
                  onChange={(e) => setCustomIpAddress(e.target.value)}
                  placeholder="Enter 6-Digit Pairing Code (e.g. #8518) or Node Name"
                  autoFocus
                />
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--hud-text-dim)', marginTop: '0.4rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>🎯 DIRECT ROUTING: Privacy-first end-to-end encrypted transfer</span>
                {peers.length > 0 && (
                  <span
                    style={{ color: 'var(--hud-orange)', cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => {
                      setCustomIpAddress(peers[0].id.slice(0, 6));
                      soundFX.playClick();
                    }}
                  >
                    Quick-fill: {peers[0].name} (#{peers[0].id.slice(0, 6).toUpperCase()})
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Mode B: Detected Mesh Peers Grid */}
          {targetMode === 'detected' && (
            <div style={{ marginTop: '0.75rem' }}>
              {peers.length === 0 ? (
                <div
                  style={{
                    padding: '1.25rem',
                    textAlign: 'center',
                    border: '1px solid rgba(255,107,0,0.15)',
                    background: 'rgba(0,0,0,0.3)',
                    color: 'var(--hud-text-dim)',
                    fontSize: '0.8rem',
                  }}
                >
                  NO PEER NODES CURRENTLY DETECTED ON MESH. USE PAIRING CODE MODE OR SHARE THE LINK.
                </div>
              ) : (
                <div className="hud-peer-grid">
                  {peers.map((peer) => {
                    const isSelected = selectedPeerId === peer.id;
                    return (
                      <div
                        key={peer.id}
                        className={`hud-peer-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => {
                          soundFX.playClick();
                          setSelectedPeerId(peer.id);
                        }}
                      >
                        {peer.type === 'android' ? (
                          <Smartphone size={20} color="var(--hud-orange)" />
                        ) : peer.type === 'windows' ? (
                          <Laptop size={20} color="var(--hud-orange)" />
                        ) : (
                          <Globe size={20} color="var(--hud-orange)" />
                        )}
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                            {peer.name}
                          </div>
                          <div style={{ color: 'var(--hud-text-dim)', fontSize: '0.7rem' }}>
                            CODE: #{peer.id.slice(0, 6).toUpperCase()} • {peer.type.toUpperCase()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* 3. Security Checksum Banner & Action */}
        <div
          style={{
            marginTop: '1.25rem',
            padding: '0.65rem 1rem',
            background: 'rgba(255,107,0,0.06)',
            border: '1px solid var(--hud-orange-dim)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.75rem',
            color: 'rgba(255,255,255,0.85)',
          }}
        >
          <Shield size={16} color="var(--hud-orange)" />
          <span>DIRECT DEVICE-TO-DEVICE MESH STREAM • ZERO CENTRAL STORAGE</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.25rem' }}>
          <button className="hud-btn" onClick={onClose} style={{ padding: '0.75rem 1.5rem', fontSize: '0.8rem' }}>
            CANCEL
          </button>
          <button
            className="hud-btn hud-btn-orange"
            disabled={!selectedFile || !effectiveTargetId}
            onClick={handleSubmit}
            style={{
              padding: '0.75rem 2rem',
              fontSize: '0.8rem',
              opacity: !selectedFile || !effectiveTargetId ? 0.4 : 1,
              cursor: !selectedFile || !effectiveTargetId ? 'not-allowed' : 'pointer',
            }}
          >
            INITIATE TRANSFER ➔
          </button>
        </div>
      </div>
    </div>
  );
};

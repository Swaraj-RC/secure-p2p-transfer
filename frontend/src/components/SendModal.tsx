import React, { useState, useRef } from 'react';
import { UploadCloud, Shield, FileCheck, X, Laptop, Smartphone, Globe, Radio, Terminal, Plus, Trash2, Layers } from 'lucide-react';
import { Device } from '../types';
import { soundFX } from '../services/sound';

interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
  peers: Device[];
  onStartSend: (files: File[], targetPeerId: string) => void;
}

export const SendModal: React.FC<SendModalProps> = ({
  isOpen,
  onClose,
  peers,
  onStartSend,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [targetMode, setTargetMode] = useState<'detected' | 'direct'>('direct');
  const [selectedPeerId, setSelectedPeerId] = useState<string>('');
  const [customIpAddress, setCustomIpAddress] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const dropped = Array.from(e.dataTransfer.files);
      setSelectedFiles((prev) => {
        const existingNames = new Set(prev.map((f) => `${f.name}-${f.size}-${f.lastModified}`));
        const uniqueNew = dropped.filter((f) => !existingNames.has(`${f.name}-${f.size}-${f.lastModified}`));
        return [...prev, ...uniqueNew];
      });
      soundFX.playClick();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);
      setSelectedFiles((prev) => {
        const existingNames = new Set(prev.map((f) => `${f.name}-${f.size}-${f.lastModified}`));
        const uniqueNew = selected.filter((f) => !existingNames.has(`${f.name}-${f.size}-${f.lastModified}`));
        return [...prev, ...uniqueNew];
      });
      soundFX.playClick();
      e.target.value = '';
    }
  };

  const handleRemoveFile = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    soundFX.playClick();
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFiles([]);
    soundFX.playClick();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const totalBytes = selectedFiles.reduce((acc, f) => acc + f.size, 0);
  const effectiveTargetId = targetMode === 'direct' ? customIpAddress.trim() : selectedPeerId;

  const handleSubmit = () => {
    if (selectedFiles.length === 0 || !effectiveTargetId) return;
    soundFX.playClick();
    onStartSend(selectedFiles, effectiveTargetId);
    setSelectedFiles([]);
    onClose();
  };

  return (
    <div className="hud-modal-overlay" onClick={onClose}>
      <div className="hud-modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
        {/* Corner Reticles */}
        <div className="hud-corner-tl" />
        <div className="hud-corner-tr" />
        <div className="hud-corner-bl" />
        <div className="hud-corner-br" />

        <div className="hud-modal-header">
          <div className="hud-modal-title">
            <UploadCloud size={20} />
            <span>TRANSMIT PAYLOAD // SEND {selectedFiles.length > 1 ? `(${selectedFiles.length} FILES)` : ''}</span>
          </div>
          <button className="hud-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* 1. Drag & Drop File Zone / Multiple File Staging Deck */}
        <input
          type="file"
          ref={fileInputRef}
          multiple
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />

        {selectedFiles.length === 0 ? (
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
            <UploadCloud size={40} color="var(--hud-orange)" />
            <div style={{ color: '#fff', fontSize: '0.95rem', letterSpacing: '0.1em' }}>
              DRAG & DROP <span style={{ color: 'var(--hud-orange)' }}>ONE OR MULTIPLE FILES</span> OR BROWSE
            </div>
            <div style={{ color: 'var(--hud-text-dim)', fontSize: '0.75rem' }}>
              SUPPORTS BATCH TRANSMISSIONS • AUTOMATIC AES-256-GCM CHUNKING
            </div>
          </div>
        ) : (
          <div
            style={{
              border: '1px solid var(--hud-orange)',
              background: 'rgba(0,0,0,0.45)',
              padding: '1rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem',
                paddingBottom: '0.5rem',
                borderBottom: '1px solid rgba(255,107,0,0.2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--hud-orange)', fontSize: '0.85rem', fontWeight: 600 }}>
                <Layers size={16} />
                <span>STAGED FILES ({selectedFiles.length}) • TOTAL: {formatFileSize(totalBytes)}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="hud-btn"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Plus size={12} /> ADD MORE
                </button>
                <button
                  className="hud-btn"
                  onClick={handleClearAll}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.7rem', borderColor: 'var(--hud-red)', color: 'var(--hud-red)' }}
                >
                  <Trash2 size={12} /> CLEAR
                </button>
              </div>
            </div>

            {/* Scrollable File List */}
            <div
              className="hud-file-deck"
              style={{
                maxHeight: '180px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
                paddingRight: '0.25rem',
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
            >
              {selectedFiles.map((file, idx) => (
                <div
                  key={`${file.name}-${idx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.75rem',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,107,0,0.15)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', overflow: 'hidden' }}>
                    <FileCheck size={16} color="var(--hud-orange)" style={{ flexShrink: 0 }} />
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {file.name}
                      </div>
                      <div style={{ color: 'var(--hud-text-dim)', fontSize: '0.7rem' }}>
                        {formatFileSize(file.size)} • {file.type || 'binary/stream'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleRemoveFile(idx, e)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--hud-text-dim)',
                      cursor: 'pointer',
                      padding: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Remove file"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

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
            disabled={selectedFiles.length === 0 || !effectiveTargetId}
            onClick={handleSubmit}
            style={{
              padding: '0.75rem 2rem',
              fontSize: '0.8rem',
              opacity: selectedFiles.length === 0 || !effectiveTargetId ? 0.4 : 1,
              cursor: selectedFiles.length === 0 || !effectiveTargetId ? 'not-allowed' : 'pointer',
            }}
          >
            {selectedFiles.length > 1 ? `INITIATE BATCH (${selectedFiles.length} FILES) ➔` : 'INITIATE TRANSFER ➔'}
          </button>
        </div>
      </div>
    </div>
  );
};


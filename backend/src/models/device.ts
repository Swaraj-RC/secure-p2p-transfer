export interface DeviceCapabilities {
  supportsFolder: boolean;
  supportsBatch: boolean;
  maxFileSize: number; // In bytes
  webrtcSupported: boolean;
  encryptionTypes: string[];
}

export interface Device {
  id: string;                 // Unique device UUID
  name: string;               // User-friendly device name
  type: 'android' | 'windows' | 'linux' | 'macos' | 'web';
  platform: string;           // OS details / Browser agent
  ipAddress: string;          // Detected IP address
  localIp?: string;           // Local network IP reported by client
  port?: number;              // Transfer listening port
  publicKey?: string;         // Public key for ECDH / E2EE
  lastSeen: Date;             // Last heartbeat
  isOnline: boolean;
  avatarUrl?: string;
  capabilities: DeviceCapabilities;
}

export interface RegisterDeviceDto {
  name: string;
  type: 'android' | 'windows' | 'linux' | 'macos' | 'web';
  platform?: string;
  localIp?: string;
  port?: number;
  publicKey?: string;
  capabilities?: Partial<DeviceCapabilities>;
}

export type DeviceType = 'android' | 'windows' | 'linux' | 'macos' | 'web';

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  platform: string;
  ipAddress: string;
  localIp?: string;
  port?: number;
  publicKey?: string;
  lastSeen: string;
  isOnline: boolean;
}

export type TransferStatus = 'idle' | 'offering' | 'connecting' | 'transferring' | 'completed' | 'failed' | 'cancelled';
export type TransferDirection = 'send' | 'receive';

export interface TransferItem {
  id: string;
  direction: TransferDirection;
  fileName: string;
  fileSize: number;
  mimeType?: string;
  peerId: string;
  peerName: string;
  status: TransferStatus;
  progress: number; // 0 - 100
  bytesTransferred: number;
  totalBytes: number;
  speedMBps: number;
  etaSeconds: number;
  chunksCompleted: number;
  totalChunks: number;
  fileHash?: string;
  calculatedHash?: string;
  error?: string;
  startedAt: number;
  completedAt?: number;
  blobUrl?: string;
}

export interface SignalingMessage<T = any> {
  type: string;
  senderId?: string;
  targetId?: string;
  timestamp?: number;
  payload?: T;
  error?: string;
}

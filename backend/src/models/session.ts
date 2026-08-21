import WebSocket from 'ws';

export interface Session {
  sessionId: string;
  deviceId: string;
  token: string;
  connectedAt: Date;
  lastActivity: Date;
  isActive: boolean;
  ipAddress: string;
  userAgent: string;
  ws?: WebSocket;
}

export interface JwtPayload {
  deviceId: string;
  deviceName: string;
  type: string;
  sessionId: string;
  iat?: number;
  exp?: number;
}

import { Device, SignalingMessage } from '../types';

type MessageHandler = (message: SignalingMessage) => void;

export class SignalingClient {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private reconnectTimer: any = null;
  private pingInterval: any = null;
  private currentDevice: Device | null = null;
  private isConnected: boolean = false;
  private onConnectionChangeCallback?: (connected: boolean) => void;

  constructor(url?: string) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    this.url = url || `${protocol}//${host}/ws`;
  }

  public connect(deviceName?: string, onStatus?: (connected: boolean) => void) {
    if (onStatus) this.onConnectionChangeCallback = onStatus;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(this.url);
    } catch (e) {
      console.warn('WebSocket connection failed to initiate:', e);
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.isConnected = true;
      if (this.onConnectionChangeCallback) this.onConnectionChangeCallback(true);

      const name = deviceName || `Web-Node-${Math.floor(1000 + Math.random() * 9000)}`;
      this.send({
        type: 'REGISTER',
        payload: {
          name,
          type: 'web',
          platform: navigator.userAgent.slice(0, 40),
          capabilities: {
            supportsFolder: false,
            supportsBatch: true,
            maxFileSize: 2 * 1024 * 1024 * 1024,
            webrtcSupported: true,
            encryptionTypes: ['AES-256-GCM'],
          },
        },
      });

      // Keepalive heartbeat
      clearInterval(this.pingInterval);
      this.pingInterval = setInterval(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.send({ type: 'KEEP_ALIVE' });
        }
      }, 20000);
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: SignalingMessage = JSON.parse(event.data);
        if (msg.type === 'REGISTER' && msg.payload?.device) {
          this.currentDevice = msg.payload.device;
        }

        const listeners = this.handlers.get(msg.type);
        if (listeners) {
          listeners.forEach((handler) => handler(msg));
        }

        // Wildcard listeners
        const wildcard = this.handlers.get('*');
        if (wildcard) {
          wildcard.forEach((handler) => handler(msg));
        }
      } catch (e) {
        console.error('Failed to parse signaling message:', e);
      }
    };

    this.ws.onclose = () => {
      this.isConnected = false;
      if (this.onConnectionChangeCallback) this.onConnectionChangeCallback(false);
      clearInterval(this.pingInterval);
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      if (this.ws) this.ws.close();
    };
  }

  private scheduleReconnect() {
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, 4000);
  }

  public send(message: SignalingMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      if (this.currentDevice && !message.senderId) {
        message.senderId = this.currentDevice.id;
      }
      this.ws.send(JSON.stringify(message));
    }
  }

  public on(type: string, handler: MessageHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
    return () => {
      this.handlers.get(type)?.delete(handler);
    };
  }

  public getCurrentDevice(): Device | null {
    return this.currentDevice;
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  public disconnect() {
    clearTimeout(this.reconnectTimer);
    clearInterval(this.pingInterval);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const signalingClient = new SignalingClient();

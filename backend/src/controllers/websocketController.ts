import WebSocket, { Server as WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { authService } from '../services/authService';
import { deviceService } from '../services/deviceService';
import { sessionService } from '../services/sessionService';
import { signalingService } from '../services/signalingService';
import { relayService } from '../services/relayService';
import { SignalingMessage } from '../models/signaling';
import { logger } from '../utils/logger';

export class WebSocketController {
  private wss: WebSocketServer;

  constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.initialize();
  }

  private initialize(): void {
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      this.handleConnection(ws, req);
    });

    // Inactivity heartbeat sweeper
    setInterval(() => {
      const removedIds = deviceService.cleanupInactiveDevices(60000);
      for (const id of removedIds) {
        sessionService.removeSession(id);
        signalingService.broadcast({
          type: 'DEVICE_LEFT',
          senderId: id,
          timestamp: Date.now(),
          payload: { deviceId: id },
        });
      }
    }, 15000);

    // Log active peer count every 30s
    setInterval(() => {
      const count = deviceService.getAllOnlineDevices().length;
      if (count > 0) {
        logger.info(`📊 Active peers in mesh: ${count}`);
      }
    }, 30000);
  }

  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    logger.info(`Incoming WebSocket connection from ${ip}`);

    // Parse token from query param ?token=... if provided
    const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const token = url.searchParams.get('token');

    let authenticatedDeviceId: string | null = null;

    if (token) {
      try {
        const payload = authService.verifyToken(token);
        authenticatedDeviceId = payload.deviceId;
        sessionService.bindWebSocket(authenticatedDeviceId, ws);
        deviceService.updateHeartbeat(authenticatedDeviceId);

        const currentDevice = deviceService.getDevice(authenticatedDeviceId);
        if (currentDevice) {
          currentDevice.isOnline = true;
          // Notify other peers that device joined
          signalingService.broadcast(
            {
              type: 'DEVICE_JOINED',
              senderId: authenticatedDeviceId,
              timestamp: Date.now(),
              payload: { device: currentDevice },
            },
            authenticatedDeviceId
          );

          // Send current online device list to connected device
          const peers = deviceService.getAllOnlineDevices(authenticatedDeviceId);
          this.sendMessage(ws, {
            type: 'DEVICE_LIST',
            timestamp: Date.now(),
            payload: { devices: peers },
          });
        }
        logger.info(`WebSocket authenticated via URL token for device: [${authenticatedDeviceId}]`);
      } catch (err: any) {
        logger.warn(`Invalid token in WebSocket connection query: ${err.message}`);
      }
    }

    ws.on('message', (rawData: WebSocket.RawData) => {
      try {
        const text = rawData.toString();
        const message: SignalingMessage = JSON.parse(text);
        this.processMessage(ws, message, req);
      } catch (err: any) {
        logger.error('Error handling WebSocket message:', err);
        this.sendMessage(ws, {
          type: 'ERROR',
          error: 'Malformed JSON message',
          timestamp: Date.now(),
        });
      }
    });

    ws.on('close', () => {
      const deviceId = sessionService.removeSessionByWs(ws);
      if (deviceId) {
        const device = deviceService.setDeviceOffline(deviceId);
        logger.info(`WebSocket closed for device [${deviceId}]`);
        signalingService.broadcast({
          type: 'DEVICE_LEFT',
          senderId: deviceId,
          timestamp: Date.now(),
          payload: { deviceId, deviceName: device?.name },
        });
      }
    });

    ws.on('error', (err) => {
      logger.error('WebSocket client error:', err);
    });
  }

  private processMessage(ws: WebSocket, message: SignalingMessage, req: IncomingMessage): void {
    const senderId = sessionService.getDeviceIdByWs(ws) || message.senderId;

    switch (message.type) {
      case 'REGISTER': {
        const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
        const userAgent = req.headers['user-agent'] || 'Unknown';
        const dto = message.payload || { name: 'Anonymous Peer' };

        const device = deviceService.registerDevice(dto, ip, message.senderId);
        const { token, sessionId } = authService.generateToken(device);
        sessionService.createSession(sessionId, device.id, token, ip, userAgent, ws);

        this.sendMessage(ws, {
          type: 'REGISTER',
          senderId: device.id,
          timestamp: Date.now(),
          payload: { device, token, sessionId },
        });

        // Broadcast to existing peers
        signalingService.broadcast(
          {
            type: 'DEVICE_JOINED',
            senderId: device.id,
            timestamp: Date.now(),
            payload: { device },
          },
          device.id
        );

        // Send existing peers to this newly registered peer
        const peers = deviceService.getAllOnlineDevices(device.id);
        this.sendMessage(ws, {
          type: 'DEVICE_LIST',
          timestamp: Date.now(),
          payload: { devices: peers },
        });

        logger.info(`✅ Device registered: [${device.id}] "${device.name}" from ${ip} — ${peers.length} peers online`);
        break;
      }

      case 'GET_DEVICES': {
        const devId = senderId || '';
        const peers = deviceService.getAllOnlineDevices(devId);
        this.sendMessage(ws, {
          type: 'DEVICE_LIST',
          timestamp: Date.now(),
          payload: { devices: peers },
        });
        break;
      }

      case 'KEEP_ALIVE': {
        if (senderId) {
          deviceService.updateHeartbeat(senderId);
          sessionService.touchSession(senderId);
        }
        this.sendMessage(ws, {
          type: 'PONG',
          timestamp: Date.now(),
        });
        break;
      }

      case 'SEND_OFFER':
      case 'SEND_ANSWER':
      case 'SEND_ICE_CANDIDATE':
      case 'TRANSFER_REQUEST':
      case 'TRANSFER_ACCEPT':
      case 'TRANSFER_REJECT':
      case 'TRANSFER_PROGRESS':
      case 'TRANSFER_COMPLETE': {
        if (!message.targetId) {
          this.sendMessage(ws, {
            type: 'ERROR',
            error: 'Target device ID is required for peer signaling',
            timestamp: Date.now(),
          });
          return;
        }

        const forwarded = signalingService.sendToDevice(message.targetId, {
          ...message,
          senderId,
          timestamp: Date.now(),
        });

        if (!forwarded) {
          this.sendMessage(ws, {
            type: 'ERROR',
            error: `Target peer ${message.targetId} is offline or unreachable`,
            timestamp: Date.now(),
          });
        } else if (message.type === 'TRANSFER_REQUEST') {
          logger.info(`📨 Transfer request from [${senderId}] → [${message.targetId}]: "${message.payload?.fileName}" (${((message.payload?.fileSize || 0) / (1024 * 1024)).toFixed(2)} MB)`);
        } else if (message.type === 'TRANSFER_COMPLETE') {
          logger.info(`✅ Transfer complete from [${senderId}] → [${message.targetId}]`);
        }
        break;
      }

      case 'RELAY_DATA': {
        if (!senderId || !message.targetId || !message.payload) {
          this.sendMessage(ws, {
            type: 'ERROR',
            error: 'Missing senderId, targetId, or payload for relay data',
            timestamp: Date.now(),
          });
          return;
        }

        relayService.relayChunk(senderId, message.targetId, message.payload);
        break;
      }

      default:
        logger.warn(`Unknown signaling message type: ${(message as any).type}`);
        break;
    }
  }

  private sendMessage(ws: WebSocket, message: SignalingMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
}

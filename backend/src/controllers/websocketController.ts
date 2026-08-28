import WebSocket, { Server as WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { authService } from '../services/authService';
import { deviceService } from '../services/deviceService';
import { sessionService } from '../services/sessionService';
import { signalingService } from '../services/signalingService';
import { relayService } from '../services/relayService';
import { SignalingMessage } from '../models/signaling';
import { logger } from '../utils/logger';

// STRICT ZERO-LOGS / ZERO-METADATA POLICY:
// The server NEVER records filenames, file sizes, payload contents, or user data.

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

    // Inactivity sweeper (cleans up stale connections in memory)
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
  }

  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
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
          signalingService.broadcast(
            {
              type: 'DEVICE_JOINED',
              senderId: authenticatedDeviceId,
              timestamp: Date.now(),
              payload: { device: currentDevice },
            },
            authenticatedDeviceId
          );

          const peers = deviceService.getAllOnlineDevices(authenticatedDeviceId);
          this.sendMessage(ws, {
            type: 'DEVICE_LIST',
            timestamp: Date.now(),
            payload: { devices: peers },
          });
        }
      } catch {}
    }

    ws.on('message', (rawData: WebSocket.RawData) => {
      try {
        const text = rawData.toString();
        const message: SignalingMessage = JSON.parse(text);
        this.processMessage(ws, message, req);
      } catch {
        this.sendMessage(ws, {
          type: 'ERROR',
          error: 'Malformed message',
          timestamp: Date.now(),
        });
      }
    });

    ws.on('close', () => {
      const deviceId = sessionService.removeSessionByWs(ws);
      if (deviceId) {
        const device = deviceService.setDeviceOffline(deviceId);
        signalingService.broadcast({
          type: 'DEVICE_LEFT',
          senderId: deviceId,
          timestamp: Date.now(),
          payload: { deviceId, deviceName: device?.name },
        });
      }
    });

    ws.on('error', () => {});
  }

  private processMessage(ws: WebSocket, message: SignalingMessage, req: IncomingMessage): void {
    const senderId = sessionService.getDeviceIdByWs(ws) || message.senderId;

    switch (message.type) {
      case 'REGISTER': {
        const userAgent = req.headers['user-agent'] || 'Unknown';
        const dto = message.payload || { name: 'Anonymous Peer' };

        const device = deviceService.registerDevice(dto, '0.0.0.0', message.senderId);
        const { token, sessionId } = authService.generateToken(device);
        sessionService.createSession(sessionId, device.id, token, '0.0.0.0', userAgent, ws);

        this.sendMessage(ws, {
          type: 'REGISTER',
          senderId: device.id,
          timestamp: Date.now(),
          payload: { device, token, sessionId },
        });

        // Broadcast presence
        signalingService.broadcast(
          {
            type: 'DEVICE_JOINED',
            senderId: device.id,
            timestamp: Date.now(),
            payload: { device },
          },
          device.id
        );

        // Send online peer list
        const peers = deviceService.getAllOnlineDevices(device.id);
        this.sendMessage(ws, {
          type: 'DEVICE_LIST',
          timestamp: Date.now(),
          payload: { devices: peers },
        });
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
      case 'TRANSFER_CANCEL':
      case 'TRANSFER_PROGRESS':
      case 'TRANSFER_COMPLETE': {
        if (!message.targetId) {
          this.sendMessage(ws, {
            type: 'ERROR',
            error: 'Target device ID is required',
            timestamp: Date.now(),
          });
          return;
        }

        // Blind forwarding without logging file names, sizes, or metadata
        const forwarded = signalingService.sendToDevice(message.targetId, {
          ...message,
          senderId,
          timestamp: Date.now(),
        });

        if (!forwarded) {
          this.sendMessage(ws, {
            type: 'ERROR',
            error: 'Target peer is offline or unreachable',
            timestamp: Date.now(),
          });
        }
        break;
      }

      case 'RELAY_DATA': {
        if (!senderId || !message.targetId || !message.payload) {
          this.sendMessage(ws, {
            type: 'ERROR',
            error: 'Invalid relay packet',
            timestamp: Date.now(),
          });
          return;
        }

        // Blind stream forwarding
        relayService.relayChunk(senderId, message.targetId, message.payload);
        break;
      }

      default:
        break;
    }
  }

  private sendMessage(ws: WebSocket, message: SignalingMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
}

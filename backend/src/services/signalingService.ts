import WebSocket from 'ws';
import { SignalingMessage } from '../models/signaling';
import { sessionService } from './sessionService';
import { deviceService } from './deviceService';
import { logger } from '../utils/logger';

export class SignalingService {
  public sendToDevice(targetDeviceId: string, message: SignalingMessage): boolean {
    // Try exact device session first
    let session = sessionService.getSessionByDeviceId(targetDeviceId);

    // If not found, try resolving via IP address or device identifier
    if (!session || !session.ws || session.ws.readyState !== WebSocket.OPEN) {
      const resolvedDevice = deviceService.findDevice(targetDeviceId);
      if (resolvedDevice) {
        session = sessionService.getSessionByDeviceId(resolvedDevice.id);
      }
    }

    if (!session || !session.ws || session.ws.readyState !== WebSocket.OPEN) {
      logger.warn(`Cannot send message ${message.type} to device/IP "${targetDeviceId}": Peer offline or unreachable`);
      return false;
    }

    try {
      session.ws.send(JSON.stringify(message));
      return true;
    } catch (err: any) {
      logger.error(`Error sending message to device ${targetDeviceId}:`, err);
      return false;
    }
  }

  public broadcast(message: SignalingMessage, excludeDeviceId?: string): number {
    const onlineDevices = deviceService.getAllOnlineDevices(excludeDeviceId);
    let sentCount = 0;

    for (const dev of onlineDevices) {
      if (this.sendToDevice(dev.id, message)) {
        sentCount++;
      }
    }
    return sentCount;
  }

  public handleRelay(senderId: string, targetId: string, message: SignalingMessage): boolean {
    logger.debug(`Relaying ${message.type} from [${senderId}] to [${targetId}]`);
    return this.sendToDevice(targetId, {
      ...message,
      senderId,
      timestamp: Date.now(),
    });
  }
}

export const signalingService = new SignalingService();

import { RelayDataPayload } from '../models/signaling';
import { signalingService } from './signalingService';
import { logger } from '../utils/logger';

export class RelayService {
  private activeRelays: Map<string, { senderId: string; targetId: string; totalBytes: number }> = new Map();

  public relayChunk(senderId: string, targetId: string, payload: RelayDataPayload): boolean {
    const success = signalingService.sendToDevice(targetId, {
      type: 'RELAY_DATA',
      senderId,
      targetId,
      timestamp: Date.now(),
      payload,
    });

    if (success) {
      const stats = this.activeRelays.get(payload.transferId) || { senderId, targetId, totalBytes: 0 };
      stats.totalBytes += payload.data.length;
      this.activeRelays.set(payload.transferId, stats);
    } else {
      logger.warn(`Relay chunk failed for transfer ${payload.transferId} chunk #${payload.chunkIndex}`);
    }

    return success;
  }

  public finishRelay(transferId: string): void {
    const stats = this.activeRelays.get(transferId);
    if (stats) {
      logger.info(`Completed relay for transfer [${transferId}]: relayed ~${(stats.totalBytes / 1024).toFixed(2)} KB`);
      this.activeRelays.delete(transferId);
    }
  }
}

export const relayService = new RelayService();

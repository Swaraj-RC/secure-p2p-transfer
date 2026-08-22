import { RelayDataPayload } from '../models/signaling';
import { signalingService } from './signalingService';

export class RelayService {
  public relayChunk(senderId: string, targetId: string, payload: RelayDataPayload): boolean {
    return signalingService.sendToDevice(targetId, {
      type: 'RELAY_DATA',
      senderId,
      targetId,
      timestamp: Date.now(),
      payload,
    });
  }

  public finishRelay(_transferId: string): void {
    // No-op for maximum privacy
  }
}

export const relayService = new RelayService();

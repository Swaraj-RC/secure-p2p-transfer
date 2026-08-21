import { Request, Response } from 'express';
import { deviceService } from '../services/deviceService';

export class HealthController {
  public getHealth(_req: Request, res: Response): void {
    const devices = deviceService.getAllOnlineDevices();
    res.status(200).json({
      status: 'UP',
      service: 'Secure P2P Signaling Server',
      version: '1.0.0',
      uptimeSeconds: process.uptime(),
      activePeers: devices.length,
      timestamp: new Date().toISOString(),
    });
  }
}

export const healthController = new HealthController();

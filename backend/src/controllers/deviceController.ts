import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { deviceService } from '../services/deviceService';
import { AppError } from '../middleware/errorHandler';

export class DeviceController {
  public async getDevices(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentDeviceId = req.user?.deviceId;
      const devices = deviceService.getAllOnlineDevices(currentDeviceId);

      res.status(200).json({
        success: true,
        data: {
          devices,
          count: devices.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public async getDeviceById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const device = deviceService.getDevice(id);
      if (!device) {
        throw new AppError('Device not found', 404);
      }

      res.status(200).json({
        success: true,
        data: { device },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const deviceController = new DeviceController();

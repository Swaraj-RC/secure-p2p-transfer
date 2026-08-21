import { Request, Response, NextFunction } from 'express';
import { deviceService } from '../services/deviceService';
import { authService } from '../services/authService';
import { sessionService } from '../services/sessionService';
import { RegisterDeviceDto } from '../models/device';
import { AppError } from '../middleware/errorHandler';

export class AuthController {
  public async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto: RegisterDeviceDto = req.body;
      if (!dto.name) {
        throw new AppError('Device name is required', 400);
      }

      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'Unknown';

      const device = deviceService.registerDevice(dto, ipAddress);
      const { token, sessionId } = authService.generateToken(device);

      sessionService.createSession(sessionId, device.id, token, ipAddress, userAgent);

      res.status(201).json({
        success: true,
        data: {
          device,
          token,
          sessionId,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();

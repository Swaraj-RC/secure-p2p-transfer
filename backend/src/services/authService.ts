import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/config';
import { JwtPayload } from '../models/session';
import { Device } from '../models/device';

export class AuthService {
  public generateToken(device: Device): { token: string; sessionId: string } {
    const sessionId = uuidv4();
    const payload: JwtPayload = {
      deviceId: device.id,
      deviceName: device.name,
      type: device.type,
      sessionId,
    };

    const token = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiry as any,
    });

    return { token, sessionId };
  }

  public verifyToken(token: string): JwtPayload {
    return jwt.verify(token, config.jwtSecret) as JwtPayload;
  }
}

export const authService = new AuthService();

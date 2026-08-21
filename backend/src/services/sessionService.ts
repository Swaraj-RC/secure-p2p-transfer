import WebSocket from 'ws';
import { Session } from '../models/session';
import { logger } from '../utils/logger';

export class SessionService {
  private sessionsByDeviceId: Map<string, Session> = new Map();
  private deviceIdByWs: Map<WebSocket, string> = new Map();

  public createSession(
    sessionId: string,
    deviceId: string,
    token: string,
    ipAddress: string,
    userAgent: string,
    ws?: WebSocket
  ): Session {
    const session: Session = {
      sessionId,
      deviceId,
      token,
      connectedAt: new Date(),
      lastActivity: new Date(),
      isActive: true,
      ipAddress,
      userAgent,
      ws,
    };

    this.sessionsByDeviceId.set(deviceId, session);
    if (ws) {
      this.deviceIdByWs.set(ws, deviceId);
    }

    logger.info(`Session created: [${sessionId}] for device [${deviceId}]`);
    return session;
  }

  public bindWebSocket(deviceId: string, ws: WebSocket): void {
    const session = this.sessionsByDeviceId.get(deviceId);
    if (session) {
      session.ws = ws;
      session.lastActivity = new Date();
      session.isActive = true;
      this.deviceIdByWs.set(ws, deviceId);
    }
  }

  public getSessionByDeviceId(deviceId: string): Session | undefined {
    return this.sessionsByDeviceId.get(deviceId);
  }

  public getDeviceIdByWs(ws: WebSocket): string | undefined {
    return this.deviceIdByWs.get(ws);
  }

  public touchSession(deviceId: string): void {
    const session = this.sessionsByDeviceId.get(deviceId);
    if (session) {
      session.lastActivity = new Date();
    }
  }

  public removeSessionByWs(ws: WebSocket): string | undefined {
    const deviceId = this.deviceIdByWs.get(ws);
    if (deviceId) {
      this.deviceIdByWs.delete(ws);
      const session = this.sessionsByDeviceId.get(deviceId);
      if (session && session.ws === ws) {
        session.isActive = false;
        session.ws = undefined;
      }
    }
    return deviceId;
  }

  public removeSession(deviceId: string): void {
    const session = this.sessionsByDeviceId.get(deviceId);
    if (session && session.ws) {
      this.deviceIdByWs.delete(session.ws);
    }
    this.sessionsByDeviceId.delete(deviceId);
  }
}

export const sessionService = new SessionService();

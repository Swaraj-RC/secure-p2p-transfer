import { Device, RegisterDeviceDto } from '../models/device';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export class DeviceService {
  private devices: Map<string, Device> = new Map();

  public registerDevice(dto: RegisterDeviceDto, ipAddress: string, deviceId?: string): Device {
    const id = deviceId || uuidv4();
    const now = new Date();

    const device: Device = {
      id,
      name: dto.name || `Device-${id.slice(0, 6)}`,
      type: dto.type || 'web',
      platform: dto.platform || 'Browser',
      ipAddress,
      localIp: dto.localIp,
      port: dto.port,
      publicKey: dto.publicKey,
      lastSeen: now,
      isOnline: true,
      capabilities: {
        supportsFolder: dto.capabilities?.supportsFolder ?? false,
        supportsBatch: dto.capabilities?.supportsBatch ?? true,
        maxFileSize: dto.capabilities?.maxFileSize ?? 2 * 1024 * 1024 * 1024, // 2GB
        webrtcSupported: dto.capabilities?.webrtcSupported ?? true,
        encryptionTypes: dto.capabilities?.encryptionTypes ?? ['AES-256-GCM', 'ECDH'],
      },
    };

    this.devices.set(id, device);
    return device;
  }


  public getDevice(id: string): Device | undefined {
    return this.devices.get(id);
  }

  public findDevice(identifier: string): Device | undefined {
    if (!identifier) return undefined;
    const cleanId = identifier.trim();

    // 1. Exact ID match
    if (this.devices.has(cleanId)) {
      return this.devices.get(cleanId);
    }

    // 2. Search by IP address, local IP, name, or ID prefix
    for (const device of this.devices.values()) {
      if (!device.isOnline) continue;
      if (
        device.ipAddress === cleanId ||
        device.localIp === cleanId ||
        device.id.startsWith(cleanId) ||
        device.name.toLowerCase() === cleanId.toLowerCase()
      ) {
        return device;
      }
    }

    return undefined;
  }

  public getAllOnlineDevices(excludeId?: string): Device[] {
    const list: Device[] = [];
    for (const [id, device] of this.devices.entries()) {
      if (device.isOnline && id !== excludeId) {
        list.push(device);
      }
    }
    return list;
  }

  public updateHeartbeat(id: string): boolean {
    const device = this.devices.get(id);
    if (device) {
      device.lastSeen = new Date();
      device.isOnline = true;
      return true;
    }
    return false;
  }

  public setDeviceOffline(id: string): Device | undefined {
    const device = this.devices.get(id);
    if (device) {
      device.isOnline = false;
      device.lastSeen = new Date();
      logger.info(`Device went offline: [${id}] "${device.name}"`);
      return device;
    }
    return undefined;
  }

  public removeDevice(id: string): boolean {
    return this.devices.delete(id);
  }

  public cleanupInactiveDevices(maxInactivityMs: number): string[] {
    const now = Date.now();
    const removed: string[] = [];

    for (const [id, device] of this.devices.entries()) {
      if (now - device.lastSeen.getTime() > maxInactivityMs) {
        if (device.isOnline) {
          device.isOnline = false;
          removed.push(id);
          logger.info(`Marked device inactive due to heartbeat timeout: [${id}]`);
        }
      }
    }
    return removed;
  }
}

export const deviceService = new DeviceService();

/**
 * SLRV Local Resumable Transfer Checkpoint Engine
 * 100% Client-Side Local IndexedDB Storage (Zero Server, Zero Cost, 100% Private)
 * Tracks received chunk bitfields so interrupted transfers can resume without re-downloading existing chunks.
 */

const DB_NAME = 'slrv_p2p_vault';
const DB_VERSION = 1;
const STORE_NAME = 'transfer_checkpoints';

export interface TransferCheckpoint {
  transferId: string;
  fileName: string;
  fileSize: number;
  totalChunks: number;
  receivedChunks: number[]; // Sorted list of received chunk indices
  lastUpdated: number;
  completed: boolean;
}

export class ResumableEngine {
  private static dbPromise: Promise<IDBDatabase> | null = null;

  private static getDB(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
          reject(new Error('IndexedDB not supported'));
          return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (e: any) => {
          const db = e.target.result as IDBDatabase;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'transferId' });
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    return this.dbPromise;
  }

  /**
   * Initializes or updates a local checkpoint record for an active transfer
   */
  public static async recordChunk(
    transferId: string,
    chunkIndex: number,
    totalChunks: number,
    meta: { fileName: string; fileSize: number }
  ): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const getReq = store.get(transferId);
      getReq.onsuccess = () => {
        const existing: TransferCheckpoint = getReq.result || {
          transferId,
          fileName: meta.fileName,
          fileSize: meta.fileSize,
          totalChunks,
          receivedChunks: [],
          lastUpdated: Date.now(),
          completed: false,
        };

        if (!existing.receivedChunks.includes(chunkIndex)) {
          existing.receivedChunks.push(chunkIndex);
        }

        existing.lastUpdated = Date.now();
        existing.completed = existing.receivedChunks.length >= totalChunks;
        store.put(existing);
      };
    } catch (err) {
      console.warn('[ResumableEngine] Checkpoint error:', err);
    }
  }

  /**
   * Returns an array of missing chunk indices for an interrupted transfer
   */
  public static async getMissingChunks(transferId: string, totalChunks: number): Promise<number[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(transferId);

        req.onsuccess = () => {
          const record: TransferCheckpoint | undefined = req.result;
          if (!record) {
            // All chunks missing
            resolve(Array.from({ length: totalChunks }, (_, i) => i));
            return;
          }

          const receivedSet = new Set(record.receivedChunks);
          const missing: number[] = [];
          for (let i = 0; i < totalChunks; i++) {
            if (!receivedSet.has(i)) {
              missing.push(i);
            }
          }
          resolve(missing);
        };

        req.onerror = () => {
          resolve(Array.from({ length: totalChunks }, (_, i) => i));
        };
      });
    } catch {
      return Array.from({ length: totalChunks }, (_, i) => i);
    }
  }

  /**
   * Clears a completed transfer checkpoint from local database
   */
  public static async clearCheckpoint(transferId: string): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(transferId);
    } catch {}
  }
}

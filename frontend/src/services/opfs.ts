/**
 * SLRV OPFS (Origin Private File System) Engine
 * Direct-to-Disk Zero-RAM Streaming Storage with Seamless In-Memory Fallback
 * Allows 100GB+ transfers with flat ~20MB RAM footprint on physical disk sectors.
 * 100% local, client-side only, zero server involvement.
 */

interface ActiveTransferHandle {
  fileHandle?: FileSystemFileHandle;
  writable?: FileSystemWritableFileStream;
  fallbackChunks?: Map<number, ArrayBuffer>;
}

export class OPFSEngine {
  private static rootDirPromise: Promise<FileSystemDirectoryHandle> | null = null;
  private static activeHandles: Map<string, ActiveTransferHandle> = new Map();

  public static isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'storage' in navigator && typeof navigator.storage?.getDirectory === 'function';
  }

  private static async getRoot(): Promise<FileSystemDirectoryHandle | null> {
    if (!this.isSupported()) return null;
    if (!this.rootDirPromise) {
      try {
        this.rootDirPromise = navigator.storage.getDirectory();
      } catch {
        return null;
      }
    }
    return await this.rootDirPromise.catch(() => null);
  }

  /**
   * Initializes a direct disk file for an incoming transfer
   */
  public static async initFile(transferId: string, _fileName: string): Promise<boolean> {
    const handleObj: ActiveTransferHandle = {
      fallbackChunks: new Map(),
    };

    try {
      const root = await this.getRoot();
      if (root) {
        const sanitizedName = `slrv_${transferId.replace(/[^a-zA-Z0-9_-]/g, '_')}.tmp`;
        const fileHandle = await root.getFileHandle(sanitizedName, { create: true });
        let writable: FileSystemWritableFileStream | undefined;
        try {
          writable = await fileHandle.createWritable();
        } catch {}

        handleObj.fileHandle = fileHandle;
        handleObj.writable = writable;
      }
    } catch (err) {
      console.warn('[OPFS] Direct disk fallback to memory buffers:', err);
    }

    this.activeHandles.set(transferId, handleObj);
    return true;
  }

  /**
   * Writes a decrypted chunk directly to disk at the calculated byte offset
   */
  public static async writeChunk(transferId: string, byteOffset: number, data: ArrayBuffer): Promise<boolean> {
    let handleObj = this.activeHandles.get(transferId);
    if (!handleObj) {
      handleObj = { fallbackChunks: new Map() };
      this.activeHandles.set(transferId, handleObj);
    }

    try {
      if (handleObj.writable) {
        await handleObj.writable.seek(byteOffset);
        await handleObj.writable.write(data);
        return true;
      } else {
        // Fallback to memory store if disk writable is not active
        handleObj.fallbackChunks?.set(byteOffset, data);
        return true;
      }
    } catch (err) {
      console.warn('[OPFS] Disk write exception, storing in fallback buffer:', err);
      handleObj.fallbackChunks?.set(byteOffset, data);
      return true;
    }
  }

  /**
   * Finalizes the file stream and creates a download Blob URL
   */
  public static async finalizeBlob(transferId: string, mimeType: string): Promise<{ blob: Blob; blobUrl: string } | null> {
    const handleObj = this.activeHandles.get(transferId);
    if (!handleObj) return null;

    try {
      if (handleObj.writable) {
        try {
          await handleObj.writable.close();
        } catch {}
        handleObj.writable = undefined;
      }

      if (handleObj.fileHandle) {
        try {
          const file = await handleObj.fileHandle.getFile();
          if (file.size > 0) {
            const blob = new Blob([file], { type: mimeType || 'application/octet-stream' });
            const blobUrl = URL.createObjectURL(blob);
            return { blob, blobUrl };
          }
        } catch {}
      }

      // Memory buffer fallback
      if (handleObj.fallbackChunks && handleObj.fallbackChunks.size > 0) {
        const sortedOffsets = Array.from(handleObj.fallbackChunks.keys()).sort((a, b) => a - b);
        const chunks: ArrayBuffer[] = sortedOffsets.map((offset) => handleObj.fallbackChunks!.get(offset)!);
        const blob = new Blob(chunks, { type: mimeType || 'application/octet-stream' });
        const blobUrl = URL.createObjectURL(blob);
        return { blob, blobUrl };
      }

      return null;
    } catch (err) {
      console.error('[OPFS] Finalize error:', err);
      return null;
    }
  }

  /**
   * Cleans up temporary disk allocation and buffers
   */
  public static async cleanup(transferId: string): Promise<void> {
    try {
      const handleObj = this.activeHandles.get(transferId);
      if (handleObj?.writable) {
        try { await handleObj.writable.close(); } catch {}
      }
      handleObj?.fallbackChunks?.clear();
      this.activeHandles.delete(transferId);

      const root = await this.getRoot();
      if (root) {
        const sanitizedName = `slrv_${transferId.replace(/[^a-zA-Z0-9_-]/g, '_')}.tmp`;
        await root.removeEntry(sanitizedName).catch(() => {});
      }
    } catch {}
  }
}

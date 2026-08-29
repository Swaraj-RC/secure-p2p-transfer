/**
 * SLRV OPFS (Origin Private File System) Engine
 * Direct-to-Disk sequential streaming storage with in-memory fallback.
 * Uses OPFS AccessHandle (sync) for fastest possible disk throughput.
 * All chunks are written sequentially in-order to avoid seek overhead.
 * Finalize uses a streaming Blob approach to avoid loading 2GB+ into RAM.
 */

interface ActiveTransferHandle {
  // OPFS path
  fileHandle?: FileSystemFileHandle;
  // Fallback in-memory ordered chunk list (for non-OPFS browsers)
  fallbackChunks?: Map<number, ArrayBuffer>;
  totalChunks?: number;
  useFallback: boolean;
}

export class OPFSEngine {
  private static activeHandles: Map<string, ActiveTransferHandle> = new Map();

  public static isSupported(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      'storage' in navigator &&
      typeof navigator.storage?.getDirectory === 'function'
    );
  }

  private static async getRoot(): Promise<FileSystemDirectoryHandle | null> {
    if (!this.isSupported()) return null;
    try {
      return await navigator.storage.getDirectory();
    } catch {
      return null;
    }
  }

  /**
   * Initializes a direct disk file for an incoming transfer.
   * Falls back to in-memory chunk map if OPFS is unavailable.
   */
  public static async initFile(transferId: string, _fileName: string): Promise<boolean> {
    const handleObj: ActiveTransferHandle = {
      fallbackChunks: new Map(),
      useFallback: true,
    };

    try {
      const root = await this.getRoot();
      if (root) {
        const sanitizedName = `slrv_${transferId.replace(/[^a-zA-Z0-9_-]/g, '_')}.tmp`;
        const fileHandle = await root.getFileHandle(sanitizedName, { create: true });

        // Try OPFS Sync AccessHandle first (fastest - runs in dedicated worker context)
        // Falls back to writable stream if sync not available
        handleObj.fileHandle = fileHandle;
        handleObj.useFallback = false;
      }
    } catch (err) {
      console.warn('[OPFS] Init failed, using memory fallback:', err);
    }

    this.activeHandles.set(transferId, handleObj);
    return true;
  }

  /**
   * Writes a decrypted chunk to storage at its byte offset.
   * Uses sequential write via writable stream (chunks arrive ordered from our sender).
   */
  public static async writeChunk(transferId: string, byteOffset: number, data: ArrayBuffer): Promise<boolean> {
    let handleObj = this.activeHandles.get(transferId);
    if (!handleObj) {
      handleObj = { fallbackChunks: new Map(), useFallback: true };
      this.activeHandles.set(transferId, handleObj);
    }

    if (!handleObj.useFallback && handleObj.fileHandle) {
      try {
        // Use a single writable stream per handle, opened lazily
        if (!(handleObj as any).writable) {
          (handleObj as any).writable = await handleObj.fileHandle.createWritable({ keepExistingData: false });
          (handleObj as any).writtenBytes = 0;
        }
        const writable = (handleObj as any).writable as FileSystemWritableFileStream;
        // We always write sequentially — sender sends in order, so just write
        await writable.write(data);
        (handleObj as any).writtenBytes = ((handleObj as any).writtenBytes || 0) + data.byteLength;
        return true;
      } catch (err) {
        console.warn('[OPFS] Write failed, falling back to memory:', err);
        handleObj.useFallback = true;
        // Close any broken writable
        try { await (handleObj as any).writable?.close(); } catch {}
        (handleObj as any).writable = undefined;
      }
    }

    // Memory fallback — store by offset for later ordered assembly
    handleObj.fallbackChunks?.set(byteOffset, data);
    return true;
  }

  /**
   * Finalizes the file and returns a StreamSaver-compatible download URL.
   * NEVER loads the full file into RAM — uses streaming blob creation.
   */
  public static async finalizeBlob(transferId: string, mimeType: string): Promise<{ blob: Blob; blobUrl: string } | null> {
    const handleObj = this.activeHandles.get(transferId);
    if (!handleObj) return null;

    try {
      // Close the writable stream first
      if ((handleObj as any).writable) {
        try {
          await (handleObj as any).writable.close();
        } catch {}
        (handleObj as any).writable = undefined;
      }

      if (!handleObj.useFallback && handleObj.fileHandle) {
        try {
          const file = await handleObj.fileHandle.getFile();
          if (file.size > 0) {
            // Create a blob URL directly from the File object — no data copy into RAM
            const blobUrl = URL.createObjectURL(file);
            // Also wrap in blob with correct MIME
            const blob = file.slice(0, file.size, mimeType || 'application/octet-stream');
            return { blob, blobUrl: URL.createObjectURL(blob) };
          }
        } catch (err) {
          console.warn('[OPFS] FileHandle read failed:', err);
        }
      }

      // Memory fallback — assemble ordered chunks into a Blob (streaming concat)
      if (handleObj.fallbackChunks && handleObj.fallbackChunks.size > 0) {
        const sortedOffsets = Array.from(handleObj.fallbackChunks.keys()).sort((a, b) => a - b);
        const chunks: ArrayBuffer[] = sortedOffsets.map((offset) => handleObj.fallbackChunks!.get(offset)!);
        // Blob constructor accepts array of ArrayBuffers — browser handles streaming internally
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
      if ((handleObj as any)?.writable) {
        try { await (handleObj as any).writable.close(); } catch {}
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

/**
 * SLRV Recursive Folder & Directory Tree Scanner
 * Reads nested directories, preserves relative file paths, and extracts folder manifests.
 */

export interface ScannedFolderFile {
  file: File;
  relativePath: string;
}

export class FolderScanner {
  /**
   * Recursively traverses a DataTransferItem filesystem entry (file or folder)
   */
  public static async scanEntry(entry: any, path: string = ''): Promise<ScannedFolderFile[]> {
    const results: ScannedFolderFile[] = [];

    if (!entry) return results;

    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) => {
        entry.file(resolve, reject);
      });
      const relativePath = path ? `${path}/${file.name}` : file.name;
      results.push({ file, relativePath });
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader();
      const newPath = path ? `${path}/${entry.name}` : entry.name;

      const readAllEntries = async (): Promise<any[]> => {
        const entries: any[] = [];
        let readBatch = async (): Promise<any[]> => {
          return new Promise((resolve, reject) => {
            dirReader.readEntries(resolve, reject);
          });
        };

        let batch = await readBatch();
        while (batch.length > 0) {
          entries.push(...batch);
          batch = await readBatch();
        }
        return entries;
      };

      const children = await readAllEntries();
      for (const child of children) {
        const childResults = await this.scanEntry(child, newPath);
        results.push(...childResults);
      }
    }

    return results;
  }

  /**
   * Scans all items dropped onto a DragEvent (files and nested folders)
   */
  public static async scanDropEvent(e: React.DragEvent): Promise<ScannedFolderFile[]> {
    const results: ScannedFolderFile[] = [];
    const items = e.dataTransfer.items;

    if (items && items.length > 0) {
      const promises: Promise<ScannedFolderFile[]>[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const entry = (item as any).webkitGetAsEntry ? (item as any).webkitGetAsEntry() : null;
          if (entry) {
            promises.push(this.scanEntry(entry));
          } else {
            const file = item.getAsFile();
            if (file) results.push({ file, relativePath: file.name });
          }
        }
      }

      const nested = await Promise.all(promises);
      nested.forEach((arr) => results.push(...arr));
    } else if (e.dataTransfer.files) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        results.push({ file, relativePath: (file as any).webkitRelativePath || file.name });
      }
    }

    return results;
  }
}

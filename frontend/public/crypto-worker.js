/**
 * SLRV Crypto Web Worker
 * Handles AES-GCM 256-bit encryption/decryption entirely off the main thread.
 * Communicates via postMessage with transferable ArrayBuffers (zero-copy).
 */

let importedKey = null;

self.onmessage = async (e) => {
  const { type, id, keyHex, data } = e.data;

  try {
    if (type === 'IMPORT_KEY') {
      const bytes = new Uint8Array(
        keyHex.match(/.{1,2}/g).map((b) => parseInt(b, 16))
      );
      importedKey = await crypto.subtle.importKey(
        'raw', bytes,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
      self.postMessage({ type: 'KEY_READY', id });
      return;
    }

    if (type === 'ENCRYPT') {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        importedKey,
        data
      );
      const result = new Uint8Array(12 + ciphertext.byteLength);
      result.set(iv, 0);
      result.set(new Uint8Array(ciphertext), 12);
      self.postMessage({ type: 'ENCRYPTED', id, data: result.buffer }, [result.buffer]);
      return;
    }

    if (type === 'DECRYPT') {
      const full = new Uint8Array(data);
      const iv = full.slice(0, 12);
      const ciphertext = full.slice(12);
      const plain = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        importedKey,
        ciphertext
      );
      self.postMessage({ type: 'DECRYPTED', id, data: plain }, [plain]);
      return;
    }
  } catch (err) {
    self.postMessage({ type: 'ERROR', id, error: err.message });
  }
};

// WebCrypto AES-GCM 256-bit & SHA-256 in-browser cryptographic engine

export class WebCryptoEngine {
  // Generate random 256-bit AES-GCM key
  public static async generateAESKey(): Promise<CryptoKey> {
    return window.crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  // Export raw key to hex string
  public static async exportKeyToHex(key: CryptoKey): Promise<string> {
    const raw = await window.crypto.subtle.exportKey('raw', key);
    return Array.from(new Uint8Array(raw))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Import raw key from hex string
  public static async importKeyFromHex(hexString: string): Promise<CryptoKey> {
    const bytes = new Uint8Array(
      hexString.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );
    return window.crypto.subtle.importKey(
      'raw',
      bytes,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  // Encrypt an ArrayBuffer with AES-256-GCM (returns 12B nonce prepended to ciphertext)
  public static async encryptChunk(key: CryptoKey, data: ArrayBuffer): Promise<ArrayBuffer> {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      data
    );

    const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.byteLength);
    return combined.buffer;
  }

  // Decrypt chunk data prepended with 12-byte IV
  public static async decryptChunk(key: CryptoKey, data: ArrayBuffer): Promise<ArrayBuffer> {
    const full = new Uint8Array(data);
    const iv = full.slice(0, 12);
    const ciphertext = full.slice(12);

    return window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      ciphertext
    );
  }

  // Calculate SHA-256 hash of an ArrayBuffer or File
  public static async computeHash(data: ArrayBuffer): Promise<string> {
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
}

import { t } from '../i18n-strings';

/** Minimum bytes we need to read to identify every supported magic-byte family. */
export const MAGIC_PROBE_BYTES = 32;

/**
 * Magic-byte signatures by canonical extension. JPEG matches FFD8FF — the
 * fourth byte (E0/E1/DB/EE/etc.) is variant-specific and intentionally not
 * checked. The WEBP probe matches `RIFF????WEBP` against bytes 0-3 + 8-11.
 */
export function detectImageFormat(bytes: Buffer): 'png' | 'jpeg' | 'gif' | 'webp' | null {
  if (bytes.length < 4) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'png';
  }

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpeg';
  }

  // GIF87a / GIF89a
  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return 'gif';
  }

  // WEBP: 'RIFF' .... 'WEBP'
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'webp';
  }

  return null;
}

/**
 * Map a normalized extension (no dot) to the format token returned by
 * {@link detectImageFormat}. JPG is folded into JPEG.
 */
export function extensionToFormat(ext: string): 'png' | 'jpeg' | 'gif' | 'webp' | null {
  if (ext === 'png') return 'png';
  if (ext === 'jpg' || ext === 'jpeg') return 'jpeg';
  if (ext === 'gif') return 'gif';
  if (ext === 'webp') return 'webp';
  return null;
}

/**
 * Verify that the buffer's magic bytes match the expected format derived
 * from the file extension. Defence-in-depth on top of the extension
 * whitelist — a renamed `.exe` with a `.png` extension is rejected here.
 */
export function assertContentMatchesExtension(
  buffer: Buffer,
  expected: 'png' | 'jpeg' | 'gif' | 'webp'
): void {
  const probe = buffer.subarray(0, MAGIC_PROBE_BYTES);
  const detected = detectImageFormat(probe);
  if (!detected) {
    throw new Error(t('sprite.notAValidImage'));
  }
  if (detected !== expected) {
    throw new Error(t('sprite.contentMismatchesExtension'));
  }
}

/**
 * Best-effort dimension check for raw image bytes. Reads PNG IHDR, JPEG SOFn,
 * GIF logical screen descriptor, and WEBP VP8/VP8L/VP8X chunks. Returns null
 * when dimensions can't be parsed (e.g. truncated file) so the caller can
 * decide whether to reject. We err on the side of accepting unparseable
 * inputs because the GDI+ loader will surface a clearer error downstream.
 */
export function readImageDimensions(
  buffer: Buffer,
  format: 'png' | 'jpeg' | 'gif' | 'webp'
): { width: number; height: number } | null {
  try {
    if (format === 'png') {
      // IHDR is the first chunk after the 8-byte signature; width and height
      // are big-endian uint32 at offsets 16 and 20.
      if (buffer.length < 24) return null;
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height };
    }
    if (format === 'gif') {
      // Logical screen descriptor at byte 6 (little-endian uint16 width/height).
      if (buffer.length < 10) return null;
      const width = buffer.readUInt16LE(6);
      const height = buffer.readUInt16LE(8);
      return { width, height };
    }
    if (format === 'webp') {
      // RIFF/WEBP container. 4-byte chunk header at offset 12 (e.g. 'VP8 ',
      // 'VP8L', 'VP8X'). We handle each since fixtures in the wild vary.
      if (buffer.length < 30) return null;
      const chunkType = buffer.toString('ascii', 12, 16);
      if (chunkType === 'VP8 ') {
        // Bitstream starts at offset 20 (after chunk header + 6-byte frame tag start);
        // dimensions live at offsets 26-29 as 14-bit little-endian halves.
        const w = buffer.readUInt16LE(26) & 0x3fff;
        const h = buffer.readUInt16LE(28) & 0x3fff;
        return { width: w, height: h };
      }
      if (chunkType === 'VP8L') {
        // Bytes 21-24 carry packed width-1 / height-1 in 14-bit fields.
        const b0 = buffer[21];
        const b1 = buffer[22];
        const b2 = buffer[23];
        const b3 = buffer[24];
        const width = 1 + (((b1 & 0x3f) << 8) | b0);
        const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
        return { width, height };
      }
      if (chunkType === 'VP8X') {
        // 24-bit canvas width/height-1 at offsets 24/27.
        const width = 1 + (buffer.readUIntLE(24, 3) & 0xffffff);
        const height = 1 + (buffer.readUIntLE(27, 3) & 0xffffff);
        return { width, height };
      }
      return null;
    }
    if (format === 'jpeg') {
      // Walk markers until we hit a Start-Of-Frame (SOF0/SOF2 etc.). Skip
      // RST + SOI + EOI markers and standalone APP segments.
      let offset = 2;
      while (offset + 8 < buffer.length) {
        // Each marker is 0xFF then a non-zero, non-0xFF byte.
        if (buffer[offset] !== 0xff) return null;
        let marker = buffer[offset + 1];
        // Skip fill bytes
        while (marker === 0xff && offset + 1 < buffer.length) {
          offset += 1;
          marker = buffer[offset + 1];
        }
        offset += 2;
        // SOF markers we accept: 0xC0–0xCF except 0xC4 (DHT), 0xC8 (reserved), 0xCC (DAC).
        const isSOF =
          marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
        if (offset + 7 > buffer.length) return null;
        if (isSOF) {
          const height = buffer.readUInt16BE(offset + 3);
          const width = buffer.readUInt16BE(offset + 5);
          return { width, height };
        }
        // Otherwise skip this segment by its declared length
        const segLen = buffer.readUInt16BE(offset);
        offset += segLen;
      }
      return null;
    }
  } catch {
    return null;
  }
  return null;
}

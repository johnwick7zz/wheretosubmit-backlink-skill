// Reads image dimensions from file headers. No dependencies.
// Supports PNG, JPEG, GIF and WebP. SVG is detected but has no pixel size.
import { closeSync, openSync, readSync, statSync } from 'node:fs';

/** Bytes read from the start of a file. JPEG SOF markers sit after EXIF, rarely past 2 MB. */
const HEAD_BYTES = 2 * 1024 * 1024;

/**
 * @typedef {{ format: 'png' | 'jpeg' | 'gif' | 'webp', width: number, height: number }} RasterSize
 * @typedef {{ format: 'svg' }} VectorSize
 * @typedef {RasterSize | VectorSize | { format: 'unknown' }} ImageInfo
 */

/** @param {string} file @returns {Buffer} */
function readHead(file) {
  const size = Math.min(statSync(file).size, HEAD_BYTES);
  const buf = Buffer.alloc(size);
  const fd = openSync(file, 'r');
  try {
    readSync(fd, buf, 0, size, 0);
  } finally {
    closeSync(fd);
  }
  return buf;
}

/** @param {Buffer} buf @returns {RasterSize | null} */
function pngSize(buf) {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (buf.length < 24 || !sig.every((b, i) => buf[i] === b)) return null;
  if (buf.toString('ascii', 12, 16) !== 'IHDR') return null;
  return { format: 'png', width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/** Walks JPEG segments until a start-of-frame marker. @param {Buffer} buf @returns {RasterSize | null} */
function jpegSize(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 4 <= buf.length) {
    if (buf[offset] !== 0xff) return null;
    const marker = buf[offset + 1];
    if (marker === 0xff) {
      offset += 1; // fill byte
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      offset += 2; // standalone markers carry no length
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) return null; // end of image or start of scan
    const length = buf.readUInt16BE(offset + 2);
    const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      if (offset + 9 > buf.length) return null;
      return { format: 'jpeg', height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  return null;
}

/** @param {Buffer} buf @returns {RasterSize | null} */
function gifSize(buf) {
  if (buf.length < 10 || buf.toString('ascii', 0, 4) !== 'GIF8') return null;
  return { format: 'gif', width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
}

/** @param {Buffer} buf @returns {RasterSize | null} */
function webpSize(buf) {
  if (buf.length < 30 || buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') {
    return null;
  }
  const chunk = buf.toString('ascii', 12, 16);
  if (chunk === 'VP8 ') {
    return { format: 'webp', width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  }
  if (chunk === 'VP8L') {
    const bits = buf.readUInt32LE(21);
    return { format: 'webp', width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === 'VP8X') {
    return { format: 'webp', width: buf.readUIntLE(24, 3) + 1, height: buf.readUIntLE(27, 3) + 1 };
  }
  return null;
}

/** @param {string} file @param {Buffer} buf */
function looksLikeSvg(file, buf) {
  if (file.toLowerCase().endsWith('.svg')) return true;
  const text = buf.toString('utf8', 0, Math.min(buf.length, 512)).trimStart();
  return text.startsWith('<svg') || (text.startsWith('<?xml') && text.includes('<svg'));
}

/**
 * Returns the image format and pixel size. Throws only on I/O errors.
 * @param {string} file absolute path
 * @returns {ImageInfo}
 */
export function readImageInfo(file) {
  const buf = readHead(file);
  const raster = pngSize(buf) ?? jpegSize(buf) ?? gifSize(buf) ?? webpSize(buf);
  if (raster) return raster;
  if (looksLikeSvg(file, buf)) return { format: 'svg' };
  return { format: 'unknown' };
}

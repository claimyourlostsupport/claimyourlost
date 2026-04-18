import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

/** Stored images fit inside a square; default 120×120 px. Override with IMAGE_MAX_EDGE (1–2000). */
const MAX_EDGE = Math.min(2000, Math.max(1, parseInt(process.env.IMAGE_MAX_EDGE || '120', 10) || 120));
const JPEG_QUALITY = Math.min(95, Math.max(60, parseInt(process.env.IMAGE_JPEG_QUALITY || '80', 10) || 80));

function jpegOptions(useMozjpeg) {
  return useMozjpeg
    ? { quality: JPEG_QUALITY, mozjpeg: true, chromaSubsampling: '4:2:0' }
    : { quality: JPEG_QUALITY, mozjpeg: false };
}

function resolveMaxEdge(options = {}) {
  const requested = Number(options?.maxEdge);
  if (!Number.isFinite(requested)) return MAX_EDGE;
  return Math.min(2000, Math.max(1, Math.round(requested)));
}

function resolveResizeBox(options = {}) {
  const edge = resolveMaxEdge(options);
  const maxWidthNum = Number(options?.maxWidth);
  const maxHeightNum = Number(options?.maxHeight);
  const maxWidth = Number.isFinite(maxWidthNum) ? Math.min(2000, Math.max(1, Math.round(maxWidthNum))) : edge;
  const maxHeight = Number.isFinite(maxHeightNum) ? Math.min(2000, Math.max(1, Math.round(maxHeightNum))) : edge;
  return { maxWidth, maxHeight };
}

async function toJpegBuffer(input, useMozjpeg, resizeBox) {
  return sharp(input, { failOn: 'none' })
    .rotate()
    .resize(resizeBox.maxWidth, resizeBox.maxHeight, { fit: 'inside', withoutEnlargement: true })
    .jpeg(jpegOptions(useMozjpeg))
    .toBuffer();
}

/** Re-encode with same resize as main path — survives some Windows/Sharp edge cases. */
async function sharpReencodeRotate(input, resizeBox) {
  return sharp(input, { failOn: 'none' })
    .rotate()
    .resize(resizeBox.maxWidth, resizeBox.maxHeight, { fit: 'inside', withoutEnlargement: true })
    .jpeg(jpegOptions(false))
    .toBuffer();
}

async function sharpReencodeRaw(input, resizeBox) {
  return sharp(input, { failOn: 'none' })
    .resize(resizeBox.maxWidth, resizeBox.maxHeight, { fit: 'inside', withoutEnlargement: true })
    .jpeg(jpegOptions(false))
    .toBuffer();
}

function isLikelyJpeg(buf) {
  return buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
}

/** Pure-JS decoder; used when Sharp/libvips fails (common on some Windows + exotic formats). */
async function jimpToJpeg(buf, resizeBox) {
  const { Jimp } = await import('jimp');
  const image = await Jimp.read(buf);
  const w = image.width;
  const h = image.height;
  const scale = Math.min(resizeBox.maxWidth / w, resizeBox.maxHeight / h, 1);
  if (scale < 1) {
    image.resize({ width: Math.round(w * scale), height: Math.round(h * scale) });
  }
  return image.getBuffer('image/jpeg', { quality: JPEG_QUALITY });
}

/**
 * Write JPEG without overwriting in place — avoids Windows errno -4094 (UNKNOWN) on
 * Google Drive / OneDrive / some AV when replacing the same path multer just wrote.
 */
async function writeJpegAtomically(dir, base, buffer, originalPath) {
  const outPath = path.join(dir, `${base}.jpg`);
  const tmpPath = path.join(
    dir,
    `.opt-${base}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}.jpg`
  );

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(tmpPath, buffer);

  try {
    await fs.unlink(originalPath).catch(() => {});
    await fs.rename(tmpPath, outPath);
  } catch (e) {
    await fs.unlink(tmpPath).catch(() => {});
    throw e;
  }

  return `${base}.jpg`;
}

/**
 * Resize (fit inside square) and re-encode as JPEG to save disk space.
 * Returns the final filename (always .jpg).
 */
export async function optimizeUploadedImage(filePath, options = {}) {
  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const base = path.basename(filePath, ext);
  const resizeBox = resolveResizeBox(options);

  const raw = await fs.readFile(filePath);
  if (!raw.length) {
    throw new Error('Empty image file');
  }

  const attempts = [
    () => toJpegBuffer(filePath, true, resizeBox),
    () => toJpegBuffer(filePath, false, resizeBox),
    () => toJpegBuffer(raw, true, resizeBox),
    () => toJpegBuffer(raw, false, resizeBox),
    () => sharpReencodeRotate(raw, resizeBox),
    () => sharpReencodeRotate(filePath, resizeBox),
    () => sharpReencodeRaw(raw, resizeBox),
    () => jimpToJpeg(raw, resizeBox),
  ];

  let buffer;
  let lastErr;
  for (const run of attempts) {
    try {
      buffer = await run();
      lastErr = null;
      break;
    } catch (e) {
      lastErr = e;
    }
  }

  if (!buffer && isLikelyJpeg(raw) && raw.length <= 5 * 1024 * 1024) {
    try {
      buffer = await sharp(raw, { failOn: 'none' })
        .resize(resizeBox.maxWidth, resizeBox.maxHeight, { fit: 'inside', withoutEnlargement: true })
        .jpeg(jpegOptions(false))
        .toBuffer();
    } catch {
      buffer = raw;
      console.warn('Image optimize: using original JPEG bytes (resize failed; file may be larger than target).');
    }
  }

  if (!buffer) {
    console.error('Image optimize failed:', lastErr);
    throw lastErr || new Error('Could not decode image');
  }

  return writeJpegAtomically(dir, base, buffer, filePath);
}

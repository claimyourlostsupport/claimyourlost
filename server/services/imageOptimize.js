import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

/** Stored images fit inside a square; default 30×30 px. Override with IMAGE_MAX_EDGE (1–2000). */
const MAX_EDGE = Math.min(2000, Math.max(1, parseInt(process.env.IMAGE_MAX_EDGE || '30', 10) || 30));
const JPEG_QUALITY = Math.min(95, Math.max(60, parseInt(process.env.IMAGE_JPEG_QUALITY || '80', 10) || 80));

function jpegOptions(useMozjpeg) {
  return useMozjpeg
    ? { quality: JPEG_QUALITY, mozjpeg: true, chromaSubsampling: '4:2:0' }
    : { quality: JPEG_QUALITY, mozjpeg: false };
}

async function toJpegBuffer(input, useMozjpeg) {
  return sharp(input, { failOn: 'none' })
    .rotate()
    .resize(MAX_EDGE, MAX_EDGE, { fit: 'inside', withoutEnlargement: true })
    .jpeg(jpegOptions(useMozjpeg))
    .toBuffer();
}

/** Re-encode with same resize as main path — survives some Windows/Sharp edge cases. */
async function sharpReencodeRotate(input) {
  return sharp(input, { failOn: 'none' })
    .rotate()
    .resize(MAX_EDGE, MAX_EDGE, { fit: 'inside', withoutEnlargement: true })
    .jpeg(jpegOptions(false))
    .toBuffer();
}

async function sharpReencodeRaw(input) {
  return sharp(input, { failOn: 'none' })
    .resize(MAX_EDGE, MAX_EDGE, { fit: 'inside', withoutEnlargement: true })
    .jpeg(jpegOptions(false))
    .toBuffer();
}

function isLikelyJpeg(buf) {
  return buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
}

/** Pure-JS decoder; used when Sharp/libvips fails (common on some Windows + exotic formats). */
async function jimpToJpeg(buf) {
  const { Jimp } = await import('jimp');
  const image = await Jimp.read(buf);
  const w = image.width;
  const h = image.height;
  const scale = Math.min(MAX_EDGE / w, MAX_EDGE / h, 1);
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
export async function optimizeUploadedImage(filePath) {
  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const base = path.basename(filePath, ext);

  const raw = await fs.readFile(filePath);
  if (!raw.length) {
    throw new Error('Empty image file');
  }

  const attempts = [
    () => toJpegBuffer(filePath, true),
    () => toJpegBuffer(filePath, false),
    () => toJpegBuffer(raw, true),
    () => toJpegBuffer(raw, false),
    () => sharpReencodeRotate(raw),
    () => sharpReencodeRotate(filePath),
    () => sharpReencodeRaw(raw),
    () => jimpToJpeg(raw),
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
        .resize(MAX_EDGE, MAX_EDGE, { fit: 'inside', withoutEnlargement: true })
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

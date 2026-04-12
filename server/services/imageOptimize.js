import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

/** Stored images fit inside 200×200 px. Env is capped at 200. */
const MAX_EDGE = Math.min(200, Math.max(1, parseInt(process.env.IMAGE_MAX_EDGE || '200', 10) || 200));
const JPEG_QUALITY = Math.min(95, Math.max(60, parseInt(process.env.IMAGE_JPEG_QUALITY || '80', 10) || 80));

/**
 * Resize (fit inside square) and re-encode as JPEG to save disk space.
 * Returns the final filename (always .jpg).
 */
export async function optimizeUploadedImage(filePath) {
  const dir = path.dirname(filePath);
  const ext = path.extname(filePath);
  const base = path.basename(filePath, ext);
  const outPath = path.join(dir, `${base}.jpg`);

  const buffer = await sharp(filePath)
    .rotate()
    .resize(MAX_EDGE, MAX_EDGE, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true, chromaSubsampling: '4:2:0' })
    .toBuffer();

  await fs.writeFile(outPath, buffer);

  if (path.resolve(outPath) !== path.resolve(filePath)) {
    await fs.unlink(filePath).catch(() => {});
  }

  return `${base}.jpg`;
}

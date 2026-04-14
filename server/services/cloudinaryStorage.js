import { v2 as cloudinary } from 'cloudinary';

let configured = false;

function ensureConfigured() {
  if (configured) return true;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return false;
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  configured = true;
  return true;
}

export function isCloudinaryEnabled() {
  return ensureConfigured();
}

export async function uploadImageToCloudinary(localFilePath) {
  if (!ensureConfigured()) {
    throw new Error('Cloudinary is not configured');
  }
  const result = await cloudinary.uploader.upload(localFilePath, {
    folder: 'claimyourlost/items',
    resource_type: 'image',
    overwrite: false,
  });
  return {
    secureUrl: String(result.secure_url || ''),
    publicId: String(result.public_id || ''),
  };
}

export async function deleteCloudinaryImage(publicId) {
  if (!publicId || !ensureConfigured()) return false;
  try {
    const result = await cloudinary.uploader.destroy(String(publicId), {
      resource_type: 'image',
      invalidate: true,
    });
    return result?.result === 'ok' || result?.result === 'not found';
  } catch {
    return false;
  }
}

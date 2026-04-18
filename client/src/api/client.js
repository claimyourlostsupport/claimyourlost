import axios from 'axios';
import { clearPersistedClientState } from '../utils/clearPersistedClientState.js';

const baseURL = import.meta.env.VITE_API_URL ?? '/api';

export const api = axios.create({
  baseURL,
});

/** Default JSON Content-Type breaks multipart uploads (multer never sees the file). */
api.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  } else if (
    config.data != null &&
    typeof config.data === 'object' &&
    !(config.data instanceof ArrayBuffer) &&
    !(config.data instanceof Blob)
  ) {
    config.headers['Content-Type'] = 'application/json';
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const path = String(err.config?.url || '');
    if (status === 401) {
      const isPublicAuth =
        path.includes('auth/login') || path.includes('auth/request-otp');
      if (!isPublicAuth) {
        clearPersistedClientState();
      }
    }
    return Promise.reject(err);
  }
);

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

export function assetUrl(path) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  // Uploaded image paths are stored as relative URLs like "/uploads/file.jpg".
  // In production frontend/backend are on different domains, so prefix API origin.
  if (baseURL.startsWith('http')) {
    return `${baseURL.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
  }
  return path;
}

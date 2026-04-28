import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Check whether all Cloudinary credentials are real (not placeholders / missing)
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY    = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

const cloudinaryReady =
  CLOUD_NAME && API_KEY && API_SECRET &&
  !API_SECRET.includes('your_') &&
  !CLOUD_NAME.includes('your_') &&
  !API_KEY.includes('your_');

let storage;

if (cloudinaryReady) {
  // ── Cloudinary storage ──────────────────────────────────────────
  cloudinary.config({ cloud_name: CLOUD_NAME, api_key: API_KEY, api_secret: API_SECRET });

  storage = new CloudinaryStorage({
    cloudinary,
    params: async (_req, file) => {
      if (file.mimetype.startsWith('image/')) {
        return {
          folder: 'openconnect/images',
          resource_type: 'image',
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        };
      }
      return {
        folder: 'openconnect/files',
        resource_type: 'raw',
        use_filename: true,
        unique_filename: true,
      };
    },
  });

  console.log('[upload] Using Cloudinary storage');
} else {
  // ── Local disk storage (fallback) ───────────────────────────────
  const uploadDir = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const originalName = file.originalname || 'file';
      const safe = `${Date.now()}-${originalName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      cb(null, safe);
    },
  });

  console.log('[upload] Cloudinary credentials not set — using local disk storage');
}

export const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
});

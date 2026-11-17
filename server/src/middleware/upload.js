import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { ApiError } from '../utils/ApiError.js';

// Files are saved in server/uploads/... and served at http://localhost:5000/uploads/...
export const UPLOAD_ROOT = path.resolve('uploads');

function storage(folder) {
  const dir = path.join(UPLOAD_ROOT, folder);
  fs.mkdirSync(dir, { recursive: true });
  return multer.diskStorage({
    destination: dir,
    filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${path.extname(file.originalname).toLowerCase()}`),
  });
}

const allow = (exts) => (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (exts.includes(ext)) cb(null, true);
  else cb(new ApiError(400, `Only ${exts.join(', ')} files are allowed`));
};

export const uploadImages = multer({ storage: storage('rooms'), fileFilter: allow(['.jpg', '.jpeg', '.png', '.webp']), limits: { fileSize: 15 * 1024 * 1024, files: 8 } }).array('images', 8);
export const uploadModel = multer({ storage: storage('models'), fileFilter: allow(['.glb', '.gltf']), limits: { fileSize: 25 * 1024 * 1024 } }).single('model');

export const publicUrl = (file, folder) => `/uploads/${folder}/${file.filename}`;

export function removeUpload(url) {
  if (!url?.startsWith('/uploads/')) return;
  fs.rm(path.join(UPLOAD_ROOT, url.replace('/uploads/', '')), () => {});
}

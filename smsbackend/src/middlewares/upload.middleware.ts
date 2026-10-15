import { Readable } from 'node:stream';
import { Request } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { AppError } from '../utils/AppError';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_DOC_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10MB

const storage = multer.memoryStorage();

function createFileFilter(allowedTypes: string[]) {
  return (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`, 400));
    }
  };
}

export const uploadAvatar = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_SIZE },
  fileFilter: createFileFilter(ALLOWED_IMAGE_TYPES),
}).single('avatar');

export const uploadAssignment = multer({
  storage,
  limits: { fileSize: MAX_DOC_SIZE },
  fileFilter: createFileFilter([...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES]),
}).single('attachment');

export const uploadGeneral = multer({
  storage,
  limits: { fileSize: MAX_DOC_SIZE },
  fileFilter: createFileFilter([...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES]),
}).single('file');

export const uploadSubmission = uploadGeneral;

export async function uploadToCloudinary(
  buffer: Buffer,
  folder: string,
  resourceType: 'image' | 'raw' | 'auto' = 'auto'
): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `edumanage/${folder}`,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error || !result) {
          reject(new AppError('File upload to Cloudinary failed', 500));
        } else {
          resolve({ url: result.secure_url, publicId: result.public_id });
        }
      }
    );
    Readable.from(buffer).pipe(uploadStream);
  });
}

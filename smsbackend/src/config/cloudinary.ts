import { v2 as cloudinary } from 'cloudinary';
import config from './env';
import logger from '../utils/logger';

export function configureCloudinary(): void {
  cloudinary.config({
    cloud_name: config.CLOUDINARY_CLOUD_NAME,
    api_key: config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET,
    secure: true,
  });
  logger.info(' Cloudinary configured');
}

export async function deleteCloudinaryFile(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    logger.error('Cloudinary delete error:', error);
    throw error;
  }
}

export { cloudinary };

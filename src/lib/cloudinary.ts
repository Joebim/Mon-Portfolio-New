import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

// Configure Cloudinary from environment variables
if (process.env.CLOUDINARY_URL) {
  cloudinary.config({
    cloudinary_url: process.env.CLOUDINARY_URL,
  });
} else if (
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export { cloudinary };

export interface UploadOptions {
  folder?: string;
  tags?: string[];
  transformation?: Array<Record<string, unknown>>;
}

export interface UploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

/** Check if Cloudinary credentials are configured */
export function isCloudinaryConfigured(): boolean {
  if (process.env.CLOUDINARY_URL) return true;
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

/**
 * Upload a file buffer or base64 data URI to Cloudinary.
 */
export async function uploadToCloudinary(
  file: Buffer | string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  if (!isCloudinaryConfigured()) {
    throw new Error(
      'Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env.local.'
    );
  }

  const folder = options.folder || 'portfolio';

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        tags: options.tags || ['portfolio'],
        // Auto-optimize formats and compression
        transformation: options.transformation || [
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
        ],
      },
      (error: unknown, result?: UploadApiResponse) => {
        if (error || !result) {
          reject(error instanceof Error ? error : new Error('Cloudinary upload failed'));
        } else {
          resolve({
            url: result.url,
            secureUrl: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes,
          });
        }
      }
    );

    if (Buffer.isBuffer(file)) {
      uploadStream.end(file);
    } else if (typeof file === 'string' && file.startsWith('data:')) {
      // Base64 data URI
      cloudinary.uploader
        .upload(file, {
          folder,
          resource_type: 'image',
          transformation: options.transformation || [
            { quality: 'auto:good' },
            { fetch_format: 'auto' },
          ],
        })
        .then((result) => {
          resolve({
            url: result.url,
            secureUrl: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes,
          });
        })
        .catch(reject);
    } else {
      reject(new Error('Invalid file format. Provide a Buffer or a Base64 data URL.'));
    }
  });
}


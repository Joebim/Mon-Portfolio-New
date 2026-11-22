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
  publicId?: string;
  context?: Record<string, string>;
}

export interface UploadResult {
  url: string;
  secureUrl: string;
  devtoUrl: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  createdAt?: string;
}

export interface CloudinaryAsset {
  publicId: string;
  url: string;
  secureUrl: string;
  devtoUrl: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  createdAt: string;
  folder: string;
  tags: string[];
  alt?: string;
  caption?: string;
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
 * Converts a Cloudinary URL (including .webp, .avif, or extensionless URLs)
 * into a DEV.to-guaranteed 1000x420 PNG URL ending with `.png` so DEV.to's
 * Forem image fetcher always accepts and re-hosts it in DEV.to cover storage.
 */
export function toDevToCompatibleImageUrl(imageUrl?: string | null): string | undefined {
  if (!imageUrl || !imageUrl.trim()) return undefined;
  const trimmed = imageUrl.trim();

  // Check if it's a Cloudinary image upload URL
  const cloudMatch = trimmed.match(
    /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(?:v\d+\/|[^/]+\/)*?([^?]+)$/
  );
  if (cloudMatch) {
    // Parse out base upload prefix and publicId path
    const uploadSplit = trimmed.split('/image/upload/');
    if (uploadSplit.length === 2) {
      const base = `${uploadSplit[0]}/image/upload`;
      let rest = uploadSplit[1].split('?')[0];

      // Strip existing inline transformations if present before version (e.g. c_fill,w_1000/v123/...)
      const versionMatch = rest.match(/(?:^|\/)(v\d+\/.+)$/);
      if (versionMatch) {
        rest = versionMatch[1];
      }

      // Replace file extension with .png so DEV.to's extension parser accepts it
      const withoutExt = rest.replace(/\.[a-zA-Z0-9]+$/, '');
      return `${base}/c_fill,w_1000,h_420,f_png,q_auto/${withoutExt}.png`;
    }
  }

  return trimmed;
}

/**
 * Upload a file buffer, base64 data URI, or remote image URL to Cloudinary.
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
  const contextObj = options.context
    ? Object.entries(options.context)
        .map(([k, v]) => `${k}=${String(v).replace(/\|/g, ' ')}`)
        .join('|')
    : undefined;

  return new Promise((resolve, reject) => {
    const handleSuccess = (result: UploadApiResponse) => {
      const secureUrl = result.secure_url;
      resolve({
        url: result.url,
        secureUrl,
        devtoUrl: toDevToCompatibleImageUrl(secureUrl) || secureUrl,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
        createdAt: result.created_at,
      });
    };

    const uploadParams: Record<string, any> = {
      folder,
      resource_type: 'image',
      tags: options.tags || ['portfolio'],
    };
    if (options.publicId) uploadParams.public_id = options.publicId;
    if (contextObj) uploadParams.context = contextObj;

    if (Buffer.isBuffer(file)) {
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadParams,
        (error: unknown, result?: UploadApiResponse) => {
          if (error || !result) {
            reject(error instanceof Error ? error : new Error('Cloudinary upload failed'));
          } else {
            handleSuccess(result);
          }
        }
      );
      uploadStream.end(file);
    } else if (
      typeof file === 'string' &&
      (file.startsWith('data:') || file.startsWith('http://') || file.startsWith('https://'))
    ) {
      cloudinary.uploader
        .upload(file, uploadParams)
        .then(handleSuccess)
        .catch(reject);
    } else {
      reject(new Error('Invalid file format. Provide a Buffer, Base64 data URL, or remote URL.'));
    }
  });
}

/**
 * List uploaded image assets in Cloudinary for the Admin Media Library.
 */
export async function listCloudinaryResources(options: {
  folder?: string;
  maxResults?: number;
  nextCursor?: string;
  search?: string;
} = {}): Promise<{ assets: CloudinaryAsset[]; nextCursor?: string }> {
  if (!isCloudinaryConfigured()) {
    return { assets: [] };
  }

  const res = await cloudinary.api.resources({
    type: 'upload',
    resource_type: 'image',
    prefix: options.folder || undefined,
    max_results: options.maxResults || 60,
    next_cursor: options.nextCursor || undefined,
    tags: true,
    context: true,
    direction: 'desc',
  });

  const resources = Array.isArray(res?.resources) ? res.resources : [];
  let assets: CloudinaryAsset[] = resources.map((r: any) => {
    const customCtx = r.context?.custom || {};
    const inferredFolder =
      r.folder ||
      (typeof r.public_id === 'string' && r.public_id.includes('/')
        ? r.public_id.split('/').slice(0, -1).join('/')
        : 'root');

    return {
      publicId: r.public_id,
      url: r.url,
      secureUrl: r.secure_url,
      devtoUrl: toDevToCompatibleImageUrl(r.secure_url) || r.secure_url,
      width: r.width || 0,
      height: r.height || 0,
      format: r.format || 'png',
      bytes: r.bytes || 0,
      createdAt: r.created_at || new Date().toISOString(),
      folder: inferredFolder,
      tags: Array.isArray(r.tags) ? r.tags : [],
      alt: customCtx.alt || '',
      caption: customCtx.caption || '',
    };
  });

  if (options.search && options.search.trim()) {
    const q = options.search.trim().toLowerCase();
    assets = assets.filter(
      (a) =>
        a.publicId.toLowerCase().includes(q) ||
        a.folder.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q)) ||
        (a.alt && a.alt.toLowerCase().includes(q)) ||
        (a.caption && a.caption.toLowerCase().includes(q))
    );
  }

  return {
    assets,
    nextCursor: res?.next_cursor,
  };
}

/**
 * Delete an image resource from Cloudinary by publicId.
 */
export async function deleteCloudinaryResource(publicId: string): Promise<boolean> {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured.');
  }
  const res = await cloudinary.uploader.destroy(publicId, {
    invalidate: true,
    resource_type: 'image',
  });
  return res?.result === 'ok' || res?.result === 'not found';
}

/**
 * Update a Cloudinary resource: rename/move publicId, update tags, and update alt/caption context.
 */
export async function updateCloudinaryResource(
  publicId: string,
  updates: {
    newPublicId?: string;
    tags?: string[];
    alt?: string;
    caption?: string;
  }
): Promise<CloudinaryAsset> {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured.');
  }

  let activeId = publicId;

  // 1. Rename if newPublicId was provided and differs
  if (updates.newPublicId && updates.newPublicId.trim() && updates.newPublicId.trim() !== publicId) {
    const renameRes = await cloudinary.uploader.rename(publicId, updates.newPublicId.trim(), {
      overwrite: true,
      invalidate: true,
      resource_type: 'image',
    });
    activeId = renameRes.public_id || updates.newPublicId.trim();
  }

  // 2. Update metadata (tags & context)
  const apiUpdateParams: Record<string, any> = {
    resource_type: 'image',
  };
  if (updates.tags) {
    apiUpdateParams.tags = updates.tags.join(',');
  }
  if (updates.alt !== undefined || updates.caption !== undefined) {
    const parts: string[] = [];
    if (updates.alt !== undefined) parts.push(`alt=${updates.alt.replace(/\|/g, ' ')}`);
    if (updates.caption !== undefined) parts.push(`caption=${updates.caption.replace(/\|/g, ' ')}`);
    apiUpdateParams.context = parts.join('|');
  }

  const r = await cloudinary.api.update(activeId, apiUpdateParams);
  const customCtx = r.context?.custom || {};
  const inferredFolder =
    r.folder ||
    (typeof r.public_id === 'string' && r.public_id.includes('/')
      ? r.public_id.split('/').slice(0, -1).join('/')
      : 'root');

  return {
    publicId: r.public_id,
    url: r.url,
    secureUrl: r.secure_url,
    devtoUrl: toDevToCompatibleImageUrl(r.secure_url) || r.secure_url,
    width: r.width || 0,
    height: r.height || 0,
    format: r.format || 'png',
    bytes: r.bytes || 0,
    createdAt: r.created_at || new Date().toISOString(),
    folder: inferredFolder,
    tags: Array.isArray(r.tags) ? r.tags : [],
    alt: customCtx.alt || updates.alt || '',
    caption: customCtx.caption || updates.caption || '',
  };
}

import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';
import { uploadToCloudinary, isCloudinaryConfigured } from '../../../../lib/cloudinary';

/**
 * POST /api/admin/upload
 * Accepts either:
 * 1) multipart/form-data with `file` (File) and optional `folder`
 * 2) application/json with `url` (remote image URL or base64 data URI) and optional `folder`
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      {
        error:
          'Cloudinary is not configured. Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to your environment variables.',
      },
      { status: 503 }
    );
  }

  try {
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await request.json();
      const remoteUrl = body.url as string | undefined;
      const folder = (body.folder as string) || 'portfolio/blogs';
      if (!remoteUrl || typeof remoteUrl !== 'string') {
        return NextResponse.json({ error: 'No valid image URL provided.' }, { status: 400 });
      }

      const result = await uploadToCloudinary(remoteUrl, {
        folder,
        tags: ['portfolio', folder.replace(/[^a-zA-Z0-9_-]/g, '_')],
        context: body.alt ? { alt: body.alt } : undefined,
      });

      return NextResponse.json({
        success: true,
        url: result.secureUrl,
        secureUrl: result.secureUrl,
        devtoUrl: result.devtoUrl,
        publicId: result.publicId,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
      });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const folder = (formData.get('folder') as string) || 'portfolio';
    const alt = (formData.get('alt') as string) || '';

    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { error: 'No valid file provided. Please attach an image file.' },
        { status: 400 }
      );
    }

    const fileBlob = file as File;

    // Check size limit (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (fileBlob.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Image exceeds maximum allowed size of 10MB.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await fileBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await uploadToCloudinary(buffer, {
      folder,
      tags: ['portfolio', folder.replace(/[^a-zA-Z0-9_-]/g, '_')],
      context: alt ? { alt } : undefined,
    });

    return NextResponse.json({
      success: true,
      url: result.secureUrl,
      secureUrl: result.secureUrl,
      devtoUrl: result.devtoUrl,
      publicId: result.publicId,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    });
  } catch (error) {
    console.error('[API /api/admin/upload] Upload error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to upload image to Cloudinary.',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/upload
 * Returns whether Cloudinary is configured.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    configured: isCloudinaryConfigured(),
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || null,
  });
}

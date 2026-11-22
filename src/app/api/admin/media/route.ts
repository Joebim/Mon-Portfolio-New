import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';
import {
  isCloudinaryConfigured,
  listCloudinaryResources,
  deleteCloudinaryResource,
  updateCloudinaryResource,
} from '../../../../lib/cloudinary';

/**
 * GET /api/admin/media?folder=...&search=...&nextCursor=...
 * Lists uploaded assets in Cloudinary.
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isCloudinaryConfigured()) {
    return NextResponse.json({
      configured: false,
      assets: [],
      error: 'Cloudinary is not configured in environment variables.',
    });
  }

  try {
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder') || undefined;
    const search = searchParams.get('search') || undefined;
    const nextCursor = searchParams.get('nextCursor') || undefined;
    const maxResults = parseInt(searchParams.get('maxResults') || '60', 10);

    const { assets, nextCursor: cursor } = await listCloudinaryResources({
      folder,
      search,
      nextCursor,
      maxResults,
    });

    return NextResponse.json({
      configured: true,
      assets,
      nextCursor: cursor,
    });
  } catch (error) {
    console.error('[API /api/admin/media GET] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list Cloudinary media.' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/media
 * Updates/renames a Cloudinary asset's publicId, tags, alt, or caption.
 */
export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isCloudinaryConfigured()) {
    return NextResponse.json({ error: 'Cloudinary is not configured.' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { publicId, newPublicId, tags, alt, caption } = body;

    if (!publicId || typeof publicId !== 'string') {
      return NextResponse.json({ error: 'publicId is required.' }, { status: 400 });
    }

    const updated = await updateCloudinaryResource(publicId, {
      newPublicId,
      tags: Array.isArray(tags) ? tags : undefined,
      alt,
      caption,
    });

    return NextResponse.json({
      success: true,
      asset: updated,
    });
  } catch (error) {
    console.error('[API /api/admin/media PUT] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update Cloudinary asset.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/media?publicId=...
 * Deletes a Cloudinary asset by publicId.
 */
export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isCloudinaryConfigured()) {
    return NextResponse.json({ error: 'Cloudinary is not configured.' }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const publicId = searchParams.get('publicId');

    if (!publicId) {
      return NextResponse.json({ error: 'publicId query parameter is required.' }, { status: 400 });
    }

    const deleted = await deleteCloudinaryResource(publicId);
    return NextResponse.json({
      success: deleted,
      publicId,
    });
  } catch (error) {
    console.error('[API /api/admin/media DELETE] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete Cloudinary asset.' },
      { status: 500 }
    );
  }
}


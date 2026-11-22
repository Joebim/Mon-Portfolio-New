'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CloudinaryAsset } from '../../lib/cloudinary';
import { ConfirmModal } from './ConfirmModal';

interface CloudinaryMediaManagerProps {
  showToast: (msg: string, type?: 'success' | 'error') => void;
  /** When provided, renders a "Select Image" button on each card for picking into an input or editor */
  onSelectAsset?: (url: string, asset: CloudinaryAsset) => void;
  onClosePicker?: () => void;
  pickerTitle?: string;
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 KB';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

export function CloudinaryMediaManager({
  showToast,
  onSelectAsset,
  onClosePicker,
  pickerTitle,
}: CloudinaryMediaManagerProps) {
  const [assets, setAssets] = useState<CloudinaryAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [folderFilter, setFolderFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [uploadFolder, setUploadFolder] = useState<string>('portfolio/blogs');
  const [uploading, setUploading] = useState(false);
  const [remoteUrlInput, setRemoteUrlInput] = useState('');
  const [aiImagePrompt, setAiImagePrompt] = useState('');
  const [generatingAiImage, setGeneratingAiImage] = useState(false);

  // Preview Lightbox Modal
  const [previewAsset, setPreviewAsset] = useState<CloudinaryAsset | null>(null);

  // Edit / Rename Modal
  const [editAsset, setEditAsset] = useState<{
    asset: CloudinaryAsset;
    newPublicId: string;
    tags: string;
    alt: string;
    caption: string;
    saving: boolean;
  } | null>(null);

  // Delete Confirm Modal
  const [deleteTarget, setDeleteTarget] = useState<CloudinaryAsset | null>(null);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (folderFilter) params.set('folder', folderFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      const res = await fetch(`/api/admin/media?${params.toString()}`);
      const data = await res.json();
      setConfigured(data.configured !== false);
      setAssets(Array.isArray(data.assets) ? data.assets : []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load Cloudinary media', 'error');
    } finally {
      setLoading(false);
    }
  }, [folderFilter, searchQuery, showToast]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      let uploadedCount = 0;
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', uploadFolder || 'portfolio');
        const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        uploadedCount++;
      }
      showToast(`Uploaded ${uploadedCount} image${uploadedCount > 1 ? 's' : ''} to Cloudinary ✓`);
      await fetchMedia();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoteUrlUpload = async () => {
    if (!remoteUrlInput.trim()) return;
    setUploading(true);
    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: remoteUrlInput.trim(),
          folder: uploadFolder || 'portfolio/blogs',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Remote upload failed');
      setRemoteUrlInput('');
      showToast('Remote image imported to Cloudinary ✓');
      await fetchMedia();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Remote upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateFreeAiImage = async () => {
    if (!aiImagePrompt.trim()) {
      showToast('Enter a topic or description for the free AI image', 'error');
      return;
    }
    setGeneratingAiImage(true);
    try {
      const res = await fetch('/api/admin/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-image',
          prompt: aiImagePrompt.trim(),
          uploadToCloud: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI image generation failed');
      setAiImagePrompt('');
      showToast(
        data.uploadedToCloudinary
          ? 'Generated free AI cover & uploaded to Cloudinary ✓'
          : 'Generated free AI image ✓'
      );
      await fetchMedia();
      if (onSelectAsset && data.devtoCompatibleUrl) {
        onSelectAsset(data.devtoCompatibleUrl, {
          publicId: 'ai-generated',
          url: data.imageUrl,
          secureUrl: data.imageUrl,
          devtoUrl: data.devtoCompatibleUrl,
          width: 1200,
          height: 630,
          format: 'png',
          bytes: 0,
          createdAt: new Date().toISOString(),
          folder: 'portfolio/blogs',
          tags: ['ai-generated'],
        });
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'AI image generation failed', 'error');
    } finally {
      setGeneratingAiImage(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editAsset) return;
    setEditAsset({ ...editAsset, saving: true });
    try {
      const res = await fetch('/api/admin/media', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicId: editAsset.asset.publicId,
          newPublicId: editAsset.newPublicId.trim(),
          tags: editAsset.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          alt: editAsset.alt.trim(),
          caption: editAsset.caption.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      showToast('Cloudinary asset updated ✓');
      setEditAsset(null);
      await fetchMedia();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Update failed', 'error');
      setEditAsset((prev) => (prev ? { ...prev, saving: false } : null));
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      const res = await fetch(`/api/admin/media?publicId=${encodeURIComponent(target.publicId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      setAssets((prev) => prev.filter((a) => a.publicId !== target.publicId));
      if (previewAsset?.publicId === target.publicId) setPreviewAsset(null);
      showToast(`Deleted "${target.publicId}" from Cloudinary ✓`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed', 'error');
    }
  };

  const copyToClipboard = (text: string, label = 'URL') => {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label} to clipboard ✓`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h2 className="text-xl font-medium tracking-tight text-paper">
            {pickerTitle || `Cloudinary Media Library (${assets.length})`}
          </h2>
          <p className="text-xs text-[#8e8883] font-mono mt-1">
            Upload, view, rename, tag, copy DEV.to-ready cover URLs, or delete Cloudinary assets.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={fetchMedia}
            disabled={loading}
            className="px-3.5 py-2 rounded-lg bg-white/10 border border-white/15 text-paper font-mono text-[9px] tracking-[0.08em] hover:bg-white/15 transition-colors cursor-pointer"
          >
            {loading ? '↺ LOADING…' : '↺ REFRESH'}
          </button>
          {onClosePicker && (
            <button
              type="button"
              onClick={onClosePicker}
              className="px-3.5 py-2 rounded-lg border border-white/20 text-[#aaa] font-mono text-[9px] hover:text-paper cursor-pointer"
            >
              CLOSE [×]
            </button>
          )}
        </div>
      </div>

      {/* Upload & Free AI Generator Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-5 rounded-2xl bg-[#111110] border border-white/13">
        {/* 1. Direct File Upload */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[8px] text-[#888] uppercase tracking-[0.08em]">
              1. Upload Local Image(s)
            </span>
            <select
              value={uploadFolder}
              onChange={(e) => setUploadFolder(e.target.value)}
              className="px-2 py-0.5 rounded bg-[#181614] border border-white/15 font-mono text-[9px] text-ember outline-none"
            >
              <option value="portfolio/blogs">Folder: portfolio/blogs</option>
              <option value="portfolio/works">Folder: portfolio/works</option>
              <option value="portfolio/profile">Folder: portfolio/profile</option>
              <option value="portfolio">Folder: portfolio (root)</option>
            </select>
          </div>
          <label className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl border border-dashed border-ember/50 bg-ember/5 hover:bg-ember/10 text-ember font-mono text-[10px] font-bold tracking-[0.08em] cursor-pointer transition-colors">
            <span>{uploading ? '⏳ UPLOADING TO CLOUDINARY…' : '↑ CHOOSE FILE(S) TO UPLOAD'}</span>
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={uploading}
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
            />
          </label>
        </div>

        {/* 2. Import from Remote URL */}
        <div className="space-y-2">
          <span className="block font-mono text-[8px] text-[#888] uppercase tracking-[0.08em]">
            2. Import Remote Image URL to Cloudinary
          </span>
          <div className="flex gap-2">
            <input
              type="text"
              value={remoteUrlInput}
              onChange={(e) => setRemoteUrlInput(e.target.value)}
              placeholder="https://example.com/image.png"
              className="flex-1 px-3 py-2 rounded-xl bg-[#181614] border border-white/10 text-xs text-paper focus:border-ember outline-none"
            />
            <button
              type="button"
              onClick={handleRemoteUrlUpload}
              disabled={uploading || !remoteUrlInput.trim()}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 font-mono text-[9px] text-paper disabled:opacity-40 cursor-pointer"
            >
              IMPORT
            </button>
          </div>
        </div>

        {/* 3. Generate Free AI Cover Image (Flux) & Auto-Upload to Cloudinary */}
        <div className="space-y-2">
          <span className="block font-mono text-[8px] text-ember uppercase tracking-[0.08em]">
            3. ✨ Generate Free AI Cover (Flux → Cloudinary)
          </span>
          <div className="flex gap-2">
            <input
              type="text"
              value={aiImagePrompt}
              onChange={(e) => setAiImagePrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleGenerateFreeAiImage();
                }
              }}
              placeholder="e.g. React 19 state machine architecture..."
              className="flex-1 px-3 py-2 rounded-xl bg-[#181614] border border-ember/30 text-xs text-paper focus:border-ember outline-none"
            />
            <button
              type="button"
              onClick={handleGenerateFreeAiImage}
              disabled={generatingAiImage}
              className="px-3.5 py-2 rounded-xl bg-ember hover:bg-ember-soft text-ink font-mono text-[9px] font-bold disabled:opacity-40 cursor-pointer whitespace-nowrap"
            >
              {generatingAiImage ? '⏳ GENERATING…' : '✨ GENERATE'}
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { label: 'ALL ASSETS', value: '' },
            { label: 'BLOGS', value: 'portfolio/blogs' },
            { label: 'WORKS', value: 'portfolio/works' },
            { label: 'PROFILE', value: 'portfolio/profile' },
            { label: 'PORTFOLIO ROOT', value: 'portfolio' },
          ].map((f) => (
            <button
              key={f.label}
              type="button"
              onClick={() => setFolderFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg font-mono text-[9px] tracking-[0.08em] transition-colors cursor-pointer ${
                folderFilter === f.value
                  ? 'bg-ember text-ink font-bold'
                  : 'bg-[#141210] text-[#888] border border-white/10 hover:text-paper'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by public ID, tag, or alt text…"
          className="w-full sm:w-72 px-3 py-1.5 rounded-xl bg-[#181614] border border-white/10 text-xs text-paper focus:border-ember outline-none font-mono"
        />
      </div>

      {!configured && (
        <div className="p-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-300 font-mono text-xs">
          Cloudinary credentials are not configured in <code>.env.local</code>. Add{' '}
          <code>CLOUDINARY_CLOUD_NAME</code>, <code>CLOUDINARY_API_KEY</code>, and{' '}
          <code>CLOUDINARY_API_SECRET</code> to manage cloud uploads.
        </div>
      )}

      {/* Assets Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-56 rounded-2xl bg-[#141210] border border-white/10 animate-pulse" />
          ))}
        </div>
      ) : assets.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-white/10 bg-[#111110] font-mono text-xs text-[#666]">
          No Cloudinary assets found in this view. Upload an image or generate a free AI cover above.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {assets.map((asset) => (
            <div
              key={asset.publicId}
              className="group rounded-2xl bg-[#111110] border border-white/13 overflow-hidden flex flex-col justify-between hover:border-ember/50 transition-all"
            >
              {/* Thumbnail */}
              <div
                className="relative aspect-[16/10] bg-[#1a1714] overflow-hidden cursor-pointer"
                onClick={() => setPreviewAsset(asset)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={asset.secureUrl}
                  alt={asset.alt || asset.publicId}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute top-2 left-2 flex items-center gap-1">
                  <span className="px-2 py-0.5 rounded bg-black/75 backdrop-blur-sm border border-white/15 font-mono text-[8px] text-ember uppercase">
                    {asset.format}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-black/75 backdrop-blur-sm border border-white/15 font-mono text-[8px] text-[#ccc]">
                    {asset.width}×{asset.height}
                  </span>
                </div>
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/75 font-mono text-[8px] text-[#aaa]">
                  {formatBytes(asset.bytes)}
                </div>
              </div>

              {/* Meta & Actions */}
              <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                <div>
                  <p className="font-mono text-[10px] text-paper font-medium truncate" title={asset.publicId}>
                    {asset.publicId.split('/').pop()}
                  </p>
                  <p className="font-mono text-[8px] text-[#777] truncate" title={asset.publicId}>
                    {asset.publicId}
                  </p>
                  {asset.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {asset.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[7px] text-[#aaa]"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-1.5">
                  {onSelectAsset && (
                    <button
                      type="button"
                      onClick={() => onSelectAsset(asset.devtoUrl || asset.secureUrl, asset)}
                      className="w-full mb-1 py-1.5 px-2.5 rounded-lg bg-ember hover:bg-ember-soft text-ink font-mono text-[9px] font-bold cursor-pointer"
                    >
                      ✓ USE THIS IMAGE (DEV.TO READY)
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => copyToClipboard(asset.secureUrl, 'Cloudinary URL')}
                    className="flex-1 py-1 px-2 rounded bg-white/5 hover:bg-white/10 border border-white/10 font-mono text-[8px] text-paper cursor-pointer"
                    title="Copy direct Cloudinary URL"
                  >
                    COPY URL
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(asset.devtoUrl, 'DEV.to Cover PNG URL')}
                    className="flex-1 py-1 px-2 rounded bg-ember/15 hover:bg-ember/25 border border-ember/30 font-mono text-[8px] text-ember cursor-pointer"
                    title="Copy DEV.to 1000x420 PNG compatible cover URL"
                  >
                    DEV.TO URL
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEditAsset({
                        asset,
                        newPublicId: asset.publicId,
                        tags: asset.tags.join(', '),
                        alt: asset.alt || '',
                        caption: asset.caption || '',
                        saving: false,
                      })
                    }
                    className="py-1 px-2 rounded bg-white/5 hover:bg-white/10 border border-white/10 font-mono text-[8px] text-[#bbb] hover:text-paper cursor-pointer"
                  >
                    EDIT
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(asset)}
                    className="py-1 px-2 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 font-mono text-[8px] text-red-400 cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox View Modal */}
      {previewAsset && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewAsset(null);
          }}
        >
          <div className="relative w-full max-w-3xl rounded-2xl bg-[#141210] border border-white/15 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-paper font-mono">{previewAsset.publicId}</h3>
                <p className="font-mono text-[9px] text-[#888]">
                  {previewAsset.width}×{previewAsset.height}px · {previewAsset.format.toUpperCase()} ·{' '}
                  {formatBytes(previewAsset.bytes)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewAsset(null)}
                className="font-mono text-xs text-[#888] hover:text-paper cursor-pointer"
              >
                CLOSE [×]
              </button>
            </div>

            <div className="max-h-[55vh] overflow-hidden rounded-xl bg-black flex items-center justify-center border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewAsset.secureUrl}
                alt={previewAsset.alt || previewAsset.publicId}
                className="max-h-[55vh] w-auto object-contain"
              />
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[8px] text-[#888] w-28">ORIGINAL URL:</span>
                <input
                  type="text"
                  readOnly
                  value={previewAsset.secureUrl}
                  className="flex-1 px-2.5 py-1.5 rounded bg-[#181614] border border-white/10 font-mono text-[10px] text-[#ccc]"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(previewAsset.secureUrl, 'Original URL')}
                  className="px-3 py-1.5 rounded bg-white/10 font-mono text-[9px] text-paper cursor-pointer"
                >
                  COPY
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[8px] text-ember w-28">DEV.TO PNG URL:</span>
                <input
                  type="text"
                  readOnly
                  value={previewAsset.devtoUrl}
                  className="flex-1 px-2.5 py-1.5 rounded bg-[#181614] border border-ember/30 font-mono text-[10px] text-ember"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(previewAsset.devtoUrl, 'DEV.to Compatible Cover URL')}
                  className="px-3 py-1.5 rounded bg-ember text-ink font-mono text-[9px] font-bold cursor-pointer"
                >
                  COPY
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Rename Asset Modal */}
      {editAsset && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={(e) => {
            if (e.target === e.currentTarget && !editAsset.saving) setEditAsset(null);
          }}
        >
          <div className="relative w-full max-w-md rounded-2xl bg-[#141210] border border-white/15 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-paper">Edit Cloudinary Asset</h3>
              <button
                type="button"
                onClick={() => setEditAsset(null)}
                className="font-mono text-xs text-[#888] hover:text-paper cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-mono text-[8px] text-[#888] uppercase mb-1">
                  Public ID / Folder Path (Rename or Move)
                </label>
                <input
                  type="text"
                  value={editAsset.newPublicId}
                  onChange={(e) => setEditAsset({ ...editAsset, newPublicId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#181614] border border-white/15 text-xs text-paper font-mono focus:border-ember outline-none"
                />
              </div>

              <div>
                <label className="block font-mono text-[8px] text-[#888] uppercase mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={editAsset.tags}
                  onChange={(e) => setEditAsset({ ...editAsset, tags: e.target.value })}
                  placeholder="portfolio, blog-cover, react"
                  className="w-full px-3 py-2 rounded-xl bg-[#181614] border border-white/15 text-xs text-paper font-mono focus:border-ember outline-none"
                />
              </div>

              <div>
                <label className="block font-mono text-[8px] text-[#888] uppercase mb-1">
                  Alt Text (Accessibility & SEO)
                </label>
                <input
                  type="text"
                  value={editAsset.alt}
                  onChange={(e) => setEditAsset({ ...editAsset, alt: e.target.value })}
                  placeholder="Describe the image..."
                  className="w-full px-3 py-2 rounded-xl bg-[#181614] border border-white/15 text-xs text-paper focus:border-ember outline-none"
                />
              </div>

              <div>
                <label className="block font-mono text-[8px] text-[#888] uppercase mb-1">
                  Caption
                </label>
                <input
                  type="text"
                  value={editAsset.caption}
                  onChange={(e) => setEditAsset({ ...editAsset, caption: e.target.value })}
                  placeholder="Optional caption"
                  className="w-full px-3 py-2 rounded-xl bg-[#181614] border border-white/15 text-xs text-paper focus:border-ember outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditAsset(null)}
                disabled={editAsset.saving}
                className="px-4 py-2 rounded-xl border border-white/15 font-mono text-[9px] text-[#888] hover:text-paper cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={editAsset.saving}
                className="px-5 py-2 rounded-xl bg-ember hover:bg-ember-soft text-ink font-mono text-[9px] font-bold cursor-pointer disabled:opacity-50"
              >
                {editAsset.saving ? 'SAVING…' : 'SAVE CHANGES'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteTarget && (
        <ConfirmModal
          isOpen={true}
          title="Delete Cloudinary Asset"
          message="Are you sure you want to permanently delete this image from your Cloudinary storage? Any blog posts or projects referencing this URL may lose their image."
          itemTitle={deleteTarget.publicId}
          itemType={`${deleteTarget.format.toUpperCase()} · ${deleteTarget.width}×${deleteTarget.height}`}
          confirmLabel="DELETE FROM CLOUDINARY"
          variant="danger"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}


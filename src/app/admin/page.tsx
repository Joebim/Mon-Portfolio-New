'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic_import from 'next/dynamic';
import type {
  PortfolioContent,
  BlogArticle,
  Project,
  AdditionalProject,
  Experience,
  SkillGroup,
} from '../../lib/schemas';
import { Arrow } from '../../components/SiteNavigation';
import { signOutUser } from '../../lib/firebase';
import { AdminDashboardSkeleton } from '../../components/Skeleton';

// Rich-text editor is client-only (Tiptap)
const RichTextEditor = dynamic_import(() => import('../../components/admin/RichTextEditor'), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl border border-white/10 bg-[#181614] h-64 flex items-center justify-center">
      <span className="font-mono text-[10px] text-[#666]">Loading editor…</span>
    </div>
  ),
});

type AdminTab = 'profile' | 'projects' | 'smallWorks' | 'experience' | 'skills' | 'blogs';

/* ─── small reusable helpers ─────────────────────── */
const inputCls =
  'w-full px-3 py-2 rounded bg-[#181614] border border-white/10 text-xs focus:border-ember outline-none transition-colors';
const labelCls = 'block font-mono text-[8px] text-[#888] uppercase mb-1 tracking-[0.08em]';

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [syncingDevTo, setSyncingDevTo] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [dataSource, setDataSource] = useState<'firestore' | 'local'>('local');

  const [portfolio, setPortfolio] = useState<PortfolioContent | null>(null);
  const [blogs, setBlogs] = useState<BlogArticle[]>([]);
  const [activeBlogEdit, setActiveBlogEdit] = useState<BlogArticle | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Blog creation / cross-posting state
  const [isCreatingBlog, setIsCreatingBlog] = useState(false);
  const [crossPosting, setCrossPosting] = useState<Record<string, boolean>>({});
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [cloudinaryConfigured, setCloudinaryConfigured] = useState<boolean>(false);
  const [platformStatus, setPlatformStatus] = useState<{
    devto: { connected: boolean; username?: string };
    medium: { connected: boolean; username?: string };
  } | null>(null);
  const [newBlog, setNewBlog] = useState({
    title: '',
    description: '',
    bodyMarkdown: '# My New Article\n\nWrite your content here.',
    tagList: '',
    coverImage: '',
    isDraft: false,
    publishTo: { devto: true, medium: true },
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    async function loadData() {
      try {
        const sessionRes = await fetch('/api/auth/session');
        const session = await sessionRes.json();
        if (!session.authenticated) {
          router.push('/admin/login');
          return;
        }
        if (session.user) setUserEmail(session.user);

        const [portfolioRes, blogsRes] = await Promise.all([
          fetch('/api/admin/portfolio'),
          fetch('/api/admin/blogs'),
        ]);

        if (portfolioRes.ok) {
          const pData = await portfolioRes.json();
          setPortfolio(pData.data);
          setDataSource(pData.source);
        } else {
          const errData = await portfolioRes.json().catch(() => ({}));
          console.error('[Admin] Portfolio load error:', errData);
          showToast(`Error loading portfolio: ${errData.error || portfolioRes.statusText}`, 'error');
        }
        if (blogsRes.ok) {
          const bData = await blogsRes.json();
          setBlogs(bData.articles || []);
        }

        try {
          const [statusRes, uploadRes] = await Promise.all([
            fetch('/api/admin/blogs/crosspost'),
            fetch('/api/admin/upload'),
          ]);
          if (statusRes.ok) setPlatformStatus(await statusRes.json());
          if (uploadRes.ok) {
            const uData = await uploadRes.json();
            setCloudinaryConfigured(Boolean(uData.configured));
          }
        } catch {
          // non-fatal
        }
      } catch (err) {
        console.error('Failed to load admin data:', err);
        showToast('Error loading dashboard data', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  /* ─── handlers ─── */
  const handleLogout = async () => {
    try { await signOutUser(); } catch { /* non-fatal */ }
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const handleSavePortfolio = async () => {
    if (!portfolio) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/portfolio', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(portfolio),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setDataSource(data.source);
      showToast('Portfolio changes saved successfully!');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSeedToCloud = async () => {
    setSeeding(true);
    try {
      const res = await fetch('/api/admin/seed', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Seed failed');
      // Reload portfolio from Firestore
      const pRes = await fetch('/api/admin/portfolio');
      if (pRes.ok) {
        const pData = await pRes.json();
        setPortfolio(pData.data);
        setDataSource(pData.source);
      }
      showToast(`Seeded to Firestore ✓ — ${data.counts?.projects} projects, ${data.counts?.experiences} experiences`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Seed failed', 'error');
    } finally {
      setSeeding(false);
    }
  };

  const handleSyncDevTo = async () => {
    setSyncingDevTo(true);
    try {
      const res = await fetch('/api/admin/sync-devto', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      setBlogs(data.articles || []);
      showToast(`Synced ${data.count} articles from DEV.to!`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Sync failed', 'error');
    } finally {
      setSyncingDevTo(false);
    }
  };

  const handleUploadFile = async (
    file: File,
    folder: string,
    key: string,
    onSuccess: (url: string) => void
  ) => {
    setUploadingImage(key);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      onSuccess(data.secureUrl || data.url);
      setCloudinaryConfigured(true);
      showToast('Image uploaded to Cloudinary ✓');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Image upload failed', 'error');
    } finally {
      setUploadingImage(null);
    }
  };

  const handleCreateBlog = async () => {
    if (!newBlog.title.trim() || !newBlog.bodyMarkdown.trim()) {
      showToast('Title and content are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const publishTo: string[] = [];
      if (newBlog.publishTo.devto) publishTo.push('devto');
      if (newBlog.publishTo.medium) publishTo.push('medium');

      const res = await fetch('/api/admin/blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'create',
          title: newBlog.title.trim(),
          description: newBlog.description.trim(),
          bodyMarkdown: newBlog.bodyMarkdown,
          tagList: newBlog.tagList ? newBlog.tagList.split(',').map((t) => t.trim()).filter(Boolean) : [],
          coverImage: newBlog.coverImage.trim() || undefined,
          isDraft: newBlog.isDraft,
          publishTo,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Create failed');

      setBlogs((prev) => [data.article, ...prev]);
      setIsCreatingBlog(false);
      setNewBlog({
        title: '',
        description: '',
        bodyMarkdown: '# My New Article\n\nWrite your content here.',
        tagList: '',
        coverImage: '',
        isDraft: false,
        publishTo: { devto: true, medium: true },
      });

      const msgs: string[] = ['Article created ✓'];
      if (data.devto?.success) msgs.push('DEV.to ✓');
      if (data.medium?.success) msgs.push('Medium ✓');
      showToast(msgs.join(' · '));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Create failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCrossPost = async (slug: string, platform: 'devto' | 'medium') => {
    const key = `${slug}-${platform}`;
    setCrossPosting((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await fetch('/api/admin/blogs/crosspost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, platform }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Cross-post failed');
      setBlogs((prev) =>
        prev.map((b) =>
          b.slug === slug
            ? {
                ...b,
                ...(platform === 'devto' ? { devtoUrl: data.url } : { mediumUrl: data.url }),
                publishedTo: [...new Set([...(b.publishedTo ?? []), platform])],
              }
            : b
        )
      );
      showToast(`Posted to ${platform === 'devto' ? 'DEV.to' : 'Medium'} ✓`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : `${platform} cross-post failed`, 'error');
    } finally {
      setCrossPosting((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleSaveBlogArticle = async (article: BlogArticle) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(article),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setBlogs((prev) => {
        const idx = prev.findIndex((b) => b.slug === article.slug);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = data.article;
          return next;
        }
        return [data.article, ...prev];
      });
      setActiveBlogEdit(null);
      showToast('Article saved!');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Article save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBlogArticle = async (slug: string) => {
    if (!confirm(`Delete article "${slug}"?`)) return;
    try {
      const res = await fetch(`/api/admin/blogs?slug=${encodeURIComponent(slug)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
      setBlogs((prev) => prev.filter((b) => b.slug !== slug));
      showToast('Article deleted');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed', 'error');
    }
  };

  /* ─── loading state ─── */
  if (loading) {
    return <AdminDashboardSkeleton />;
  }

  /* ─── helpers for portfolio state mutations ─── */
  const setProj = (idx: number, patch: Partial<Project>) => {
    if (!portfolio) return;
    const next = (portfolio.projects || []).map((p, i) => (i === idx ? { ...p, ...patch } : p));
    setPortfolio({ ...portfolio, projects: next });
  };
  const setWork = (idx: number, patch: Partial<AdditionalProject>) => {
    if (!portfolio) return;
    const next = (portfolio.smallWorks || []).map((w, i) => (i === idx ? { ...w, ...patch } : w));
    setPortfolio({ ...portfolio, smallWorks: next });
  };
  const setExp = (idx: number, patch: Partial<Experience>) => {
    if (!portfolio) return;
    const next = (portfolio.experiences || []).map((e, i) => (i === idx ? { ...e, ...patch } : e));
    setPortfolio({ ...portfolio, experiences: next });
  };
  const setGroup = (gIdx: number, patch: Partial<SkillGroup>) => {
    if (!portfolio) return;
    const next = (portfolio.skillGroups || []).map((g, i) => (i === gIdx ? { ...g, ...patch } : g));
    setPortfolio({ ...portfolio, skillGroups: next });
  };
  const moveItem = <T,>(arr: T[], idx: number, dir: -1 | 1): T[] => {
    const next = [...arr];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return next;
    [next[idx], next[target]] = [next[target], next[idx]];
    return next;
  };

  /* ─────────────────────────────────────────── RENDER ─── */
  return (
    <div className="min-h-screen bg-[#0B0B0B] text-paper font-sans">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl font-mono text-xs shadow-2xl border transition-all ${
            toast.type === 'success'
              ? 'bg-[#182315] border-[#b4d579]/40 text-[#b4d579]'
              : 'bg-[#291414] border-red-500/40 text-red-300'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-[#0B0B0B]/90 backdrop-blur-md border-b border-white/13 px-8 max-sm:px-4 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid w-7 h-7 place-items-center rounded bg-ember -rotate-6">
              <img src="/joseph-logo-light.svg" alt="Logo" className="w-4 h-4 object-contain" />
            </span>
            <span className="font-mono text-[9px] font-bold tracking-[0.1em]">ADMIN CONSOLE</span>
          </Link>

          {/* Source badge */}
          <span
            className={`font-mono text-[7px] tracking-[0.1em] px-2.5 py-0.5 rounded-full border ${
              dataSource === 'firestore'
                ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                : 'border-amber-500/40 text-amber-400 bg-amber-500/10'
            }`}
          >
            {dataSource === 'firestore' ? '● FIRESTORE CLOUD' : '○ LOCAL JSON'}
          </span>

          {/* Cloudinary badge */}
          <span
            className={`font-mono text-[7px] tracking-[0.1em] px-2.5 py-0.5 rounded-full border ${
              cloudinaryConfigured
                ? 'border-sky-500/40 text-sky-400 bg-sky-500/10'
                : 'border-white/10 text-[#666]'
            }`}
          >
            {cloudinaryConfigured ? '● CLOUDINARY READY' : '○ CLOUDINARY'}
          </span>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {/* Seed button — shown when on local JSON */}
          {dataSource === 'local' && (
            <button
              onClick={handleSeedToCloud}
              disabled={seeding}
              className="px-3 py-1.5 rounded-lg border border-emerald-500/40 text-emerald-400 font-mono text-[9px] hover:bg-emerald-500/10 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {seeding ? (
                <><span className="animate-spin inline-block">↺</span> SEEDING…</>
              ) : (
                <>↑ SEED TO CLOUD</>
              )}
            </button>
          )}

          <button
            onClick={handleSavePortfolio}
            disabled={saving}
            className="px-4 py-1.5 rounded-lg bg-ember text-ink font-mono text-[9px] font-bold tracking-[0.1em] hover:bg-ember-soft transition-colors cursor-pointer disabled:opacity-50"
          >
            {saving ? 'SAVING...' : 'SAVE CHANGES'}
          </button>
          <Link
            href="/"
            target="_blank"
            className="text-[#999] hover:text-paper font-mono text-[8px] tracking-[0.1em] transition-colors"
          >
            VIEW SITE ↗
          </Link>
          {userEmail && (
            <span className="text-[#888] font-mono text-[7px] tracking-[0.1em] truncate max-w-[160px]">
              {userEmail}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="text-[#666] hover:text-red-400 font-mono text-[8px] tracking-[0.1em] transition-colors cursor-pointer"
          >
            SIGN OUT
          </button>
        </div>
      </header>

      {/* ── Main ── */}
      <div className="max-w-[1400px] mx-auto px-8 max-sm:px-4 py-8">
        {/* Tab Nav */}
        <div className="flex flex-wrap gap-2 pb-6 border-b border-white/13 mb-8">
          {[
            { id: 'profile', label: '01 / Profile & Contact' },
            { id: 'projects', label: '02 / Selected Works' },
            { id: 'smallWorks', label: '03 / Little Things' },
            { id: 'experience', label: '04 / Career Timeline' },
            { id: 'skills', label: '05 / Skills & Toolkit' },
            { id: 'blogs', label: '06 / Blog Engine' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`px-4 py-2 rounded-lg font-mono text-[9px] tracking-[0.08em] transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white/10 text-paper border border-white/20'
                  : 'text-[#888] hover:text-paper hover:bg-white/5 border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Fallback if portfolio data fails to load */}
        {!portfolio && activeTab !== 'blogs' && (
          <div className="p-8 rounded-2xl bg-[#111110] border border-white/13 text-center space-y-4 max-w-lg mx-auto my-12">
            <div className="w-3 h-3 rounded-full bg-ember animate-ping mx-auto" />
            <h3 className="text-base font-medium text-paper">Portfolio Content Not Loaded</h3>
            <p className="font-mono text-xs text-[#8e8883]">
              Unable to load portfolio details. Click below to retry.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-ember text-ink font-mono text-[9px] font-bold hover:bg-ember-soft transition-colors cursor-pointer"
            >
              RELOAD CONSOLE
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════
            TAB 01 — Profile & Contact
        ══════════════════════════════════════ */}
        {activeTab === 'profile' && portfolio && (
          <div className="space-y-8 max-w-[800px]">

            {/* General Identity */}
            <section className="p-6 rounded-2xl bg-[#111110] border border-white/13 space-y-4">
              <h2 className="text-lg font-medium tracking-tight mb-4">General Identity</h2>
              <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-4">
                <Field label="Name">
                  <input type="text" className={inputCls} value={portfolio.profile.name}
                    onChange={(e) => setPortfolio({ ...portfolio, profile: { ...portfolio.profile, name: e.target.value } })} />
                </Field>
                <Field label="Role Title">
                  <input type="text" className={inputCls} value={portfolio.profile.role}
                    onChange={(e) => setPortfolio({ ...portfolio, profile: { ...portfolio.profile, role: e.target.value } })} />
                </Field>
              </div>
              <Field label="Headline / Tagline">
                <input type="text" className={inputCls} value={portfolio.profile.headline}
                  onChange={(e) => setPortfolio({ ...portfolio, profile: { ...portfolio.profile, headline: e.target.value } })} />
              </Field>
              <Field label="Status">
                <input type="text" className={inputCls} value={portfolio.profile.status}
                  onChange={(e) => setPortfolio({ ...portfolio, profile: { ...portfolio.profile, status: e.target.value } })} />
              </Field>
              <Field label="About Lead">
                <textarea rows={2} className={inputCls} value={portfolio.profile.aboutLead}
                  onChange={(e) => setPortfolio({ ...portfolio, profile: { ...portfolio.profile, aboutLead: e.target.value } })} />
              </Field>
              <Field label="About Paragraphs (one per blank line)">
                <textarea rows={5} className={inputCls}
                  value={(portfolio.profile.aboutParagraphs || []).join('\n\n')}
                  onChange={(e) =>
                    setPortfolio({
                      ...portfolio,
                      profile: { ...portfolio.profile, aboutParagraphs: e.target.value.split('\n\n').filter(Boolean) },
                    })
                  }
                />
              </Field>
            </section>

            {/* Contact Info */}
            <section className="p-6 rounded-2xl bg-[#111110] border border-white/13 space-y-4">
              <h2 className="text-lg font-medium tracking-tight mb-4">Contact Information</h2>
              <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-4">
                <Field label="Email">
                  <input type="email" className={inputCls} value={portfolio.contact.email}
                    onChange={(e) => setPortfolio({ ...portfolio, contact: { ...portfolio.contact, email: e.target.value } })} />
                </Field>
                <Field label="Phone">
                  <input type="text" className={inputCls} value={portfolio.contact.phone}
                    onChange={(e) => setPortfolio({ ...portfolio, contact: { ...portfolio.contact, phone: e.target.value } })} />
                </Field>
                <Field label="Location">
                  <input type="text" className={inputCls} value={portfolio.contact.location}
                    onChange={(e) => setPortfolio({ ...portfolio, contact: { ...portfolio.contact, location: e.target.value } })} />
                </Field>
                <Field label="GitHub URL">
                  <input type="text" className={inputCls} value={portfolio.contact.github || ''}
                    onChange={(e) => setPortfolio({ ...portfolio, contact: { ...portfolio.contact, github: e.target.value } })} />
                </Field>
                <Field label="Website URL">
                  <input type="text" className={inputCls} value={portfolio.contact.website || ''}
                    onChange={(e) => setPortfolio({ ...portfolio, contact: { ...portfolio.contact, website: e.target.value } })} />
                </Field>
              </div>
            </section>

            {/* Social Profiles */}
            <section className="p-6 rounded-2xl bg-[#111110] border border-white/13 space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium tracking-tight">Social Profiles</h2>
                <button
                  onClick={() =>
                    setPortfolio({
                      ...portfolio,
                      contact: {
                        ...portfolio.contact,
                        profiles: [
                          ...(portfolio.contact.profiles ?? []),
                          { platform: 'New Platform', username: '@handle', url: 'https://' },
                        ],
                      },
                    })
                  }
                  className="font-mono text-[9px] text-ember hover:underline cursor-pointer"
                >
                  + ADD PROFILE
                </button>
              </div>
              <div className="space-y-3">
                {(portfolio.contact.profiles ?? []).map((profile, pIdx) => (
                  <div key={pIdx} className="flex items-center gap-2 flex-wrap">
                    <input
                      type="text"
                      value={profile.platform}
                      placeholder="Platform"
                      onChange={(e) => {
                        const next = [...(portfolio.contact.profiles ?? [])];
                        next[pIdx] = { ...next[pIdx], platform: e.target.value };
                        setPortfolio({ ...portfolio, contact: { ...portfolio.contact, profiles: next } });
                      }}
                      className="w-32 px-2.5 py-1.5 rounded bg-[#181614] border border-white/10 text-xs focus:border-ember outline-none"
                    />
                    <input
                      type="text"
                      value={profile.username}
                      placeholder="@username"
                      onChange={(e) => {
                        const next = [...(portfolio.contact.profiles ?? [])];
                        next[pIdx] = { ...next[pIdx], username: e.target.value };
                        setPortfolio({ ...portfolio, contact: { ...portfolio.contact, profiles: next } });
                      }}
                      className="w-32 px-2.5 py-1.5 rounded bg-[#181614] border border-white/10 text-xs focus:border-ember outline-none"
                    />
                    <input
                      type="text"
                      value={profile.url}
                      placeholder="https://..."
                      onChange={(e) => {
                        const next = [...(portfolio.contact.profiles ?? [])];
                        next[pIdx] = { ...next[pIdx], url: e.target.value };
                        setPortfolio({ ...portfolio, contact: { ...portfolio.contact, profiles: next } });
                      }}
                      className="flex-1 min-w-[180px] px-2.5 py-1.5 rounded bg-[#181614] border border-white/10 text-xs focus:border-ember outline-none"
                    />
                    <button
                      onClick={() => {
                        const next = [...(portfolio.contact.profiles ?? [])];
                        next.splice(pIdx, 1);
                        setPortfolio({ ...portfolio, contact: { ...portfolio.contact, profiles: next } });
                      }}
                      className="text-red-400 font-mono text-[9px] hover:underline cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {(portfolio.contact.profiles ?? []).length === 0 && (
                  <p className="font-mono text-[10px] text-[#555]">No social profiles added yet.</p>
                )}
              </div>
            </section>
          </div>
        )}

        {/* ══════════════════════════════════════
            TAB 02 — Selected Works
        ══════════════════════════════════════ */}
        {activeTab === 'projects' && portfolio && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-medium tracking-tight">Featured Projects ({(portfolio.projects || []).length})</h2>
              <button
                onClick={() => {
                  const newProj: Project = {
                    title: 'New Project',
                    year: '2026',
                    category: 'WEB PLATFORM',
                    description: 'A newly designed tool or system.',
                    technologies: ['React', 'TypeScript', 'Node.js'],
                    accent: '#f36d45',
                    kind: 'fullstack',
                    url: 'https://github.com',
                    linkLabel: 'VIEW PROJECT',
                  };
                  setPortfolio({ ...portfolio, projects: [newProj, ...(portfolio.projects || [])] });
                }}
                className="px-3 py-1.5 rounded-lg border border-ember/40 text-ember font-mono text-[9px] hover:bg-ember/10 transition-colors cursor-pointer"
              >
                + ADD PROJECT
              </button>
            </div>

            <div className="grid grid-cols-2 max-lg:grid-cols-1 gap-6">
              {(portfolio.projects || []).map((proj, idx) => (
                <div key={idx} className="p-6 rounded-2xl bg-[#111110] border border-white/13 space-y-4">
                  {/* Card header with reorder + delete */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setPortfolio({ ...portfolio, projects: moveItem(portfolio.projects, idx, -1) })}
                        disabled={idx === 0} className="text-[#888] font-mono text-[10px] hover:text-paper disabled:opacity-30 cursor-pointer px-1">↑</button>
                      <button onClick={() => setPortfolio({ ...portfolio, projects: moveItem(portfolio.projects, idx, 1) })}
                        disabled={idx === portfolio.projects.length - 1} className="text-[#888] font-mono text-[10px] hover:text-paper disabled:opacity-30 cursor-pointer px-1">↓</button>
                      <span className="font-mono text-[8px] text-ember ml-2">{proj.kind?.toUpperCase()}</span>
                    </div>
                    <button
                      onClick={() => {
                        if (!confirm(`Delete "${proj.title}"?`)) return;
                        setPortfolio({ ...portfolio, projects: portfolio.projects.filter((_, i) => i !== idx) });
                      }}
                      className="text-red-400 font-mono text-[8px] hover:underline cursor-pointer"
                    >
                      DELETE
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Title">
                      <input type="text" className={inputCls} value={proj.title}
                        onChange={(e) => setProj(idx, { title: e.target.value })} />
                    </Field>
                    <Field label="Year">
                      <input type="text" className={inputCls} value={proj.year}
                        onChange={(e) => setProj(idx, { year: e.target.value })} />
                    </Field>
                  </div>

                  <Field label="Category">
                    <input type="text" className={inputCls} value={proj.category}
                      onChange={(e) => setProj(idx, { category: e.target.value })} />
                  </Field>

                  <Field label="Description">
                    <textarea rows={2} className={inputCls} value={proj.description}
                      onChange={(e) => setProj(idx, { description: e.target.value })} />
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Kind (slug)">
                      <input type="text" className={inputCls} value={proj.kind}
                        onChange={(e) => setProj(idx, { kind: e.target.value })} />
                    </Field>
                    <Field label="Accent Hex">
                      <div className="flex gap-2 items-center">
                        <input type="color" value={proj.accent}
                          onChange={(e) => setProj(idx, { accent: e.target.value })}
                          className="w-8 h-8 rounded border border-white/10 bg-transparent cursor-pointer" />
                        <input type="text" className={`${inputCls} flex-1`} value={proj.accent}
                          onChange={(e) => setProj(idx, { accent: e.target.value })} />
                      </div>
                    </Field>
                  </div>

                  <Field label="Technologies (comma-separated)">
                    <input type="text" className={inputCls} value={proj.technologies.join(', ')}
                      onChange={(e) => setProj(idx, { technologies: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Project URL">
                      <input type="text" className={inputCls} value={proj.url || ''}
                        onChange={(e) => setProj(idx, { url: e.target.value })} />
                    </Field>
                    <Field label="Link Label">
                      <input type="text" className={inputCls} value={proj.linkLabel || ''}
                        placeholder="VIEW PROJECT"
                        onChange={(e) => setProj(idx, { linkLabel: e.target.value })} />
                    </Field>
                  </div>

                  {/* Media upload */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className={labelCls}>Media / Cover Image</label>
                      <label className="font-mono text-[8px] text-ember hover:text-ember-soft cursor-pointer flex items-center gap-1">
                        <span>{uploadingImage === `proj-${idx}` ? 'UPLOADING...' : '↑ UPLOAD'}</span>
                        <input type="file" accept="image/*" className="hidden"
                          disabled={uploadingImage === `proj-${idx}`}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadFile(file, 'portfolio/works', `proj-${idx}`, (url) => setProj(idx, { mediaSrc: url }));
                          }} />
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <input type="text" className={`${inputCls} flex-1`} value={proj.mediaSrc || ''}
                        placeholder="https://... or upload"
                        onChange={(e) => setProj(idx, { mediaSrc: e.target.value })} />
                      {proj.mediaSrc && <img src={proj.mediaSrc} alt="" className="w-8 h-8 object-cover rounded border border-white/10 flex-none" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            TAB 03 — Little Things
        ══════════════════════════════════════ */}
        {activeTab === 'smallWorks' && portfolio && (
          <div className="space-y-6 max-w-[960px]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-medium tracking-tight">Little Things ({(portfolio.smallWorks || []).length})</h2>
              <button
                onClick={() => {
                  const newWork: AdditionalProject = { name: 'New Experiment', note: 'Micro-library or demo', year: '2026', stack: 'TypeScript', url: '' };
                  setPortfolio({ ...portfolio, smallWorks: [newWork, ...(portfolio.smallWorks || [])] });
                }}
                className="px-3 py-1.5 rounded-lg border border-ember/40 text-ember font-mono text-[9px] hover:bg-ember/10 transition-colors cursor-pointer"
              >
                + ADD EXPERIMENT
              </button>
            </div>

            <div className="border border-white/13 rounded-2xl overflow-hidden bg-[#111110]">
              {(portfolio.smallWorks || []).map((work, idx) => (
                <div key={idx} className="p-4 border-b border-white/10 flex items-center gap-3 text-xs flex-wrap last:border-b-0">
                  {/* reorder */}
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => setPortfolio({ ...portfolio, smallWorks: moveItem(portfolio.smallWorks, idx, -1) })}
                      disabled={idx === 0} className="text-[#666] hover:text-paper disabled:opacity-20 cursor-pointer text-[8px] leading-none">▲</button>
                    <button onClick={() => setPortfolio({ ...portfolio, smallWorks: moveItem(portfolio.smallWorks, idx, 1) })}
                      disabled={idx === portfolio.smallWorks.length - 1} className="text-[#666] hover:text-paper disabled:opacity-20 cursor-pointer text-[8px] leading-none">▼</button>
                  </div>

                  <span className="font-mono text-[8px] text-[#555] w-5 flex-none">
                    {String(idx + 1).padStart(2, '0')}
                  </span>

                  <input type="text" value={work.name} placeholder="Name"
                    onChange={(e) => setWork(idx, { name: e.target.value })}
                    className="flex-1 min-w-[100px] px-2.5 py-1.5 rounded bg-[#181614] border border-white/10 font-medium focus:border-ember outline-none" />
                  <input type="text" value={work.note} placeholder="Short description"
                    onChange={(e) => setWork(idx, { note: e.target.value })}
                    className="flex-[2] min-w-[120px] px-2.5 py-1.5 rounded bg-[#181614] border border-white/10 text-[#aaa] focus:border-ember outline-none" />
                  <input type="text" value={work.stack} placeholder="Stack"
                    onChange={(e) => setWork(idx, { stack: e.target.value })}
                    className="w-40 px-2.5 py-1.5 rounded bg-[#181614] border border-white/10 font-mono text-[10px] focus:border-ember outline-none" />
                  <input type="text" value={work.year} placeholder="Year"
                    onChange={(e) => setWork(idx, { year: e.target.value })}
                    className="w-16 px-2.5 py-1.5 rounded bg-[#181614] border border-white/10 font-mono text-[10px] focus:border-ember outline-none" />
                  <input type="text" value={work.url || ''} placeholder="URL (optional)"
                    onChange={(e) => setWork(idx, { url: e.target.value })}
                    className="w-44 px-2.5 py-1.5 rounded bg-[#181614] border border-white/10 text-[10px] text-ember focus:border-ember outline-none" />
                  <button
                    onClick={() => {
                      if (!confirm(`Remove "${work.name}"?`)) return;
                      setPortfolio({ ...portfolio, smallWorks: portfolio.smallWorks.filter((_, i) => i !== idx) });
                    }}
                    className="text-red-400 font-mono text-[9px] hover:underline cursor-pointer flex-none"
                  >
                    ×
                  </button>
                </div>
              ))}
              {portfolio.smallWorks.length === 0 && (
                <p className="text-center font-mono text-[10px] text-[#555] py-8">No experiments yet.</p>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            TAB 04 — Career Timeline
        ══════════════════════════════════════ */}
        {activeTab === 'experience' && portfolio && (
          <div className="space-y-6 max-w-[900px]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-medium tracking-tight">Career Timeline ({(portfolio.experiences || []).length})</h2>
              <button
                onClick={() => {
                  const newExp: Experience = {
                    company: 'Company Name',
                    role: 'Senior Software Engineer',
                    dates: '2025 — PRESENT',
                    location: 'Remote',
                    achievements: ['Designed and maintained mission-critical interfaces.'],
                  };
                  setPortfolio({ ...portfolio, experiences: [newExp, ...(portfolio.experiences || [])] });
                }}
                className="px-3 py-1.5 rounded-lg border border-ember/40 text-ember font-mono text-[9px] hover:bg-ember/10 transition-colors cursor-pointer"
              >
                + ADD POSITION
              </button>
            </div>

            {(portfolio.experiences || []).map((exp, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-[#111110] border border-white/13 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPortfolio({ ...portfolio, experiences: moveItem(portfolio.experiences, idx, -1) })}
                      disabled={idx === 0} className="text-[#888] font-mono text-[10px] hover:text-paper disabled:opacity-30 cursor-pointer">↑</button>
                    <button onClick={() => setPortfolio({ ...portfolio, experiences: moveItem(portfolio.experiences, idx, 1) })}
                      disabled={idx === portfolio.experiences.length - 1} className="text-[#888] font-mono text-[10px] hover:text-paper disabled:opacity-30 cursor-pointer">↓</button>
                    <span className="font-mono text-[8px] text-ember">
                      {String(idx + 1).padStart(2, '0')} / POSITION
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (!confirm(`Delete position at "${exp.company}"?`)) return;
                      setPortfolio({ ...portfolio, experiences: portfolio.experiences.filter((_, i) => i !== idx) });
                    }}
                    className="text-red-400 font-mono text-[8px] hover:underline cursor-pointer"
                  >
                    DELETE
                  </button>
                </div>

                <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-4">
                  <Field label="Company">
                    <input type="text" className={inputCls} value={exp.company}
                      onChange={(e) => setExp(idx, { company: e.target.value })} />
                  </Field>
                  <Field label="Role">
                    <input type="text" className={inputCls} value={exp.role}
                      onChange={(e) => setExp(idx, { role: e.target.value })} />
                  </Field>
                  <Field label="Dates">
                    <input type="text" className={inputCls} value={exp.dates}
                      placeholder="2023 — 2025"
                      onChange={(e) => setExp(idx, { dates: e.target.value })} />
                  </Field>
                  <Field label="Location">
                    <input type="text" className={inputCls} value={exp.location}
                      onChange={(e) => setExp(idx, { location: e.target.value })} />
                  </Field>
                </div>

                {/* Achievements as individual rows */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className={labelCls}>Achievements</label>
                    <button
                      onClick={() => setExp(idx, { achievements: [...exp.achievements, ''] })}
                      className="font-mono text-[8px] text-ember hover:underline cursor-pointer"
                    >
                      + ADD BULLET
                    </button>
                  </div>
                  <div className="space-y-2">
                    {exp.achievements.map((ach, aIdx) => (
                      <div key={aIdx} className="flex items-start gap-2">
                        <span className="font-mono text-[8px] text-[#555] mt-2 flex-none">—</span>
                        <textarea
                          rows={2}
                          value={ach}
                          onChange={(e) => {
                            const next = [...exp.achievements];
                            next[aIdx] = e.target.value;
                            setExp(idx, { achievements: next });
                          }}
                          className="flex-1 px-2.5 py-1.5 rounded bg-[#181614] border border-white/10 text-xs focus:border-ember outline-none resize-none"
                        />
                        <button
                          onClick={() => {
                            const next = exp.achievements.filter((_, i) => i !== aIdx);
                            setExp(idx, { achievements: next });
                          }}
                          className="text-red-400 font-mono text-[9px] mt-1.5 hover:underline cursor-pointer flex-none"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ══════════════════════════════════════
            TAB 05 — Skills & Toolkit
        ══════════════════════════════════════ */}
        {activeTab === 'skills' && portfolio && (
          <div className="space-y-8 max-w-[960px]">
            {/* Skill Groups */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-medium tracking-tight">Skill Groups</h2>
                <button
                  onClick={() => {
                    const newGroup: SkillGroup = { title: 'New Category', items: [{ name: 'New Skill', note: 'Context note' }] };
                    setPortfolio({ ...portfolio, skillGroups: [...portfolio.skillGroups, newGroup] });
                  }}
                  className="px-3 py-1.5 rounded-lg border border-ember/40 text-ember font-mono text-[9px] hover:bg-ember/10 transition-colors cursor-pointer"
                >
                  + ADD GROUP
                </button>
              </div>

              <div className="space-y-6">
                {(portfolio.skillGroups || []).map((group, gIdx) => (
                  <div key={gIdx} className="p-6 rounded-2xl bg-[#111110] border border-white/13 space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setPortfolio({ ...portfolio, skillGroups: moveItem(portfolio.skillGroups, gIdx, -1) })}
                          disabled={gIdx === 0} className="text-[#888] font-mono text-[10px] hover:text-paper disabled:opacity-30 cursor-pointer">↑</button>
                        <button onClick={() => setPortfolio({ ...portfolio, skillGroups: moveItem(portfolio.skillGroups, gIdx, 1) })}
                          disabled={gIdx === portfolio.skillGroups.length - 1} className="text-[#888] font-mono text-[10px] hover:text-paper disabled:opacity-30 cursor-pointer">↓</button>
                        <input
                          type="text"
                          value={group.title}
                          onChange={(e) => setGroup(gIdx, { title: e.target.value })}
                          className="text-base font-medium px-2 py-1 rounded bg-[#181614] border border-white/10 text-paper focus:border-ember outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => setGroup(gIdx, { items: [...(group.items || []), { name: 'New Skill', note: '' }] })}
                          className="font-mono text-[8px] text-ember hover:underline cursor-pointer">
                          + ADD SKILL
                        </button>
                        <button
                          onClick={() => {
                            if (!confirm(`Delete group "${group.title}"?`)) return;
                            setPortfolio({ ...portfolio, skillGroups: portfolio.skillGroups.filter((_, i) => i !== gIdx) });
                          }}
                          className="font-mono text-[8px] text-red-400 hover:underline cursor-pointer"
                        >
                          DELETE GROUP
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-3">
                      {(group.items || []).map((item, iIdx) => (
                        <div key={iIdx} className="p-3 rounded-lg bg-[#181614] border border-white/10 flex items-center gap-2">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => {
                              const next = group.items.map((it, i) => (i === iIdx ? { ...it, name: e.target.value } : it));
                              setGroup(gIdx, { items: next });
                            }}
                            className="w-1/2 px-2 py-1 rounded bg-[#201e1b] border border-white/10 text-xs font-medium focus:border-ember outline-none"
                          />
                          <input
                            type="text"
                            value={item.note}
                            placeholder="Context…"
                            onChange={(e) => {
                              const next = group.items.map((it, i) => (i === iIdx ? { ...it, note: e.target.value } : it));
                              setGroup(gIdx, { items: next });
                            }}
                            className="w-1/2 px-2 py-1 rounded bg-[#201e1b] border border-white/10 text-[10px] text-[#aaa] focus:border-ember outline-none"
                          />
                          <button
                            onClick={() => setGroup(gIdx, { items: group.items.filter((_, i) => i !== iIdx) })}
                            className="text-red-400 font-mono text-[8px] hover:underline cursor-pointer flex-none"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Soft Skills */}
            <section className="p-6 rounded-2xl bg-[#111110] border border-white/13">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium tracking-tight">Soft Skills</h2>
                <button
                  onClick={() => setPortfolio({ ...portfolio, softSkills: [...portfolio.softSkills, 'New Skill'] })}
                  className="font-mono text-[9px] text-ember hover:underline cursor-pointer"
                >
                  + ADD
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(portfolio.softSkills || []).map((skill, sIdx) => (
                  <div key={sIdx} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#181614] border border-white/10">
                    <input
                      type="text"
                      value={skill}
                      onChange={(e) => {
                        const next = portfolio.softSkills.map((s, i) => (i === sIdx ? e.target.value : s));
                        setPortfolio({ ...portfolio, softSkills: next });
                      }}
                      className="bg-transparent text-xs outline-none min-w-[60px] max-w-[160px]"
                    />
                    <button
                      onClick={() => setPortfolio({ ...portfolio, softSkills: portfolio.softSkills.filter((_, i) => i !== sIdx) })}
                      className="text-red-400 text-[10px] hover:scale-110 cursor-pointer transition-transform"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ══════════════════════════════════════
            TAB 06 — Blog Engine
        ══════════════════════════════════════ */}
        {activeTab === 'blogs' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-start gap-4 pb-4 border-b border-white/10">
              <div>
                <h2 className="text-xl font-medium tracking-tight">Blog Engine ({blogs.length})</h2>
                <p className="text-xs text-[#8e8883] font-mono mt-1">
                  Write once · publish to DEV.to, Medium & your portfolio.
                </p>
                {platformStatus && (
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`font-mono text-[7px] px-2 py-0.5 rounded-full border ${platformStatus.devto.connected ? 'border-green-500/40 text-green-400 bg-green-500/10' : 'border-white/10 text-[#555]'}`}>
                      {platformStatus.devto.connected ? `● DEV.TO @${platformStatus.devto.username}` : '○ DEV.TO NOT CONNECTED'}
                    </span>
                    <span className={`font-mono text-[7px] px-2 py-0.5 rounded-full border ${platformStatus.medium.connected ? 'border-green-500/40 text-green-400 bg-green-500/10' : 'border-white/10 text-[#555]'}`}>
                      {platformStatus.medium.connected ? `● MEDIUM @${platformStatus.medium.username}` : '○ MEDIUM NOT CONNECTED'}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={handleSyncDevTo}
                  disabled={syncingDevTo}
                  className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-paper font-mono text-[9px] tracking-[0.08em] hover:bg-white/15 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  <span className={syncingDevTo ? 'animate-spin inline-block' : ''}>↺</span>
                  {syncingDevTo ? 'SYNCING...' : 'SYNC FROM DEV.TO'}
                </button>
                <button
                  onClick={() => setIsCreatingBlog(true)}
                  className="px-4 py-2 rounded-lg bg-ember text-ink font-mono text-[9px] font-bold tracking-[0.08em] hover:bg-ember-soft transition-colors cursor-pointer"
                >
                  + NEW ARTICLE
                </button>
              </div>
            </div>

            {/* ── NEW ARTICLE MODAL ── */}
            {isCreatingBlog && (
              <div className="p-6 rounded-2xl bg-[#111110] border border-ember/30 space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-base font-medium text-paper">Create New Article</h3>
                  <button onClick={() => setIsCreatingBlog(false)} className="text-[#888] font-mono text-xs hover:text-paper cursor-pointer">CLOSE [×]</button>
                </div>

                <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-4">
                  <Field label="Title *">
                    <input type="text" className={inputCls} value={newBlog.title}
                      onChange={(e) => setNewBlog({ ...newBlog, title: e.target.value })}
                      placeholder="Your article title" />
                  </Field>
                  <Field label="Tags (comma-separated, max 4)">
                    <input type="text" className={inputCls} value={newBlog.tagList}
                      onChange={(e) => setNewBlog({ ...newBlog, tagList: e.target.value })}
                      placeholder="react, typescript, webdev" />
                  </Field>
                </div>

                <Field label="Description / Summary">
                  <textarea rows={2} className={inputCls} value={newBlog.description}
                    onChange={(e) => setNewBlog({ ...newBlog, description: e.target.value })}
                    placeholder="A brief summary shown in previews" />
                </Field>

                {/* Cover image */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className={labelCls}>Cover Image (optional)</label>
                    <label className="font-mono text-[8px] text-ember hover:text-ember-soft cursor-pointer flex items-center gap-1">
                      <span>{uploadingImage === 'newBlog' ? 'UPLOADING...' : '↑ UPLOAD TO CLOUDINARY'}</span>
                      <input type="file" accept="image/*" className="hidden"
                        disabled={uploadingImage === 'newBlog'}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadFile(file, 'portfolio/blogs', 'newBlog', (url) => setNewBlog((p) => ({ ...p, coverImage: url })));
                        }} />
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <input type="text" className={`${inputCls} flex-1`} value={newBlog.coverImage}
                      placeholder="https://... or upload to Cloudinary"
                      onChange={(e) => setNewBlog({ ...newBlog, coverImage: e.target.value })} />
                    {newBlog.coverImage && <img src={newBlog.coverImage} alt="" className="w-8 h-8 object-cover rounded border border-white/10 flex-none" />}
                  </div>
                </div>

                {/* Rich text editor */}
                <div>
                  <label className={labelCls}>Article Content *</label>
                  <RichTextEditor
                    value={newBlog.bodyMarkdown}
                    onChange={(md) => setNewBlog((p) => ({ ...p, bodyMarkdown: md }))}
                    placeholder="Write your article content here…"
                    minHeight={400}
                  />
                </div>

                {/* Publish options */}
                <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-white/10">
                  <div>
                    <p className="font-mono text-[8px] text-[#888] uppercase mb-2">Publish To</p>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="accent-ember" checked={newBlog.publishTo.devto}
                          onChange={(e) => setNewBlog({ ...newBlog, publishTo: { ...newBlog.publishTo, devto: e.target.checked } })} />
                        <span className="font-mono text-[9px] text-paper">DEV.TO</span>
                        {platformStatus && !platformStatus.devto.connected && (
                          <span className="font-mono text-[7px] text-yellow-500">(token missing)</span>
                        )}
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="accent-ember" checked={newBlog.publishTo.medium}
                          onChange={(e) => setNewBlog({ ...newBlog, publishTo: { ...newBlog.publishTo, medium: e.target.checked } })} />
                        <span className="font-mono text-[9px] text-paper">MEDIUM</span>
                        {platformStatus && !platformStatus.medium.connected && (
                          <span className="font-mono text-[7px] text-yellow-500">(token missing)</span>
                        )}
                      </label>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer ml-auto">
                    <input type="checkbox" className="accent-ember" checked={newBlog.isDraft}
                      onChange={(e) => setNewBlog({ ...newBlog, isDraft: e.target.checked })} />
                    <span className="font-mono text-[9px] text-[#aaa]">SAVE AS DRAFT</span>
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setIsCreatingBlog(false)}
                    className="px-4 py-1.5 rounded-lg border border-white/15 text-[#888] font-mono text-[8px] hover:text-paper cursor-pointer">
                    CANCEL
                  </button>
                  <button onClick={handleCreateBlog} disabled={saving}
                    className="px-5 py-1.5 rounded-lg bg-ember text-ink font-mono text-[9px] font-bold hover:bg-ember-soft disabled:opacity-50 cursor-pointer flex items-center gap-2">
                    {saving ? 'PUBLISHING...' : (newBlog.isDraft ? 'SAVE DRAFT' : 'PUBLISH ARTICLE')}
                  </button>
                </div>
              </div>
            )}

            {/* ── EDIT ARTICLE MODAL ── */}
            {activeBlogEdit && (
              <div className="p-6 rounded-2xl bg-[#111110] border border-ember/30 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-medium text-paper">Edit: {activeBlogEdit.title}</h3>
                  <button onClick={() => setActiveBlogEdit(null)} className="text-[#888] font-mono text-xs hover:text-paper cursor-pointer">CLOSE [×]</button>
                </div>

                <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-4">
                  <Field label="Title">
                    <input type="text" className={inputCls} value={activeBlogEdit.title}
                      onChange={(e) => setActiveBlogEdit({ ...activeBlogEdit, title: e.target.value })} />
                  </Field>
                  <Field label="Slug">
                    <input type="text" className={inputCls} value={activeBlogEdit.slug}
                      onChange={(e) => setActiveBlogEdit({ ...activeBlogEdit, slug: e.target.value })} />
                  </Field>
                </div>

                <Field label="Description">
                  <textarea rows={2} className={inputCls} value={activeBlogEdit.description}
                    onChange={(e) => setActiveBlogEdit({ ...activeBlogEdit, description: e.target.value })} />
                </Field>

                <div className="grid grid-cols-3 max-sm:grid-cols-1 gap-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className={labelCls}>Cover Image</label>
                      <label className="font-mono text-[8px] text-ember hover:text-ember-soft cursor-pointer">
                        <span>{uploadingImage === 'editBlog' ? 'UPLOADING...' : '↑ UPLOAD'}</span>
                        <input type="file" accept="image/*" className="hidden"
                          disabled={uploadingImage === 'editBlog'}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadFile(file, 'portfolio/blogs', 'editBlog', (url) => setActiveBlogEdit((p) => p ? { ...p, coverImage: url } : null));
                          }} />
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <input type="text" className={`${inputCls} flex-1`} value={activeBlogEdit.coverImage || ''}
                        onChange={(e) => setActiveBlogEdit({ ...activeBlogEdit, coverImage: e.target.value })} />
                      {activeBlogEdit.coverImage && <img src={activeBlogEdit.coverImage} alt="" className="w-8 h-8 object-cover rounded border border-white/10 flex-none" />}
                    </div>
                  </div>
                  <Field label="Reading Time (mins)">
                    <input type="number" className={inputCls} value={activeBlogEdit.readingTimeMinutes}
                      onChange={(e) => setActiveBlogEdit({ ...activeBlogEdit, readingTimeMinutes: parseInt(e.target.value) || 1 })} />
                  </Field>
                  <Field label="Tags (comma-separated)">
                    <input type="text" className={inputCls} value={activeBlogEdit.tagList.join(', ')}
                      onChange={(e) => setActiveBlogEdit({ ...activeBlogEdit, tagList: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })} />
                  </Field>
                </div>

                {/* Rich text editor for edit */}
                <div>
                  <label className={labelCls}>Article Content</label>
                  <RichTextEditor
                    value={activeBlogEdit.bodyMarkdown || ''}
                    onChange={(md) => setActiveBlogEdit((p) => p ? { ...p, bodyMarkdown: md } : null)}
                    minHeight={360}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setActiveBlogEdit(null)}
                    className="px-4 py-1.5 rounded-lg border border-white/15 text-[#888] font-mono text-[8px] hover:text-paper cursor-pointer">
                    CANCEL
                  </button>
                  <button onClick={() => handleSaveBlogArticle(activeBlogEdit)} disabled={saving}
                    className="px-4 py-1.5 rounded-lg bg-ember text-ink font-mono text-[9px] font-bold hover:bg-ember-soft disabled:opacity-50 cursor-pointer">
                    {saving ? 'SAVING...' : 'SAVE ARTICLE'}
                  </button>
                </div>
              </div>
            )}

            {/* ── ARTICLE LIST ── */}
            <div className="grid grid-cols-1 gap-3">
              {blogs.map((article) => (
                <div key={article.slug} className="p-5 rounded-xl bg-[#111110] border border-white/13 space-y-3">
                  <div className="flex max-sm:flex-col items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      {article.coverImage && (
                        <img src={article.coverImage} alt="" className="w-16 h-12 object-cover rounded flex-none bg-[#1a1714]" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-mono text-[7px] text-ember px-2 py-0.5 rounded bg-ember/10">
                            {article.tagList[0]?.toUpperCase() || 'ARTICLE'}
                          </span>
                          <span className="font-mono text-[8px] text-[#777]">{article.readingTimeMinutes} MIN</span>
                          {article.isDraft && (
                            <span className="font-mono text-[7px] text-yellow-500 px-2 py-0.5 rounded bg-yellow-500/10">DRAFT</span>
                          )}
                          {/* Platform badges */}
                          {(article.publishedTo ?? []).map((platform) => (
                            <span key={platform} className="font-mono text-[7px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[#aaa]">
                              {platform === 'devto' ? 'DEV.TO' : 'MEDIUM'}
                            </span>
                          ))}
                        </div>
                        <h4 className="text-sm font-medium text-paper truncate">{article.title}</h4>
                        <p className="text-[11px] text-[#8e8883] truncate">{article.slug}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap flex-none">
                      {/* Cross-post buttons */}
                      {!article.devtoUrl && (
                        <button
                          onClick={() => handleCrossPost(article.slug, 'devto')}
                          disabled={crossPosting[`${article.slug}-devto`]}
                          className="px-3 py-1.5 rounded-lg border border-white/15 text-[#888] font-mono text-[8px] hover:text-paper hover:border-white/30 disabled:opacity-50 transition-colors cursor-pointer"
                        >
                          {crossPosting[`${article.slug}-devto`] ? '...' : '→ DEV.TO'}
                        </button>
                      )}
                      {article.devtoUrl && (
                        <a href={article.devtoUrl} target="_blank" rel="noopener noreferrer"
                          className="font-mono text-[7px] text-emerald-400 hover:underline">
                          ● DEV.TO ↗
                        </a>
                      )}
                      {!article.mediumUrl && (
                        <button
                          onClick={() => handleCrossPost(article.slug, 'medium')}
                          disabled={crossPosting[`${article.slug}-medium`]}
                          className="px-3 py-1.5 rounded-lg border border-white/15 text-[#888] font-mono text-[8px] hover:text-paper hover:border-white/30 disabled:opacity-50 transition-colors cursor-pointer"
                        >
                          {crossPosting[`${article.slug}-medium`] ? '...' : '→ MEDIUM'}
                        </button>
                      )}
                      {article.mediumUrl && (
                        <a href={article.mediumUrl} target="_blank" rel="noopener noreferrer"
                          className="font-mono text-[7px] text-emerald-400 hover:underline">
                          ● MEDIUM ↗
                        </a>
                      )}
                      <button
                        onClick={() => setActiveBlogEdit(article)}
                        className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/15 text-[#aaa] font-mono text-[8px] hover:text-paper transition-colors cursor-pointer"
                      >
                        EDIT
                      </button>
                      <button
                        onClick={() => handleDeleteBlogArticle(article.slug)}
                        className="text-red-400 font-mono text-[8px] hover:underline cursor-pointer"
                      >
                        DELETE
                      </button>
                    </div>
                  </div>

                  {article.description && (
                    <p className="text-[11px] text-[#8e8883] font-mono leading-relaxed border-t border-white/5 pt-2">
                      {article.description}
                    </p>
                  )}
                </div>
              ))}
              {blogs.length === 0 && (
                <div className="text-center py-20 font-mono text-[10px] text-[#555]">
                  No articles yet. Create your first one above, or sync from DEV.to.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

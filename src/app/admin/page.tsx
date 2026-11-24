'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
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
import { PrismaticLoader } from '../../components/PrismaticLoader';
import { ConfirmModal } from '../../components/admin/ConfirmModal';
import { CloudinaryMediaManager } from '../../components/admin/CloudinaryMediaManager';
import { AutomationAndNewsletterManager } from '../../components/admin/AutomationAndNewsletterManager';
import { AdminOverviewDashboard } from '../../components/admin/AdminOverviewDashboard';
import { portfolio as defaultPortfolio } from '../../data';

const AdminOverviewDashboardPromise = null;
const GradientWaves = dynamic_import(() => import('../../components/GradientWaves'), {
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-[#09090b]" />,
});

// Rich-text editor is client-only (Tiptap)
const RichTextEditor = dynamic_import(() => import('../../components/admin/RichTextEditor'), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] h-64 flex items-center justify-center">
      <span className="font-mono text-[10px] text-[#666]">Loading editor…</span>
    </div>
  ),
});

type AdminTab =
  | 'dashboard'
  | 'profile'
  | 'projects'
  | 'smallWorks'
  | 'experience'
  | 'skills'
  | 'blogs'
  | 'media'
  | 'automation';

const VALID_ADMIN_TABS: AdminTab[] = [
  'dashboard',
  'profile',
  'projects',
  'smallWorks',
  'experience',
  'skills',
  'blogs',
  'media',
  'automation',
];

function SidebarIcon({ name }: { name: string }) {
  const cls = 'w-4 h-4 shrink-0';
  switch (name) {
    case 'dashboard':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
        </svg>
      );
    case 'blogs':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16M4 12h16M4 18h10" />
        </svg>
      );
    case 'automation':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
      );
    case 'media':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="16" rx="2.5" />
          <circle cx="8.5" cy="9.5" r="1.5" />
          <path d="M21 15l-5-5L5 20" />
        </svg>
      );
    case 'projects':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case 'profile':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c1.8-3.5 5-5 8-5s6.2 1.5 8 5" />
        </svg>
      );
    case 'smallWorks':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
        </svg>
      );
    case 'experience':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case 'skills':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
        </svg>
      );
    case 'newsletter':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 7l9 6 9-6" />
        </svg>
      );
    default:
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6M8 13h8M8 17h5" />
        </svg>
      );
  }
}

/* ─── small reusable helpers ─────────────────────── */
const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.09] text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-[#f36d45]/60 outline-none transition-colors';
const labelCls = 'block text-[11px] font-medium text-zinc-400 mb-1.5';

function Field({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <label className="block font-mono text-[8px] text-[#888] uppercase tracking-[0.08em]">{label}</label>
        {helper && <span className="font-mono text-[8px] text-[#666] tracking-wide">{helper}</span>}
      </div>
      {children}
    </div>
  );
}

function CommaSeparatedInput({
  value = [],
  onChange,
  className,
  placeholder,
  showPills = true,
}: {
  value: string[];
  onChange: (items: string[]) => void;
  className?: string;
  placeholder?: string;
  showPills?: boolean;
}) {
  const [text, setText] = useState(() => (Array.isArray(value) ? value.join(', ') : ''));
  const isFocusedRef = useRef(false);

  useEffect(() => {
    if (!isFocusedRef.current) {
      const nextText = Array.isArray(value) ? value.join(', ') : '';
      setText((prev) => (prev === nextText ? prev : nextText));
    }
  }, [value]);

  const handleRemove = (indexToRemove: number) => {
    const updated = (value || []).filter((_, i) => i !== indexToRemove);
    onChange(updated);
    setText(updated.join(', '));
  };

  return (
    <div className="space-y-1.5">
      <input
        type="text"
        className={className}
        placeholder={placeholder}
        value={text}
        onFocus={() => {
          isFocusedRef.current = true;
        }}
        onChange={(e) => {
          const raw = e.target.value;
          setText(raw);
          const parsed = raw
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
          onChange(parsed);
        }}
        onBlur={() => {
          isFocusedRef.current = false;
          const parsed = text
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
          onChange(parsed);
          setText(parsed.join(', '));
        }}
      />
      {showPills && Array.isArray(value) && value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {value.map((item, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.06] text-white/80 border border-white/10"
            >
              {item}
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="text-white/40 hover:text-zinc-200 text-xs font-bold leading-none cursor-pointer"
                title={`Remove ${item}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function MultilineArrayInput({
  value = [],
  onChange,
  className,
  rows = 5,
  placeholder,
}: {
  value: string[];
  onChange: (items: string[]) => void;
  className?: string;
  rows?: number;
  placeholder?: string;
}) {
  const [text, setText] = useState(() => (Array.isArray(value) ? value.join('\n\n') : ''));
  const isFocusedRef = useRef(false);

  useEffect(() => {
    if (!isFocusedRef.current) {
      const nextText = Array.isArray(value) ? value.join('\n\n') : '';
      setText((prev) => (prev === nextText ? prev : nextText));
    }
  }, [value]);

  return (
    <textarea
      rows={rows}
      className={className}
      placeholder={placeholder}
      value={text}
      onFocus={() => {
        isFocusedRef.current = true;
      }}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        const parsed = raw
          .split('\n\n')
          .map((s) => s.trim())
          .filter(Boolean);
        onChange(parsed);
      }}
      onBlur={() => {
        isFocusedRef.current = false;
        const parsed = text
          .split('\n\n')
          .map((s) => s.trim())
          .filter(Boolean);
        onChange(parsed);
        setText(parsed.join('\n\n'));
      }}
    />
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as AdminTab | null;
      if (tabParam && VALID_ADMIN_TABS.includes(tabParam)) {
        return tabParam;
      }
    }
    return 'dashboard';
  });
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [automationSubTabKey, setAutomationSubTabKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [syncingDevTo, setSyncingDevTo] = useState(false);
  const [syncingMedium, setSyncingMedium] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [dataSource, setDataSource] = useState<'firestore' | 'local'>('local');

  const [portfolio, setPortfolio] = useState<PortfolioContent | null>(null);
  const [blogs, setBlogs] = useState<BlogArticle[]>([]);
  const [activeBlogEdit, setActiveBlogEdit] = useState<BlogArticle | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Global confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    itemTitle?: string;
    itemType?: string;
    confirmLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void | Promise<void>;
  } | null>(null);

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
    sendNewsletter: true,
    publishTo: { devto: true },
  });
  const [syncingCoverDevTo, setSyncingCoverDevTo] = useState(false);
  const [generatingCoverAi, setGeneratingCoverAi] = useState(false);
  const [mediaPickerCallback, setMediaPickerCallback] = useState<((url: string) => void) | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSelectTab = (nextTab: AdminTab, subTab?: string) => {
    setActiveTab(nextTab);
    setMobileSidebarOpen(false);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', nextTab);
      if (subTab && nextTab === 'automation') {
        url.searchParams.set('subTab', subTab);
        setAutomationSubTabKey((k) => k + 1);
      } else if (nextTab !== 'automation') {
        url.searchParams.delete('subTab');
      }
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const syncTabFromUrl = () => {
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get('tab') as AdminTab | null;
        if (tabParam && VALID_ADMIN_TABS.includes(tabParam)) {
          setActiveTab(tabParam);
        } else {
          // Ensure ?tab= is present in the URL so any refresh preserves the active tab
          const url = new URL(window.location.href);
          url.searchParams.set('tab', activeTab);
          window.history.replaceState({}, '', url.pathname + url.search);
        }
      };

      syncTabFromUrl();

      const params = new URLSearchParams(window.location.search);
      const liStatus = params.get('linkedin');
      const liErr = params.get('linkedinError');
      if (liStatus === 'published') {
        handleSelectTab('automation');
        showToast('LinkedIn OAuth verified & post published to your profile');
      } else if (liStatus === 'connected') {
        handleSelectTab('automation');
        showToast('LinkedIn OAuth verified (60-day member access token saved)');
      } else if (liErr) {
        handleSelectTab('automation');
        showToast(`LinkedIn OAuth: ${liErr}`, 'error');
      }

      window.addEventListener('popstate', syncTabFromUrl);
      return () => window.removeEventListener('popstate', syncTabFromUrl);
    }
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const sessionRes = await fetch('/api/auth/session');
        const session = await sessionRes.json();
        if (!session.authenticated) {
          const nextDest =
            typeof window !== 'undefined'
              ? `${window.location.pathname}${window.location.search}`
              : '/admin';
          router.replace(`/admin/login?next=${encodeURIComponent(nextDest)}`);
          return;
        }
        setAuthenticated(true);
        if (session.user) setUserEmail(session.user);

        const [portfolioRes, blogsRes] = await Promise.all([
          fetch('/api/admin/portfolio'),
          fetch('/api/admin/blogs'),
        ]);

        if (portfolioRes.ok) {
          const pData = await portfolioRes.json().catch(() => ({}));
          if (pData?.data) {
            setPortfolio(pData.data);
            setDataSource(pData.source || 'firestore');
          } else {
            setPortfolio(defaultPortfolio as any);
            setDataSource('local');
          }
        } else {
          const errData = await portfolioRes.json().catch(() => ({}));
          console.error('[Admin] Portfolio load error:', errData);
          setPortfolio(defaultPortfolio as any);
          setDataSource('local');
          showToast('Loaded local portfolio backup (remote endpoint unavailable)', 'error');
        }
        if (blogsRes.ok) {
          const bData = await blogsRes.json().catch(() => ({}));
          setBlogs(Array.isArray(bData?.articles) ? bData.articles : []);
        } else {
          setBlogs([]);
        }

        try {
          const [statusRes, uploadRes, autoDebugRes] = await Promise.all([
            fetch('/api/admin/blogs/crosspost'),
            fetch('/api/admin/upload'),
            fetch('/api/admin/automation', { cache: 'no-store' }),
          ]);
          if (statusRes.ok) setPlatformStatus(await statusRes.json());
          if (uploadRes.ok) {
            const uData = await uploadRes.json();
            setCloudinaryConfigured(Boolean(uData.configured));
          }
          if (autoDebugRes.ok) {
            const aDebug = await autoDebugRes.json();
            if (aDebug.automationDebugReport) {
              const r = aDebug.automationDebugReport;
              console.log('[Automation Debug 1/5 - Server Clock & WAT]', r.serverClock);
              console.log('[Automation Debug 2/5 - Schedules & Due Checks]', r.schedules);
              console.log('[Automation Debug 3/5 - Weekly Queues]', r.queues);
              console.log('[Automation Debug 4/5 - Environment & Providers]', r.environment);
              console.log('[Automation Debug 5/5 - Cron History & Recent Logs]', {
                cronHistory: r.cronHistory,
                recentLogs: r.recentLogs,
              });
              console.log('[Automation Debug FULL REPORT]', JSON.stringify(r, null, 2));
            }
          }
        } catch {
          // non-fatal
        }
      } catch (err) {
        console.error('Failed to load admin data:', err);
        setPortfolio((prev) => prev || (defaultPortfolio as any));
        setDataSource('local');
        showToast('Error connecting to backend services — offline mode active', 'error');
      } finally {
        setFadingOut(true);
        setTimeout(() => {
          setLoading(false);
        }, 800);
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
      showToast(`Seeded to Firestore — ${data.counts?.projects} projects, ${data.counts?.experiences} experiences`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Seed failed', 'error');
    } finally {
      setSeeding(false);
    }
  };

  const syncLatestToPortfolioState = (article?: BlogArticle) => {
    if (!article || article.isDraft) return;
    setPortfolio((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        latestArticle: {
          id: article.devtoId || article.id,
          slug: article.slug,
          title: article.title,
          description: article.description,
          platform:
            article.devtoUrl || (article.publishedTo || []).includes('devto')
              ? 'DEV.TO'
              : 'BLOG',
          readingTime: `${article.readingTimeMinutes || 5} MIN READ`,
          publishedAt: article.publishedAt,
          date: new Date(article.publishedAt || Date.now())
            .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            .toUpperCase(),
          url: article.devtoUrl || article.url || `/blog/${article.slug}`,
          coverImage: article.coverImage,
        },
      };
    });
  };

  const handleSyncDevTo = async () => {
    setSyncingDevTo(true);
    try {
      const res = await fetch('/api/admin/sync-devto', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      const syncedList: BlogArticle[] = data.articles || [];
      setBlogs(syncedList);
      if (syncedList.length > 0) {
        syncLatestToPortfolioState(syncedList[0]);
      }
      showToast(`Synced ${data.count} articles from DEV.to & updated Hero Featured Post!`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Sync failed', 'error');
    } finally {
      setSyncingDevTo(false);
    }
  };

  const handleSyncMedium = async () => {
    setSyncingMedium(true);
    try {
      const res = await fetch('/api/admin/sync-medium', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Medium sync failed');
      const bRes = await fetch('/api/admin/blogs');
      if (bRes.ok) {
        const bData = await bRes.json();
        setBlogs(bData.articles || []);
      }
      showToast(`Synced ${data.count} articles & images from Medium!`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Medium sync failed', 'error');
    } finally {
      setSyncingMedium(false);
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
      // For blog covers, use the DEV.to-compatible 1000x420 PNG URL so DEV.to cover storage always ingests it
      const finalUrl =
        folder === 'portfolio/blogs' && data.devtoUrl
          ? data.devtoUrl
          : data.secureUrl || data.url;
      onSuccess(finalUrl);
      setCloudinaryConfigured(true);
      showToast(
        folder === 'portfolio/blogs'
          ? 'Uploaded to Cloudinary (formatted for DEV.to cover compatibility)'
          : 'Image uploaded to Cloudinary'
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Image upload failed', 'error');
    } finally {
      setUploadingImage(null);
    }
  };

  /**
   * Attaches the current Cloudinary cover image to DEV.to, uploads it into DEV.to's
   * cover image storage, and pulls DEV.to's hosted cover_image URL directly into our Cover Image field.
   */
  const handleSyncCoverWithDevTo = async (mode: 'new' | 'edit') => {
    const currentUrl = mode === 'new' ? newBlog.coverImage : activeBlogEdit?.coverImage;
    if (!currentUrl || !currentUrl.trim()) {
      showToast('Upload or paste a Cover Image URL first', 'error');
      return;
    }
    setSyncingCoverDevTo(true);
    try {
      const payload =
        mode === 'new'
          ? {
              action: 'sync-cover',
              coverImage: currentUrl.trim(),
              title: newBlog.title.trim() || 'Draft Article',
              bodyMarkdown: newBlog.bodyMarkdown || 'Draft content',
              description: newBlog.description,
              tags: newBlog.tagList
                ? newBlog.tagList.split(',').map((t) => t.trim()).filter(Boolean)
                : [],
            }
          : {
              action: 'sync-cover',
              coverImage: currentUrl.trim(),
              devtoId: activeBlogEdit?.devtoId,
              title: activeBlogEdit?.title,
              bodyMarkdown: activeBlogEdit?.bodyMarkdown,
              description: activeBlogEdit?.description,
              tags: activeBlogEdit?.tagList,
            };

      const res = await fetch('/api/admin/blogs/crosspost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to sync cover with DEV.to');

      if (mode === 'new') {
        setNewBlog((prev) => ({ ...prev, coverImage: data.coverImage }));
      } else if (activeBlogEdit) {
        setActiveBlogEdit({
          ...activeBlogEdit,
          coverImage: data.coverImage,
          ...(data.devtoId ? { devtoId: data.devtoId } : {}),
          ...(data.devtoUrl ? { devtoUrl: data.devtoUrl } : {}),
        });
      }

      showToast(
        data.source === 'devto-storage'
          ? 'Attached to DEV.to & pulled DEV.to cover storage URL into field'
          : 'Formatted Cloudinary URL for DEV.to cover image storage'
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Cover sync failed', 'error');
    } finally {
      setSyncingCoverDevTo(false);
    }
  };

  /**
   * Generates a 100% free AI cover image (Pollinations Flux), uploads it to Cloudinary,
   * and populates the DEV.to-compatible cover URL into the Cover Image field.
   */
  const handleGenerateFreeAiCoverForBlog = async (mode: 'new' | 'edit') => {
    const promptTopic =
      mode === 'new'
        ? newBlog.title.trim() || newBlog.description.trim()
        : activeBlogEdit?.title.trim() || activeBlogEdit?.description.trim();

    if (!promptTopic) {
      showToast('Enter an Article Title first so AI can generate a matching cover image', 'error');
      return;
    }

    setGeneratingCoverAi(true);
    try {
      const res = await fetch('/api/admin/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-image',
          prompt: promptTopic,
          uploadToCloud: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI cover generation failed');

      const finalCover = data.devtoCompatibleUrl || data.imageUrl;
      if (mode === 'new') {
        setNewBlog((prev) => ({ ...prev, coverImage: finalCover }));
      } else if (activeBlogEdit) {
        setActiveBlogEdit({ ...activeBlogEdit, coverImage: finalCover });
      }
      showToast('Generated free AI cover image & uploaded to Cloudinary');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'AI cover generation failed', 'error');
    } finally {
      setGeneratingCoverAi(false);
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
          sendNewsletter: newBlog.sendNewsletter,
          publishTo,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Create failed');

      setBlogs((prev) => [data.article, ...prev]);
      syncLatestToPortfolioState(data.article);
      setIsCreatingBlog(false);
      setNewBlog({
        title: '',
        description: '',
        bodyMarkdown: '# My New Article\n\nWrite your content here.',
        tagList: '',
        coverImage: '',
        isDraft: false,
        sendNewsletter: true,
        publishTo: { devto: true },
      });

      const msgs: string[] = ['Article created'];
      if (data.devto?.success) msgs.push('DEV.to + Cover Synced');
      if (data.newsletter?.success) msgs.push(`Newsletter (${data.newsletter.sentCount})`);
      showToast(msgs.join(' · '));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Create failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCrossPost = async (slug: string, platform: 'devto') => {
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
                devtoUrl: data.url,
                devtoId: data.devtoId || b.devtoId,
                coverImage: data.coverImage || b.coverImage,
                publishedTo: Array.from(new Set([...(b.publishedTo ?? []), 'devto' as const])) as Array<'devto' | 'medium' | 'portfolio'>,
              }
            : b
        )
      );
      showToast('Posted to DEV.to & pulled DEV.to cover image');
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

  const handleDeleteBlogArticle = (slug: string) => {
    const article = blogs.find((b) => b.slug === slug);
    setConfirmModal({
      isOpen: true,
      title: 'Delete Article',
      message: 'Are you sure you want to permanently delete this article? This action cannot be undone.',
      itemTitle: article?.title || slug,
      itemType: 'ARTICLE',
      confirmLabel: 'DELETE ARTICLE',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal(null);
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
      },
    });
  };

  /* ─── auth & loading guard ─── */
  if (!authenticated || (loading && !portfolio)) {
    return <PrismaticLoader isFadingOut={fadingOut} fadeDuration={800} />;
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
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const primaryTiles: Array<{ id: AdminTab; label: string }> = [
    { id: 'dashboard', label: 'Overview' },
    { id: 'blogs', label: 'Blogs' },
    { id: 'automation', label: 'Automation' },
    { id: 'media', label: 'Media' },
    { id: 'projects', label: 'Works' },
    { id: 'profile', label: 'Profile' },
  ];

  const secondaryItems: Array<{
    id: string;
    tab: AdminTab;
    subTab?: string;
    label: string;
    icon: string;
  }> = [
    { id: 'smallWorks', tab: 'smallWorks', label: 'Little Things', icon: 'smallWorks' },
    { id: 'experience', tab: 'experience', label: 'Career Timeline', icon: 'experience' },
    { id: 'skills', tab: 'skills', label: 'Skills & Toolkit', icon: 'skills' },
    { id: 'newsletter', tab: 'automation', subTab: 'newsletter', label: 'Newsletter', icon: 'newsletter' },
    { id: 'logs', tab: 'automation', subTab: 'logs', label: 'Debug Logs', icon: 'logs' },
  ];

  const q = sidebarSearch.trim().toLowerCase();
  const visibleTiles = q
    ? primaryTiles.filter((t) => t.label.toLowerCase().includes(q))
    : primaryTiles;
  const visibleSecondary = q
    ? secondaryItems.filter((s) => s.label.toLowerCase().includes(q))
    : secondaryItems;

  return (
    <>
      {loading && <PrismaticLoader isFadingOut={fadingOut} fadeDuration={800} />}
      <div className="relative min-h-screen bg-[#09090b] text-zinc-100 font-sans overflow-x-hidden">
        {/* Fixed Full-Screen GradientWaves Background (Same component as lower portfolio section) */}
        <div className="fixed inset-0 h-screen w-screen z-0 pointer-events-none opacity-65">
          <GradientWaves
            horizonColor="#150d1e"
            waveColor="#6e2d63"
            crestColor="#f36d45"
            backgroundColor="#09090b"
            speed={0.28}
            amplitude={2.1}
            relief={1}
            lightAngle={120}
            mouseInteraction={false}
            swellOnClick={false}
            lightMode={false}
            waveScale={0.65}
            waveRatio={0.9}
            swell={28}
            turbulence={16}
            tilt={64}
            zoom={1}
            height={5.5}
            fogDepth={15}
            sheen={0.22}
            brightness={0.95}
            opacity={0.85}
            grain={0.14}
            quality="medium"
            intro={false}
          />
        </div>

        {/* Toast */}
        {toast && (
          <div
            className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl text-xs shadow-2xl border backdrop-blur-2xl transition-all ${
              toast.type === 'success'
                ? 'bg-zinc-900/90 border-white/[0.1] text-zinc-100'
                : 'bg-zinc-900/90 border-red-400/35 text-red-200'
            }`}
          >
            {toast.message}
          </div>
        )}

        {/* Mobile Sidebar Backdrop */}
        {mobileSidebarOpen && (
          <div
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          />
        )}

        {/* ── Fixed Full-Screen-Height Left Frosted Sidebar ── */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 h-screen w-[264px] bg-[#101014]/75 backdrop-blur-2xl border-r border-white/[0.08] shadow-[inset_-1px_0_0_rgba(255,255,255,0.04)] p-5 flex flex-col justify-between transition-transform duration-200 ${
            mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
            <div className="space-y-5 overflow-y-auto pr-0.5">
              {/* Brand Row */}
              <div className="flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2.5">
                  <span className="grid w-8 h-8 place-items-center rounded-lg bg-[#f36d45] -rotate-6 shadow-[0_4px_14px_rgba(243,109,69,0.35)]">
                    <img
                      src="/joseph-logo-light.svg"
                      alt="Joseph Akinwole Logo"
                      className="w-5 h-5 object-contain"
                    />
                  </span>
                  <span className="text-sm font-semibold tracking-tight text-white">
                    JOSEPH<span className="text-[#f36d45]">®</span>
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="lg:hidden w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
                >
                  ×
                </button>
                <Link
                  href="/"
                  target="_blank"
                  title="Open Public Portfolio"
                  className="hidden lg:flex w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] items-center justify-center text-zinc-400 hover:text-white text-xs"
                >
                  ↗
                </Link>
              </div>

              {/* Search Input */}
              <div className="relative">
                <svg
                  className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.07] text-xs text-zinc-200 placeholder:text-zinc-500 focus:border-white/20 outline-none"
                />
              </div>

              {/* 2-Column Primary Tile Grid (6 Cards matching reference) */}
              <div className="grid grid-cols-2 gap-2.5">
                {visibleTiles.map((tile) => {
                  const isActive = activeTab === tile.id;
                  return (
                    <button
                      key={tile.id}
                      type="button"
                      onClick={() => handleSelectTab(tile.id)}
                      className={`p-3.5 rounded-2xl flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer border ${
                        isActive
                          ? 'bg-white text-[#09090b] border-[#f36d45]/60 shadow-[0_8px_24px_rgba(243,109,69,0.2)] font-semibold'
                          : 'bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border-white/[0.06] hover:border-[#f36d45]/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                      }`}
                    >
                      <SidebarIcon name={tile.id} />
                      <span className="text-[11px] tracking-tight">{tile.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Secondary Clean List Navigation */}
              <div className="pt-2 space-y-1">
                {visibleSecondary.map((item) => {
                  const isActive =
                    activeTab === item.tab &&
                    (!item.subTab ||
                      (typeof window !== 'undefined' &&
                        new URLSearchParams(window.location.search).get('subTab') === item.subTab));
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectTab(item.tab, item.subTab)}
                      className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-left text-xs transition-all cursor-pointer border ${
                        isActive
                          ? 'bg-white/[0.1] text-white font-medium border-[#f36d45]/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_4px_16px_rgba(243,109,69,0.12)]'
                          : 'border-transparent text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]'
                      }`}
                    >
                      <span className={isActive ? 'text-[#f36d45]' : ''}>
                        <SidebarIcon name={item.icon} />
                      </span>
                      <span className="flex-1 truncate">{item.label}</span>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#f36d45] shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Frosted Status Card */}
            <div className="mt-4 pt-4 border-t border-white/[0.07]">
              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] space-y-2.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-zinc-200">System Status</span>
                  <span className="text-[10px] text-emerald-400">
                    {dataSource === 'firestore' ? 'Cloud Live' : 'Local'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                  <span className="inline-flex items-center gap-1">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        dataSource === 'firestore' ? 'bg-emerald-400' : 'bg-zinc-500'
                      }`}
                    />
                    DB
                  </span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        cloudinaryConfigured ? 'bg-emerald-400' : 'bg-zinc-500'
                      }`}
                    />
                    Media
                  </span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        platformStatus?.devto.connected ? 'bg-emerald-400' : 'bg-zinc-500'
                      }`}
                    />
                    DEV.to
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  {dataSource === 'local' ? (
                    <button
                      type="button"
                      onClick={handleSeedToCloud}
                      disabled={seeding}
                      className="text-[10px] text-zinc-200 hover:underline cursor-pointer"
                    >
                      {seeding ? 'Seeding…' : 'Seed to Cloud'}
                    </button>
                  ) : (
                    <span className="text-[10px] text-zinc-500 truncate max-w-[120px]">
                      {userEmail || 'Admin'}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="text-[10px] text-zinc-400 hover:text-white cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </aside>

          {/* ── Right Main Workspace (Offset by fixed 264px sidebar on desktop) ── */}
          <div className="relative z-10 lg:pl-[264px] min-h-screen flex flex-col min-w-0">
            <div className="flex-1 m-2 sm:m-5 rounded-[20px] sm:rounded-[24px] bg-[#111114]/65 backdrop-blur-2xl border border-white/[0.08] shadow-[0_24px_80px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.07)] flex flex-col overflow-hidden min-w-0">
              {/* Top Greeting & Action Bar (Matching Reference Image) */}
              <header className="px-4 sm:px-8 py-4 sm:py-5 border-b border-white/[0.07] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(true)}
                  className="lg:hidden w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-zinc-200 cursor-pointer"
                  aria-label="Open navigation"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M4 7h16M4 12h16M4 17h16" />
                  </svg>
                </button>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white truncate">
                    {greeting}, Joseph
                  </h1>
                  <p className="text-xs text-zinc-400 mt-0.5">{formattedDate}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleSyncDevTo}
                  disabled={syncingDevTo}
                  className="px-3.5 py-2 rounded-full bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] text-xs font-medium text-zinc-200 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {syncingDevTo ? 'Syncing…' : 'Sync DEV.to'}
                </button>
                <button
                  type="button"
                  onClick={handleSavePortfolio}
                  disabled={saving}
                  className="px-4 py-2 rounded-full bg-[#f36d45] text-[#09090b] hover:bg-[#ff855f] text-xs font-semibold shadow-[0_6px_20px_rgba(243,109,69,0.28)] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectTab('automation', 'logs')}
                  className="w-9 h-9 rounded-full bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] flex items-center justify-center text-zinc-300 cursor-pointer"
                  title="Debug Logs"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </button>
                <Link
                  href="/"
                  target="_blank"
                  className="w-9 h-9 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.14] flex items-center justify-center overflow-hidden transition-colors"
                  title={userEmail || 'Joseph Akinwole'}
                >
                  <img
                    src="/joseph-logo.svg"
                    alt="Joseph Akinwole"
                    className="w-5 h-5 object-contain"
                  />
                </Link>
              </div>
            </header>

            {/* Main Content Body */}
            <main className="flex-1 p-3.5 sm:p-6 lg:p-8 overflow-y-auto min-w-0">
              {/* ══════════════════════════════════════
                  TAB 00 — Overview Analytics Dashboard
              ══════════════════════════════════════ */}
              {activeTab === 'dashboard' && (
                <AdminOverviewDashboard
                  onNavigateTab={(tab, subTab) => handleSelectTab(tab, subTab)}
                />
              )}

              {/* Fallback if portfolio data fails to load */}
              {!portfolio &&
                activeTab !== 'dashboard' &&
                activeTab !== 'blogs' &&
                activeTab !== 'media' &&
                activeTab !== 'automation' && (
                <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-center space-y-4 max-w-lg mx-auto my-12">
                  <h3 className="text-base font-medium text-white">Portfolio Content Not Loaded</h3>
                  <p className="text-xs text-zinc-400">
                    Unable to load portfolio details. Click below to retry.
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 rounded-full bg-white text-[#09090b] text-xs font-semibold hover:bg-zinc-200 transition-colors cursor-pointer"
                  >
                    RELOAD CONSOLE
                  </button>
                </div>
              )}

        {/* ══════════════════════════════════════
            TAB 01 — Profile & Contact
        ══════════════════════════════════════ */}
        {activeTab === 'profile' && portfolio && (
          <div className="space-y-6 w-full">

            {/* Hero Section (Homepage) */}
            <section className="p-6 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/[0.09] space-y-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <div className="flex justify-between items-center mb-1">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#f36d45] inline-block" />
                    <h2 className="text-lg font-medium tracking-tight">Hero Section (Homepage Hero)</h2>
                  </div>
                  <p className="font-mono text-[9px] text-[#777] mt-1">
                    All texts and elements displayed on the landing page hero section.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-4">
                <Field label="Greeting Badge" helper="e.g. HELLO, I’M JOSEPH">
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="HELLO, I’M JOSEPH"
                    value={portfolio.profile.heroGreeting ?? ''}
                    onChange={(e) =>
                      setPortfolio({
                        ...portfolio,
                        profile: { ...portfolio.profile, heroGreeting: e.target.value },
                      })
                    }
                  />
                </Field>
                <Field label="Location Status Tag" helper="e.g. ONDO, NIGERIA • WORLDWIDE">
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="ONDO, NIGERIA • WORLDWIDE"
                    value={portfolio.profile.heroLocation ?? ''}
                    onChange={(e) =>
                      setPortfolio({
                        ...portfolio,
                        profile: { ...portfolio.profile, heroLocation: e.target.value },
                      })
                    }
                  />
                </Field>
              </div>

              <Field
                label="Hero Intro / Pitch Paragraph"
                helper="The prominent uppercase paragraph under the greeting"
              >
                <textarea
                  rows={2}
                  className={inputCls}
                  placeholder="I BUILD SECURE FINANCIAL TOOLS, THOUGHTFUL PRODUCT INTERFACES, AND USEFUL WEB EXPERIENCES."
                  value={portfolio.profile.heroIntro ?? ''}
                  onChange={(e) =>
                    setPortfolio({
                      ...portfolio,
                      profile: { ...portfolio.profile, heroIntro: e.target.value },
                      heroIntro: e.target.value,
                    })
                  }
                />
              </Field>

              <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-4">
                <Field
                  label="Hero Title — Word 1 (Interactive TechText)"
                  helper="First kinetic blueprint word (e.g. FRONTEND)"
                >
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="FRONTEND"
                    value={portfolio.profile.heroTitleWord1 ?? ''}
                    onChange={(e) =>
                      setPortfolio({
                        ...portfolio,
                        profile: { ...portfolio.profile, heroTitleWord1: e.target.value },
                      })
                    }
                  />
                </Field>
                <Field
                  label="Hero Title — Word 2 (Architectural Bold)"
                  helper="Second bold typography word (e.g. ENGINEER)"
                >
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="ENGINEER"
                    value={portfolio.profile.heroTitleWord2 ?? ''}
                    onChange={(e) =>
                      setPortfolio({
                        ...portfolio,
                        profile: { ...portfolio.profile, heroTitleWord2: e.target.value },
                      })
                    }
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-4">
                <Field
                  label="Circular Explore Button Label"
                  helper="Text inside the circular magnetic button"
                >
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="EXPLORE\nTHE WORK"
                    value={portfolio.profile.heroCtaLabel ?? ''}
                    onChange={(e) =>
                      setPortfolio({
                        ...portfolio,
                        profile: { ...portfolio.profile, heroCtaLabel: e.target.value },
                      })
                    }
                  />
                </Field>
                <Field
                  label="Hero Portrait Image"
                  helper="Texture dither portrait image URL or file upload"
                >
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      className={inputCls}
                      placeholder="/joseph-portrait-textured-new.png"
                      value={portfolio.profile.heroPortraitUrl ?? ''}
                      onChange={(e) =>
                        setPortfolio({
                          ...portfolio,
                          profile: { ...portfolio.profile, heroPortraitUrl: e.target.value },
                        })
                      }
                    />
                    <label className="shrink-0 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-ember text-xs font-mono cursor-pointer transition-colors">
                      {uploadingImage === 'hero-portrait' ? 'UPLOADING...' : 'UPLOAD'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingImage === 'hero-portrait'}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          handleUploadFile(file, 'portfolio/hero', 'hero-portrait', (url: string) => {
                            setPortfolio({
                              ...portfolio,
                              profile: { ...portfolio.profile, heroPortraitUrl: url },
                            });
                          });
                        }}
                      />
                    </label>
                  </div>
                </Field>
              </div>
            </section>

            {/* Hero Featured Article Card */}
            <section className="p-6 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/[0.09] space-y-4">
              <div className="flex justify-between items-center mb-1">
                <div>
                  <h2 className="text-lg font-medium tracking-tight">Hero Featured Article Card</h2>
                  <p className="font-mono text-[9px] text-[#777] mt-1">
                    Select which article from your database is highlighted on the desktop homepage hero.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {blogs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const latest = blogs[0];
                        if (!latest) return;
                        const dateStr = latest.publishedAt
                          ? new Date(latest.publishedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()
                          : 'LATEST';
                        const platformStr = latest.devtoUrl ? 'DEV.TO' : latest.mediumUrl ? 'MEDIUM' : 'PORTFOLIO';
                        setPortfolio({
                          ...portfolio,
                          latestArticle: {
                            id: latest.id,
                            slug: latest.slug,
                            title: latest.title,
                            description: latest.description,
                            url: latest.url || (latest.slug ? `/blog/${latest.slug}` : undefined),
                            platform: platformStr,
                            date: dateStr,
                            publishedAt: latest.publishedAt,
                            readingTime: `${latest.readingTimeMinutes || 3} MIN READ`,
                            coverImage: latest.coverImage || undefined,
                          },
                        });
                        showToast(`Selected latest article: "${latest.title.slice(0, 32)}…"`);
                      }}
                      className="px-3 py-1 rounded bg-ember/15 border border-ember/30 text-zinc-200 hover:bg-ember/25 font-mono text-[8.5px] uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      ★ Pick Latest
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/admin/blogs');
                        if (res.ok) {
                          const data = await res.json();
                          setBlogs(data.articles || []);
                          showToast(`Refreshed ${data.articles?.length || 0} articles from DB`);
                        }
                      } catch {
                        showToast('Failed to refresh blogs', 'error');
                      }
                    }}
                    className="px-3 py-1 rounded bg-white/5 border border-white/10 text-[#aaa] hover:text-paper hover:bg-white/10 font-mono text-[8.5px] uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    ↻ Refresh List
                  </button>
                </div>
              </div>

              {blogs.length === 0 ? (
                <div className="p-4 rounded-xl border border-white/10 bg-[#161413] text-center space-y-2">
                  <p className="font-mono text-xs text-[#8e8883]">
                    No articles loaded from database yet.
                  </p>
                  <p className="font-mono text-[9px] text-[#666]">
                    Create an article or sync from DEV.to in Tab 06 (Blog Engine) to feature it here.
                  </p>
                </div>
              ) : (
                <Field
                  label="Select Article from Database"
                  helper={`${blogs.length} article${blogs.length === 1 ? '' : 's'} available in DB`}
                >
                  <select
                    className={inputCls}
                    value={
                      blogs.find(
                        (b) =>
                          (portfolio.latestArticle?.slug && b.slug === portfolio.latestArticle.slug) ||
                          (portfolio.latestArticle?.id && String(b.id) === String(portfolio.latestArticle.id)) ||
                          (portfolio.latestArticle?.title && b.title.trim().toLowerCase() === portfolio.latestArticle.title.trim().toLowerCase())
                      )?.slug || ''
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      const selected = blogs.find((b) => b.slug === val || String(b.id) === val);
                      if (selected) {
                        const dateStr = selected.publishedAt
                          ? new Date(selected.publishedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()
                          : 'LATEST';
                        const platformStr = selected.devtoUrl ? 'DEV.TO' : selected.mediumUrl ? 'MEDIUM' : 'PORTFOLIO';
                        setPortfolio({
                          ...portfolio,
                          latestArticle: {
                            id: selected.id,
                            slug: selected.slug,
                            title: selected.title,
                            description: selected.description,
                            url: selected.url || (selected.slug ? `/blog/${selected.slug}` : undefined),
                            platform: platformStr,
                            date: dateStr,
                            publishedAt: selected.publishedAt,
                            readingTime: `${selected.readingTimeMinutes || 3} MIN READ`,
                            coverImage: selected.coverImage || undefined,
                          },
                        });
                        showToast(`Hero featured article updated to "${selected.title.slice(0, 32)}…"`);
                      }
                    }}
                  >
                    <option value="" disabled>
                      — Choose an article from database —
                    </option>
                    {blogs.map((b) => {
                      const d = b.publishedAt
                        ? new Date(b.publishedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                        : 'Draft';
                      return (
                        <option key={b.slug || b.id} value={b.slug || b.id}>
                          [{d}] {b.title} {b.devtoUrl ? '(DEV.to)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </Field>
              )}

              {/* Read-only Live Preview Card */}
              {portfolio.latestArticle?.title ? (
                <div className="mt-4 p-4 rounded-xl border border-white/10 bg-[#161413] space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-ember inline-block animate-pulse" />
                      <span className="font-mono text-[9px] uppercase tracking-widest text-[#ffb490] font-semibold">
                        HERO CARD PREVIEW
                      </span>
                    </div>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-[#777]">
                      {portfolio.latestArticle.date || portfolio.latestArticle.publishedAt || 'LATEST'} • {portfolio.latestArticle.readingTime || '3 MIN READ'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-paper tracking-tight">
                      {portfolio.latestArticle.title}
                    </h3>
                    <p className="mt-1 text-xs text-[#999] leading-relaxed line-clamp-2">
                      {portfolio.latestArticle.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between font-mono text-[9px]">
                    <span className="text-[#777] uppercase tracking-widest">
                      PLATFORM:{' '}
                      <span className="text-paper font-semibold">
                        {portfolio.latestArticle.platform || 'DEV.TO'}
                      </span>
                    </span>
                    {portfolio.latestArticle.url && (
                      <a
                        href={portfolio.latestArticle.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zinc-200 hover:underline flex items-center gap-1 font-semibold"
                      >
                        VIEW ARTICLE ↗
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <p className="font-mono text-[9px] text-[#666] italic">
                  No article currently selected for hero display. Choose one from the dropdown above.
                </p>
              )}
            </section>

            {/* General Identity */}
            <section className="p-6 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/[0.09] space-y-4">
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
                <MultilineArrayInput
                  rows={5}
                  className={inputCls}
                  value={portfolio.profile.aboutParagraphs || []}
                  placeholder="First paragraph...&#10;&#10;Second paragraph..."
                  onChange={(aboutParagraphs) =>
                    setPortfolio({
                      ...portfolio,
                      profile: { ...portfolio.profile, aboutParagraphs },
                    })
                  }
                />
              </Field>
            </section>

            {/* Contact Info */}
            <section className="p-6 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/[0.09] space-y-4">
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
            <section className="p-6 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/[0.09] space-y-4">
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
                  className="font-mono text-[9px] text-zinc-200 hover:underline cursor-pointer"
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
                      className="w-32 px-2.5 py-1.5 rounded bg-white/[0.04] border border-white/10 text-xs focus:border-white/25 outline-none"
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
                      className="w-32 px-2.5 py-1.5 rounded bg-white/[0.04] border border-white/10 text-xs focus:border-white/25 outline-none"
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
                      className="flex-1 min-w-[180px] px-2.5 py-1.5 rounded bg-white/[0.04] border border-white/10 text-xs focus:border-white/25 outline-none"
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
                className="px-3 py-1.5 rounded-lg border border-white/[0.12] text-zinc-200 font-mono text-[9px] hover:bg-ember/10 transition-colors cursor-pointer"
              >
                + ADD PROJECT
              </button>
            </div>

            <div className="grid grid-cols-2 max-lg:grid-cols-1 gap-6">
              {(portfolio.projects || []).map((proj, idx) => (
                <div key={idx} className="p-6 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/[0.09] space-y-4">
                  {/* Card header with reorder + delete */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setPortfolio({ ...portfolio, projects: moveItem(portfolio.projects, idx, -1) })}
                        disabled={idx === 0} className="text-[#888] font-mono text-[10px] hover:text-paper disabled:opacity-30 cursor-pointer px-1">↑</button>
                      <button onClick={() => setPortfolio({ ...portfolio, projects: moveItem(portfolio.projects, idx, 1) })}
                        disabled={idx === portfolio.projects.length - 1} className="text-[#888] font-mono text-[10px] hover:text-paper disabled:opacity-30 cursor-pointer px-1">↓</button>
                      <span className="font-mono text-[8px] text-zinc-200 ml-2">{proj.kind?.toUpperCase()}</span>
                    </div>
                    <button
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: 'Delete Project',
                          message: 'Are you sure you want to permanently remove this project from your portfolio works?',
                          itemTitle: proj.title,
                          itemType: proj.kind || 'PROJECT',
                          confirmLabel: 'DELETE PROJECT',
                          variant: 'danger',
                          onConfirm: () => {
                            setPortfolio({ ...portfolio, projects: portfolio.projects.filter((_, i) => i !== idx) });
                            setConfirmModal(null);
                            showToast(`Deleted "${proj.title}"`);
                          },
                        });
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
                    <CommaSeparatedInput
                      className={inputCls}
                      value={proj.technologies}
                      placeholder="React, TypeScript, Node.js"
                      onChange={(technologies) => setProj(idx, { technologies })}
                    />
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
                      <label className="font-mono text-[8px] text-zinc-200 hover:text-zinc-200-soft cursor-pointer flex items-center gap-1">
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
                className="px-3 py-1.5 rounded-lg border border-white/[0.12] text-zinc-200 font-mono text-[9px] hover:bg-ember/10 transition-colors cursor-pointer"
              >
                + ADD EXPERIMENT
              </button>
            </div>

            <div className="border border-white/[0.09] rounded-2xl overflow-hidden bg-white/[0.04] backdrop-blur-2xl">
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
                    className="flex-1 min-w-[100px] px-2.5 py-1.5 rounded bg-white/[0.04] border border-white/10 font-medium focus:border-white/25 outline-none" />
                  <input type="text" value={work.note} placeholder="Short description"
                    onChange={(e) => setWork(idx, { note: e.target.value })}
                    className="flex-[2] min-w-[120px] px-2.5 py-1.5 rounded bg-white/[0.04] border border-white/10 text-[#aaa] focus:border-white/25 outline-none" />
                  <input type="text" value={work.stack} placeholder="Stack"
                    onChange={(e) => setWork(idx, { stack: e.target.value })}
                    className="w-40 px-2.5 py-1.5 rounded bg-white/[0.04] border border-white/10 font-mono text-[10px] focus:border-white/25 outline-none" />
                  <input type="text" value={work.year} placeholder="Year"
                    onChange={(e) => setWork(idx, { year: e.target.value })}
                    className="w-16 px-2.5 py-1.5 rounded bg-white/[0.04] border border-white/10 font-mono text-[10px] focus:border-white/25 outline-none" />
                  <input type="text" value={work.url || ''} placeholder="URL (optional)"
                    onChange={(e) => setWork(idx, { url: e.target.value })}
                    className="w-44 px-2.5 py-1.5 rounded bg-white/[0.04] border border-white/10 text-[10px] text-zinc-200 focus:border-white/25 outline-none" />
                  <button
                    onClick={() => {
                      setConfirmModal({
                        isOpen: true,
                        title: 'Remove Experiment',
                        message: 'Are you sure you want to remove this experiment from Little Things?',
                        itemTitle: work.name,
                        itemType: work.stack || 'EXPERIMENT',
                        confirmLabel: 'REMOVE',
                        variant: 'danger',
                        onConfirm: () => {
                          setPortfolio({ ...portfolio, smallWorks: portfolio.smallWorks.filter((_, i) => i !== idx) });
                          setConfirmModal(null);
                          showToast(`Removed "${work.name}"`);
                        },
                      });
                    }}
                    className="text-red-400 font-mono text-[9px] hover:underline cursor-pointer flex-none"
                    title="Remove experiment"
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
                className="px-3 py-1.5 rounded-lg border border-white/[0.12] text-zinc-200 font-mono text-[9px] hover:bg-ember/10 transition-colors cursor-pointer"
              >
                + ADD POSITION
              </button>
            </div>

            {(portfolio.experiences || []).map((exp, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/[0.09] space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPortfolio({ ...portfolio, experiences: moveItem(portfolio.experiences, idx, -1) })}
                      disabled={idx === 0} className="text-[#888] font-mono text-[10px] hover:text-paper disabled:opacity-30 cursor-pointer">↑</button>
                    <button onClick={() => setPortfolio({ ...portfolio, experiences: moveItem(portfolio.experiences, idx, 1) })}
                      disabled={idx === portfolio.experiences.length - 1} className="text-[#888] font-mono text-[10px] hover:text-paper disabled:opacity-30 cursor-pointer">↓</button>
                    <span className="font-mono text-[8px] text-zinc-200">
                      {String(idx + 1).padStart(2, '0')} / POSITION
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setConfirmModal({
                        isOpen: true,
                        title: 'Delete Position',
                        message: 'Are you sure you want to remove this position from your career history?',
                        itemTitle: `${exp.role} at ${exp.company}`,
                        itemType: 'POSITION',
                        confirmLabel: 'DELETE POSITION',
                        variant: 'danger',
                        onConfirm: () => {
                          setPortfolio({ ...portfolio, experiences: portfolio.experiences.filter((_, i) => i !== idx) });
                          setConfirmModal(null);
                          showToast(`Deleted position at "${exp.company}"`);
                        },
                      });
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
                      className="font-mono text-[8px] text-zinc-200 hover:underline cursor-pointer"
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
                          className="flex-1 px-2.5 py-1.5 rounded bg-white/[0.04] border border-white/10 text-xs focus:border-white/25 outline-none resize-none"
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
                  className="px-3 py-1.5 rounded-lg border border-white/[0.12] text-zinc-200 font-mono text-[9px] hover:bg-ember/10 transition-colors cursor-pointer"
                >
                  + ADD GROUP
                </button>
              </div>

              <div className="space-y-6">
                {(portfolio.skillGroups || []).map((group, gIdx) => (
                  <div key={gIdx} className="p-6 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/[0.09] space-y-4">
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
                          className="text-base font-medium px-2 py-1 rounded bg-white/[0.04] border border-white/10 text-paper focus:border-white/25 outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => setGroup(gIdx, { items: [...(group.items || []), { name: 'New Skill', note: '' }] })}
                          className="font-mono text-[8px] text-zinc-200 hover:underline cursor-pointer">
                          + ADD SKILL
                        </button>
                        <button
                          onClick={() => {
                            setConfirmModal({
                              isOpen: true,
                              title: 'Delete Skill Group',
                              message: 'Are you sure you want to delete this skill group and all skills within it?',
                              itemTitle: group.title,
                              itemType: 'SKILL GROUP',
                              confirmLabel: 'DELETE GROUP',
                              variant: 'danger',
                              onConfirm: () => {
                                setPortfolio({ ...portfolio, skillGroups: portfolio.skillGroups.filter((_, i) => i !== gIdx) });
                                setConfirmModal(null);
                                showToast(`Deleted group "${group.title}"`);
                              },
                            });
                          }}
                          className="font-mono text-[8px] text-red-400 hover:underline cursor-pointer"
                        >
                          DELETE GROUP
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-3">
                      {(group.items || []).map((item, iIdx) => (
                        <div key={iIdx} className="p-3 rounded-lg bg-white/[0.04] border border-white/10 flex items-center gap-2">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => {
                              const next = group.items.map((it, i) => (i === iIdx ? { ...it, name: e.target.value } : it));
                              setGroup(gIdx, { items: next });
                            }}
                            className="w-1/2 px-2 py-1 rounded bg-[#201e1b] border border-white/10 text-xs font-medium focus:border-white/25 outline-none"
                          />
                          <input
                            type="text"
                            value={item.note}
                            placeholder="Context…"
                            onChange={(e) => {
                              const next = group.items.map((it, i) => (i === iIdx ? { ...it, note: e.target.value } : it));
                              setGroup(gIdx, { items: next });
                            }}
                            className="w-1/2 px-2 py-1 rounded bg-[#201e1b] border border-white/10 text-[10px] text-[#aaa] focus:border-white/25 outline-none"
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
            <section className="p-6 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/[0.09]">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium tracking-tight">Soft Skills</h2>
                <button
                  onClick={() => setPortfolio({ ...portfolio, softSkills: [...portfolio.softSkills, 'New Skill'] })}
                  className="font-mono text-[9px] text-zinc-200 hover:underline cursor-pointer"
                >
                  + ADD
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(portfolio.softSkills || []).map((skill, sIdx) => (
                  <div key={sIdx} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10">
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
            TAB 06 — Blog Engine (Isolated Create/Edit View + Sticky Toolbar & Save Bar)
        ══════════════════════════════════════ */}
        {activeTab === 'blogs' && (
          <div className="space-y-6">
            {/* ── ISOLATED CREATE ARTICLE VIEW (Other posts hidden while creating) ── */}
            {isCreatingBlog && (
              <div className="relative rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-ember/30 p-6 space-y-5">
                <div className="flex flex-wrap justify-between items-center gap-3 pb-4 border-b border-white/10">
                  <div>
                    <span className="font-mono text-[8px] text-zinc-200 uppercase tracking-[0.14em] font-bold">
                      FOCUSED EDITOR MODE · NEW ARTICLE
                    </span>
                    <h3 className="text-lg font-medium text-paper mt-0.5">
                      {newBlog.title.trim() || 'Untitled New Article'}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCreatingBlog(false)}
                    className="px-3.5 py-1.5 rounded-lg border border-white/[0.1] text-[#aaa] font-mono text-[9px] hover:text-paper cursor-pointer"
                  >
                    ← BACK TO ARTICLES
                  </button>
                </div>

                <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-4">
                  <Field label="Title *">
                    <input
                      type="text"
                      className={inputCls}
                      value={newBlog.title}
                      onChange={(e) => setNewBlog({ ...newBlog, title: e.target.value })}
                      placeholder="Your article title"
                    />
                  </Field>
                  <Field label="Tags (comma-separated, max 4)">
                    <input
                      type="text"
                      className={inputCls}
                      value={newBlog.tagList}
                      onChange={(e) => setNewBlog({ ...newBlog, tagList: e.target.value })}
                      placeholder="react, typescript, webdev"
                    />
                  </Field>
                </div>

                <Field label="Description / Summary">
                  <textarea
                    rows={2}
                    className={inputCls}
                    value={newBlog.description}
                    onChange={(e) => setNewBlog({ ...newBlog, description: e.target.value })}
                    placeholder="A brief summary shown in previews and SEO"
                  />
                </Field>

                {/* Cover image with Cloudinary Upload, Media Library Picker, Free AI Generator & DEV.to Cover Storage Sync */}
                <div className="p-4 rounded-xl bg-[#161513] border border-white/10 space-y-2.5">
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <label className={labelCls}>
                      Cover Image (Cloudinary &amp; DEV.to Cover Storage Ready)
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="font-mono text-[8px] text-zinc-200 hover:text-zinc-200-soft cursor-pointer flex items-center gap-1 font-bold">
                        <span>{uploadingImage === 'newBlog' ? 'UPLOADING…' : '↑ UPLOAD TO CLOUDINARY'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingImage === 'newBlog'}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file)
                              handleUploadFile(file, 'portfolio/blogs', 'newBlog', (url) =>
                                setNewBlog((p) => ({ ...p, coverImage: url }))
                              );
                          }}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() =>
                          setMediaPickerCallback(() => (url: string) => {
                            setNewBlog((p) => ({ ...p, coverImage: url }));
                            setMediaPickerCallback(null);
                          })
                        }
                        className="font-mono text-[8px] text-zinc-200 hover:underline cursor-pointer"
                      >
                        🗂 PICK FROM LIBRARY
                      </button>

                      <button
                        type="button"
                        onClick={() => handleGenerateFreeAiCoverForBlog('new')}
                        disabled={generatingCoverAi}
                        className="font-mono text-[8px] text-emerald-400 hover:underline cursor-pointer disabled:opacity-40"
                      >
                        {generatingCoverAi ? 'GENERATING AI COVER…' : 'GENERATE FREE AI COVER'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSyncCoverWithDevTo('new')}
                        disabled={syncingCoverDevTo || !newBlog.coverImage.trim()}
                        className="px-2 py-0.5 rounded bg-ember/15 border border-white/[0.12] font-mono text-[8px] text-zinc-200 hover:bg-ember/25 cursor-pointer disabled:opacity-40"
                        title="Uploads/attaches the Cloudinary image to DEV.to cover image storage and pulls DEV.to's cover URL into this field"
                      >
                        {syncingCoverDevTo ? 'SYNCING WITH DEV.TO…' : '⇄ ATTACH & PULL DEV.TO COVER URL'}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      className={`${inputCls} flex-1 font-mono`}
                      value={newBlog.coverImage}
                      placeholder="https://... (Upload to Cloudinary, Generate Free AI Cover, or Sync with DEV.to)"
                      onChange={(e) => setNewBlog({ ...newBlog, coverImage: e.target.value })}
                    />
                    {newBlog.coverImage && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={newBlog.coverImage}
                        alt="Cover preview"
                        className="w-16 h-10 object-cover rounded-lg border border-white/[0.1] flex-none bg-black"
                      />
                    )}
                  </div>
                </div>

                {/* Rich text editor with Sticky Toolbar */}
                <div>
                  <label className={labelCls}>Article Content * (Formatting toolbar stays sticky on scroll)</label>
                  <RichTextEditor
                    value={newBlog.bodyMarkdown}
                    onChange={(md) => setNewBlog((p) => ({ ...p, bodyMarkdown: md }))}
                    placeholder="Write your article content here…"
                    minHeight={480}
                    onOpenMediaPicker={(cb) =>
                      setMediaPickerCallback(() => (url: string) => {
                        cb(url);
                        setMediaPickerCallback(null);
                      })
                    }
                  />
                </div>

                {/* Sticky Bottom Save & Publish Action Menu */}
                <div className="sticky bottom-3 z-30 p-4 rounded-2xl bg-white/[0.04] backdrop-blur-2xl/95 backdrop-blur-md border border-white/[0.12] shadow-[0_-12px_36px_rgba(0,0,0,0.85)] flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="accent-ember"
                        checked={newBlog.publishTo.devto}
                        onChange={(e) =>
                          setNewBlog({
                            ...newBlog,
                            publishTo: { ...newBlog.publishTo, devto: e.target.checked },
                          })
                        }
                      />
                      <span className="font-mono text-[9px] text-paper font-bold">
                        PUBLISH &amp; PULL COVER VIA DEV.TO
                      </span>
                      {platformStatus && !platformStatus.devto.connected && (
                        <span className="font-mono text-[7px] text-yellow-500">(token missing)</span>
                      )}
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="accent-ember"
                        checked={newBlog.sendNewsletter}
                        onChange={(e) => setNewBlog({ ...newBlog, sendNewsletter: e.target.checked })}
                      />
                      <span className="font-mono text-[9px] text-[#ccc]">EMAIL NEWSLETTER SUBSCRIBERS</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="accent-ember"
                        checked={newBlog.isDraft}
                        onChange={(e) => setNewBlog({ ...newBlog, isDraft: e.target.checked })}
                      />
                      <span className="font-mono text-[9px] text-amber-400">SAVE AS DRAFT</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-3 ml-auto">
                    <button
                      type="button"
                      onClick={() => setIsCreatingBlog(false)}
                      className="px-4 py-2 rounded-xl border border-white/[0.1] text-[#aaa] font-mono text-[9px] hover:text-paper cursor-pointer"
                    >
                      CANCEL
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateBlog}
                      disabled={saving}
                      className="px-6 py-2 rounded-xl bg-white text-[#09090b] font-mono text-[10px] font-bold hover:bg-ember-soft disabled:opacity-50 cursor-pointer shadow-lg"
                    >
                      {saving ? 'PUBLISHING…' : newBlog.isDraft ? 'SAVE DRAFT' : 'PUBLISH ARTICLE'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── ISOLATED EDIT ARTICLE VIEW (Other posts hidden while editing) ── */}
            {!isCreatingBlog && activeBlogEdit && (
              <div className="relative rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-ember/30 p-6 space-y-5">
                <div className="flex flex-wrap justify-between items-center gap-3 pb-4 border-b border-white/10">
                  <div>
                    <span className="font-mono text-[8px] text-zinc-200 uppercase tracking-[0.14em] font-bold">
                      FOCUSED EDITOR MODE · EDITING ARTICLE
                    </span>
                    <h3 className="text-lg font-medium text-paper mt-0.5">{activeBlogEdit.title}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveBlogEdit(null)}
                    className="px-3.5 py-1.5 rounded-lg border border-white/[0.1] text-[#aaa] font-mono text-[9px] hover:text-paper cursor-pointer"
                  >
                    ← BACK TO ARTICLES
                  </button>
                </div>

                <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-4">
                  <Field label="Title">
                    <input
                      type="text"
                      className={inputCls}
                      value={activeBlogEdit.title}
                      onChange={(e) => setActiveBlogEdit({ ...activeBlogEdit, title: e.target.value })}
                    />
                  </Field>
                  <Field label="Slug">
                    <input
                      type="text"
                      className={inputCls}
                      value={activeBlogEdit.slug}
                      onChange={(e) => setActiveBlogEdit({ ...activeBlogEdit, slug: e.target.value })}
                    />
                  </Field>
                </div>

                <Field label="Description">
                  <textarea
                    rows={2}
                    className={inputCls}
                    value={activeBlogEdit.description}
                    onChange={(e) => setActiveBlogEdit({ ...activeBlogEdit, description: e.target.value })}
                  />
                </Field>

                {/* Cover image with Cloudinary Upload, Library Picker, Free AI Cover & DEV.to Cover Storage Sync */}
                <div className="p-4 rounded-xl bg-[#161513] border border-white/10 space-y-2.5">
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <label className={labelCls}>
                      Cover Image (Cloudinary &amp; DEV.to Cover Storage Ready)
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="font-mono text-[8px] text-zinc-200 hover:text-zinc-200-soft cursor-pointer font-bold">
                        <span>{uploadingImage === 'editBlog' ? 'UPLOADING…' : '↑ UPLOAD TO CLOUDINARY'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingImage === 'editBlog'}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file)
                              handleUploadFile(file, 'portfolio/blogs', 'editBlog', (url) =>
                                setActiveBlogEdit((p) => (p ? { ...p, coverImage: url } : null))
                              );
                          }}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() =>
                          setMediaPickerCallback(() => (url: string) => {
                            setActiveBlogEdit((p) => (p ? { ...p, coverImage: url } : null));
                            setMediaPickerCallback(null);
                          })
                        }
                        className="font-mono text-[8px] text-zinc-200 hover:underline cursor-pointer"
                      >
                        🗂 PICK FROM LIBRARY
                      </button>

                      <button
                        type="button"
                        onClick={() => handleGenerateFreeAiCoverForBlog('edit')}
                        disabled={generatingCoverAi}
                        className="font-mono text-[8px] text-emerald-400 hover:underline cursor-pointer disabled:opacity-40"
                      >
                        {generatingCoverAi ? 'GENERATING AI COVER…' : 'GENERATE FREE AI COVER'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSyncCoverWithDevTo('edit')}
                        disabled={syncingCoverDevTo || !activeBlogEdit.coverImage?.trim()}
                        className="px-2 py-0.5 rounded bg-ember/15 border border-white/[0.12] font-mono text-[8px] text-zinc-200 hover:bg-ember/25 cursor-pointer disabled:opacity-40"
                        title="Attaches this image to DEV.to cover image storage and pulls DEV.to's hosted cover URL into this field"
                      >
                        {syncingCoverDevTo ? 'SYNCING WITH DEV.TO…' : '⇄ ATTACH & PULL DEV.TO COVER URL'}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      className={`${inputCls} flex-1 font-mono`}
                      value={activeBlogEdit.coverImage || ''}
                      placeholder="https://... (Upload to Cloudinary, Generate Free AI Cover, or Sync with DEV.to)"
                      onChange={(e) =>
                        setActiveBlogEdit({ ...activeBlogEdit, coverImage: e.target.value })
                      }
                    />
                    {activeBlogEdit.coverImage && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={activeBlogEdit.coverImage}
                        alt=""
                        className="w-16 h-10 object-cover rounded-lg border border-white/[0.1] flex-none bg-black"
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-4">
                  <Field label="Reading Time (mins)">
                    <input
                      type="number"
                      className={inputCls}
                      value={activeBlogEdit.readingTimeMinutes}
                      onChange={(e) =>
                        setActiveBlogEdit({
                          ...activeBlogEdit,
                          readingTimeMinutes: parseInt(e.target.value) || 1,
                        })
                      }
                    />
                  </Field>
                  <Field label="Tags (comma-separated)">
                    <CommaSeparatedInput
                      className={inputCls}
                      value={activeBlogEdit.tagList}
                      placeholder="react, typescript, webdev"
                      onChange={(tagList) => setActiveBlogEdit({ ...activeBlogEdit, tagList })}
                    />
                  </Field>
                </div>

                {/* Rich text editor for edit (Sticky Toolbar) */}
                <div>
                  <label className={labelCls}>Article Content (Formatting toolbar stays sticky on scroll)</label>
                  <RichTextEditor
                    value={activeBlogEdit.bodyMarkdown || ''}
                    onChange={(md) =>
                      setActiveBlogEdit((p) => (p ? { ...p, bodyMarkdown: md } : null))
                    }
                    minHeight={480}
                    onOpenMediaPicker={(cb) =>
                      setMediaPickerCallback(() => (url: string) => {
                        cb(url);
                        setMediaPickerCallback(null);
                      })
                    }
                  />
                </div>

                {/* Sticky Bottom Save Menu */}
                <div className="sticky bottom-3 z-30 p-4 rounded-2xl bg-white/[0.04] backdrop-blur-2xl/95 backdrop-blur-md border border-white/[0.12] shadow-[0_-12px_36px_rgba(0,0,0,0.85)] flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="accent-ember"
                        checked={activeBlogEdit.isDraft}
                        onChange={(e) =>
                          setActiveBlogEdit({ ...activeBlogEdit, isDraft: e.target.checked })
                        }
                      />
                      <span className="font-mono text-[9px] text-amber-400">DRAFT STATUS</span>
                    </label>
                    {activeBlogEdit.devtoId && (
                      <span className="font-mono text-[8px] text-emerald-400">
                        ● LINKED TO DEV.TO (#{activeBlogEdit.devtoId}) — SAVING AUTO-SYNCS COVER &amp; BODY
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 ml-auto">
                    <button
                      type="button"
                      onClick={() => setActiveBlogEdit(null)}
                      className="px-4 py-2 rounded-xl border border-white/[0.1] text-[#aaa] font-mono text-[9px] hover:text-paper cursor-pointer"
                    >
                      CANCEL
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveBlogArticle(activeBlogEdit)}
                      disabled={saving}
                      className="px-6 py-2 rounded-xl bg-white text-[#09090b] font-mono text-[10px] font-bold hover:bg-ember-soft disabled:opacity-50 cursor-pointer shadow-lg"
                    >
                      {saving ? 'SAVING…' : 'SAVE ARTICLE'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── MAIN BLOG LIST VIEW (Only rendered when NOT creating or editing an article!) ── */}
            {!isCreatingBlog && !activeBlogEdit && (
              <>
                <div className="flex flex-wrap justify-between items-start gap-4 pb-4 border-b border-white/10">
                  <div>
                    <h2 className="text-xl font-medium tracking-tight">Blog Engine ({blogs.length})</h2>
                    <p className="text-xs text-[#8e8883] font-mono mt-1">
                      Manage articles · sync with DEV.to and Medium RSS (with cover images) · publish to portfolio &amp; newsletter.
                    </p>
                    {platformStatus && (
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span
                          className={`font-mono text-[7px] px-2 py-0.5 rounded-full border ${
                            platformStatus.devto.connected
                              ? 'border-green-500/40 text-green-400 bg-green-500/10'
                              : 'border-white/10 text-[#555]'
                          }`}
                        >
                          {platformStatus.devto.connected
                            ? `● DEV.TO @${platformStatus.devto.username}`
                            : '○ DEV.TO NOT CONNECTED'}
                        </span>
                        <span
                          className={`font-mono text-[7px] px-2 py-0.5 rounded-full border ${
                            platformStatus.medium.connected
                              ? 'border-green-500/40 text-green-400 bg-green-500/10'
                              : 'border-white/10 text-[#555]'
                          }`}
                        >
                          {platformStatus.medium.connected
                            ? `● MEDIUM FEED @${platformStatus.medium.username}`
                            : '○ MEDIUM USERNAME NOT SET'}
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
                      {syncingDevTo ? 'SYNCING DEV.TO...' : 'SYNC FROM DEV.TO'}
                    </button>
                    <button
                      onClick={handleSyncMedium}
                      disabled={syncingMedium}
                      className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-paper font-mono text-[9px] tracking-[0.08em] hover:bg-white/15 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                    >
                      <span className={syncingMedium ? 'animate-spin inline-block' : ''}>↺</span>
                      {syncingMedium ? 'SYNCING MEDIUM...' : 'SYNC FROM MEDIUM'}
                    </button>
                    <button
                      onClick={() => handleSelectTab('automation')}
                      className="px-4 py-2 rounded-lg bg-ember/15 border border-white/[0.12] text-zinc-200 font-mono text-[9px] font-bold tracking-[0.08em] hover:bg-ember/25 transition-colors cursor-pointer"
                    >
                      AI AUTOMATION
                    </button>
                    <button
                      onClick={() => setIsCreatingBlog(true)}
                      className="px-4 py-2 rounded-lg bg-white text-[#09090b] font-mono text-[9px] font-bold tracking-[0.08em] hover:bg-ember-soft transition-colors cursor-pointer"
                    >
                      + NEW ARTICLE
                    </button>
                  </div>
                </div>

                {/* ── ARTICLE LIST ── */}
                <div className="grid grid-cols-1 gap-3">
                  {blogs.map((article) => (
                    <div
                      key={article.slug}
                      className="p-4 sm:p-5 rounded-xl bg-white/[0.04] backdrop-blur-2xl border border-white/[0.09] space-y-3 overflow-hidden min-w-0"
                    >
                      <div className="flex max-sm:flex-col items-start sm:items-center justify-between gap-4 min-w-0">
                        <div className="flex items-start sm:items-center gap-3 sm:gap-4 w-full sm:flex-1 min-w-0">
                          {article.coverImage && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={article.coverImage}
                              alt=""
                              className="w-16 h-12 object-cover rounded flex-none bg-white/[0.05]"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-mono text-[7px] text-zinc-200 px-2 py-0.5 rounded bg-ember/10">
                                {article.tagList[0]?.toUpperCase() || 'ARTICLE'}
                              </span>
                              <span className="font-mono text-[8px] text-[#777]">
                                {article.readingTimeMinutes} MIN
                              </span>
                              {article.isDraft && (
                                <span className="font-mono text-[7px] text-yellow-500 px-2 py-0.5 rounded bg-yellow-500/10">
                                  DRAFT
                                </span>
                              )}
                              {(article.publishedTo ?? []).map((platform) => (
                                <span
                                  key={platform}
                                  className="font-mono text-[7px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[#aaa]"
                                >
                                  {platform === 'devto' ? 'DEV.TO' : platform.toUpperCase()}
                                </span>
                              ))}
                            </div>
                            <h4 className="text-sm font-medium text-paper break-words line-clamp-2 sm:truncate">
                              {article.title}
                            </h4>
                            <p className="text-[11px] text-[#8e8883] truncate max-w-full">
                              {article.slug}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap flex-none w-full sm:w-auto">
                          {!article.devtoUrl && (
                            <button
                              onClick={() => handleCrossPost(article.slug, 'devto')}
                              disabled={crossPosting[`${article.slug}-devto`]}
                              className="px-3 py-1.5 rounded-lg border border-white/[0.1] text-[#888] font-mono text-[8px] hover:text-paper hover:border-white/30 disabled:opacity-50 transition-colors cursor-pointer"
                            >
                              {crossPosting[`${article.slug}-devto`] ? '...' : '→ DEV.TO'}
                            </button>
                          )}
                          {article.devtoUrl && (
                            <a
                              href={article.devtoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-[7px] text-emerald-400 hover:underline"
                            >
                              ● DEV.TO ↗
                            </a>
                          )}
                          <button
                            onClick={() => setActiveBlogEdit(article)}
                            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/[0.1] text-[#aaa] font-mono text-[8px] hover:text-paper transition-colors cursor-pointer"
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
                        <p className="text-[11px] text-[#8e8883] font-mono leading-relaxed border-t border-white/5 pt-2 break-words overflow-hidden">
                          {article.description}
                        </p>
                      )}
                    </div>
                  ))}
                  {blogs.length === 0 && (
                    <div className="text-center py-20 font-mono text-[10px] text-[#555]">
                      No articles yet. Create your first one above, run AI Automation, or sync from DEV.to.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════
            TAB 07 — Cloudinary Media Library
        ══════════════════════════════════════ */}
        {activeTab === 'media' && <CloudinaryMediaManager showToast={showToast} />}

        {/* ══════════════════════════════════════
            TAB 08 — AI Automation, Social & Newsletter
        ══════════════════════════════════════ */}
              {activeTab === 'automation' && (
                <AutomationAndNewsletterManager
                  key={automationSubTabKey}
                  blogs={blogs}
                  onArticleCreated={(newArt) => {
                    setBlogs((prev) => [newArt, ...prev]);
                    syncLatestToPortfolioState(newArt);
                  }}
                  showToast={showToast}
                />
              )}
              </main>
            </div>
          </div>
      </div>

    {/* Global Cloudinary Media Picker Modal (when triggered from Blog Editor) */}
    {mediaPickerCallback && (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-8 bg-black/85 backdrop-blur-md overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) setMediaPickerCallback(null);
        }}
      >
        <div className="w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.1] p-6 shadow-2xl">
          <CloudinaryMediaManager
            showToast={showToast}
            pickerTitle="Select Image from Cloudinary Media Library"
            onSelectAsset={(url) => mediaPickerCallback(url)}
            onClosePicker={() => setMediaPickerCallback(null)}
          />
        </div>
      </div>
    )}

    {/* Global custom confirm & delete modal */}
    {confirmModal && (
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        itemTitle={confirmModal.itemTitle}
        itemType={confirmModal.itemType}
        confirmLabel={confirmModal.confirmLabel}
        variant={confirmModal.variant || 'danger'}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(null)}
      />
    )}
    </>
  );
}

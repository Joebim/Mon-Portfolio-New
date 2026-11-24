'use client';

import { useEffect, useState, useCallback } from 'react';

export interface AdminAnalyticsPayload {
  site: {
    totalVisits: number;
    todayVisits: number;
    activeNow: number;
    dailySeries: Array<{ date: string; visits: number }>;
    topPaths: Array<{ path: string; visits: number }>;
    lastVisitAt?: string;
  };
  blog: {
    totalArticles: number;
    publishedCount: number;
    draftCount: number;
    totalReactions: number;
    totalComments: number;
    totalViews: number;
    dailySeries: Array<{ date: string; count: number }>;
  };
  linkedin: {
    totalPosts: number;
    publishedCount: number;
    pendingReviewCount: number;
    totalLikes: number;
    totalComments: number;
    connected: boolean;
    daysRemaining: number;
    dailySeries: Array<{ date: string; count: number }>;
  };
  newsletter: {
    activeSubscribers: number;
    totalSubscribers: number;
    dailySeries: Array<{ date: string; count: number }>;
  };
  automation: {
    weekKey: string | null;
    lastRunAt: string | null;
    lastRunStatus: string | null;
    blogSchedule: {
      enabled: boolean;
      nextRunLabel: string;
      queueRemaining: number;
      nextTopic: string | null;
    };
    linkedinSchedule: {
      enabled: boolean;
      nextRunLabel: string;
      queueRemaining: number;
      nextTopic: string | null;
      hasAttachedImage: boolean;
    };
  };
  recentActivity: Array<{
    id: string;
    type: 'blog' | 'linkedin';
    platform: string;
    title: string;
    slug: string;
    status: string;
    date: string;
    url?: string;
    coverImage?: string;
    reactions: number;
    comments: number;
  }>;
}

interface AdminOverviewDashboardProps {
  onNavigateTab: (tab: 'blogs' | 'automation' | 'media' | 'projects' | 'profile', subTab?: string) => void;
}

function MiniSparkline({ points, muted = false }: { points: number[]; muted?: boolean }) {
  const safe = points.length >= 2 ? points : [0, 0];
  const max = Math.max(...safe, 1);
  const min = Math.min(...safe, 0);
  const span = Math.max(1, max - min);
  const w = 68;
  const h = 24;
  const d = safe
    .map((v, i) => {
      const x = (i / (safe.length - 1)) * w;
      const y = h - ((v - min) / span) * (h - 4) - 2;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible shrink-0">
      <path
        d={d}
        fill="none"
        stroke={muted ? 'rgba(255,255,255,0.35)' : '#f36d45'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AdminOverviewDashboard({ onNavigateTab }: AdminOverviewDashboardProps) {
  const [data, setData] = useState<AdminAnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [activityFilter, setActivityFilter] = useState<'all' | 'blog' | 'linkedin'>('all');

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/analytics', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    const timer = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(timer);
  }, [fetchAnalytics]);

  const visitSeries = data?.site.dailySeries.map((d) => d.visits) || [0, 0, 0, 0, 0, 0, 0];
  const blogSeries = data?.blog.dailySeries.map((d) => d.count) || [0, 0, 0, 0, 0, 0, 0];
  const linkedinSeries = data?.linkedin.dailySeries.map((d) => d.count) || [0, 0, 0, 0, 0, 0, 0];
  const newsletterSeries = data?.newsletter.dailySeries.map((d) => d.count) || [0, 0, 0, 0, 0, 0, 0];

  const totalBlogInteractions = (data?.blog.totalReactions || 0) + (data?.blog.totalComments || 0);
  const totalLinkedinInteractions =
    (data?.linkedin.totalLikes || 0) + (data?.linkedin.totalComments || 0);

  const blogQueueReady = data?.automation.blogSchedule.queueRemaining || 0;
  const linkedinQueueReady = data?.automation.linkedinSchedule.queueRemaining || 0;
  const totalQueued = blogQueueReady + linkedinQueueReady;
  const queuePercent = totalQueued > 0 ? Math.min(100, Math.round((totalQueued / 7) * 100)) : 0;

  const filteredActivity = (data?.recentActivity || []).filter((item) => {
    const matchesType = activityFilter === 'all' ? true : item.type === activityFilter;
    const matchesSearch = filterText.trim()
      ? item.title.toLowerCase().includes(filterText.trim().toLowerCase()) ||
        item.platform.toLowerCase().includes(filterText.trim().toLowerCase())
      : true;
    return matchesType && matchesSearch;
  });

  // Real smooth spline from actual daily visits & actual daily content publications
  const maxSpline = Math.max(...visitSeries, ...blogSeries, 1);
  const buildSmoothSpline = (vals: number[], height = 110, width = 280) => {
    if (vals.length < 2) return '';
    const coords = vals.map((v, i) => ({
      x: (i / (vals.length - 1)) * width,
      y: height - (v / maxSpline) * (height - 24) - 10,
    }));
    return coords.reduce((acc, pt, idx, arr) => {
      if (idx === 0) return `M ${pt.x} ${pt.y}`;
      const prev = arr[idx - 1];
      const cx = (prev.x + pt.x) / 2;
      return `${acc} C ${cx} ${prev.y}, ${cx} ${pt.y}, ${pt.x} ${pt.y}`;
    }, '');
  };

  const primarySpline = buildSmoothSpline(visitSeries);
  const secondarySpline = buildSmoothSpline(
    blogSeries.map((b, idx) => b + (linkedinSeries[idx] || 0))
  );

  // Arc gauge math (semi-circle)
  const gaugeRadius = 72;
  const gaugeCircumference = Math.PI * gaugeRadius;
  const gaugeOffset = gaugeCircumference * (1 - queuePercent / 100);

  return (
    <div className="space-y-5">
      {/* ── Top Fanned Glossy Cards Strip (Automation Flow & Upcoming Actions) ── */}
      <div className="relative pt-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 items-end">
          {/* Card 1: Blog Pipeline */}
          <button
            type="button"
            onClick={() => onNavigateTab('automation', 'schedule')}
            className="text-left group relative p-4 rounded-2xl bg-white/[0.05] hover:bg-white/[0.08] backdrop-blur-2xl border border-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-3">
              <span className="font-medium text-zinc-200">Blog Pipeline</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-zinc-300">
                {data?.automation.blogSchedule.enabled ? 'Active' : 'Paused'}
              </span>
            </div>
            <p className="text-xs text-zinc-200 font-medium truncate">
              {data?.automation.blogSchedule.nextTopic || 'No topic queued'}
            </p>
            <p className="text-[11px] text-zinc-400 mt-1.5">
              Next: {data?.automation.blogSchedule.nextRunLabel || '—'} · {blogQueueReady} queued
            </p>
          </button>

          {/* Card 2: LinkedIn Pipeline (Elevated center-left glossy card) */}
          <button
            type="button"
            onClick={() => onNavigateTab('automation', 'social')}
            className="text-left group relative p-4 rounded-2xl bg-white/[0.08] hover:bg-white/[0.11] backdrop-blur-2xl border border-white/[0.15] shadow-[0_12px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.14)] transition-all cursor-pointer lg:-translate-y-1.5"
          >
            <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-3">
              <span className="font-medium text-white">LinkedIn Flow</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.1] border border-white/[0.12] text-white">
                {data?.linkedin.connected ? `OAuth ${data.linkedin.daysRemaining}d` : 'Verify OAuth'}
              </span>
            </div>
            <p className="text-xs text-white font-medium truncate">
              {data?.automation.linkedinSchedule.nextTopic || 'No queued LinkedIn topic'}
            </p>
            <p className="text-[11px] text-zinc-300 mt-1.5">
              Next: {data?.automation.linkedinSchedule.nextRunLabel || '—'} ·{' '}
              {data?.automation.linkedinSchedule.hasAttachedImage ? 'Image attached' : 'Text-only'}
            </p>
          </button>

          {/* Card 3: Newsletter Dispatch */}
          <button
            type="button"
            onClick={() => onNavigateTab('automation', 'newsletter')}
            className="text-left group relative p-4 rounded-2xl bg-white/[0.05] hover:bg-white/[0.08] backdrop-blur-2xl border border-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-3">
              <span className="font-medium text-zinc-200">Newsletter</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-zinc-300">
                Auto-Send
              </span>
            </div>
            <p className="text-xs text-zinc-200 font-medium truncate">
              {data?.newsletter.activeSubscribers ?? 0} Active Subscribers
            </p>
            <p className="text-[11px] text-zinc-400 mt-1.5">
              Dispatches on publish
            </p>
          </button>

          {/* Card 4: Weekly AI Queue Cycle */}
          <button
            type="button"
            onClick={() => onNavigateTab('automation', 'schedule')}
            className="text-left group relative p-4 rounded-2xl bg-white/[0.05] hover:bg-white/[0.08] backdrop-blur-2xl border border-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-3">
              <span className="font-medium text-zinc-200">Weekly Queue</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-zinc-300">
                {data?.automation.weekKey || 'Not generated'}
              </span>
            </div>
            <p className="text-xs text-zinc-200 font-medium truncate">
              {blogQueueReady} DEV.to · {linkedinQueueReady} LinkedIn
            </p>
            <p className="text-[11px] text-zinc-400 mt-1.5 truncate">
              {data?.automation.lastRunStatus || 'Ready for next scheduled run'}
            </p>
          </button>
        </div>
      </div>

      {/* ── 4-Column KPI Strip (100% Real Data) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/[0.09] divide-y sm:divide-y-0 sm:divide-x divide-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        {/* KPI 1: Realtime Site Visits */}
        <div className="p-5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] text-zinc-400">
              <span>Realtime Site Visits</span>
              <span className="inline-flex items-center gap-1 text-[10px] text-zinc-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {data?.site.activeNow ?? 0} live
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-2xl font-semibold tracking-tight text-white">
                {loading ? '—' : (data?.site.totalVisits ?? 0).toLocaleString()}
              </span>
              <span className="text-[11px] text-emerald-400 font-medium">
                +{data?.site.todayVisits ?? 0} today
              </span>
            </div>
          </div>
          <MiniSparkline points={visitSeries} />
        </div>

        {/* KPI 2: Blog Interactions */}
        <div className="p-5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] text-zinc-400">Blog Interactions</div>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-2xl font-semibold tracking-tight text-white">
                {loading ? '—' : totalBlogInteractions.toLocaleString()}
              </span>
              <span className="text-[11px] text-zinc-400">
                {data?.blog.publishedCount ?? 0} live
              </span>
            </div>
          </div>
          <MiniSparkline points={blogSeries} />
        </div>

        {/* KPI 3: LinkedIn Interactions */}
        <div className="p-5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] text-zinc-400">LinkedIn Interactions</div>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-2xl font-semibold tracking-tight text-white">
                {loading ? '—' : totalLinkedinInteractions.toLocaleString()}
              </span>
              <span className="text-[11px] text-zinc-400">
                {data?.linkedin.pendingReviewCount ?? 0} pending
              </span>
            </div>
          </div>
          <MiniSparkline points={linkedinSeries} muted />
        </div>

        {/* KPI 4: Newsletter Subscribers */}
        <div className="p-5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] text-zinc-400">Newsletter Subscribers</div>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-2xl font-semibold tracking-tight text-white">
                {loading ? '—' : (data?.newsletter.activeSubscribers ?? 0).toLocaleString()}
              </span>
              <span className="text-[11px] text-zinc-400">
                {data?.newsletter.totalSubscribers ?? 0} total
              </span>
            </div>
          </div>
          <MiniSparkline points={newsletterSeries} />
        </div>
      </div>

      {/* ── Middle 3-Card Bento Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: 7-Day Site Visits Breakdown (Real Bar Chart) */}
        <div className="lg:col-span-4 p-5 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/[0.09] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-200">Daily Site Visits</h3>
            <span className="px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/[0.09] text-[11px] text-zinc-300">
              7 Days
            </span>
          </div>

          <div className="my-5 text-center">
            <div className="text-[11px] text-zinc-400">Total Engagements</div>
            <div className="text-3xl font-semibold tracking-tight text-white mt-1">
              {(totalBlogInteractions + totalLinkedinInteractions + (data?.site.totalVisits || 0)).toLocaleString()}
            </div>
          </div>

          {/* 7-day monochrome bar chart from real site_visits */}
          <div className="space-y-2">
            <div className="grid grid-cols-7 gap-2 items-end h-24 px-1">
              {(data?.site.dailySeries || Array.from({ length: 7 }, (_, i) => ({ date: `${i}`, visits: 0 }))).map(
                (day, idx) => {
                  const maxV = Math.max(...visitSeries, 1);
                  const pct = day.visits === 0 ? 6 : Math.max(14, Math.round((day.visits / maxV) * 100));
                  const isHighlight = day.visits > 0 && (idx === visitSeries.length - 1 || day.visits === maxV);
                  return (
                    <div key={day.date} className="flex flex-col items-center justify-end h-full gap-1.5">
                      <div
                        style={{ height: `${pct}%` }}
                        className={`w-full rounded-md transition-all ${
                          isHighlight
                            ? 'bg-[#f36d45] shadow-[0_0_16px_rgba(243,109,69,0.35)]'
                            : 'bg-white/[0.14]'
                        }`}
                        title={`${day.date}: ${day.visits} visits`}
                      />
                    </div>
                  );
                }
              )}
            </div>
            <div className="grid grid-cols-7 gap-2 text-center text-[10px] text-zinc-400">
              {(data?.site.dailySeries || []).map((d) => (
                <span key={d.date}>
                  {new Date(`${d.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3)}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-white/[0.08] flex items-center justify-between text-xs">
            <span className="text-zinc-400">Published Posts</span>
            <span className="font-semibold text-white">
              {(data?.blog.publishedCount || 0) + (data?.linkedin.publishedCount || 0)}
            </span>
          </div>
        </div>

        {/* Center + Right Top & Bottom Bento */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Center: Automation Flow & Upcoming Action Gauge */}
            <div className="p-5 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/[0.09] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-zinc-200">Automation Flow</h3>
                <button
                  type="button"
                  onClick={() => onNavigateTab('automation', 'schedule')}
                  className="w-7 h-7 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.09] flex items-center justify-center text-zinc-300 text-xs cursor-pointer"
                  title="Open Automation Studio"
                >
                  ↗
                </button>
              </div>

              <div className="flex flex-col items-center my-2">
                <svg width="180" height="102" viewBox="0 0 180 102" className="overflow-visible">
                  <path
                    d="M 18 90 A 72 72 0 0 1 162 90"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 18 90 A 72 72 0 0 1 162 90"
                    fill="none"
                    stroke="#f36d45"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={gaugeCircumference}
                    strokeDashoffset={gaugeOffset}
                  />
                  <text
                    x="90"
                    y="76"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="22"
                    fontWeight="600"
                  >
                    {totalQueued} Queued
                  </text>
                  <text
                    x="90"
                    y="94"
                    textAnchor="middle"
                    fill="#a1a1aa"
                    fontSize="10"
                  >
                    Weekly AI Pipeline
                  </text>
                </svg>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/[0.08]">
                <div className="min-w-0">
                  <div className="text-[10px] text-zinc-400">Upcoming Blog</div>
                  <div className="text-xs font-medium text-zinc-200 truncate mt-0.5">
                    {data?.automation.blogSchedule.nextRunLabel || 'Paused'}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-zinc-400">Upcoming LinkedIn</div>
                  <div className="text-xs font-medium text-zinc-200 truncate mt-0.5">
                    {data?.automation.linkedinSchedule.nextRunLabel || 'Paused'}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Realtime Traffic & Publication Trend (100% Real Series) */}
            <div className="p-5 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/[0.09] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-zinc-200">Traffic &amp; Output</h3>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-[#f36d45] text-[#09090b] text-[10px] font-semibold">
                    {data?.site.todayVisits ?? 0} today
                  </span>
                  <button
                    type="button"
                    onClick={fetchAnalytics}
                    className="w-7 h-7 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.09] flex items-center justify-center text-zinc-300 text-xs cursor-pointer"
                    title="Refresh Realtime Metrics"
                  >
                    ↻
                  </button>
                </div>
              </div>

              <div className="my-3">
                <svg viewBox="0 0 280 110" className="w-full h-28 overflow-visible">
                  <path
                    d={secondarySpline}
                    fill="none"
                    stroke="rgba(255,255,255,0.25)"
                    strokeWidth="1.5"
                  />
                  <path
                    d={primarySpline}
                    fill="none"
                    stroke="#f36d45"
                    strokeWidth="2"
                  />
                </svg>
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-2 border-t border-white/[0.08]">
                <span>Top Page: {data?.site.topPaths?.[0]?.path || '/'}</span>
                <span>{data?.site.topPaths?.[0]?.visits || 0} visits</span>
              </div>
            </div>
          </div>

          {/* Bottom Card: Recently Posted & Live Performance */}
          <div className="p-5 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/[0.09] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-medium text-zinc-200">Recently Posted &amp; Performance</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  placeholder="Filter posts…"
                  className="px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.09] text-[11px] text-zinc-200 placeholder:text-zinc-500 outline-none focus:border-white/25 w-full sm:w-36"
                />
                {(['all', 'blog', 'linkedin'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setActivityFilter(f)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-medium capitalize transition-colors cursor-pointer ${
                      activityFilter === f
                        ? 'bg-white text-[#09090b]'
                        : 'bg-white/[0.05] text-zinc-400 hover:text-white border border-white/[0.08]'
                    }`}
                  >
                    {f}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => onNavigateTab('blogs')}
                  className="px-3 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.09] text-[10px] text-zinc-200 cursor-pointer"
                >
                  View All
                </button>
              </div>
            </div>

            <div className="divide-y divide-white/[0.07]">
              {filteredActivity.map((item) => (
                <div
                  key={item.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 min-w-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.09] flex items-center justify-center shrink-0 text-xs font-semibold text-zinc-200">
                      {item.type === 'linkedin' ? 'in' : 'B'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-zinc-100 truncate">{item.title}</p>
                      <p className="text-[11px] text-zinc-400 truncate">
                        {item.platform} · {new Date(item.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pl-12 sm:pl-0">
                    <div className="sm:text-right">
                      <div className="text-xs font-medium text-zinc-200">
                        {item.reactions} reactions · {item.comments} comments
                      </div>
                      <div
                        className={`text-[10px] ${
                          item.status === 'Published'
                            ? 'text-emerald-400'
                            : item.status === 'Pending Review'
                            ? 'text-amber-300'
                            : 'text-zinc-400'
                        }`}
                      >
                        {item.status}
                      </div>
                    </div>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.09] text-[10px] text-zinc-200"
                      >
                        ↗
                      </a>
                    )}
                  </div>
                </div>
              ))}

              {filteredActivity.length === 0 && (
                <p className="py-6 text-center text-xs text-zinc-400">
                  No recent posts match this filter yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

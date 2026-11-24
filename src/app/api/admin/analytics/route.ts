import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';
import { getSiteAnalyticsSummary } from '../../../../lib/analytics';
import { getAllBlogArticles } from '../../../../lib/controllers/blogController';
import {
  getAutomationConfig,
  listSocialPosts,
  listTrackedComments,
} from '../../../../lib/automation';
import { listSubscribers } from '../../../../lib/controllers/newsletterController';
import { getLinkedInConnectionStatus } from '../../../../lib/linkedin';
import { getArticles as getDevToArticles } from '../../../../lib/devto';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function computeNextScheduledLabel(schedule: {
  enabled: boolean;
  scheduleMode: 'days_of_week' | 'interval_days';
  daysOfWeek: number[];
  intervalDays: number;
  timeOfDay: string;
}): string {
  if (!schedule?.enabled) return 'Paused';
  if (schedule.scheduleMode === 'interval_days') {
    return `Every ${schedule.intervalDays}d at ${schedule.timeOfDay || '09:00'}`;
  }
  const now = new Date();
  const today = now.getDay();
  const days =
    Array.isArray(schedule.daysOfWeek) && schedule.daysOfWeek.length > 0
      ? [...schedule.daysOfWeek].sort((a, b) => a - b)
      : [];
  if (days.length === 0) return 'No days selected';

  const [targetH, targetM] = (schedule.timeOfDay || '09:00')
    .split(':')
    .map((n) => parseInt(n, 10) || 0);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const targetMins = targetH * 60 + targetM;

  let nextDay = days.find((d) => d > today || (d === today && nowMins < targetMins));
  if (nextDay === undefined) nextDay = days[0];

  if (nextDay === today && nowMins < targetMins) {
    return `Today at ${schedule.timeOfDay}`;
  }
  return `${DAY_NAMES[nextDay]} at ${schedule.timeOfDay}`;
}

function getLast7DayKeys(): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const origin = new URL(request.url).origin;
    const [site, blogRes, config, socialPosts, comments, subscribers, linkedinAuth, liveDevtoArticles] =
      await Promise.all([
        getSiteAnalyticsSummary(),
        getAllBlogArticles(),
        getAutomationConfig(),
        listSocialPosts(),
        listTrackedComments(),
        listSubscribers(),
        getLinkedInConnectionStatus(origin),
        getDevToArticles().catch(() => []),
      ]);

    const articles = blogRes.articles || [];
    const publishedArticles = articles.filter((a) => !a.isDraft);
    const draftArticles = articles.filter((a) => a.isDraft);

    // Map live DEV.to article metrics by id/slug for real interaction counts
    const devtoMetricsBySlug = new Map<
      string,
      { reactions: number; comments: number; views: number }
    >();
    for (const d of liveDevtoArticles) {
      const anyD = d as any;
      devtoMetricsBySlug.set(d.slug, {
        reactions: d.public_reactions_count || anyD.positive_reactions_count || 0,
        comments: d.comments_count || 0,
        views: anyD.page_views_count || 0,
      });
    }

    let totalDevtoReactions = 0;
    let totalDevtoComments = 0;
    let totalDevtoViews = 0;

    for (const a of articles) {
      const liveM = devtoMetricsBySlug.get(a.slug);
      const socialM = socialPosts.find((s) => s.articleSlug === a.slug);
      const r = Math.max(liveM?.reactions || 0, socialM?.reactions?.devtoReactions || 0);
      const c = Math.max(liveM?.comments || 0, socialM?.reactions?.devtoComments || 0);
      totalDevtoReactions += r;
      totalDevtoComments += c;
      totalDevtoViews += liveM?.views || 0;
    }

    // Include tracked comments if higher
    const devtoTrackedComments = comments.filter((c) => c.platform === 'devto').length;
    totalDevtoComments = Math.max(totalDevtoComments, devtoTrackedComments);

    const linkedinPublishedPosts = socialPosts.filter((p) => p.linkedinStatus === 'published');
    const linkedinPendingPosts = socialPosts.filter((p) => p.linkedinStatus === 'pending_review');
    const linkedinLikes = socialPosts.reduce(
      (sum, p) => sum + (p.reactions?.linkedinLikes || 0),
      0
    );
    const linkedinTrackedComments = comments.filter((c) => c.platform === 'linkedin').length;

    const activeSubscribers = subscribers.filter((s) => s.status === 'active').length;

    // Real 7-day time series computed strictly from actual timestamps
    const dayKeys = getLast7DayKeys();
    const blogDailySeries = dayKeys.map((date) => ({
      date,
      count: articles.filter((a) => (a.publishedAt || '').slice(0, 10) === date).length,
    }));
    const linkedinDailySeries = dayKeys.map((date) => ({
      date,
      count: socialPosts.filter((p) => (p.createdAt || '').slice(0, 10) === date).length,
    }));
    const newsletterDailySeries = dayKeys.map((date) => ({
      date,
      count: subscribers.filter((s) => (s.subscribedAt || '').slice(0, 10) === date).length,
    }));

    const devtoQueue = config.devtoTopicsQueue || config.topicsQueue || [];
    const linkedinQueue = config.linkedinTopicsQueue || [];
    const nextLinkedinTopic = linkedinQueue[0] || null;
    const nextLinkedinImage =
      nextLinkedinTopic && config.linkedinTopicImages?.[nextLinkedinTopic]
        ? config.linkedinTopicImages[nextLinkedinTopic]
        : null;

    // Build recent unified activity feed (blogs + linkedin posts) with real metrics
    const recentBlogItems = articles.slice(0, 6).map((a) => {
      const liveM = devtoMetricsBySlug.get(a.slug);
      const matchingSocial = socialPosts.find((s) => s.articleSlug === a.slug);
      return {
        id: `blog-${a.slug}`,
        type: 'blog' as const,
        platform: a.devtoUrl ? 'DEV.to + Portfolio' : 'Portfolio',
        title: a.title,
        slug: a.slug,
        status: a.isDraft ? 'Draft' : 'Published',
        date: a.publishedAt,
        url: a.devtoUrl || `/blog/${a.slug}`,
        coverImage: a.coverImage,
        reactions: Math.max(liveM?.reactions || 0, matchingSocial?.reactions?.devtoReactions || 0),
        comments: Math.max(liveM?.comments || 0, matchingSocial?.reactions?.devtoComments || 0),
      };
    });

    const recentLinkedinItems = socialPosts.slice(0, 6).map((p) => ({
      id: p.id,
      type: 'linkedin' as const,
      platform: 'LinkedIn',
      title: p.articleTitle,
      slug: p.articleSlug,
      status:
        p.linkedinStatus === 'published'
          ? 'Published'
          : p.linkedinStatus === 'pending_review'
          ? 'Pending Review'
          : p.linkedinStatus,
      date: p.createdAt,
      url: p.linkedinPostUrl || p.articleUrl,
      coverImage: p.linkedinImageUrl,
      reactions: p.reactions?.linkedinLikes || 0,
      comments: comments.filter((c) => c.platform === 'linkedin' && c.articleSlug === p.articleSlug).length,
    }));

    const recentActivity = [...recentBlogItems, ...recentLinkedinItems]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);

    return NextResponse.json({
      site,
      blog: {
        totalArticles: articles.length,
        publishedCount: publishedArticles.length,
        draftCount: draftArticles.length,
        totalReactions: totalDevtoReactions,
        totalComments: totalDevtoComments,
        totalViews: totalDevtoViews,
        dailySeries: blogDailySeries,
      },
      linkedin: {
        totalPosts: socialPosts.length,
        publishedCount: linkedinPublishedPosts.length,
        pendingReviewCount: linkedinPendingPosts.length,
        totalLikes: linkedinLikes,
        totalComments: linkedinTrackedComments,
        connected: linkedinAuth.connected,
        daysRemaining: linkedinAuth.daysRemaining || 0,
        dailySeries: linkedinDailySeries,
      },
      newsletter: {
        activeSubscribers,
        totalSubscribers: subscribers.length,
        dailySeries: newsletterDailySeries,
      },
      automation: {
        weekKey: config.lastWeeklyQueueGeneratedWeek || null,
        lastRunAt: config.lastRunAt || null,
        lastRunStatus: config.lastRunStatus || null,
        blogSchedule: {
          enabled: Boolean(config.blogSchedule?.enabled),
          nextRunLabel: computeNextScheduledLabel(config.blogSchedule),
          queueRemaining: devtoQueue.length,
          nextTopic: devtoQueue[0] || null,
        },
        linkedinSchedule: {
          enabled: Boolean(config.linkedinSchedule?.enabled),
          nextRunLabel: computeNextScheduledLabel(config.linkedinSchedule),
          queueRemaining: linkedinQueue.length,
          nextTopic: nextLinkedinTopic,
          hasAttachedImage: Boolean(nextLinkedinImage),
        },
      },
      recentActivity,
    });
  } catch (error) {
    console.error('[API /api/admin/analytics GET] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load analytics' },
      { status: 500 }
    );
  }
}

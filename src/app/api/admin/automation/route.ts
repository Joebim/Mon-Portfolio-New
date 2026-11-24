import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';
import {
  getAutomationConfig,
  saveAutomationConfig,
  runAutomatedBlogPipeline,
  runAutomatedLinkedInPipeline,
  generateWeeklyQueuesWithAI,
  generateFreeCoverImage,
  generateSocialPostsForArticle,
  listSocialPosts,
  updateSocialPost,
  sendSocialReviewAlert,
  publishToLinkedInApi,
  listTrackedComments,
  syncCommentsAndReactions,
  generateTailoredCommentReply,
  addManualTrackedComment,
  getAutomationLogs,
  clearAutomationLogs,
  logAutomationStep,
} from '../../../../lib/automation';
import { getBlogArticleBySlug } from '../../../../lib/controllers/blogController';
import { getEmailProviderStatus } from '../../../../lib/email';
import { getLinkedInConnectionStatus } from '../../../../lib/linkedin';

/**
 * GET /api/admin/automation
 * Returns automation configuration, social post queue, tracked comments, and provider statuses.
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const origin = new URL(request.url).origin;
    const [config, socialPosts, comments, linkedinAuth, logs] = await Promise.all([
      getAutomationConfig(),
      listSocialPosts(),
      listTrackedComments(),
      getLinkedInConnectionStatus(origin),
      getAutomationLogs(),
    ]);

    return NextResponse.json({
      config,
      socialPosts,
      comments,
      logs,
      providers: {
        geminiConfigured: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY),
        cloudflareWorkersAiConfigured: Boolean(
          process.env.CLOUDFLARE_ACCOUNT_ID &&
            (process.env.CLOUDFLARE_API_TOKEN ||
              process.env.CLOUDFLARE_WORKERS_AI_API_KEY ||
              process.env.CLOUDFLARE_API_KEY)
        ),
        cloudflareModel:
          process.env.CLOUDFLARE_WORKERS_AI_MODEL || '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
        pollinationsAvailable: true,
        linkedinApiConfigured: linkedinAuth.connected || linkedinAuth.oauthConfigured,
        linkedinAuth,
        email: getEmailProviderStatus(),
      },
    });
  } catch (error) {
    console.error('[API /api/admin/automation GET] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load automation data' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/automation
 * Updates the automation configuration (schedule, days, time, models, topic queue, master prompts).
 */
export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const patch = await request.json();
    const config = await saveAutomationConfig(patch);
    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('[API /api/admin/automation PUT] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save automation settings' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/automation
 * Executes on-demand automation actions from the Admin Dashboard.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'run-now') {
      const result = await runAutomatedBlogPipeline({
        customTopic: body.topic,
        forcePublish: body.forcePublish,
      });
      const [updatedConfig, logs] = await Promise.all([
        getAutomationConfig(),
        getAutomationLogs(),
      ]);
      return NextResponse.json({ ...result, config: updatedConfig, logs });
    }

    if (action === 'run-linkedin-now') {
      const result = await runAutomatedLinkedInPipeline({
        slug: body.slug,
        customTopic: body.topic,
      });
      const [updatedConfig, logs] = await Promise.all([
        getAutomationConfig(),
        getAutomationLogs(),
      ]);
      return NextResponse.json({ ...result, config: updatedConfig, logs });
    }

    if (action === 'generate-weekly-queues') {
      const target =
        body.target === 'devto' || body.target === 'linkedin' ? body.target : 'both';
      const result = await generateWeeklyQueuesWithAI({ target });
      const logs = await getAutomationLogs();
      return NextResponse.json({
        success: true,
        ...result,
        logs,
      });
    }

    if (action === 'clear-logs') {
      await clearAutomationLogs();
      return NextResponse.json({ success: true, logs: [] });
    }

    if (action === 'generate-image') {
      const prompt = body.prompt || body.title || 'Modern Frontend Engineering Architecture';
      const blogTitle = body.title || body.prompt || prompt;
      const config = await getAutomationConfig();
      const img = await generateFreeCoverImage(prompt, {
        blogTitle,
        imageMasterPrompt: config.masterPrompts.imageMasterPrompt,
        model: body.model || config.imageModel,
        uploadToCloud: body.uploadToCloud !== false,
      });
      return NextResponse.json({ success: true, ...img });
    }

    if (action === 'generate-social') {
      const slug = body.slug as string;
      let article = slug ? await getBlogArticleBySlug(slug) : null;
      if (!article && body.title) {
        article = {
          id: body.slug || 'draft',
          slug: body.slug || 'draft',
          title: body.title,
          description: body.description || '',
          bodyMarkdown: body.bodyMarkdown || '',
          tagList: body.tagList || [],
          publishedAt: new Date().toISOString(),
          readingTimeMinutes: 5,
          isDraft: false,
          publishedTo: ['portfolio'],
        };
      }
      if (!article) {
        return NextResponse.json({ error: 'Article not found' }, { status: 404 });
      }
      const socialPost = await generateSocialPostsForArticle(article);
      return NextResponse.json({ success: true, socialPost });
    }

    if (action === 'update-social') {
      const updated = await updateSocialPost(body.id, body.patch || {});
      return NextResponse.json({ success: true, socialPost: updated });
    }

    if (action === 'send-review-email') {
      const posts = await listSocialPosts();
      const target = posts.find((p) => p.id === body.id);
      if (!target) {
        return NextResponse.json({ error: 'Social post not found' }, { status: 404 });
      }
      const res = await sendSocialReviewAlert(target, body.recipientEmail);
      if (res.success) {
        await updateSocialPost(target.id, {
          reviewEmailSent: true,
          reviewEmailSentTo: res.sentTo,
        });
      }
      return NextResponse.json(res);
    }

    if (action === 'publish-social') {
      const { id, platform, text, articleUrl, title, imageUrl } = body;
      if (platform === 'linkedin') {
        const res = await publishToLinkedInApi(text, articleUrl, title, imageUrl);
        if (res.success && id) {
          await updateSocialPost(id, { linkedinStatus: 'published', linkedinPostUrl: res.url });
        }
        return NextResponse.json(res);
      }
      return NextResponse.json({ error: 'Invalid social platform' }, { status: 400 });
    }

    if (action === 'sync-comments') {
      const res = await syncCommentsAndReactions();
      return NextResponse.json({ success: true, ...res });
    }

    if (action === 'reply-comment') {
      const res = await generateTailoredCommentReply({
        commentId: body.commentId,
        platform: body.platform || 'linkedin',
        articleTitle: body.articleTitle || 'Engineering Article',
        authorName: body.authorName || 'Reader',
        commentText: body.commentText || '',
      });
      return NextResponse.json({ success: true, ...res });
    }

    if (action === 'add-comment') {
      const comment = await addManualTrackedComment({
        platform: body.platform || 'linkedin',
        articleSlug: body.articleSlug || 'general',
        articleTitle: body.articleTitle || 'Portfolio Article',
        authorName: body.authorName || 'Commenter',
        commentText: body.commentText || '',
      });
      return NextResponse.json({ success: true, comment });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[API /api/admin/automation POST] Error:', error);
    await logAutomationStep({
      level: 'error',
      pipeline: 'system',
      step: 'ADMIN_API_POST_ERROR',
      message: error instanceof Error ? error.message : 'Automation action failed',
      meta: {
        stack: error instanceof Error ? error.stack?.slice(0, 600) : undefined,
      },
    });
    const logs = await getAutomationLogs().catch(() => []);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Automation action failed', logs },
      { status: 500 }
    );
  }
}


import { NextResponse } from 'next/server';
import {
  ensureWeeklyQueuesPopulated,
  isPostTypeScheduleDue,
  runAutomatedBlogPipeline,
  runAutomatedLinkedInPipeline,
  logAutomationStep,
} from '../../../../lib/automation';

/**
 * GET or POST /api/cron/blog-automation
 * Evaluates the independent schedules for:
 *  1) Blog Post Automation (`config.blogSchedule` — days of week / interval + time of day)
 *  2) LinkedIn Post Automation (`config.linkedinSchedule` — days of week / interval + time of day)
 * Executes whichever post type is due (or both if both are due).
 */
export async function GET(request: Request) {
  return handleCronRequest(request);
}

export async function POST(request: Request) {
  return handleCronRequest(request);
}

async function handleCronRequest(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force'); // 'true' | 'blog' | 'linkedin'

    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = request.headers.get('authorization');
      const querySecret = searchParams.get('secret');
      if (authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized cron trigger' }, { status: 401 });
      }
    }

    // At the start of a new week (or if either queue is empty), auto-generate this week's queues
    // sized to the exact number of scheduled days for DEV.to Blog and LinkedIn
    const config = await ensureWeeklyQueuesPopulated('both');
    const blogCheck = isPostTypeScheduleDue(config.blogSchedule, 'Blog Schedule');
    const linkedinCheck = isPostTypeScheduleDue(config.linkedinSchedule, 'LinkedIn Schedule');

    const shouldRunBlog = force === 'true' || force === 'blog' || blogCheck.due;
    const shouldRunLinkedin = force === 'true' || force === 'linkedin' || linkedinCheck.due;

    await logAutomationStep({
      level: 'info',
      pipeline: 'cron',
      step: 'CRON_SCHEDULE_CHECK',
      message: `Cron evaluated schedules (force=${force || 'none'}): blogDue=${blogCheck.due} (${blogCheck.reason}), linkedinDue=${linkedinCheck.due} (${linkedinCheck.reason})`,
      meta: {
        force,
        weekKey: config.lastWeeklyQueueGeneratedWeek,
        devtoQueueRemaining: config.devtoTopicsQueue?.length ?? 0,
        linkedinQueueRemaining: config.linkedinTopicsQueue?.length ?? 0,
        blogCheck,
        linkedinCheck,
      },
    });

    if (!shouldRunBlog && !shouldRunLinkedin) {
      return NextResponse.json({
        executed: false,
        weekKey: config.lastWeeklyQueueGeneratedWeek,
        devtoQueueRemaining: config.devtoTopicsQueue?.length ?? 0,
        linkedinQueueRemaining: config.linkedinTopicsQueue?.length ?? 0,
        blogSchedule: {
          due: blogCheck.due,
          reason: blogCheck.reason,
          daysOfWeek: config.blogSchedule.daysOfWeek,
          timeOfDay: config.blogSchedule.timeOfDay,
          lastRunAt: config.blogSchedule.lastRunAt,
        },
        linkedinSchedule: {
          due: linkedinCheck.due,
          reason: linkedinCheck.reason,
          daysOfWeek: config.linkedinSchedule.daysOfWeek,
          timeOfDay: config.linkedinSchedule.timeOfDay,
          lastRunAt: config.linkedinSchedule.lastRunAt,
        },
      });
    }

    let blogResult = null;
    let linkedinResult = null;

    if (shouldRunBlog) {
      blogResult = await runAutomatedBlogPipeline();
    }

    // Run independent LinkedIn schedule if due (and not already generated during blogResult)
    if (shouldRunLinkedin && (!shouldRunBlog || !blogResult?.socialPost)) {
      linkedinResult = await runAutomatedLinkedInPipeline();
    }

    return NextResponse.json({
      executed: true,
      blogExecuted: Boolean(blogResult),
      linkedinExecuted: Boolean(linkedinResult || blogResult?.socialPost),
      blogResult,
      linkedinResult,
    });
  } catch (error) {
    console.error('[Cron /api/cron/blog-automation] Error:', error);
    return NextResponse.json(
      {
        executed: false,
        error: error instanceof Error ? error.message : 'Cron automation run failed',
      },
      { status: 500 }
    );
  }
}

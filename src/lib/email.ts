import nodemailer from 'nodemailer';

export type EmailProvider = 'gmail' | 'resend' | 'auto';

export interface EmailConfigOverride {
  provider?: EmailProvider;
  gmailUser?: string;
  gmailAppPassword?: string;
  resendApiKey?: string;
  fromName?: string;
  fromEmail?: string;
}

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  configOverride?: EmailConfigOverride;
}

export interface EmailSendResult {
  success: boolean;
  provider: 'gmail' | 'resend' | 'none';
  sentCount: number;
  error?: string;
}

export function getEmailProviderStatus(override?: EmailConfigOverride) {
  const gmailUser = override?.gmailUser || process.env.GMAIL_USER || '';
  const gmailAppPassword = override?.gmailAppPassword || process.env.GMAIL_APP_PASSWORD || '';
  const resendApiKey = override?.resendApiKey || process.env.RESEND_API_KEY || '';
  const preferred = (override?.provider || (process.env.EMAIL_PROVIDER as EmailProvider) || 'auto').toLowerCase();

  const gmailConfigured = Boolean(gmailUser && gmailAppPassword);
  const resendConfigured = Boolean(resendApiKey);

  let activeProvider: 'gmail' | 'resend' | 'none' = 'none';
  if (preferred === 'gmail' && gmailConfigured) {
    activeProvider = 'gmail';
  } else if (preferred === 'resend' && resendConfigured) {
    activeProvider = 'resend';
  } else if (gmailConfigured) {
    // Prefer Gmail by default when no custom domain is configured for Resend
    activeProvider = 'gmail';
  } else if (resendConfigured) {
    activeProvider = 'resend';
  }

  return {
    activeProvider,
    preferred,
    gmail: {
      configured: gmailConfigured,
      user: gmailUser || undefined,
    },
    resend: {
      configured: resendConfigured,
      fromEmail:
        override?.fromEmail ||
        process.env.EMAIL_FROM ||
        process.env.RESEND_FROM_EMAIL ||
        process.env.RESEND_FROM ||
        'onboarding@resend.dev',
    },
  };
}

/**
 * Global email sender supporting Free Gmail SMTP (via App Password, no custom domain needed)
 * and Resend API (ready to switch whenever a custom domain is added).
 */
export async function sendEmail(input: SendEmailInput): Promise<EmailSendResult> {
  const recipients = (Array.isArray(input.to) ? input.to : [input.to])
    .map((e) => e.trim())
    .filter(Boolean);

  if (recipients.length === 0) {
    return { success: false, provider: 'none', sentCount: 0, error: 'No recipients provided.' };
  }

  const status = getEmailProviderStatus(input.configOverride);
  const fromName = input.configOverride?.fromName || process.env.EMAIL_FROM_NAME || 'Joseph Akinwole';

  if (status.activeProvider === 'gmail') {
    const gmailUser = input.configOverride?.gmailUser || process.env.GMAIL_USER!;
    const gmailPass = (input.configOverride?.gmailAppPassword || process.env.GMAIL_APP_PASSWORD!).replace(/\s+/g, '');

    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
      });

      // Send individually or via BCC to protect subscriber privacy
      let sent = 0;
      for (const recipient of recipients) {
        await transporter.sendMail({
          from: `"${fromName}" <${gmailUser}>`,
          to: recipient,
          subject: input.subject,
          html: input.html,
          text: input.text,
        });
        sent++;
      }

      return { success: true, provider: 'gmail', sentCount: sent };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[email.ts] Gmail SMTP failed:', msg);
      // If Resend is also configured as fallback, try Resend
      if (!status.resend.configured) {
        return { success: false, provider: 'gmail', sentCount: 0, error: `Gmail SMTP error: ${msg}` };
      }
    }
  }

  if (status.activeProvider === 'resend' || status.resend.configured) {
    const apiKey = input.configOverride?.resendApiKey || process.env.RESEND_API_KEY!;
    const fromAddr =
      input.configOverride?.fromEmail ||
      process.env.EMAIL_FROM ||
      process.env.RESEND_FROM_EMAIL ||
      process.env.RESEND_FROM ||
      `${fromName} <onboarding@resend.dev>`;

    try {
      let sent = 0;
      for (const recipient of recipients) {
        if (sent > 0) {
          // Stay safely under Resend's 2 requests/second rate limit
          await new Promise((r) => setTimeout(r, 550));
        }
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromAddr.includes('<') ? fromAddr : `${fromName} <${fromAddr}>`,
            to: [recipient],
            subject: input.subject,
            html: input.html,
            text: input.text,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Resend API (${res.status}): ${errText}`);
        }
        sent++;
      }

      return { success: true, provider: 'resend', sentCount: sent };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[email.ts] Resend failed:', msg);
      return { success: false, provider: 'resend', sentCount: 0, error: msg };
    }
  }

  return {
    success: false,
    provider: 'none',
    sentCount: 0,
    error:
      'No email provider configured. Add GMAIL_USER + GMAIL_APP_PASSWORD (free, no domain needed) or RESEND_API_KEY in Admin Automation Settings or .env.local.',
  };
}

/**
 * Creates a tamper-proof HMAC-SHA256 token for one-click email unsubscribe links.
 */
export function createUnsubscribeToken(email: string): string {
  const crypto = require('crypto') as typeof import('crypto');
  const secret =
    process.env.ADMIN_JWT_SECRET || 'mon-portfolio-joseph-admin-secret-2026-secure-key';
  return crypto
    .createHmac('sha256', secret)
    .update(email.trim().toLowerCase())
    .digest('hex')
    .slice(0, 32);
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  if (!email || !token) return false;
  const expected = createUnsubscribeToken(email);
  return expected.length === token.length && expected === token;
}

export function buildUnsubscribeUrl(email: string): string {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.josephakinwole.dev').replace(
    /\/$/,
    ''
  );
  const normalized = email.trim().toLowerCase();
  const token = createUnsubscribeToken(normalized);
  return `${siteUrl}/api/newsletter/unsubscribe?email=${encodeURIComponent(
    normalized
  )}&token=${encodeURIComponent(token)}`;
}

/**
 * Generates an editorial HTML newsletter email for a newly published blog article.
 */
export function buildBlogNewsletterHtml(
  article: {
    title: string;
    description: string;
    slug: string;
    coverImage?: string;
    readingTimeMinutes?: number;
    tagList?: string[];
    url?: string;
  },
  recipientEmail?: string
): string {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.josephakinwole.dev').replace(
    /\/$/,
    ''
  );
  const articleUrl = `${siteUrl}/blog/${article.slug}`;
  const tags = (article.tagList || []).slice(0, 3).map((t) => t.toUpperCase()).join(' · ');
  const unsubscribeUrl = recipientEmail
    ? buildUnsubscribeUrl(recipientEmail)
    : `${siteUrl}/blog#newsletter`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${article.title}</title>
</head>
<body style="margin:0;padding:0;background-color:#0b0b0b;color:#eeeae5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0b0b0b;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#121110;border:1px solid #2a2521;border-radius:20px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 16px 32px;border-bottom:1px solid #221e1b;">
              <span style="font-family:monospace;font-size:11px;letter-spacing:0.14em;color:#f36d45;text-transform:uppercase;font-weight:700;">
                JOSEPH AKINWOLE® · NEW DISPATCH
              </span>
            </td>
          </tr>
          ${
            article.coverImage
              ? `<tr>
            <td style="padding:0;">
              <img src="${article.coverImage}" alt="${article.title}" style="width:100%;max-height:280px;object-fit:cover;display:block;" />
            </td>
          </tr>`
              : ''
          }
          <tr>
            <td style="padding:32px;">
              <div style="font-family:monospace;font-size:11px;color:#8e8883;letter-spacing:0.08em;margin-bottom:12px;">
                ${article.readingTimeMinutes || 5} MIN READ${tags ? ` · ${tags}` : ''}
              </div>
              <h1 style="margin:0 0 16px 0;font-size:26px;line-height:1.25;color:#eeeae5;font-weight:600;letter-spacing:-0.02em;">
                ${article.title}
              </h1>
              <p style="margin:0 0 28px 0;font-size:15px;line-height:1.7;color:#b0a69c;">
                ${article.description}
              </p>
              <a href="${articleUrl}" style="display:inline-block;padding:14px 28px;background-color:#f36d45;color:#0b0b0b;text-decoration:none;font-family:monospace;font-size:12px;font-weight:700;letter-spacing:0.1em;border-radius:10px;text-transform:uppercase;">
                READ FULL ARTICLE →
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background-color:#0e0d0c;border-top:1px solid #221e1b;font-family:monospace;font-size:10px;color:#6e6760;line-height:1.8;">
              You are receiving this email because you subscribed to Joseph Akinwole's engineering newsletter.<br/>
              <div style="margin-top:10px;">
                <a href="${siteUrl}" style="color:#f36d45;text-decoration:none;margin-right:16px;">Visit Portfolio</a>
                <a href="${unsubscribeUrl}" style="display:inline-block;padding:6px 12px;border:1px solid #3a332d;border-radius:6px;color:#a7a09a;text-decoration:none;font-size:10px;letter-spacing:0.06em;text-transform:uppercase;">
                  Unsubscribe
                </a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildWelcomeEmailHtml(recipientEmail?: string): string {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.josephakinwole.dev').replace(
    /\/$/,
    ''
  );
  const unsubscribeUrl = recipientEmail ? buildUnsubscribeUrl(recipientEmail) : `${siteUrl}/blog#newsletter`;
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#0b0b0b;color:#eeeae5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0b0b0b;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#121110;border:1px solid #2a2521;border-radius:20px;padding:32px;">
          <tr>
            <td>
              <span style="font-family:monospace;font-size:11px;letter-spacing:0.14em;color:#f36d45;font-weight:700;">
                JOSEPH AKINWOLE® · WELCOME
              </span>
              <h1 style="margin:16px 0 12px 0;font-size:24px;color:#eeeae5;">Thanks for subscribing!</h1>
              <p style="margin:0 0 24px 0;font-size:14px;line-height:1.7;color:#b0a69c;">
                You're now on the list. Whenever I ship a new deep dive on frontend architecture, financial tooling, or product engineering, you'll get it straight in your inbox.
              </p>
              <a href="${siteUrl}/blog" style="display:inline-block;padding:12px 24px;background-color:#f36d45;color:#0b0b0b;text-decoration:none;font-family:monospace;font-size:11px;font-weight:700;letter-spacing:0.1em;border-radius:10px;">
                EXPLORE ARTICLES →
              </a>
              <div style="margin-top:24px;padding-top:16px;border-top:1px solid #221e1b;font-family:monospace;font-size:10px;color:#6e6760;">
                Don&apos;t want these emails?
                <a href="${unsubscribeUrl}" style="display:inline-block;margin-left:8px;padding:4px 10px;border:1px solid #3a332d;border-radius:6px;color:#a7a09a;text-decoration:none;text-transform:uppercase;">
                  Unsubscribe
                </a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Reputation & Brand Safety Scanner:
 * Checks generated LinkedIn and X content for any profanity, overly aggressive insults,
 * confidential terms, or reputation-risky words so the admin is alerted before posting.
 */
const REPUTATION_WATCHLIST = [
  'idiot',
  'stupid',
  'moron',
  'dumb',
  'trash',
  'garbage',
  'incompetent',
  'hate',
  'fired',
  'scam',
  'fraud',
  'wtf',
  'shit',
  'fuck',
  'damn',
  'hell',
  'crap',
  'sucks',
  'clown',
  'pathetic',
];

export function scanForReputationRisks(texts: string[]): {
  passed: boolean;
  flaggedWords: string[];
} {
  const combined = texts.join(' ').toLowerCase();
  const flagged: string[] = [];

  for (const word of REPUTATION_WATCHLIST) {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(combined)) {
      flagged.push(word);
    }
  }

  return {
    passed: flagged.length === 0,
    flaggedWords: Array.from(new Set(flagged)),
  };
}

/**
 * Builds the Admin Review Alert Email HTML sent whenever a LinkedIn post draft is generated,
 * allowing Joseph to review the ready-to-post content for reputation safety and verify via LinkedIn OAuth before publishing.
 */
export function buildSocialReviewAlertEmailHtml(input: {
  postId?: string;
  articleTitle: string;
  articleUrl: string;
  linkedinContent: string;
  linkedinImageUrl?: string;
  safetyCheck: { passed: boolean; flaggedWords: string[] };
}): string {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
  const adminUrl = `${siteUrl}/admin?tab=automation&subTab=social`;
  const linkedinOAuthVerifyAndPublishUrl = `${siteUrl}/api/auth/linkedin?postId=${encodeURIComponent(
    input.postId || ''
  )}&autoPublish=true`;
  const linkedinIntentUrl = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(input.linkedinContent)}`;

  const safetyBadge = input.safetyCheck.passed
    ? `<div style="display:inline-block;padding:6px 12px;border-radius:8px;background-color:rgba(180,213,121,0.15);border:1px solid rgba(180,213,121,0.4);color:#b4d579;font-family:monospace;font-size:11px;font-weight:700;">
         ✓ REPUTATION GUARDRAIL: PASSED (0 RISKY WORDS DETECTED)
       </div>`
    : `<div style="display:inline-block;padding:8px 14px;border-radius:8px;background-color:rgba(239,68,68,0.18);border:1px solid rgba(239,68,68,0.5);color:#fca5a5;font-family:monospace;font-size:11px;font-weight:700;">
         ⚠ REPUTATION ALERT — FLAGGED WORDS DETECTED: [${input.safetyCheck.flaggedWords.join(', ').toUpperCase()}] — PLEASE EDIT BEFORE POSTING
       </div>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Review Ready-to-Post LinkedIn Content</title>
</head>
<body style="margin:0;padding:0;background-color:#0b0b0b;color:#eeeae5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0b0b0b;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background-color:#121110;border:1px solid #2e2722;border-radius:20px;overflow:hidden;">
          <tr>
            <td style="padding:24px 28px;border-bottom:1px solid #221e1b;background-color:#161412;">
              <div style="font-family:monospace;font-size:11px;letter-spacing:0.14em;color:#f36d45;font-weight:700;text-transform:uppercase;">
                ACTION REQUIRED · LINKEDIN POST REVIEW BEFORE PUBLISHING
              </div>
              <h1 style="margin:8px 0 12px 0;font-size:20px;color:#eeeae5;line-height:1.3;">
                Review LinkedIn Draft for: &ldquo;${input.articleTitle}&rdquo;
              </h1>
              ${safetyBadge}
            </td>
          </tr>

          <!-- LinkedIn Draft (Official) -->
          <tr>
            <td style="padding:24px 28px;">
              <div style="font-family:monospace;font-size:11px;color:#38bdf8;font-weight:700;letter-spacing:0.08em;margin-bottom:8px;">
                LINKEDIN DRAFT (OFFICIAL &amp; EXECUTIVE PERSONA)
              </div>
              ${
                input.linkedinImageUrl
                  ? `<div style="margin-bottom:14px;">
                       <div style="font-family:monospace;font-size:10px;color:#b4d579;font-weight:700;margin-bottom:6px;">
                         📷 ATTACHED AUTHENTIC IMAGE (CLOUDINARY — WILL BE POSTED WITH LINKEDIN UPDATE)
                       </div>
                       <img src="${input.linkedinImageUrl}" alt="Attached LinkedIn Image" style="width:100%;max-height:260px;object-fit:cover;border-radius:12px;border:1px solid rgba(56,189,248,0.35);display:block;" />
                     </div>`
                  : `<div style="margin-bottom:12px;font-family:monospace;font-size:10px;color:#8e8883;">
                       📷 IMAGE: NONE ATTACHED (WILL PUBLISH AS TEXT-ONLY POST — NO AI IMAGE FALLBACK)
                     </div>`
              }
              <div style="padding:16px;background-color:#181614;border:1px solid rgba(56,189,248,0.3);border-radius:12px;font-size:14px;line-height:1.65;color:#eeeae5;white-space:pre-wrap;">${input.linkedinContent.replace(/</g, '&lt;')}</div>
              <div style="margin-top:16px;">
                <a href="${linkedinOAuthVerifyAndPublishUrl}" style="display:inline-block;padding:12px 22px;background-color:#0284c7;color:#ffffff;text-decoration:none;font-family:monospace;font-size:11px;font-weight:700;border-radius:8px;margin-right:8px;">
                  🔐 VERIFY VIA LINKEDIN OAUTH &amp; PUBLISH TO PROFILE →
                </a>
                <a href="${linkedinIntentUrl}" style="display:inline-block;padding:12px 16px;background-color:#1e293b;border:1px solid #38bdf8;color:#38bdf8;text-decoration:none;font-family:monospace;font-size:10px;font-weight:700;border-radius:8px;">
                  OPEN IN LINKEDIN WEB ↗
                </a>
              </div>
            </td>
          </tr>

          <!-- Admin Console Footer -->
          <tr>
            <td style="padding:20px 28px;background-color:#0e0d0c;border-top:1px solid #221e1b;">
              <p style="margin:0 0 14px 0;font-size:13px;color:#aaa39e;line-height:1.5;">
                Nothing has been posted to LinkedIn yet. Click the blue button above to verify via LinkedIn OAuth &amp; publish, or edit the wording in your Admin Console first:
              </p>
              <a href="${adminUrl}" style="display:inline-block;padding:12px 24px;background-color:#f36d45;color:#0b0b0b;text-decoration:none;font-family:monospace;font-size:11px;font-weight:700;letter-spacing:0.1em;border-radius:10px;">
                OPEN ADMIN SOCIAL STUDIO →
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Builds the Admin Failure Alert Email HTML sent whenever a Blog Automation
 * or LinkedIn Post Automation attempt fails.
 */
export function buildAutomationFailureAlertEmailHtml(input: {
  pipelineLabel: string;
  topicOrTitle?: string;
  failedStep: string;
  errorMessage: string;
  stackSnippet?: string;
  recentLogs?: string[];
  timestamp?: string;
}): string {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
  const debugConsoleUrl = `${siteUrl}/admin?tab=automation&subTab=logs`;
  const scheduleUrl = `${siteUrl}/admin?tab=automation&subTab=schedule`;
  const occurredAt = input.timestamp || new Date().toISOString();

  const logsBlock =
    input.recentLogs && input.recentLogs.length > 0
      ? `<tr>
            <td style="padding:0 28px 24px 28px;">
              <div style="font-family:monospace;font-size:11px;color:#8e8883;font-weight:700;letter-spacing:0.08em;margin-bottom:8px;">
                RECENT PIPELINE EXECUTION TRACE
              </div>
              <div style="padding:14px;background-color:#0e0d0c;border:1px solid #26221f;border-radius:12px;font-family:monospace;font-size:11px;line-height:1.6;color:#c7c1ba;white-space:pre-wrap;">${input.recentLogs
                .join('\n')
                .replace(/</g, '&lt;')}</div>
            </td>
          </tr>`
      : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Automation Failure Alert: ${input.pipelineLabel}</title>
</head>
<body style="margin:0;padding:0;background-color:#0b0b0b;color:#eeeae5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0b0b0b;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background-color:#121110;border:1px solid rgba(239,68,68,0.45);border-radius:20px;overflow:hidden;">
          <tr>
            <td style="padding:24px 28px;border-bottom:1px solid #281a1a;background-color:#1a1111;">
              <div style="font-family:monospace;font-size:11px;letter-spacing:0.14em;color:#f87171;font-weight:700;text-transform:uppercase;">
                🚨 AUTOMATION FAILURE ALERT · ${input.pipelineLabel.toUpperCase()}
              </div>
              <h1 style="margin:8px 0 10px 0;font-size:20px;color:#eeeae5;line-height:1.3;">
                ${input.pipelineLabel} Failed at Step: <code style="color:#fca5a5;">${input.failedStep}</code>
              </h1>
              <div style="font-family:monospace;font-size:11px;color:#b0a69c;">
                TIME: ${new Date(occurredAt).toLocaleString()}${
    input.topicOrTitle ? ` · TARGET: "${input.topicOrTitle}"` : ''
  }
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 28px;">
              <div style="font-family:monospace;font-size:11px;color:#f87171;font-weight:700;letter-spacing:0.08em;margin-bottom:8px;">
                ERROR MESSAGE
              </div>
              <div style="padding:16px;background-color:#1c1212;border:1px solid rgba(239,68,68,0.4);border-radius:12px;font-family:monospace;font-size:13px;line-height:1.6;color:#fecaca;white-space:pre-wrap;">${input.errorMessage.replace(
                /</g,
                '&lt;'
              )}</div>
              ${
                input.stackSnippet
                  ? `<div style="margin-top:12px;padding:12px;background-color:#0e0d0c;border:1px solid #26221f;border-radius:10px;font-family:monospace;font-size:10px;line-height:1.5;color:#8e8883;white-space:pre-wrap;">${input.stackSnippet.replace(
                      /</g,
                      '&lt;'
                    )}</div>`
                  : ''
              }
            </td>
          </tr>

          ${logsBlock}

          <tr>
            <td style="padding:20px 28px;background-color:#0e0d0c;border-top:1px solid #221e1b;">
              <p style="margin:0 0 14px 0;font-size:13px;color:#aaa39e;line-height:1.5;">
                Open the Admin Debug Console to inspect the step-by-step payload or re-run the pipeline:
              </p>
              <a href="${debugConsoleUrl}" style="display:inline-block;padding:12px 22px;background-color:#ef4444;color:#ffffff;text-decoration:none;font-family:monospace;font-size:11px;font-weight:700;letter-spacing:0.08em;border-radius:10px;margin-right:8px;">
                🪵 OPEN ADMIN DEBUG LOGS →
              </a>
              <a href="${scheduleUrl}" style="display:inline-block;padding:12px 18px;background-color:#1c1917;border:1px solid #44403c;color:#eeeae5;text-decoration:none;font-family:monospace;font-size:11px;font-weight:700;border-radius:10px;">
                ⚡ RETRY IN AUTOMATION STUDIO →
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Builds the Admin Success Notification Email HTML sent whenever a Blog Post
 * or LinkedIn Post is successfully posted through automation.
 */
export function buildAutomationSuccessAlertEmailHtml(input: {
  pipeline: 'blog' | 'linkedin';
  pipelineLabel: string;
  title: string;
  summary?: string;
  liveUrl?: string;
  devtoUrl?: string;
  coverImageUrl?: string;
  modelUsed?: string;
  newsletterSentCount?: number;
  isDraft?: boolean;
  timestamp?: string;
}): string {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
  const adminUrl = `${siteUrl}/admin?tab=automation&subTab=${
    input.pipeline === 'linkedin' ? 'social' : 'schedule'
  }`;
  const occurredAt = input.timestamp || new Date().toISOString();

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${input.pipelineLabel}: ${input.title}</title>
</head>
<body style="margin:0;padding:0;background-color:#0b0b0b;color:#eeeae5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0b0b0b;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background-color:#121110;border:1px solid rgba(180,213,121,0.4);border-radius:20px;overflow:hidden;">
          <tr>
            <td style="padding:24px 28px;border-bottom:1px solid #22261e;background-color:#131712;">
              <div style="font-family:monospace;font-size:11px;letter-spacing:0.14em;color:#b4d579;font-weight:700;text-transform:uppercase;">
                ✅ AUTOMATION PUBLISHED · ${input.pipelineLabel.toUpperCase()}
              </div>
              <h1 style="margin:8px 0 10px 0;font-size:20px;color:#eeeae5;line-height:1.3;">
                &ldquo;${input.title}&rdquo;
              </h1>
              <div style="font-family:monospace;font-size:11px;color:#a7a09a;">
                POSTED AT: ${new Date(occurredAt).toLocaleString()}${
                  input.modelUsed ? ` · MODEL: ${input.modelUsed}` : ''
                }${input.isDraft ? ' · SAVED AS DRAFT' : ' · LIVE'}
              </div>
            </td>
          </tr>

          ${
            input.coverImageUrl
              ? `<tr>
            <td style="padding:0;">
              <img src="${input.coverImageUrl}" alt="${input.title}" style="width:100%;max-height:260px;object-fit:cover;display:block;" />
            </td>
          </tr>`
              : ''
          }

          <tr>
            <td style="padding:24px 28px;">
              ${
                input.summary
                  ? `<p style="margin:0 0 18px 0;font-size:14px;line-height:1.65;color:#d6d0c9;white-space:pre-wrap;">${input.summary.replace(
                      /</g,
                      '&lt;'
                    )}</p>`
                  : ''
              }
              <div style="font-family:monospace;font-size:11px;color:#b4d579;line-height:1.8;">
                ${input.liveUrl ? `<div>🔗 Live URL: <a href="${input.liveUrl}" style="color:#38bdf8;">${input.liveUrl}</a></div>` : ''}
                ${input.devtoUrl ? `<div>📝 DEV.to URL: <a href="${input.devtoUrl}" style="color:#f36d45;">${input.devtoUrl}</a></div>` : ''}
                ${
                  typeof input.newsletterSentCount === 'number'
                    ? `<div>✉ Newsletter Dispatched: ${input.newsletterSentCount} subscriber(s)</div>`
                    : ''
                }
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 28px;background-color:#0e0d0c;border-top:1px solid #221e1b;">
              ${
                input.liveUrl
                  ? `<a href="${input.liveUrl}" style="display:inline-block;padding:12px 22px;background-color:#b4d579;color:#0b0b0b;text-decoration:none;font-family:monospace;font-size:11px;font-weight:700;letter-spacing:0.08em;border-radius:10px;margin-right:8px;">
                      VIEW LIVE POST →
                    </a>`
                  : ''
              }
              <a href="${adminUrl}" style="display:inline-block;padding:12px 18px;background-color:#1c1917;border:1px solid #44403c;color:#eeeae5;text-decoration:none;font-family:monospace;font-size:11px;font-weight:700;border-radius:10px;">
                OPEN AUTOMATION STUDIO →
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}




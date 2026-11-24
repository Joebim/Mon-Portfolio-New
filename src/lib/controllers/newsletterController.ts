import { getFirestoreDb } from '../firebase-admin';
import {
  sendEmail,
  buildBlogNewsletterHtml,
  buildWelcomeEmailHtml,
  buildUnsubscribeUrl,
  type EmailConfigOverride,
} from '../email';
import type { BlogArticle } from '../schemas';

export interface Subscriber {
  email: string;
  name?: string;
  source: 'frontend' | 'admin';
  status: 'active' | 'unsubscribed';
  subscribedAt: string;
}

// Local fallback cache when running offline without Firestore credentials
const memorySubscribers = new Map<string, Subscriber>();

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function listSubscribers(): Promise<Subscriber[]> {
  const db = getFirestoreDb();
  if (db) {
    try {
      const snapshot = await db.collection('subscribers').orderBy('subscribedAt', 'desc').get();
      const list: Subscriber[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data() as Subscriber;
        if (d?.email) list.push(d);
      });
      return list;
    } catch (err) {
      console.warn('[newsletterController] Firestore listSubscribers fallback:', err);
    }
  }
  return Array.from(memorySubscribers.values()).sort((a, b) =>
    b.subscribedAt.localeCompare(a.subscribedAt)
  );
}

export async function addSubscriber(
  rawEmail: string,
  options: { name?: string; source?: 'frontend' | 'admin'; sendWelcome?: boolean; emailConfig?: EmailConfigOverride } = {}
): Promise<{ subscriber: Subscriber; isNew: boolean }> {
  const email = normalizeEmail(rawEmail);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`Invalid email address: "${rawEmail}"`);
  }

  const now = new Date().toISOString();
  const subscriber: Subscriber = {
    email,
    name: options.name?.trim() || undefined,
    source: options.source || 'frontend',
    status: 'active',
    subscribedAt: now,
  };

  let isNew = true;
  const db = getFirestoreDb();
  if (db) {
    const docId = email.replace(/[^a-z0-9@._-]/gi, '_');
    const docRef = db.collection('subscribers').doc(docId);
    const existing = await docRef.get();
    if (existing.exists) {
      isNew = false;
      await docRef.set({ ...existing.data(), status: 'active' }, { merge: true });
    } else {
      await docRef.set(JSON.parse(JSON.stringify(subscriber)));
    }
  } else {
    isNew = !memorySubscribers.has(email);
    memorySubscribers.set(email, subscriber);
  }

  if (isNew && options.sendWelcome) {
    try {
      await sendEmail({
        to: email,
        subject: "Welcome to Joseph Akinwole's Engineering Dispatch",
        html: buildWelcomeEmailHtml(email),
        configOverride: options.emailConfig,
      });
    } catch (err) {
      console.warn('[newsletterController] Welcome email skipped:', err);
    }
  }

  return { subscriber, isNew };
}

export async function addSubscribersBulk(
  rawEmails: string[],
  source: 'frontend' | 'admin' = 'admin'
): Promise<{ added: number; total: number; subscribers: Subscriber[] }> {
  let added = 0;
  for (const raw of rawEmails) {
    const clean = normalizeEmail(raw);
    if (!clean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) continue;
    const res = await addSubscriber(clean, { source, sendWelcome: false });
    if (res.isNew) added++;
  }
  const subscribers = await listSubscribers();
  return { added, total: subscribers.length, subscribers };
}

export async function removeSubscriber(rawEmail: string): Promise<boolean> {
  const email = normalizeEmail(rawEmail);
  const db = getFirestoreDb();
  if (db) {
    const docId = email.replace(/[^a-z0-9@._-]/gi, '_');
    await db.collection('subscribers').doc(docId).delete();
  }
  memorySubscribers.delete(email);
  return true;
}

export async function unsubscribeSubscriber(rawEmail: string): Promise<boolean> {
  const email = normalizeEmail(rawEmail);
  const db = getFirestoreDb();
  if (db) {
    const docId = email.replace(/[^a-z0-9@._-]/gi, '_');
    const docRef = db.collection('subscribers').doc(docId);
    const snap = await docRef.get();
    if (snap.exists) {
      await docRef.set(
        {
          ...snap.data(),
          status: 'unsubscribed',
          unsubscribedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }
  }
  const mem = memorySubscribers.get(email);
  if (mem) {
    memorySubscribers.set(email, { ...mem, status: 'unsubscribed' });
  }
  return true;
}

export async function sendArticleToSubscribers(
  article: BlogArticle,
  emailConfig?: EmailConfigOverride
): Promise<{ success: boolean; sentCount: number; provider: string; error?: string }> {
  const subscribers = await listSubscribers();
  const activeEmails = subscribers.filter((s) => s.status === 'active').map((s) => s.email);

  if (activeEmails.length === 0) {
    return {
      success: false,
      sentCount: 0,
      provider: 'none',
      error: 'No active newsletter subscribers yet.',
    };
  }

  let sentCount = 0;
  let lastProvider = 'none';
  let lastError: string | undefined;

  // Send individually so each subscriber gets their own signed one-click Unsubscribe button
  for (const recipient of activeEmails) {
    const html = buildBlogNewsletterHtml(
      {
        title: article.title,
        description: article.description,
        slug: article.slug,
        coverImage: article.coverImage,
        readingTimeMinutes: article.readingTimeMinutes,
        tagList: article.tagList,
        url: article.url,
      },
      recipient
    );

    const unsubscribeUrl = buildUnsubscribeUrl(recipient);
    const res = await sendEmail({
      to: recipient,
      subject: `New Article: ${article.title}`,
      html,
      text: `${article.title}\n\n${article.description}\n\nRead more: ${
        process.env.NEXT_PUBLIC_SITE_URL || 'https://josephakinwole.com'
      }/blog/${article.slug}\n\nUnsubscribe: ${unsubscribeUrl}`,
      configOverride: emailConfig,
    });

    if (res.success) {
      sentCount++;
    } else if (res.error) {
      lastError = res.error;
    }
    if (res.provider !== 'none') {
      lastProvider = res.provider;
    }
  }

  return {
    success: sentCount > 0,
    sentCount,
    provider: lastProvider,
    error: sentCount === 0 ? lastError : undefined,
  };
}


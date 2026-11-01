import fs from 'node:fs/promises';
import path from 'node:path';
import { getFirestoreDb } from '../firebase-admin';
import {
  PortfolioContentSchema,
  type PortfolioContent,
} from '../schemas';

const LOCAL_PORTFOLIO_PATH = path.join(process.cwd(), 'src', 'portfolio.json');

/**
 * Normalizes raw/legacy JSON data into a strictly valid PortfolioContent object.
 * Maps legacy keys (additionalProjects -> smallWorks, experience -> experiences,
 * contact.name -> profile.name, label/short -> platform/username) seamlessly.
 */
export function normalizePortfolio(raw: unknown): PortfolioContent {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const contact = (data.contact && typeof data.contact === 'object' ? data.contact : {}) as Record<string, unknown>;
  const profile = (data.profile && typeof data.profile === 'object' ? data.profile : {}) as Record<string, unknown>;

  // Profiles array mapping
  const rawProfiles = Array.isArray(contact.profiles) ? contact.profiles : [];
  const profiles = rawProfiles.map((p: unknown) => {
    const item = (p && typeof p === 'object' ? p : {}) as Record<string, string>;
    return {
      platform: item.platform || item.label || item.short || 'Link',
      username: item.username || item.short || item.label || 'profile',
      url: item.url || 'https://',
    };
  });

  // Profile data mapping
  const name = String(profile.name || contact.name || 'Joseph Akinwole');
  const role = String(profile.role || contact.role || 'Full Stack Engineer');
  const headline = String(profile.headline || profile.heroIntro || 'Turning complex systems into calm, dependable software.');
  const status = String(profile.status || 'Available for new opportunities');
  const aboutLead = String(profile.aboutLead || '');
  const aboutParagraphs = Array.isArray(profile.aboutParagraphs)
    ? (profile.aboutParagraphs as unknown[]).map(String)
    : [];

  // Projects mapping
  const rawProjects = Array.isArray(data.projects) ? data.projects : [];
  const projects = rawProjects.map((p: unknown) => {
    const item = (p && typeof p === 'object' ? p : {}) as Record<string, unknown>;
    return {
      title: String(item.title || 'Untitled Project'),
      year: String(item.year || '2026'),
      category: String(item.category || 'Product Experience'),
      description: String(item.description || ''),
      technologies: Array.isArray(item.technologies) ? (item.technologies as unknown[]).map(String) : [],
      accent: String(item.accent || '#f36d45'),
      kind: String(item.kind || 'web'),
      url: item.url ? String(item.url) : undefined,
      linkLabel: item.linkLabel ? String(item.linkLabel) : undefined,
      mediaSrc: item.mediaSrc ? String(item.mediaSrc) : undefined,
      mediaAlt: item.mediaAlt ? String(item.mediaAlt) : undefined,
    };
  });

  // Small works mapping (handles both "smallWorks" and legacy "additionalProjects")
  const rawSmall = Array.isArray(data.smallWorks)
    ? data.smallWorks
    : Array.isArray(data.additionalProjects)
    ? data.additionalProjects
    : [];
  const smallWorks = rawSmall.map((w: unknown) => {
    const item = (w && typeof w === 'object' ? w : {}) as Record<string, unknown>;
    return {
      name: String(item.name || 'Untitled'),
      note: String(item.note || ''),
      year: String(item.year || '—'),
      stack: String(item.stack || ''),
      url: item.url ? String(item.url) : undefined,
    };
  });

  // Experiences mapping (handles both "experiences" and legacy "experience")
  const rawExp = Array.isArray(data.experiences)
    ? data.experiences
    : Array.isArray(data.experience)
    ? data.experience
    : [];
  const experiences = rawExp.map((e: unknown) => {
    const item = (e && typeof e === 'object' ? e : {}) as Record<string, unknown>;
    return {
      company: String(item.company || 'Company'),
      role: String(item.role || 'Software Engineer'),
      dates: String(item.dates || '2024 — Present'),
      location: String(item.location || 'Remote'),
      achievements: Array.isArray(item.achievements)
        ? (item.achievements as unknown[]).map(String)
        : [],
    };
  });

  // Skill groups mapping
  const rawSkills = Array.isArray(data.skillGroups) ? data.skillGroups : [];
  const skillGroups = rawSkills.map((g: unknown) => {
    const group = (g && typeof g === 'object' ? g : {}) as Record<string, unknown>;
    const rawItems = Array.isArray(group.items) ? group.items : [];
    return {
      title: String(group.title || 'General'),
      items: rawItems.map((it: unknown) => {
        const item = (it && typeof it === 'object' ? it : {}) as Record<string, unknown>;
        return {
          name: String(item.name || ''),
          note: String(item.note || ''),
        };
      }),
    };
  });

  // Soft skills mapping
  const softSkills = Array.isArray(data.softSkills)
    ? (data.softSkills as unknown[]).map(String)
    : [];

  // Latest article mapping
  const latestRaw = (data.latestArticle && typeof data.latestArticle === 'object' ? data.latestArticle : null) as Record<string, unknown> | null;
  const latestArticle = latestRaw
    ? {
        title: String(latestRaw.title || ''),
        description: String(latestRaw.description || ''),
        readingTime: latestRaw.readingTime ? String(latestRaw.readingTime) : undefined,
        publishedAt: latestRaw.publishedAt || latestRaw.date ? String(latestRaw.publishedAt || latestRaw.date) : undefined,
        url: latestRaw.url ? String(latestRaw.url) : undefined,
      }
    : undefined;

  const candidate = {
    profile: {
      name,
      role,
      headline,
      status,
      aboutLead,
      aboutParagraphs,
    },
    contact: {
      email: String(contact.email || 'joseph.akinwole.me@gmail.com'),
      phone: String(contact.phone || '+2347036857945'),
      location: String(contact.location || 'Ondo, Nigeria'),
      website: contact.website ? String(contact.website) : undefined,
      github: contact.github ? String(contact.github) : undefined,
      profiles,
    },
    projects,
    smallWorks,
    experiences,
    skillGroups,
    softSkills,
    latestArticle,
  };

  const parsed = PortfolioContentSchema.safeParse(candidate);
  if (parsed.success) {
    return parsed.data;
  }

  console.warn('[normalizePortfolio] Parse issues:', parsed.error.issues);
  return candidate as PortfolioContent;
}

export async function readLocalPortfolio(): Promise<PortfolioContent> {
  const file = await fs.readFile(LOCAL_PORTFOLIO_PATH, 'utf-8');
  const json = JSON.parse(file);
  return normalizePortfolio(json);
}

export async function writeLocalPortfolio(data: PortfolioContent): Promise<void> {
  const validated = PortfolioContentSchema.parse(data);

  // Preserve legacy aliases for backward compatibility with frontend pages (src/data.ts)
  const compatiblePayload = {
    ...validated,
    // Provide both modern schema and legacy names so nothing breaks
    additionalProjects: validated.smallWorks,
    experience: validated.experiences,
    contact: {
      ...validated.contact,
      name: validated.profile.name,
      role: validated.profile.role,
      profiles: validated.contact.profiles.map((p) => ({
        label: p.platform,
        short: p.username,
        url: p.url,
        platform: p.platform,
        username: p.username,
      })),
    },
    profile: {
      ...validated.profile,
      heroIntro: validated.profile.headline,
    },
  };

  await fs.writeFile(LOCAL_PORTFOLIO_PATH, JSON.stringify(compatiblePayload, null, 2), 'utf-8');
}

export async function getPortfolioContent(): Promise<{ source: 'firestore' | 'local'; data: PortfolioContent }> {
  const db = getFirestoreDb();
  if (db) {
    try {
      const doc = await db.collection('content').doc('portfolio').get();
      if (doc.exists) {
        const raw = doc.data();
        const normalized = normalizePortfolio(raw);
        return { source: 'firestore', data: normalized };
      }
    } catch (err) {
      console.warn('[portfolioController] Firestore fetch failed, falling back to local file:', err);
    }
  }

  const localData = await readLocalPortfolio();
  return { source: 'local', data: localData };
}

/**
 * Strips undefined properties recursively so Firestore does not reject the document.
 */
function toCleanFirestoreData<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export async function updatePortfolioContent(data: unknown): Promise<{ source: 'firestore' | 'local'; data: PortfolioContent }> {
  const normalized = normalizePortfolio(data);
  const validated = PortfolioContentSchema.parse(normalized);
  const db = getFirestoreDb();

  if (db) {
    try {
      const cleanData = toCleanFirestoreData(validated);
      await db.collection('content').doc('portfolio').set(cleanData, { merge: true });
      // Also update local copy for sync
      try {
        await writeLocalPortfolio(validated);
      } catch {
        // local write non-fatal in cloud environments
      }
      return { source: 'firestore', data: validated };
    } catch (err) {
      console.warn('[portfolioController] Firestore save failed, saving to local json:', err);
    }
  }

  await writeLocalPortfolio(validated);
  return { source: 'local', data: validated };
}

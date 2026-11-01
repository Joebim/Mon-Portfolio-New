import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';
import { getFirestoreDb } from '../../../../lib/firebase-admin';
import portfolioJson from '../../../../portfolio.json';

export const dynamic = 'force-dynamic';

// Normalise portfolio.json keys → PortfolioContentSchema keys
function normalisePortfolioData(raw: typeof portfolioJson) {
  const contact = raw.contact as Record<string, unknown>;

  return {
    profile: {
      name: (contact.name as string) || '',
      role: (contact.role as string) || '',
      headline: (raw.profile as Record<string, unknown>).heroIntro as string || '',
      status: 'Available for new opportunities',
      aboutLead: (raw.profile as Record<string, unknown>).aboutLead as string || '',
      aboutParagraphs: (raw.profile as Record<string, unknown>).aboutParagraphs as string[] || [],
    },
    contact: {
      email: (contact.email as string) || '',
      phone: (contact.phone as string) || '',
      location: (contact.location as string) || '',
      website: (contact.website as string) || '',
      github: (contact.github as string) || '',
      profiles: ((contact.profiles as Array<Record<string, string>>) || []).map((p) => ({
        platform: p.label || p.short || '',
        username: p.short || p.label || '',
        url: p.url || '',
      })),
    },
    projects: (raw.projects || []).map((p) => ({
      title: p.title,
      year: p.year,
      category: p.category,
      description: p.description,
      technologies: p.technologies,
      accent: p.accent,
      kind: p.kind,
      url: (p as Record<string, unknown>).url as string | undefined,
      linkLabel: (p as Record<string, unknown>).linkLabel as string | undefined,
      mediaSrc: (p as Record<string, unknown>).mediaSrc as string | undefined,
      mediaAlt: (p as Record<string, unknown>).mediaAlt as string | undefined,
    })),
    // portfolio.json uses "additionalProjects" → schema uses "smallWorks"
    smallWorks: (raw.additionalProjects || []).map((w) => ({
      name: w.name,
      note: w.note,
      year: w.year,
      stack: w.stack,
      url: w.url,
    })),
    // portfolio.json uses "experience" → schema uses "experiences"
    experiences: (raw.experience || []).map((e) => ({
      company: e.company,
      role: e.role,
      dates: e.dates,
      location: e.location,
      achievements: e.achievements,
    })),
    skillGroups: raw.skillGroups || [],
    softSkills: raw.softSkills || [],
    latestArticle: raw.latestArticle
      ? {
          title: raw.latestArticle.title,
          description: raw.latestArticle.description,
          readingTime: (raw.latestArticle as Record<string, unknown>).readingTime as string | undefined,
          publishedAt: (raw.latestArticle as Record<string, unknown>).date as string | undefined,
          url: raw.latestArticle.url,
        }
      : undefined,
  };
}

export async function POST(_request: Request) {
  // Auth check
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getFirestoreDb();
    if (!db) {
      return NextResponse.json(
        { error: 'Firestore not available. Configure Firebase Admin credentials first.' },
        { status: 503 }
      );
    }

    const normalised = normalisePortfolioData(portfolioJson);
    const cleanPayload = JSON.parse(JSON.stringify(normalised));

    // Merge into Firestore (idempotent)
    await db
      .collection('content')
      .doc('portfolio')
      .set(cleanPayload, { merge: true });

    return NextResponse.json({
      success: true,
      seeded: ['portfolio'],
      message: 'Portfolio JSON seeded to Firestore successfully.',
      counts: {
        projects: normalised.projects.length,
        smallWorks: normalised.smallWorks.length,
        experiences: normalised.experiences.length,
        skillGroups: normalised.skillGroups.length,
        softSkills: normalised.softSkills.length,
      },
    });
  } catch (err) {
    console.error('[Seed] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Seed failed' },
      { status: 500 }
    );
  }
}

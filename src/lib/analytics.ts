import { getFirestoreDb } from './firebase-admin';

export interface VisitDayBucket {
  date: string; // YYYY-MM-DD
  visits: number;
}

export interface SiteAnalyticsSummary {
  totalVisits: number;
  todayVisits: number;
  activeNow: number;
  dailySeries: VisitDayBucket[];
  topPaths: Array<{ path: string; visits: number }>;
  lastVisitAt?: string;
}

const memoryVisits = {
  totalVisits: 0,
  dailyCounts: new Map<string, number>(),
  pathCounts: new Map<string, number>(),
  activeVisitors: new Map<string, number>(), // visitorKey -> lastSeenMs
  lastVisitAt: undefined as string | undefined,
};

const ACTIVE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

function pruneActiveVisitors(nowMs: number) {
  for (const [key, lastSeen] of memoryVisits.activeVisitors.entries()) {
    if (nowMs - lastSeen > ACTIVE_WINDOW_MS) {
      memoryVisits.activeVisitors.delete(key);
    }
  }
}

export async function recordSiteVisit(input: {
  path: string;
  visitorKey: string;
}): Promise<void> {
  const now = new Date();
  const nowMs = now.getTime();
  const todayKey = now.toISOString().slice(0, 10);
  const cleanPath = (input.path || '/').slice(0, 120);

  // Never count admin routes as public portfolio visits
  if (cleanPath.startsWith('/admin') || cleanPath.startsWith('/api')) {
    return;
  }

  memoryVisits.totalVisits += 1;
  memoryVisits.dailyCounts.set(todayKey, (memoryVisits.dailyCounts.get(todayKey) || 0) + 1);
  memoryVisits.pathCounts.set(cleanPath, (memoryVisits.pathCounts.get(cleanPath) || 0) + 1);
  memoryVisits.activeVisitors.set(input.visitorKey, nowMs);
  memoryVisits.lastVisitAt = now.toISOString();
  pruneActiveVisitors(nowMs);

  const db = getFirestoreDb();
  if (db) {
    try {
      const docRef = db.collection('analytics').doc('site_visits');
      const snap = await docRef.get();
      const existing = snap.exists ? (snap.data() as any) : {};
      const dailyCounts: Record<string, number> = { ...(existing.dailyCounts || {}) };
      dailyCounts[todayKey] = (dailyCounts[todayKey] || 0) + 1;

      // Keep last 30 days only so document stays tiny
      const sortedDays = Object.keys(dailyCounts).sort();
      if (sortedDays.length > 30) {
        for (const oldDay of sortedDays.slice(0, sortedDays.length - 30)) {
          delete dailyCounts[oldDay];
        }
      }

      const pathCounts: Record<string, number> = { ...(existing.pathCounts || {}) };
      pathCounts[cleanPath] = (pathCounts[cleanPath] || 0) + 1;

      const activeSessions: Record<string, number> = { ...(existing.activeSessions || {}) };
      activeSessions[input.visitorKey] = nowMs;
      for (const [k, ts] of Object.entries(activeSessions)) {
        if (nowMs - Number(ts) > ACTIVE_WINDOW_MS) {
          delete activeSessions[k];
        }
      }

      await docRef.set(
        {
          totalVisits: (existing.totalVisits || 0) + 1,
          dailyCounts,
          pathCounts,
          activeSessions,
          lastVisitAt: now.toISOString(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('[analytics] Firestore recordSiteVisit warning:', err);
    }
  }
}

export async function getSiteAnalyticsSummary(): Promise<SiteAnalyticsSummary> {
  const now = new Date();
  const nowMs = now.getTime();
  const todayKey = now.toISOString().slice(0, 10);

  // Build last 7 days labels
  const last7Days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    last7Days.push(d.toISOString().slice(0, 10));
  }

  const db = getFirestoreDb();
  if (db) {
    try {
      const snap = await docGetSafe(db);
      if (snap) {
        const dailyCounts: Record<string, number> = snap.dailyCounts || {};
        const pathCounts: Record<string, number> = snap.pathCounts || {};
        const activeSessions: Record<string, number> = snap.activeSessions || {};
        const activeNow = Object.values(activeSessions).filter(
          (ts) => nowMs - Number(ts) <= ACTIVE_WINDOW_MS
        ).length;

        return {
          totalVisits: snap.totalVisits || 0,
          todayVisits: dailyCounts[todayKey] || 0,
          activeNow,
          dailySeries: last7Days.map((date) => ({
            date,
            visits: dailyCounts[date] || 0,
          })),
          topPaths: Object.entries(pathCounts)
            .map(([path, visits]) => ({ path, visits: Number(visits) || 0 }))
            .sort((a, b) => b.visits - a.visits)
            .slice(0, 5),
          lastVisitAt: snap.lastVisitAt,
        };
      }
    } catch (err) {
      console.warn('[analytics] Firestore getSiteAnalyticsSummary fallback:', err);
    }
  }

  pruneActiveVisitors(nowMs);
  return {
    totalVisits: memoryVisits.totalVisits,
    todayVisits: memoryVisits.dailyCounts.get(todayKey) || 0,
    activeNow: memoryVisits.activeVisitors.size,
    dailySeries: last7Days.map((date) => ({
      date,
      visits: memoryVisits.dailyCounts.get(date) || 0,
    })),
    topPaths: Array.from(memoryVisits.pathCounts.entries())
      .map(([path, visits]) => ({ path, visits }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 5),
    lastVisitAt: memoryVisits.lastVisitAt,
  };
}

async function docGetSafe(db: FirebaseFirestore.Firestore) {
  const doc = await db.collection('analytics').doc('site_visits').get();
  return doc.exists ? (doc.data() as any) : null;
}

import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let app: App | null = null;
let db: Firestore | null = null;

export function getFirebaseAdminApp(): App | null {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    // Strip possible surrounding quotes and replace escaped newlines
    privateKey = privateKey.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
  }

  if (projectId && clientEmail && privateKey) {
    if (!clientEmail.includes('gserviceaccount.com')) {
      console.warn(
        `[firebase-admin] Notice: FIREBASE_CLIENT_EMAIL should be the Service Account email (ends in .gserviceaccount.com), not a personal email. Operating in local/fallback mode until Service Account credentials are provided.`
      );
      return null;
    }

    try {
      app = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      return app;
    } catch (error) {
      console.warn('[firebase-admin] Failed to initialize Firebase Admin with service account:', error);
      return null;
    }
  }

  // Fallback for GCP Cloud environments with Application Default Credentials
  if (projectId && (process.env.K_SERVICE || process.env.GOOGLE_CLOUD_PROJECT)) {
    try {
      app = initializeApp({ projectId });
      return app;
    } catch (err) {
      console.warn('[firebase-admin] Default initialization failed:', err);
      return null;
    }
  }

  return null;
}

export function getFirestoreDb(): Firestore | null {
  if (db) return db;

  const adminApp = getFirebaseAdminApp();
  if (adminApp) {
    try {
      db = getFirestore(adminApp);
      try {
        db.settings({ ignoreUndefinedProperties: true });
      } catch {
        // Settings can only be called before any other calls
      }
      return db;
    } catch (err) {
      console.warn('[firebase-admin] Failed to get Firestore instance:', err);
      return null;
    }
  }

  return null;
}


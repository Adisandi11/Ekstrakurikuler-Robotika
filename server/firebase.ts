import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, disableNetwork } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

let dbInstance: ReturnType<typeof getFirestore> | null = null;
let isQuotaExhausted = false;
const QUOTA_FLAG_FILE = path.join(process.cwd(), '.firestore_quota_exhausted');

// Check if quota exhaustion flag was recorded in the last 12 hours
try {
  if (fs.existsSync(QUOTA_FLAG_FILE)) {
    const stat = fs.statSync(QUOTA_FLAG_FILE);
    const ageMs = Date.now() - stat.mtimeMs;
    if (ageMs < 12 * 3600 * 1000) {
      isQuotaExhausted = true;
      console.warn('⚠️ Firestore quota limit previously exceeded within 12 hours. Using local database fallback.');
    } else {
      fs.unlinkSync(QUOTA_FLAG_FILE);
    }
  }
} catch (e) {
  // ignore filesystem check error
}

try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    if (firebaseConfig.firestoreDatabaseId) {
      dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    } else {
      dbInstance = getFirestore(app);
    }
    console.log('🔥 Firebase initialized successfully with project:', firebaseConfig.projectId);

    if (isQuotaExhausted && dbInstance) {
      disableNetwork(dbInstance).catch(() => {});
    }
  }
} catch (err) {
  console.error('Error initializing Firebase:', err);
}

export const firestore = dbInstance;

function isQuotaError(err: any): boolean {
  if (!err) return false;
  const str = String(err.message || err.code || err);
  return str.includes('RESOURCE_EXHAUSTED') || str.includes('Quota limit exceeded') || err.code === 'resource-exhausted' || err.code === 8;
}

function handleQuotaExhausted(err: any) {
  if (isQuotaError(err)) {
    isQuotaExhausted = true;
    try {
      fs.writeFileSync(QUOTA_FLAG_FILE, new Date().toISOString(), 'utf-8');
    } catch (e) {
      // ignore write error
    }
    if (dbInstance) {
      disableNetwork(dbInstance).catch(() => {});
    }
    console.warn('⚠️ Firestore quota limit exceeded. Disabling network sync & switching to local storage.');
  }
}

export async function fetchFromFirestore(): Promise<any | null> {
  if (!firestore || isQuotaExhausted) return null;
  try {
    const docRef = doc(firestore, 'app_data', 'main');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (err: any) {
    if (isQuotaError(err)) {
      handleQuotaExhausted(err);
    } else {
      console.error('Error fetching from Firestore:', err);
    }
  }
  return null;
}

let saveTimeout: NodeJS.Timeout | null = null;
let latestDataToSave: any = null;

export async function saveToFirestore(data: any): Promise<boolean> {
  if (!firestore || isQuotaExhausted) return false;

  latestDataToSave = data;

  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  return new Promise((resolve) => {
    saveTimeout = setTimeout(async () => {
      if (!firestore || !latestDataToSave || isQuotaExhausted) {
        resolve(false);
        return;
      }
      try {
        const docRef = doc(firestore, 'app_data', 'main');
        await setDoc(docRef, latestDataToSave);
        resolve(true);
      } catch (err: any) {
        if (isQuotaError(err)) {
          handleQuotaExhausted(err);
        } else {
          console.error('Error saving to Firestore:', err);
        }
        resolve(false);
      }
    }, 1500);
  });
}



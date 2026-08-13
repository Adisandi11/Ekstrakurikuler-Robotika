import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

let dbInstance: ReturnType<typeof getFirestore> | null = null;
let isQuotaExhausted = false;
let lastQuotaErrorTime = 0;

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
    lastQuotaErrorTime = Date.now();
    console.warn('⚠️ Firestore quota limit exceeded. Temporary fallback to local storage until quota resets.');
  }
}

// Check if 2 hours passed since quota error to attempt re-enabling cloud sync
function canAttemptCloudSync(): boolean {
  if (!firestore) return false;
  if (isQuotaExhausted) {
    // If 2 hours have passed, retry cloud sync
    if (Date.now() - lastQuotaErrorTime > 2 * 3600 * 1000) {
      isQuotaExhausted = false;
      return true;
    }
    return false;
  }
  return true;
}

export async function fetchFromFirestore(): Promise<any | null> {
  if (!canAttemptCloudSync()) return null;
  try {
    const docRef = doc(firestore!, 'app_data', 'main');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      isQuotaExhausted = false; // Successfully read from cloud!
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

function sanitizeDataForFirestore(data: any): any {
  if (!data || typeof data !== 'object') return data;
  const cloned = JSON.parse(JSON.stringify(data));
  
  // Keep audit logs trimmed to max 50 to avoid hitting 1MB document limit
  if (Array.isArray(cloned.audit_logs) && cloned.audit_logs.length > 50) {
    cloned.audit_logs = cloned.audit_logs.slice(-50);
  }
  return cloned;
}

export async function saveToFirestore(data: any): Promise<boolean> {
  if (!canAttemptCloudSync()) return false;

  latestDataToSave = sanitizeDataForFirestore(data);

  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  return new Promise((resolve) => {
    saveTimeout = setTimeout(async () => {
      if (!firestore || !latestDataToSave || !canAttemptCloudSync()) {
        resolve(false);
        return;
      }
      try {
        const docRef = doc(firestore!, 'app_data', 'main');
        await setDoc(docRef, latestDataToSave);
        isQuotaExhausted = false; // Successfully saved to cloud!
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




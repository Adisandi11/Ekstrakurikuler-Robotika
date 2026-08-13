import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

let dbInstance: ReturnType<typeof getFirestore> | null = null;
let isQuotaExhausted = false;
let lastQuotaErrorTime = 0;

try {
  let firebaseConfig: any = null;

  // 1. Check environment variable FIREBASE_CONFIG or FIREBASE_APPLET_CONFIG
  const envConfigStr = process.env.FIREBASE_CONFIG || process.env.FIREBASE_APPLET_CONFIG;
  if (envConfigStr) {
    try {
      firebaseConfig = JSON.parse(envConfigStr);
    } catch (e) {
      console.error('Error parsing FIREBASE_CONFIG env var:', e);
    }
  }

  // 2. Check local file firebase-applet-config.json
  if (!firebaseConfig) {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      try {
        firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      } catch (e) {
        console.error('Error reading firebase-applet-config.json:', e);
      }
    }
  }

  // 3. Check individual env variables
  if (!firebaseConfig && (process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID)) {
    firebaseConfig = {
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
      apiKey: process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN,
      firestoreDatabaseId: process.env.FIREBASE_DATABASE_ID || process.env.VITE_FIREBASE_DATABASE_ID || 'ai-studio-sistemekstrakuri-93f064cc-29b0-42f5-a110-dcd07fb8859e',
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID,
    };
  }

  if (firebaseConfig) {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    if (firebaseConfig.firestoreDatabaseId) {
      dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    } else {
      dbInstance = getFirestore(app);
    }
    console.log('🔥 Firebase initialized successfully with project:', firebaseConfig.projectId);
  } else {
    console.warn('⚠️ No Firebase config found!');
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




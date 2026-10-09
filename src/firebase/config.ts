import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  CACHE_SIZE_UNLIMITED,
  doc,
  getDocFromServer,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Configure Firestore with persistent local cache (IndexedDB)
// This ensures that inventory, audit logs, loans, and other data remain accessible
// and viewable even when the connection drops temporarily or goes offline.
let firestoreInstance: Firestore;
try {
  firestoreInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
      cacheSizeBytes: CACHE_SIZE_UNLIMITED,
    }),
  }, firebaseConfig.firestoreDatabaseId);
} catch (err) {
  console.warn('Persistent local cache initialization fallback:', err);
  // Fallback in case of environment limitations
  firestoreInstance = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId);
}

export const db = firestoreInstance;

// Test server connection as mandated by Firebase skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase connection check: client is offline or network restricted.');
    }
  }
}

testConnection();


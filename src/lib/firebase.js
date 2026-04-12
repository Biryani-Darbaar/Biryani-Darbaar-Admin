/**
 * Firebase client SDK — Admin App
 *
 * Admin authentication is handled exclusively via JWT (backend).
 * Firebase is used ONLY for the Firestore client SDK so that the Live Orders
 * page can subscribe to `onSnapshot` listeners for real-time updates.
 *
 * ⚠️  getAuth() is intentionally NOT initialised here.
 *     Adding it causes auth/invalid-api-key because Firebase Auth is not
 *     required (and may not be enabled) for the admin application.
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:        import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:     import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
};

// Guard against double-initialisation in React StrictMode / HMR
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Only Firestore is exported — no Firebase Auth
export const firestore = getFirestore(app);

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDummyKeyForInitialization_LU";
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || "level-up-da90c";
let authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`;
if (authDomain === apiKey || authDomain.startsWith('AIzaSy')) {
  authDomain = `${projectId}.firebaseapp.com`;
}

const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "118663575269",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:118663575269:web:2785c45f542b975f4d460c"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);


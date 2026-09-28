import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAWVaHjWH3WzWnjmbsjh3wZSk3pzfRfLTk",
  authDomain: "klacon-fieldtrack.firebaseapp.com",
  projectId: "klacon-fieldtrack",
  storageBucket: "klacon-fieldtrack.firebasestorage.app",
  messagingSenderId: "295674774901",
  appId: "1:295674774901:web:10299f5ec4ac84afac3f3c",
  measurementId: "G-61XWHCG8Y2"
};

const app = initializeApp(firebaseConfig);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Initialize Firestore with robust offline persistence enabled
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

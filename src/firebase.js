// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDqVW0W-KVkJsGNtIC1husXHzcx2Ui3rGc",
  authDomain: "cxadmin-104cb.firebaseapp.com",
  projectId: "cxadmin-104cb",
  storageBucket: "cxadmin-104cb.firebasestorage.app",
  messagingSenderId: "485637889949",
  appId: "1:485637889949:web:2423dbbd84ff83a6141974",
  measurementId: "G-N7T6KE0J5G" // fine to keep in config
};

const app = initializeApp(firebaseConfig);

// Export these for App.jsx
export const auth = getAuth(app);
export const db = getFirestore(app);

// ⚠️ Do not call getAnalytics() on Vercel builds (can cause window errors)

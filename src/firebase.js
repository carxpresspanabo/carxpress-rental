// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// 👇 your own config (keep it as you pasted earlier)
const firebaseConfig = {
  apiKey: "AIzaSyDqVW0W-KVkJsGNtIC1husXHzcx2Ui3rGc",
  authDomain: "cxadmin-104cb.firebaseapp.com",
  projectId: "cxadmin-104cb",
  storageBucket: "cxadmin-104cb.firebasestorage.app",
  messagingSenderId: "485637889949",
  appId: "1:485637889949:web:2423dbbd84ff83a6141974",
  measurementId: "G-N7T6KE0J5G"
};

const app = initializeApp(firebaseConfig);

// Export only these 2 – Analytics is removed to avoid SSR build errors.
export const db = getFirestore(app);
export const auth = getAuth(app);

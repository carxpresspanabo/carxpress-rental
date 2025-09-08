// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDqVW0W-KVkJsGNtIC1husXHzcx2Ui3rGc",
  authDomain: "cxadmin-104cb.firebaseapp.com",
  projectId: "cxadmin-104cb",
  storageBucket: "cxadmin-104cb.firebasestorage.app",
  messagingSenderId: "485637889949",
  appId: "1:485637889949:web:2423dbbd84ff83a6141974",
  measurementId: "G-N7T6KE0J5G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

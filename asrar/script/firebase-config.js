// firebase-config.js

// Your Firebase project config
const firebaseConfig = {
    apiKey: "AIzaSyAbikhvunQuREB_pPNMG1eeMqkeJ3D7N5k",
    authDomain: "asrar-al-quran-secrets.firebaseapp.com",
    projectId: "asrar-al-quran-secrets",
    storageBucket: "asrar-al-quran-secrets.firebasestorage.app",
    messagingSenderId: "76215431927",
    appId: "1:76215431927:web:b0b20c72a418ee9294d9f2",
    measurementId: "G-1546V5WKH6"
};

// --- Firebase imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getFirestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, orderBy 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { 
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- Export everything you need ---
export {
  db, auth,
  doc, getDoc, setDoc, deleteDoc,
  collection, getDocs, query, orderBy,
  signInWithEmailAndPassword, signOut, onAuthStateChanged
};

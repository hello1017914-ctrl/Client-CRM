import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';
import { getFirestore, enableIndexedDbPersistence } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';

const firebaseConfig = {
  "projectId": "gen-lang-client-0242203159",
  "appId": "1:63592098435:web:8fb5c300b27b25c49409b6",
  "apiKey": "AIzaSyCpM1Q4813Ll0OyJjHATyw_NLRpuMex4Vk",
  "authDomain": "gen-lang-client-0242203159.firebaseapp.com",
  "firestoreDatabaseId": "ai-studio-5167a107-7091-47ad-86c9-ee803aceec0d",
  "storageBucket": "gen-lang-client-0242203159.firebasestorage.app",
  "messagingSenderId": "63592098435"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        console.warn('Persistence failed: Multiple tabs open');
    } else if (err.code == 'unimplemented') {
        console.warn('Persistence failed: Browser no support');
    }
});

export { 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    getDocs, 
    query, 
    where, 
    orderBy, 
    limit, 
    onSnapshot, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    serverTimestamp,
    writeBatch
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';

export { 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged,
    browserPopupRedirectResolver,
    signInAnonymously
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';

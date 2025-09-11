// firebase.js
// Import modul Firebase (v10 modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// Baca konfigurasi dari window.ENV (dibangkitkan oleh env.js). Jika tidak ada, gunakan fallback lama.
const env = (typeof window !== 'undefined' && window.ENV) ? window.ENV : {};
const firebaseConfig = {
  apiKey: env.FIREBASE_API_KEY || "AIzaSyDrXnTenv-nXC8AOgHePOuQZUOXnYUvhlk",
  authDomain: env.FIREBASE_AUTH_DOMAIN || "matkul-1c.firebaseapp.com",
  projectId: env.FIREBASE_PROJECT_ID || "matkul-1c",
  storageBucket: env.FIREBASE_STORAGE_BUCKET || "matkul-1c.appspot.com",
  messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID || "538741250564",
  appId: env.FIREBASE_APP_ID || "1:538741250564:web:c71c03f93b7ba0e607b351"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);

// Inisialisasi Firestore
const db = getFirestore(app);

// Export db supaya bisa dipakai di script.js atau add.html
export { db };

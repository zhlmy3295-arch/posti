import { initializeApp } from "firebase/app";
import { getDatabase, ref, push, onValue, serverTimestamp, query, orderByChild, equalTo, remove, set, update, get } from "firebase/database";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";

// إعدادات Firebase الخاصة بمشروعك
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  projectId: "sat-app2",
  databaseURL: "https://sat-app2-default-rtdb.firebaseio.com",
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);

// تهيئة Realtime Database
const db = getDatabase(app);

// تهيئة Auth
const auth = getAuth(app);

export { db, auth, ref, push, onValue, serverTimestamp, query, orderByChild, equalTo, remove, set, update, get, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut };



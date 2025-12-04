// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

// --- PASTE YOUR REAL CONFIGURATION HERE ---
// It should look like this (but with your numbers):
const firebaseConfig = {
  apiKey: "AIzaSyAuM17cw3dK6R017kesDiQHDQtgXY_GZ_4", 
  authDomain: "lead-sniper-auth.firebaseapp.com",
  projectId: "lead-sniper-auth",
  storageBucket: "lead-sniper-auth.firebasestorage.app", // Fixed typo here (firebasestorage.app)
  messagingSenderId: "167412952560",
  appId: "1:167412952560:web:3c60c4f0c9742476860135"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider, signInWithPopup, signOut };
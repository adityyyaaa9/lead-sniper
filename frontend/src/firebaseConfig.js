// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

// Your web app's Firebase configuration
// REPLACE THESE VALUES WITH THE ONES FROM YOUR FIREBASE CONSOLE
const firebaseConfig = {
  apiKey: "AIzaSyD...", 
  authDomain: "lead-sniper-auth.firebaseapp.com",
  projectId: "lead-sniper-auth",
  storageBucket: "lead-sniper-auth.appspot.com",
  messagingSenderId: "12345...",
  appId: "1:12345..."
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider, signInWithPopup, signOut };
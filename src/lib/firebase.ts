// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDRMvqnn6RFF83-5BvQR9x1G_u2nCoXJr0",
  authDomain: "happy-d3214.firebaseapp.com",
  projectId: "happy-d3214",
  storageBucket: "happy-d3214.appspot.com",
  messagingSenderId: "390711322269",
  appId: "1:390711322269:web:d9ecb57d8dee656f685674",
  measurementId: "G-7GCR6Y010B"
};

// Initialize Firebase
console.log("Initializing Firebase with config:", firebaseConfig);
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Log authentication settings
console.log("Firebase Auth initialized:", {
  currentUser: auth.currentUser,
  tenantId: auth.tenantId,
  config: auth.config
});

export const db = getFirestore(app);
export const storage = getStorage(app);
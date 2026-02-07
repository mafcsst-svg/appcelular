import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCnQCTjQWU-3bs4x1P0nM8N_0WHd1iM6oE",
  authDomain: "gen-lang-client-0901917179.firebaseapp.com",
  projectId: "gen-lang-client-0901917179",
  storageBucket: "gen-lang-client-0901917179.firebasestorage.app",
  messagingSenderId: "685332763707",
  appId: "1:685332763707:web:8b8d6b91c4b35be177f81e",
  measurementId: "G-CP10J2HXVB"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Pega direto do Vite, que é o que a Vercel usa
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Verifica se a configuração mínima existe antes de inicializar
const isConfigValid = firebaseConfig.apiKey && firebaseConfig.projectId;

let app;
let db;
let auth;

if (isConfigValid) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
  } catch (error) {
    console.error("Erro ao inicializar Firebase:", error);
  }
} else {
  console.warn("Configuração do Firebase ausente ou incompleta. Verifique as variáveis de ambiente.");
  // Mock para evitar crash se as variáveis não estiverem definidas, permitindo que a UI carregue (embora sem backend)
  const mockAuth = { 
    currentUser: null, 
    onAuthStateChanged: (cb: any) => { cb(null); return () => {}; },
    signOut: () => Promise.resolve(),
    signInWithEmailAndPassword: () => Promise.reject(new Error("Firebase não configurado")),
    createUserWithEmailAndPassword: () => Promise.reject(new Error("Firebase não configurado"))
  } as any;
  
  app = {} as any;
  db = {} as any;
  auth = mockAuth;
}

export { db, auth };

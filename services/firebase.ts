import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Função para obter variáveis de ambiente de forma segura em diferentes ambientes
const getEnvVar = (key: string): string => {
  // Tenta obter do import.meta.env (Vite)
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {
    // Ignora erros de acesso ao import.meta
  }

  // Tenta obter do process.env (Node/CRA/Polyfill)
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {
    // Ignora erros de acesso ao process
  }

  return '';
};

const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY'),
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVar('VITE_FIREBASE_APP_ID')
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


import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, onSnapshot, initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCnQCTjQWU-3bs4x1P0nM8N_0WHd1iM6oE",
  authDomain: "gen-lang-client-0901917179.firebaseapp.com",
  projectId: "gen-lang-client-0901917179",
  storageBucket: "gen-lang-client-0901917179.firebasestorage.app",
  messagingSenderId: "685332763707",
  appId: "1:685332763707:web:8b8d6b91c4b35be177f81e",
  measurementId: "G-CP10J2HXVB"
};

// Singleton initialization pattern
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize services immediately using the valid app instance
// Using initializeFirestore with experimentalForceLongPolling to prevent connection timeouts
// common in certain network environments or sandboxes.
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

// Helper to sanitize data (remove undefineds which Firestore dislikes)
const sanitizeData = (data: any): any => {
  if (data === undefined) return null;
  if (data === null) return null;
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  } 
  
  if (typeof data === 'object') {
    // Handle Date objects if any (though usually we use ISO strings)
    if (data instanceof Date) return data.toISOString();
    
    const newObj: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const val = data[key];
        if (val === undefined) {
          newObj[key] = null;
        } else {
          newObj[key] = sanitizeData(val);
        }
      }
    }
    return newObj;
  }
  
  return data;
};

export const saveToFirebase = async (collectionName: string, data: any[]) => {
  try {
    if (!db) throw new Error("Firestore not initialized");
    
    const sanitizedData = sanitizeData(data);
    
    await setDoc(doc(db, "padaria_db", collectionName), { 
      items: sanitizedData,
      lastUpdated: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error(`Erro ao salvar ${collectionName} no Firebase:`, error);
  }
};

export const loadFromFirebase = async (collectionName: string) => {
  try {
    if (!db) throw new Error("Firestore not initialized");
    const docRef = doc(db, "padaria_db", collectionName);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().items;
    }
    return null;
  } catch (error) {
    console.error(`Erro ao carregar ${collectionName} do Firebase:`, error);
    return null;
  }
};

// Nova função para escutar mudanças em tempo real
export const subscribeToFirebase = (collectionName: string, onUpdate: (data: any[]) => void) => {
  if (!db) return () => {};
  
  const docRef = doc(db, "padaria_db", collectionName);
  
  // Retorna a função de unsubscribe
  return onSnapshot(docRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      if (data && data.items) {
        onUpdate(data.items);
      }
    } else {
      // Se o documento não existe ainda, retorna array vazio
      onUpdate([]);
    }
  }, (error) => {
    console.error(`Erro no listener de ${collectionName}:`, error);
  });
};

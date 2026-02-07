import { initializeApp, getApps } from "firebase/app";
import * as firestore from "firebase/firestore";

// 🔹 config
const firebaseConfig = {
  apiKey: "AIzaSyCnQCTjQWU-3bs4x1P0nM8N_0WHd1iM6oE",
  authDomain: "gen-lang-client-0901917179.firebaseapp.com",
  projectId: "gen-lang-client-0901917179",
  storageBucket: "gen-lang-client-0901917179.firebasestorage.app",
  messagingSenderId: "685332763707",
  appId: "1:685332763707:web:8b8d6b91c4b35be177f81e"
};

// init
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// 🔥 REGISTRA explicitamente
const db = firestore.getFirestore(app);

export { db };

// ----------------------------

function sanitize(data: any): any {
  if (data == null) return null;

  if (Array.isArray(data)) return data.map(sanitize);

  if (typeof data === "object") {
    const o: any = {};
    for (const k in data) o[k] = sanitize(data[k]);
    return o;
  }

  return data;
}

// ----------------------------

export async function saveToFirebase(name: string, data: any) {
  const clean = sanitize(data);

  await firestore.setDoc(
    firestore.doc(db, "padaria_db", name),
    { items: clean, updated: new Date().toISOString() },
    { merge: true }
  );
}

// ----------------------------

export function subscribeToFirebase(
  name: string,
  cb: (data: any) => void
) {
  const ref = firestore.doc(db, "padaria_db", name);

  return firestore.onSnapshot(ref, snap => {
    cb(snap.exists() ? snap.data().items ?? [] : []);
  });
}

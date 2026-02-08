// 1. Uncomment the import
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyALw3abSubpKKJGmPql0PJdQc61UaCa654",
  authDomain: "hortal-delivery.firebaseapp.com",
  projectId: "hortal-delivery",
  storageBucket: "hortal-delivery.appspot.com",
  messagingSenderId: "560015064869",
  appId: "1:560015064869:web:d39ac269d33c2e8119a4cc"
};

// 2. Uncomment this line and REMOVE the "export const app = null;"
export const app = initializeApp(firebaseConfig);

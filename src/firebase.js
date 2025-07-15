// src/firebase.js

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// --- SİZİN KOPYALADIĞINIZ KODU BURAYA YAPIŞDIRIN ---
// Yuxarıdakı təlimatın 4.4-cü addımında kopyaladığınız
// firebaseConfig kodunu aşağıdakının yerinə yapışdırın.
const firebaseConfig = {
  apiKey: "AIzaSyDRVxL7bxkPRHR9z6QOARsYHClcot7_NCY",
  authDomain: "mutda-monitorinq-sistemi.firebaseapp.com",
  projectId: "mutda-monitorinq-sistemi",
  storageBucket: "mutda-monitorinq-sistemi.firebasestorage.app",
  messagingSenderId: "584760209094",
  appId: "1:584760209094:web:7a073cda6a6608e744f1c7"
};
// ----------------------------------------------------


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

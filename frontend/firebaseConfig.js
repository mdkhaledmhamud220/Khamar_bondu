import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAJ4zUdozxa-YuP1aQM1_WgcIs0eA9BKx8",
  authDomain: "khamar-bondu.firebaseapp.com",
  projectId: "khamar-bondu",
  storageBucket: "khamar-bondu.firebasestorage.app",
  messagingSenderId: "825192118498",
  appId: "1:825192118498:web:29009ae811a0b4165b86bb",
  measurementId: "G-PKL3FBFVFZ",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// ২. auth এবং db ইনিশিয়ালাইজ এবং এক্সপোর্ট করুন
export const auth = getAuth(app);
export const db = getFirestore(app);
// Realtime Database lives in asia-southeast1 for this project; provide full URL
export const rtdb = getDatabase(app, 'https://khamar-bondu-default-rtdb.asia-southeast1.firebasedatabase.app');

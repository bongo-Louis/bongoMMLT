import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBl7YHyFFQ8C6Z9GsD_TxuKn_0FvB_LV7E",
  authDomain: "bongolarpmaimaitracker.firebaseapp.com",
  databaseURL: "https://bongolarpmaimaitracker-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "bongolarpmaimaitracker",
  storageBucket: "bongolarpmaimaitracker.firebasestorage.app",
  messagingSenderId: "273880050104",
  appId: "1:273880050104:web:0fdcd4aaf44e9286da074d",
  measurementId: "G-92WGNF1MP9",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

isSupported().then((supported) => {
  if (supported) getAnalytics(app);
}).catch((error) => console.warn("Firebase Analytics is unavailable:", error));

export { auth, database };

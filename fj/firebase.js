// firebase.js — Shared Firebase Firestore initializer
// Uses Firebase v10 compat CDN (loaded via HTML <script> tags)

const firebaseConfig = {
  apiKey: "AIzaSyB5mWpHGXpZ1V1IXC4l3PPKaGeoAPHcKhs",
  authDomain: "fayra-jewelette.firebaseapp.com",
  projectId: "fayra-jewelette",
  storageBucket: "fayra-jewelette.firebasestorage.app",
  messagingSenderId: "972948254105",
  appId: "1:972948254105:web:a7a0a2aca5395c76b6f708",
  measurementId: "G-JEHB4FE9C8"
};

// Initialize Firebase (guard against double-init)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Expose Firestore globally for all pages
const db = firebase.firestore();

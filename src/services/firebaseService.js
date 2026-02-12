const firebase = require("firebase/compat/app");
require("firebase/compat/firestore");

function pickEnv(key, fallback) {
  const value = process.env[key];
  if (value === undefined || value === null || String(value).trim() === "") {
    return fallback;
  }

  return value;
}

function getFirebaseConfig() {
  return {
    apiKey: pickEnv("FIREBASE_API_KEY", "AIzaSyDrkGREhmSgQq-Ifey3shhVeMZ2ewYxiAY"),
    authDomain: pickEnv("FIREBASE_AUTH_DOMAIN", "casir-mian.firebaseapp.com"),
    projectId: pickEnv("FIREBASE_PROJECT_ID", "casir-mian"),
    storageBucket: pickEnv("FIREBASE_STORAGE_BUCKET", "casir-mian.firebasestorage.app"),
    messagingSenderId: pickEnv("FIREBASE_MESSAGING_SENDER_ID", "1033788963934"),
    appId: pickEnv("FIREBASE_APP_ID", "1:1033788963934:web:09dea7b44674fe8ca588cf"),
    measurementId: pickEnv("FIREBASE_MEASUREMENT_ID", "G-Z3TEZ5J4FB")
  };
}

function initializeAppIfNeeded() {
  if (firebase.apps.length > 0) {
    return firebase.app();
  }

  const config = getFirebaseConfig();
  return firebase.initializeApp(config);
}

function getDb() {
  initializeAppIfNeeded();
  return firebase.firestore();
}

function getAdmin() {
  initializeAppIfNeeded();
  return firebase;
}

module.exports = {
  getDb,
  getAdmin
};

import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { firebaseConfig } from '../config/firebase-config.js';
import { createAuthService } from './AuthService.js';

export function initializeAuthentication() {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return createAuthService(getAuth(app), { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut });
}

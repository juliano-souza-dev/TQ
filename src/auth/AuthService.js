// Firebase Auth adapter. No credentials or mock sessions.
export function createAuthService(auth, { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut }) {
  if (!auth || !GoogleAuthProvider || !signInWithPopup || !onAuthStateChanged || !signOut) {
    throw new TypeError('Firebase Authentication dependencies required');
  }
  return {
    subscribe(callback) { return onAuthStateChanged(auth, callback); },
    signIn() { return signInWithPopup(auth, new GoogleAuthProvider()); },
    signOut() { return signOut(auth); },
  };
}

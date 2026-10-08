import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthService } from '../src/auth/AuthService.js';

test('auth adapter delegates sign-in, subscription and logout', async () => {
  const auth = {};
  const calls = [];
  class Provider {}
  const service = createAuthService(auth, {
    GoogleAuthProvider: Provider,
    signInWithPopup: async (a, p) => { calls.push(['login', a, p instanceof Provider]); },
    onAuthStateChanged: (a, cb) => { calls.push(['subscribe', a, typeof cb]); return () => {}; },
    signOut: async a => { calls.push(['logout', a]); },
  });
  service.subscribe(() => {});
  await service.signIn();
  await service.signOut();
  assert.deepEqual(calls, [['subscribe', auth, 'function'], ['login', auth, true], ['logout', auth]]);
});

test('auth service refuses missing dependencies', () => {
  assert.throws(() => createAuthService(null, {}), TypeError);
});

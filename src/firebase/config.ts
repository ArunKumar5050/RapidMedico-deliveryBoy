declare const process: any;

import { initializeApp, getApps, getApp } from 'firebase/app';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
// @ts-ignore
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: "AIzaSyDoqbjpy3pFiuvMCBhxffJH27bHBNaKTTA",
  authDomain: "rapidmedi.firebaseapp.com",
  projectId: "rapidmedi",
  storageBucket: "rapidmedi.firebasestorage.app",
  messagingSenderId: "553213794552",
  appId: "1:553213794552:web:db1bdac54f2a80d791430d",
  measurementId: "G-71EYHYR629"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let _authInstance: any = null;

export const getFirebaseAuth = () => {
  if (!_authInstance) {
    try {
      _authInstance = initializeAuth(app, {
        persistence: getReactNativePersistence(ReactNativeAsyncStorage),
      });
    } catch (e: any) {
      if (e?.code === 'auth/already-initialized') {
        _authInstance = getAuth(app);
      } else {
        console.warn('Error initializing firebase auth with persistence:', e);
        _authInstance = getAuth(app);
      }
    }
  }
  return _authInstance;
};

// Safe proxy export for backward compatibility that does not crash on module load
export const auth: any = new Proxy({}, {
  get(_target, prop) {
    const inst = getFirebaseAuth();
    const val = inst ? (inst as any)[prop] : undefined;
    return typeof val === 'function' ? val.bind(inst) : val;
  }
});

export const db = initializeFirestore(app, { experimentalForceLongPolling: true });
export const functions = getFunctions(app, 'asia-south1');
export const storage = getStorage(app);

export default app;

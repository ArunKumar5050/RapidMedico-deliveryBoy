declare const process: any;

import { initializeApp, getApps, getApp } from 'firebase/app';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: "AIzaSyDoqbjpy3pFiuvMCBhxffJH27bHBNaKTTA",
  authDomain: "rapidmedico.firebaseapp.com",
  projectId: "rapidmedico",
  storageBucket: "rapidmedico.firebasestorage.app",
  messagingSenderId: "553213794552",
  appId: "1:553213794552:web:db1bdac54f2a80d791430d",
  measurementId: "G-71EYHYR629"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let _authInstance: any = null;

export const getFirebaseAuth = () => {
  if (!_authInstance) {
    try {
      // @ts-ignore
      const { initializeAuth, getReactNativePersistence } = require('firebase/auth');
      _authInstance = initializeAuth(app, {
        persistence: getReactNativePersistence(ReactNativeAsyncStorage),
      });
    } catch (_) {
      try {
        // @ts-ignore
        const { getAuth } = require('firebase/auth');
        _authInstance = getAuth(app);
      } catch (err) {
        _authInstance = { currentUser: null };
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

export const db = getFirestore(app);
export const functions = getFunctions(app, 'asia-south1');
export const storage = getStorage(app);

export default app;

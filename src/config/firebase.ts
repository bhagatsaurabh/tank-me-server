import firebase from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';

const app = initializeApp({
  credential: firebase.credential.cert(
    JSON.parse(Buffer.from(process.env.FIREBASE_ADMIN_KEY_BASE64, 'base64').toString())
  )
});

export const auth = getAuth(app);
export const firestore = getFirestore(app);

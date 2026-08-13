import * as firebase from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';

const emuEnabled =
  typeof process.env.FIREBASE_EMULATION !== 'undefined' &&
  JSON.parse(process.env.FIREBASE_EMULATION) === true;

const app = initializeApp(
  !emuEnabled
    ? {
        credential: firebase.cert(
          JSON.parse(Buffer.from(process.env.FIREBASE_ADMIN_KEY_BASE64!, 'base64').toString())
        )
      }
    : { projectId: 'demo-project' }
);

console.log('Project Id', app.options.projectId);

export const auth = getAuth(app);
export const firestore = getFirestore(app);

import firebase from "firebase-admin";
import { getAuth } from "firebase-admin/auth";
import { initializeApp } from "firebase-admin/app";

if (process.env.PROFILE === "Dev") {
  process.env["FIREBASE_AUTH_EMULATOR_HOST"] = "127.0.0.1:9099";
}

const app = initializeApp({
  credential: firebase.credential.cert(
    JSON.parse(
      Buffer.from(process.env.FIREBASE_ADMIN_KEY_BASE64, "base64").toString()
    )
  ),
});

export const auth = getAuth(app);

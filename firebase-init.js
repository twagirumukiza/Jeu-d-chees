import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

const firebaseConfig = {
 apiKey:"AIzaSyBG6oid29bMq8GVvBkNvPtSDZTRO5K09uk",
 authDomain:"focus-game-1c7ee.firebaseapp.com",
 databaseURL:"https://focus-game-1c7ee-default-rtdb.europe-west1.firebasedatabase.app",
 projectId:"focus-game-1c7ee",
 storageBucket:"focus-game-1c7ee.firebasestorage.app",
 messagingSenderId:"856695121197",
 appId:"1:856695121197:web:34599f1ace92ac56499fa4"
};
export const app=initializeApp(firebaseConfig);
export const auth=getAuth(app);
export const db=getDatabase(app);
export async function ensureAuth(){ if(!auth.currentUser) await signInAnonymously(auth); return auth.currentUser; }

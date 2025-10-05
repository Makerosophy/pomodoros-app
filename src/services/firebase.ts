import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
});

export const auth = getAuth(app);
export const db = getFirestore(app);

const provider = new GoogleAuthProvider();
export const signInWithGoogle = () => signInWithPopup(auth, provider);
export const onAuth = (cb: (user: User | null) => void) => onAuthStateChanged(auth, cb);
export const logout = () => signOut(auth);

export type CloudSession = {
  user_id: string;
  date_key: string; // YYYY-MM-DD
  profile: string;
  active: number;
  break: number;
  short: number;
  long: number;
  pomodoros: number;
  started_at: number; // epoch ms
  ended_at: number;   // epoch ms
  mode: 'workday' | 'cycles';
};

export const saveSession = async (s: CloudSession) => {
  await addDoc(collection(db, 'sessions'), s);
};

export const fetchLastSessions = async (userId: string, days = 30) => {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceKey = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, '0')}-${String(since.getDate()).padStart(2, '0')}`;
  const q = query(
    collection(db, 'sessions'),
    where('user_id', '==', userId),
    where('date_key', '>=', sinceKey),
    orderBy('date_key', 'desc'),
    limit(500)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as (CloudSession & { id: string })[];
};

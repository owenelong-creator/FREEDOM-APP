import { useEffect, useRef } from "react";
import {
  db,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
} from "./firebase";
import { useAuth } from "./auth-context";

type UserDoc = {
  startDate: string | null;
  urgeSessions: unknown[];
  journalEntries: unknown[];
  fortressItems: string[];
  appName: string;
  myPosts: unknown[];
  reactions: Record<string, Record<string, number>>;
  theme: "light" | "dark";
  updatedAt: number;
};

type Loaded = {
  startDate: string | null;
  urgeSessions: unknown[];
  journalEntries: unknown[];
  fortressItems: string[];
  appName?: string;
  theme?: "light" | "dark";
};

/**
 * Two-way sync of FreedomContext data with Firestore for the signed-in user.
 * - localStorage is always the source of truth on the device (offline support).
 * - When signed in: pulls remote on first load (merges by latest updatedAt),
 *   then pushes any local change to Firestore.
 */
export function useFirestoreSync(args: {
  startDate: string | null;
  urgeSessions: unknown[];
  journalEntries: unknown[];
  fortressItems: string[];
  appName: string;
  myPosts: unknown[];
  reactions: Record<string, Record<string, number>>;
  theme: "light" | "dark";
  onRemoteLoad: (data: Loaded) => void;
}) {
  const { user } = useAuth();
  const ready = useRef(false);
  const lastSerialized = useRef<string>("");

  // On user change: load remote once, then mark ready.
  useEffect(() => {
    ready.current = false;
    if (!db || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const ref = doc(db!, "users", user.uid);
        const snap = await getDoc(ref);
        if (!cancelled && snap.exists()) {
          const data = snap.data() as UserDoc;
          args.onRemoteLoad({
            startDate: data.startDate ?? null,
            urgeSessions: data.urgeSessions ?? [],
            journalEntries: data.journalEntries ?? [],
            fortressItems: data.fortressItems ?? [],
            appName: data.appName,
            theme: data.theme,
          });
        }
      } catch (e) {
        console.warn("[freedom] firestore load failed; using local data", e);
      } finally {
        if (!cancelled) ready.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  // Subscribe to remote changes from other devices.
  useEffect(() => {
    if (!db || !user) return;
    const ref = doc(db, "users", user.uid);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists() || !ready.current) return;
      const data = snap.data() as UserDoc;
      args.onRemoteLoad({
        startDate: data.startDate ?? null,
        urgeSessions: data.urgeSessions ?? [],
        journalEntries: data.journalEntries ?? [],
        fortressItems: data.fortressItems ?? [],
        appName: data.appName,
        theme: data.theme,
      });
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  // Push local state to Firestore whenever it changes (after first load).
  useEffect(() => {
    if (!db || !user || !ready.current) return;
    const payload: UserDoc = {
      startDate: args.startDate,
      urgeSessions: args.urgeSessions,
      journalEntries: args.journalEntries,
      fortressItems: args.fortressItems,
      appName: args.appName,
      myPosts: args.myPosts,
      reactions: args.reactions,
      theme: args.theme,
      updatedAt: Date.now(),
    };
    const serialized = JSON.stringify(payload);
    if (serialized === lastSerialized.current) return;
    lastSerialized.current = serialized;

    const ref = doc(db, "users", user.uid);
    setDoc(ref, payload, { merge: true }).catch((e) => {
      console.warn("[freedom] firestore write failed (will retry on next change)", e);
    });
  }, [
    user,
    args.startDate,
    args.urgeSessions,
    args.journalEntries,
    args.fortressItems,
    args.appName,
    args.myPosts,
    args.reactions,
    args.theme,
  ]);
}

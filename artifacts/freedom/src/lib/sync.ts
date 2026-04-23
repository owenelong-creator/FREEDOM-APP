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
 *
 * Loop-prevention rules (critical — getting these wrong causes flicker):
 *   1. The push effect dedupes on a serialized payload that EXCLUDES `updatedAt`,
 *      otherwise Date.now() makes every payload "new" and we write forever.
 *   2. We ignore snapshots that come from our own pending writes
 *      (snap.metadata.hasPendingWrites), so the cached echo of a local change
 *      can never overwrite the value the user just set.
 *   3. After applying a remote snapshot we record its serialized form as
 *      `lastSerialized`, so the push effect that fires from the resulting state
 *      change recognises "this came from the server, don't echo it back".
 */
export function useFirestoreSync(args: {
  startDate: string | null;
  urgeSessions: unknown[];
  journalEntries: unknown[];
  fortressItems: string[];
  appName: string;
  theme: "light" | "dark";
  onRemoteLoad: (data: Loaded) => void;
}) {
  const { user } = useAuth();
  const ready = useRef(false);
  const lastSerialized = useRef<string>("");
  // Always-fresh ref to onRemoteLoad so the snapshot subscription doesn't
  // capture a stale closure.
  const onRemoteLoadRef = useRef(args.onRemoteLoad);
  onRemoteLoadRef.current = args.onRemoteLoad;

  const serializeForCompare = (
    data: Pick<
      UserDoc,
      "startDate" | "urgeSessions" | "journalEntries" | "fortressItems" | "appName" | "theme"
    >
  ) =>
    JSON.stringify({
      startDate: data.startDate,
      urgeSessions: data.urgeSessions,
      journalEntries: data.journalEntries,
      fortressItems: data.fortressItems,
      appName: data.appName,
      theme: data.theme,
    });

  const applyRemote = (data: UserDoc) => {
    const loaded: Loaded = {
      startDate: data.startDate ?? null,
      urgeSessions: data.urgeSessions ?? [],
      journalEntries: data.journalEntries ?? [],
      fortressItems: data.fortressItems ?? [],
      appName: data.appName,
      theme: data.theme,
    };
    // Stamp lastSerialized BEFORE pushing into React state, so the push
    // effect that runs from the resulting state change sees a match and skips.
    lastSerialized.current = serializeForCompare({
      startDate: loaded.startDate,
      urgeSessions: loaded.urgeSessions,
      journalEntries: loaded.journalEntries,
      fortressItems: loaded.fortressItems,
      appName: loaded.appName ?? args.appName,
      theme: loaded.theme ?? args.theme,
    });
    onRemoteLoadRef.current(loaded);
  };

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
          applyRemote(snap.data() as UserDoc);
        } else if (!cancelled) {
          // Seed lastSerialized with current local state so we don't immediately
          // re-push it (the push effect will only fire if local data changes).
          lastSerialized.current = serializeForCompare({
            startDate: args.startDate,
            urgeSessions: args.urgeSessions,
            journalEntries: args.journalEntries,
            fortressItems: args.fortressItems,
            appName: args.appName,
            theme: args.theme,
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
      // Ignore the cached echo of our own in-flight write — that's the source
      // of the dark/light flicker.
      if (snap.metadata.hasPendingWrites) return;
      if (!snap.exists() || !ready.current) return;
      const data = snap.data() as UserDoc;
      const serverSerialized = serializeForCompare(data);
      if (serverSerialized === lastSerialized.current) return; // already in sync
      applyRemote(data);
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  // Push local state to Firestore whenever it changes (after first load).
  useEffect(() => {
    if (!db || !user || !ready.current) return;
    const compareKey = serializeForCompare({
      startDate: args.startDate,
      urgeSessions: args.urgeSessions,
      journalEntries: args.journalEntries,
      fortressItems: args.fortressItems,
      appName: args.appName,
      theme: args.theme,
    });
    if (compareKey === lastSerialized.current) return;
    lastSerialized.current = compareKey;

    const payload: UserDoc = {
      startDate: args.startDate,
      urgeSessions: args.urgeSessions,
      journalEntries: args.journalEntries,
      fortressItems: args.fortressItems,
      appName: args.appName,
      theme: args.theme,
      updatedAt: Date.now(),
    };
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
    args.theme,
  ]);
}

import { useCallback, useEffect, useState } from "react";
import {
  db,
  collection,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
} from "./firebase";
import { useAuth } from "./auth-context";

export type AppealRecord = {
  id: string;
  uid: string;
  email: string | null;
  message: string;
  status: string;
  createdAt: string | null;
};

/**
 * Submit a "second chance" appeal for the signed-in banned user. Writes a new
 * document to the top-level `appeals` collection (so admins can browse all
 * appeals later) and stamps `appealAt` / `appealMessage` on the user's
 * `bans/{uid}` doc so the UI can hide the appeal button after submission.
 */
export function useSubmitAppeal() {
  const { user } = useAuth();
  return useCallback(
    async (message: string) => {
      if (!db) throw new Error("Appeals are unavailable offline.");
      if (!user) throw new Error("Sign in to appeal.");
      const trimmed = message.trim().slice(0, 1000);
      if (!trimmed) throw new Error("Please write a short message.");
      await addDoc(collection(db, "appeals"), {
        uid: user.uid,
        email: user.email || null,
        message: trimmed,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "bans", user.uid), {
        appealAt: serverTimestamp(),
        appealMessage: trimmed,
      });
    },
    [user]
  );
}

/**
 * Subscribe to ALL appeals (admin view). Returns the latest appeal per user as
 * a Map keyed by uid (most recent wins).
 */
export function useAllAppeals() {
  const [latestByUid, setLatestByUid] = useState<Map<string, AppealRecord>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    const q = query(collection(db, "appeals"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const next = new Map<string, AppealRecord>();
        snap.forEach((d) => {
          const data = d.data() as Record<string, unknown>;
          const created = data.createdAt as { toMillis?: () => number } | undefined;
          const uid = (data.uid as string) || "";
          if (!uid || next.has(uid)) return;
          next.set(uid, {
            id: d.id,
            uid,
            email: (data.email as string) || null,
            message: (data.message as string) || "",
            status: (data.status as string) || "pending",
            createdAt: created?.toMillis
              ? new Date(created.toMillis()).toISOString()
              : null,
          });
        });
        setLatestByUid(next);
        setLoading(false);
      },
      (err) => {
        console.warn("[freedom] appeals subscription failed", err);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  return { latestByUid, loading };
}

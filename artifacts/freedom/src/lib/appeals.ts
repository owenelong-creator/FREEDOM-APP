import { useCallback } from "react";
import {
  db,
  collection,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from "./firebase";
import { useAuth } from "./auth-context";

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

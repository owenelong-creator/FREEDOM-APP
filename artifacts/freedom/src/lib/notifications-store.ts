import { useEffect, useState, useCallback } from "react";
import {
  db,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
} from "./firebase";
import { useAuth } from "./auth-context";
import type { WarningKind } from "./community-store";

export type WarningNotification = {
  id: string;
  kind: WarningKind;
  message: string;
  targetMessage: string | null;
  createdAt: string;
};

/**
 * Subscribe to the signed-in user's unseen moderation notifications.
 * Used by the app shell to show a small modal next time the user opens the app.
 */
export function useUnseenWarnings() {
  const { user } = useAuth();
  const [items, setItems] = useState<WarningNotification[]>([]);

  useEffect(() => {
    if (!db || !user) {
      setItems([]);
      return;
    }
    const q = query(
      collection(db, "users", user.uid, "notifications"),
      where("seen", "==", false),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: WarningNotification[] = snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          const createdAt = data.createdAt as { toMillis?: () => number } | undefined;
          return {
            id: d.id,
            kind: (data.kind as WarningKind) || "warning",
            message: (data.message as string) || "",
            targetMessage: (data.targetMessage as string) || null,
            createdAt: createdAt?.toMillis
              ? new Date(createdAt.toMillis()).toISOString()
              : new Date().toISOString(),
          };
        });
        setItems(list);
      },
      (err) => {
        console.warn("[freedom] notifications subscription failed", err);
      }
    );
    return unsub;
  }, [user?.uid]);

  const markSeen = useCallback(
    async (id: string) => {
      if (!db || !user) return;
      try {
        await updateDoc(doc(db, "users", user.uid, "notifications", id), {
          seen: true,
          seenAt: new Date().toISOString(),
        });
      } catch (e) {
        console.warn("[freedom] failed to mark notification seen", e);
      }
    },
    [user?.uid]
  );

  return { items, markSeen };
}

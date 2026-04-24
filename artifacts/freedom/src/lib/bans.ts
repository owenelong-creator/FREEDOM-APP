import { useEffect, useState, useCallback } from "react";
import {
  db,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from "./firebase";
import { useAuth } from "./auth-context";

export type BanKind = "ban" | "suspension";

export type BanRecord = {
  uid: string;
  kind: BanKind;
  /** ISO timestamp when the suspension lifts. null = permanent (ban). */
  until: string | null;
  reason: string | null;
  createdAt: string | null;
  byUid: string | null;
  /** Snapshot of the username at the time of action, for admin readability. */
  username: string | null;
};

const BANS_COLLECTION = "bans";

function parseBan(uid: string, raw: Record<string, unknown> | null): BanRecord | null {
  if (!raw) return null;
  const untilField = raw.until as { toMillis?: () => number } | string | null | undefined;
  let untilIso: string | null = null;
  if (untilField && typeof untilField === "object" && typeof untilField.toMillis === "function") {
    untilIso = new Date(untilField.toMillis()).toISOString();
  } else if (typeof untilField === "string") {
    untilIso = untilField;
  }
  const createdField = raw.createdAt as { toMillis?: () => number } | undefined;
  return {
    uid,
    kind: (raw.kind as BanKind) || "ban",
    until: untilIso,
    reason: (raw.reason as string) || null,
    createdAt: createdField?.toMillis
      ? new Date(createdField.toMillis()).toISOString()
      : null,
    byUid: (raw.byUid as string) || null,
    username: (raw.username as string) || null,
  };
}

/** True if a ban record blocks community write actions right now. */
export function isBanActive(ban: BanRecord | null): boolean {
  if (!ban) return false;
  if (ban.kind === "ban") return true;
  if (!ban.until) return false;
  return new Date(ban.until).getTime() > Date.now();
}

/**
 * Subscribe to the signed-in user's ban/suspension record (if any). The UI
 * uses this to gate the post composer, comment box, and Report option.
 */
export function useMyBanState() {
  const { user } = useAuth();
  const [ban, setBan] = useState<BanRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(!!user);

  useEffect(() => {
    if (!db || !user) {
      setBan(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ref = doc(db, BANS_COLLECTION, user.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setBan(snap.exists() ? parseBan(user.uid, snap.data() as Record<string, unknown>) : null);
        setLoading(false);
      },
      (err) => {
        console.warn("[freedom] ban state subscription failed", err);
        setLoading(false);
      }
    );
    return unsub;
  }, [user?.uid]);

  return { ban, loading, blocked: isBanActive(ban) };
}

/**
 * Server-side ban check used by write hooks (post / comment / report) to
 * refuse the action even if the UI is bypassed.
 */
export async function assertNotBanned(uid: string): Promise<void> {
  if (!db) return;
  try {
    const snap = await getDoc(doc(db, BANS_COLLECTION, uid));
    if (!snap.exists()) return;
    const ban = parseBan(uid, snap.data() as Record<string, unknown>);
    if (!isBanActive(ban)) return;
    if (ban?.kind === "ban") {
      throw new Error("Your account is banned from the community.");
    }
    const until = ban?.until ? new Date(ban.until).toLocaleString() : "later";
    throw new Error(`You're suspended from the community until ${until}.`);
  } catch (e) {
    // Re-throw our own ban errors; swallow network/permission errors so the
    // app stays usable when the bans collection is unreachable.
    const err = e as { message?: string };
    if (err.message?.startsWith("Your account is banned") || err.message?.startsWith("You're suspended")) {
      throw e;
    }
    console.warn("[freedom] ban check failed (allowing action)", e);
  }
}

/** Ban a user permanently. */
export function useBanUser() {
  const { user } = useAuth();
  return useCallback(
    async (input: { uid: string; username?: string | null; reason?: string }) => {
      if (!db) throw new Error("Bans unavailable offline.");
      if (!user) throw new Error("Sign in required.");
      await setDoc(doc(db, BANS_COLLECTION, input.uid), {
        kind: "ban" as BanKind,
        until: null,
        reason: input.reason?.trim() || null,
        username: input.username || null,
        byUid: user.uid,
        createdAt: serverTimestamp(),
      });
    },
    [user]
  );
}

/** Suspend a user for a number of days. */
export function useSuspendUser() {
  const { user } = useAuth();
  return useCallback(
    async (input: { uid: string; days: number; username?: string | null; reason?: string }) => {
      if (!db) throw new Error("Bans unavailable offline.");
      if (!user) throw new Error("Sign in required.");
      const days = Math.max(1, Math.floor(input.days));
      const until = new Date(Date.now() + days * 86_400_000).toISOString();
      await setDoc(doc(db, BANS_COLLECTION, input.uid), {
        kind: "suspension" as BanKind,
        until,
        reason: input.reason?.trim() || null,
        username: input.username || null,
        byUid: user.uid,
        createdAt: serverTimestamp(),
      });
    },
    [user]
  );
}

/** Lift any ban/suspension on a user. */
export function useLiftBan() {
  return useCallback(async (uid: string) => {
    if (!db) return;
    await deleteDoc(doc(db, BANS_COLLECTION, uid));
  }, []);
}

export function describeBan(ban: BanRecord): string {
  if (ban.kind === "ban") return "Permanently banned from the community";
  if (!ban.until) return "Suspended from the community";
  const untilDate = new Date(ban.until);
  return `Suspended from the community until ${untilDate.toLocaleString()}`;
}

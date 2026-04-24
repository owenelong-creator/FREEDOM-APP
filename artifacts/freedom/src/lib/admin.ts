import { useEffect, useState, useCallback } from "react";
import {
  db,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "./firebase";
import { useAuth } from "./auth-context";

export const ADMIN_EMAIL = "owenelong@gmail.com";

export function useIsAdmin(): boolean {
  const { user } = useAuth();
  return !!user?.email && user.email.toLowerCase() === ADMIN_EMAIL;
}

export type ReportStatus = "open" | "resolved" | "dismissed";

export type Report = {
  id: string;
  kind: "post" | "comment";
  postId: string;
  commentId: string | null;
  reason: string;
  contentSnapshot: string;
  authorUid: string | null;
  authorUsername: string | null;
  reporterUid: string | null;
  reporterUsername?: string | null;
  status: ReportStatus;
  notes?: string;
  timestamp: string;
};

export function useReports(status: ReportStatus | "all" = "open", maxItems = 100) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    const base = collection(db, "reports");
    const q =
      status === "all"
        ? query(base, orderBy("createdAt", "desc"), limit(maxItems))
        : query(
            base,
            where("status", "==", status),
            orderBy("createdAt", "desc"),
            limit(maxItems)
          );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Report[] = snap.docs.map((d) => {
          const data = d.data() as {
            kind?: "post" | "comment";
            postId?: string;
            commentId?: string | null;
            reason?: string;
            contentSnapshot?: string;
            authorUid?: string | null;
            authorUsername?: string | null;
            reporterUid?: string | null;
            reporterUsername?: string | null;
            status?: ReportStatus;
            notes?: string;
            createdAt?: { toMillis?: () => number };
          };
          return {
            id: d.id,
            kind: data.kind || "post",
            postId: data.postId || "",
            commentId: data.commentId ?? null,
            reason: data.reason || "",
            contentSnapshot: data.contentSnapshot || "",
            authorUid: data.authorUid ?? null,
            authorUsername: data.authorUsername ?? null,
            reporterUid: data.reporterUid ?? null,
            reporterUsername: data.reporterUsername ?? null,
            status: data.status || "open",
            notes: data.notes || "",
            timestamp: data.createdAt?.toMillis
              ? new Date(data.createdAt.toMillis()).toISOString()
              : new Date().toISOString(),
          };
        });
        setReports(list);
        setLoading(false);
      },
      (err) => {
        console.warn("[freedom] reports subscription failed", err);
        setError(err.message || "Could not load reports.");
        setLoading(false);
      }
    );
    return unsub;
  }, [status, maxItems]);

  return { reports, loading, error };
}

export function useUpdateReport() {
  return useCallback(
    async (
      reportId: string,
      patch: Partial<Pick<Report, "status" | "notes">>
    ) => {
      if (!db) return;
      await updateDoc(doc(db, "reports", reportId), {
        ...patch,
        updatedAt: serverTimestamp(),
      });
    },
    []
  );
}

export function useDeleteReportedContent() {
  return useCallback(async (report: Report) => {
    if (!db) return;
    if (report.kind === "comment" && report.commentId) {
      await deleteDoc(doc(db, "posts", report.postId, "comments", report.commentId));
    } else if (report.kind === "post") {
      await deleteDoc(doc(db, "posts", report.postId));
    }
  }, []);
}

export function useBanUser() {
  const { user } = useAuth();
  return useCallback(
    async (uid: string, reason?: string) => {
      if (!db) return;
      await setDoc(doc(db, "bans", uid), {
        bannedAt: serverTimestamp(),
        bannedBy: user?.uid || null,
        reason: reason || "",
        expiresAt: null,
        kind: "permanent",
      });
    },
    [user]
  );
}

export function useSuspendUser() {
  const { user } = useAuth();
  return useCallback(
    async (uid: string, durationDays: number, reason?: string) => {
      if (!db) return;
      const ms = Math.max(1, Math.round(durationDays)) * 24 * 60 * 60 * 1000;
      const expiresAt = new Date(Date.now() + ms);
      await setDoc(doc(db, "bans", uid), {
        bannedAt: serverTimestamp(),
        bannedBy: user?.uid || null,
        reason: reason || "",
        expiresAt,
        kind: "suspension",
        durationDays: Math.round(durationDays),
      });
    },
    [user]
  );
}

export function useUnbanUser() {
  return useCallback(async (uid: string) => {
    if (!db) return;
    await deleteDoc(doc(db, "bans", uid));
  }, []);
}

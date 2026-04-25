import { useEffect, useState, useCallback } from "react";
import {
  db,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  increment,
  runTransaction,
  isFirebaseConfigured,
} from "./firebase";
import { useAuth } from "./auth-context";
import { assertNotBanned } from "./bans";
import type { CommunityPost } from "./context";

const POSTS_COLLECTION = "posts";
const REPORTS_COLLECTION = "reports";
const LOCAL_KEY = "freedom_community_cache";

export type ReportTargetType = "post" | "comment";

export type ReportInput = {
  targetType: ReportTargetType;
  targetId: string;
  postId: string;
  targetUid?: string | null;
  targetUsername?: string | null;
  targetMessage?: string | null;
  reason?: string;
};

export type ReportStatus = "open" | "dismissed" | "removed";

export type ReportRecord = {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  postId: string;
  targetUid: string | null;
  targetUsername: string | null;
  targetMessage: string | null;
  reason: string | null;
  reporterUid: string | null;
  reporterEmail: string | null;
  status: ReportStatus;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
};

export type WarningKind = "warning" | "removal";

export type CommentVisibility = "public" | "private";

export type CommunityComment = {
  id: string;
  uid: string;
  username: string;
  message: string;
  imageUrl?: string | null;
  timestamp: string;
  editedAt?: string | null;
  visibility: CommentVisibility;
};

function readLocal(): CommunityPost[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeLocal(posts: CommunityPost[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(posts));
  } catch {
    /* ignore quota */
  }
}

export function useCommunityFeed(maxPosts = 100) {
  const [posts, setPosts] = useState<CommunityPost[]>(() => readLocal());
  const [online, setOnline] = useState<boolean>(isFirebaseConfigured);

  useEffect(() => {
    if (!db) {
      setOnline(false);
      setPosts(readLocal());
      return;
    }
    const q = query(collection(db, POSTS_COLLECTION), orderBy("createdAt", "desc"), limit(maxPosts));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: CommunityPost[] = snap.docs.map((d) => {
          const data = d.data() as {
            uid?: string;
            username?: string;
            message?: string;
            streak?: string;
            createdAt?: { toMillis?: () => number };
            editedAt?: { toMillis?: () => number };
            reactions?: Record<string, number>;
          };
          const dataWithImage = data as typeof data & { imageUrl?: string };
          return {
            id: d.id,
            uid: data.uid,
            username: data.username || "anon",
            message: data.message || "",
            imageUrl: dataWithImage.imageUrl || null,
            streak: data.streak || "Day 1",
            timestamp: data.createdAt?.toMillis
              ? new Date(data.createdAt.toMillis()).toISOString()
              : new Date().toISOString(),
            editedAt: data.editedAt?.toMillis
              ? new Date(data.editedAt.toMillis()).toISOString()
              : null,
            reactions: data.reactions || {},
          };
        });
        setPosts(list);
        writeLocal(list);
        setOnline(true);
      },
      (err) => {
        console.warn("[freedom] community feed offline; using local cache", err);
        setOnline(false);
        setPosts(readLocal());
      }
    );
    return unsub;
  }, [maxPosts]);

  return { posts, online };
}

export function useAddCommunityPost() {
  const { user } = useAuth();

  return useCallback(
    async (post: { username: string; message: string; streak: string; imageUrl?: string | null }) => {
      if (db && user) {
        await assertNotBanned(user.uid);
        await addDoc(collection(db, POSTS_COLLECTION), {
          uid: user.uid,
          username: post.username,
          message: post.message,
          imageUrl: post.imageUrl || null,
          streak: post.streak,
          reactions: {},
          createdAt: serverTimestamp(),
        });
        return;
      }
      const local = readLocal();
      const newPost: CommunityPost = {
        id: `local-${Date.now()}`,
        username: post.username,
        message: post.message,
        imageUrl: post.imageUrl || null,
        streak: post.streak,
        timestamp: new Date().toISOString(),
        reactions: {},
        isMine: true,
      };
      writeLocal([newPost, ...local]);
    },
    [user]
  );
}

export function useUpdateCommunityPost() {
  return useCallback(
    async (postId: string, patch: { message?: string; imageUrl?: string | null }) => {
      if (!db || postId.startsWith("local-")) return;
      const ref = doc(db, POSTS_COLLECTION, postId);
      const update: Record<string, unknown> = { editedAt: serverTimestamp() };
      if (patch.message !== undefined) update.message = patch.message;
      if (patch.imageUrl !== undefined) update.imageUrl = patch.imageUrl;
      await updateDoc(ref, update);
    },
    []
  );
}

export function useDeleteCommunityPost() {
  return useCallback(async (postId: string) => {
    if (!db || postId.startsWith("local-")) return;
    await deleteDoc(doc(db, POSTS_COLLECTION, postId));
  }, []);
}

/**
 * Subscribe to the current user's reactions on a single post. The reactor
 * doc lives at `posts/{postId}/reactors/{uid}` and is the *source of truth*
 * for whether the user has already reacted — independent of local state,
 * URL, or device. Returns the set of emojis the user has reacted with.
 */
export function useMyPostReaction(postId: string, uid?: string | null) {
  const [emojis, setEmojis] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!db || !uid || !postId || postId.startsWith("local-")) {
      setEmojis(new Set());
      return;
    }
    const ref = doc(db, POSTS_COLLECTION, postId, "reactors", uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.data() as { emojis?: string[] } | undefined;
        setEmojis(new Set(Array.isArray(data?.emojis) ? data.emojis : []));
      },
      (err) => {
        console.warn("[freedom] reactor doc subscription failed", err);
      }
    );
    return unsub;
  }, [postId, uid]);

  return emojis;
}

/**
 * Toggle the current user's reaction on a post.
 *
 * Uses a Firestore transaction over the post doc and the per-user reactor
 * doc (`posts/{postId}/reactors/{uid}`) so that the count and the user's
 * reaction list always stay in sync. The reactor doc is the source of
 * truth for whether the user has already reacted, so refreshing the page,
 * clearing local state, or opening the post via a new link can never
 * inflate the count — a second tap simply removes the reaction.
 */
export function useToggleCommunityReaction() {
  const { user } = useAuth();
  return useCallback(
    async (postId: string, emoji: string) => {
      if (!db || !user || postId.startsWith("local-")) return;
      const postRef = doc(db, POSTS_COLLECTION, postId);
      const reactorRef = doc(db, POSTS_COLLECTION, postId, "reactors", user.uid);
      try {
        await runTransaction(db, async (tx) => {
          const reactorSnap = await tx.get(reactorRef);
          const current = (reactorSnap.exists()
            ? ((reactorSnap.data() as { emojis?: string[] }).emojis ?? [])
            : []) as string[];
          const already = current.includes(emoji);
          const nextEmojis = already
            ? current.filter((e) => e !== emoji)
            : [...current, emoji];
          const fieldPath = `reactions.${emoji}`;
          tx.update(postRef, {
            [fieldPath]: increment(already ? -1 : 1),
          });
          tx.set(
            reactorRef,
            {
              uid: user.uid,
              emojis: nextEmojis,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        });
      } catch (e) {
        console.warn("[freedom] reaction toggle failed", e);
      }
    },
    [user]
  );
}

/**
 * Subscribe to comments under a post. Comments live in a `comments`
 * subcollection on each post and are ordered oldest-first like a thread.
 */
export function usePostComments(postId: string, enabled = true) {
  const [comments, setComments] = useState<CommunityComment[]>([]);

  useEffect(() => {
    if (!db || !enabled || postId.startsWith("local-")) {
      setComments([]);
      return;
    }
    const q = query(
      collection(db, POSTS_COLLECTION, postId, "comments"),
      orderBy("createdAt", "asc"),
      limit(200)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: CommunityComment[] = snap.docs.map((d) => {
          const data = d.data() as {
            uid?: string;
            username?: string;
            message?: string;
            visibility?: CommentVisibility;
            createdAt?: { toMillis?: () => number };
            editedAt?: { toMillis?: () => number };
          };
          const dataWithImage = data as typeof data & { imageUrl?: string };
          return {
            id: d.id,
            uid: data.uid || "",
            username: data.username || "anon",
            message: data.message || "",
            imageUrl: dataWithImage.imageUrl || null,
            visibility: data.visibility === "private" ? "private" : "public",
            timestamp: data.createdAt?.toMillis
              ? new Date(data.createdAt.toMillis()).toISOString()
              : new Date().toISOString(),
            editedAt: data.editedAt?.toMillis
              ? new Date(data.editedAt.toMillis()).toISOString()
              : null,
          };
        });
        setComments(list);
      },
      (err) => {
        console.warn("[freedom] comments subscription failed", err);
      }
    );
    return unsub;
  }, [postId, enabled]);

  return comments;
}

export function useAddComment() {
  const { user } = useAuth();
  return useCallback(
    async (
      postId: string,
      input: {
        message: string;
        username: string;
        imageUrl?: string | null;
        visibility?: CommentVisibility;
      }
    ) => {
      if (!db || !user || postId.startsWith("local-")) {
        throw new Error("Sign in to leave a comment.");
      }
      await assertNotBanned(user.uid);
      await addDoc(collection(db, POSTS_COLLECTION, postId, "comments"), {
        uid: user.uid,
        username: input.username,
        message: input.message,
        imageUrl: input.imageUrl || null,
        visibility: input.visibility === "private" ? "private" : "public",
        createdAt: serverTimestamp(),
      });
    },
    [user]
  );
}

export function useUpdateComment() {
  return useCallback(
    async (
      postId: string,
      commentId: string,
      patch: { message?: string; imageUrl?: string | null }
    ) => {
      if (!db || postId.startsWith("local-")) return;
      const update: Record<string, unknown> = { editedAt: serverTimestamp() };
      if (patch.message !== undefined) update.message = patch.message;
      if (patch.imageUrl !== undefined) update.imageUrl = patch.imageUrl;
      await updateDoc(doc(db, POSTS_COLLECTION, postId, "comments", commentId), update);
    },
    []
  );
}

export function useDeleteComment() {
  return useCallback(async (postId: string, commentId: string) => {
    if (!db || postId.startsWith("local-")) return;
    await deleteDoc(doc(db, POSTS_COLLECTION, postId, "comments", commentId));
  }, []);
}

const NOTIFICATION_MESSAGES: Record<WarningKind, string> = {
  warning: "First warning for community violations.",
  removal: "Your content was removed — please be more careful.",
};

async function writeWarningNotification(
  uid: string,
  kind: WarningKind,
  context: { reportId: string; targetType: ReportTargetType; targetId: string; targetMessage: string | null }
) {
  if (!db || !uid) return;
  await addDoc(collection(db, "users", uid, "notifications"), {
    kind,
    message: NOTIFICATION_MESSAGES[kind],
    reportId: context.reportId,
    targetType: context.targetType,
    targetId: context.targetId,
    targetMessage: context.targetMessage,
    seen: false,
    createdAt: serverTimestamp(),
  });
}

/**
 * Subscribe to all reports for the admin dashboard, newest first.
 * `statusFilter` defaults to "open"; pass "all" to show every report.
 */
export function useAdminReports(statusFilter: ReportStatus | "all" = "open") {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(isFirebaseConfigured);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      setReports([]);
      return;
    }
    setLoading(true);
    // Single-field query (orderBy only) to avoid requiring a composite
    // Firestore index. We filter by status client-side below.
    const q = query(
      collection(db, REPORTS_COLLECTION),
      orderBy("createdAt", "desc"),
      limit(200)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const all: ReportRecord[] = snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          const createdAt = data.createdAt as { toMillis?: () => number } | undefined;
          const resolvedAt = data.resolvedAt as { toMillis?: () => number } | undefined;
          return {
            id: d.id,
            targetType: (data.targetType as ReportTargetType) || "post",
            targetId: (data.targetId as string) || "",
            postId: (data.postId as string) || "",
            targetUid: (data.targetUid as string) || null,
            targetUsername: (data.targetUsername as string) || null,
            targetMessage: (data.targetMessage as string) || null,
            reason: (data.reason as string) || null,
            reporterUid: (data.reporterUid as string) || null,
            reporterEmail: (data.reporterEmail as string) || null,
            status: (data.status as ReportStatus) || "open",
            createdAt: createdAt?.toMillis
              ? new Date(createdAt.toMillis()).toISOString()
              : new Date().toISOString(),
            resolvedAt: resolvedAt?.toMillis
              ? new Date(resolvedAt.toMillis()).toISOString()
              : null,
            resolvedBy: (data.resolvedBy as string) || null,
          };
        });
        const list =
          statusFilter === "all"
            ? all
            : all.filter((r) => r.status === statusFilter);
        setReports(list);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.warn("[freedom] admin reports subscription failed", err);
        setError(err.message);
        setLoading(false);
      }
    );
    return unsub;
  }, [statusFilter]);

  return { reports, loading, error };
}

/**
 * Dismiss a report (no content removed) and send the offender a "first warning"
 * notification. Safe to call only from the admin page.
 */
export function useDismissReport() {
  const { user } = useAuth();
  return useCallback(
    async (report: ReportRecord) => {
      if (!db) throw new Error("Reports unavailable offline.");
      if (!user) throw new Error("Sign in required.");
      await updateDoc(doc(db, REPORTS_COLLECTION, report.id), {
        status: "dismissed",
        resolvedAt: serverTimestamp(),
        resolvedBy: user.uid,
      });
      if (report.targetUid) {
        await writeWarningNotification(report.targetUid, "warning", {
          reportId: report.id,
          targetType: report.targetType,
          targetId: report.targetId,
          targetMessage: report.targetMessage,
        });
      }
    },
    [user]
  );
}

/**
 * Delete the reported post or comment, mark the report as removed, and notify
 * the offender that their content was taken down.
 */
export function useDeleteReportedContent() {
  const { user } = useAuth();
  return useCallback(
    async (report: ReportRecord) => {
      if (!db) throw new Error("Reports unavailable offline.");
      if (!user) throw new Error("Sign in required.");
      try {
        if (report.targetType === "post") {
          await deleteDoc(doc(db, POSTS_COLLECTION, report.postId));
        } else {
          await deleteDoc(
            doc(db, POSTS_COLLECTION, report.postId, "comments", report.targetId)
          );
        }
      } catch (e) {
        console.warn("[freedom] reported content delete failed (already removed?)", e);
      }
      await updateDoc(doc(db, REPORTS_COLLECTION, report.id), {
        status: "removed",
        resolvedAt: serverTimestamp(),
        resolvedBy: user.uid,
      });
      if (report.targetUid) {
        await writeWarningNotification(report.targetUid, "removal", {
          reportId: report.id,
          targetType: report.targetType,
          targetId: report.targetId,
          targetMessage: report.targetMessage,
        });
      }
    },
    [user]
  );
}

/**
 * Submit a report against a post or comment. Reports are written to the
 * top-level `reports` collection in Firestore for later moderator review.
 */
export function useSubmitReport() {
  const { user } = useAuth();
  return useCallback(
    async (input: ReportInput) => {
      if (!db) {
        throw new Error("Reporting is unavailable offline.");
      }
      if (!user) {
        throw new Error("Sign in to report content.");
      }
      if (input.postId.startsWith("local-")) {
        throw new Error("Local-only posts can't be reported.");
      }
      await assertNotBanned(user.uid);
      const reason = (input.reason || "").trim().slice(0, 500);
      await addDoc(collection(db, REPORTS_COLLECTION), {
        targetType: input.targetType,
        targetId: input.targetId,
        postId: input.postId,
        targetUid: input.targetUid || null,
        targetUsername: input.targetUsername || null,
        targetMessage: input.targetMessage || null,
        reason: reason || null,
        reporterUid: user.uid,
        reporterEmail: user.email || null,
        status: "open",
        createdAt: serverTimestamp(),
      });
    },
    [user]
  );
}


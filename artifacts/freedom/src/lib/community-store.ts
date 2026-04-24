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
  isFirebaseConfigured,
} from "./firebase";
import { useAuth } from "./auth-context";
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

export type CommunityComment = {
  id: string;
  uid: string;
  username: string;
  message: string;
  imageUrl?: string | null;
  timestamp: string;
  editedAt?: string | null;
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

export function useToggleCommunityReaction() {
  return useCallback(async (postId: string, emoji: string, currentlyLiked: boolean) => {
    if (!db || postId.startsWith("local-")) return;
    try {
      const ref = doc(db, POSTS_COLLECTION, postId);
      const fieldPath = `reactions.${emoji}`;
      await updateDoc(ref, { [fieldPath]: increment(currentlyLiked ? -1 : 1) });
    } catch (e) {
      console.warn("[freedom] reaction sync failed (kept locally)", e);
    }
  }, []);
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
      input: { message: string; username: string; imageUrl?: string | null }
    ) => {
      if (!db || !user || postId.startsWith("local-")) {
        throw new Error("Sign in to leave a comment.");
      }
      await addDoc(collection(db, POSTS_COLLECTION, postId, "comments"), {
        uid: user.uid,
        username: input.username,
        message: input.message,
        imageUrl: input.imageUrl || null,
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


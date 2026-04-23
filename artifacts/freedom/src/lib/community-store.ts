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
  serverTimestamp,
  isFirebaseConfigured,
} from "./firebase";
import { useAuth } from "./auth-context";
import type { CommunityPost } from "./context";

const POSTS_COLLECTION = "posts";
const LOCAL_KEY = "freedom_my_posts";

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

/**
 * Subscribe to the global community feed. When Firestore is configured we
 * stream the latest posts; otherwise we fall back to whatever the user has
 * stored locally so the app still works offline / unconfigured.
 */
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
            username?: string;
            message?: string;
            streak?: string;
            createdAt?: { toMillis?: () => number };
            reactions?: Record<string, number>;
            uid?: string;
          };
          return {
            id: d.id,
            username: data.username || "anon",
            message: data.message || "",
            streak: data.streak || "Day 1",
            timestamp: data.createdAt?.toMillis
              ? new Date(data.createdAt.toMillis()).toISOString()
              : new Date().toISOString(),
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
    async (post: { username: string; message: string; streak: string }) => {
      if (db && user) {
        await addDoc(collection(db, POSTS_COLLECTION), {
          uid: user.uid,
          username: post.username,
          message: post.message,
          streak: post.streak,
          reactions: {},
          createdAt: serverTimestamp(),
        });
        return;
      }
      // Offline / unconfigured fallback: stash locally so it shows in the feed.
      const local = readLocal();
      const newPost: CommunityPost = {
        id: `local-${Date.now()}`,
        username: post.username,
        message: post.message,
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

export function useToggleCommunityReaction() {
  return useCallback(async (postId: string, emoji: string, currentlyLiked: boolean) => {
    if (!db || postId.startsWith("local-")) return; // local-only posts can't update server reactions
    try {
      const ref = doc(db, POSTS_COLLECTION, postId);
      // Read current value through a simple +1/-1 update via Firestore field path
      const fieldPath = `reactions.${emoji}`;
      await updateDoc(ref, { [fieldPath]: currentlyLiked ? 0 : 1 } as never);
    } catch (e) {
      console.warn("[freedom] reaction sync failed (kept locally)", e);
    }
  }, []);
}

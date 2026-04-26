import { useCallback } from "react";
import {
  db,
  doc,
  setDoc,
  collection,
  addDoc,
  serverTimestamp,
} from "./firebase";

/**
 * Synthetic dummy posts and comments for admin testing of the report / ban /
 * suspend flow. UIDs are deterministic strings (NOT real auth uids), so banning
 * them only affects this synthetic data — no real account is touched.
 *
 * Calling the seed twice is safe: posts use deterministic IDs and are upserted.
 */
const DUMMY_POSTS = [
  {
    id: "test-rude-1",
    uid: "test-user-edgewalker",
    username: "edgewalker",
    streak: "Day 14",
    message:
      "ngl half the streaks people post here look fake. y'all hit day 3 and act like you cured cancer 😂",
  },
  {
    id: "test-rude-2",
    uid: "test-user-darkside99",
    username: "darkside99",
    streak: "Day 2",
    message:
      "if you can't quit porn you're just weak. simple as that. stop crying for support.",
  },
  {
    id: "test-rude-3",
    uid: "test-user-freebird",
    username: "freebird",
    streak: "Day 1",
    message:
      "DM me, I have a 'cure' that actually works. trust me bro, it's better than this app 👀",
  },
] as const;

const DUMMY_COMMENT = {
  postId: "test-rude-1",
  id: "test-rude-comment-1",
  uid: "test-user-troll1",
  username: "troll1",
  message: "lmao cope harder, you'll relapse by friday",
};

export function useSeedTestPosts() {
  return useCallback(async () => {
    if (!db) throw new Error("Firestore is not configured.");

    for (const post of DUMMY_POSTS) {
      await setDoc(
        doc(db, "posts", post.id),
        {
          uid: post.uid,
          username: post.username,
          message: post.message,
          imageUrl: null,
          streak: post.streak,
          reactions: {},
          createdAt: serverTimestamp(),
          isTestSeed: true,
        },
        { merge: true }
      );
    }

    // Add a rude comment under the first dummy post if we haven't yet.
    await setDoc(
      doc(db, "posts", DUMMY_COMMENT.postId, "comments", DUMMY_COMMENT.id),
      {
        uid: DUMMY_COMMENT.uid,
        username: DUMMY_COMMENT.username,
        message: DUMMY_COMMENT.message,
        imageUrl: null,
        createdAt: serverTimestamp(),
        isTestSeed: true,
      },
      { merge: true }
    );

    return { posts: DUMMY_POSTS.length, comments: 1 };
  }, []);
}

/**
 * Optional: also pre-create reports for the dummy posts so the admin sees
 * something in the Open tab immediately. The reporter is the admin themselves.
 */
export function useSeedTestReports() {
  return useCallback(async (reporterUid: string, reporterEmail: string | null) => {
    if (!db) throw new Error("Firestore is not configured.");
    for (const post of DUMMY_POSTS) {
      await addDoc(collection(db, "reports"), {
        targetType: "post",
        targetId: post.id,
        postId: post.id,
        targetUid: post.uid,
        targetUsername: post.username,
        targetMessage: post.message,
        reason: "Test seed report",
        reporterUid: reporterUid,
        reporterEmail: reporterEmail,
        status: "open",
        createdAt: serverTimestamp(),
        isTestSeed: true,
      });
    }
    return DUMMY_POSTS.length;
  }, []);
}

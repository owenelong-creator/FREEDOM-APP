import { useState, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { Plus, X, Wifi, WifiOff } from "lucide-react";
import { useFreedom } from "@/lib/context";
import { useAuth } from "@/lib/auth-context";
import {
  useCommunityFeed,
  useAddCommunityPost,
  useToggleCommunityReaction,
} from "@/lib/community-store";
import type { CommunityPost } from "@/lib/context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const REACTION_EMOJIS = ["❤️", "🔥", "💪", "🙌", "🌱"];

function PostCard({ post }: { post: CommunityPost }) {
  const { reactions: userReactions, toggleReaction } = useFreedom();
  const toggleRemote = useToggleCommunityReaction();
  const userReacted = userReactions[post.id] || {};

  const handleClick = (emoji: string) => {
    const wasLiked = !!userReacted[emoji];
    toggleReaction(post.id, emoji); // local mark
    toggleRemote(post.id, emoji, wasLiked); // remote +1/-1
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3" data-testid={`post-${post.id}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-mono font-bold">
            {post.username.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">@{post.username}</div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-primary">{post.streak}</div>
          </div>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">
          {formatDistanceToNow(new Date(post.timestamp), { addSuffix: true })}
        </span>
      </div>

      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{post.message}</p>

      <div className="flex flex-wrap gap-2 pt-1">
        {REACTION_EMOJIS.map((emoji) => {
          const baseCount = Math.max(0, post.reactions[emoji] || 0);
          // For server-backed posts, the snapshot count already includes my
          // reaction (we use atomic increment), so don't add myAdd or it
          // would double-count. For local-only fallback posts, add it.
          const isLocal = post.id.startsWith("local-");
          const myAdd = isLocal && userReacted[emoji] ? 1 : 0;
          const total = baseCount + myAdd;
          const liked = !!userReacted[emoji];
          return (
            <button
              key={emoji}
              onClick={() => handleClick(emoji)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono border transition-colors ${
                liked
                  ? "bg-primary/15 border-primary/40 text-primary"
                  : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
              }`}
              data-testid={`reaction-${post.id}-${emoji}`}
            >
              <span>{emoji}</span>
              {total > 0 && <span>{total}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Community() {
  const { appName, startDate } = useFreedom();
  const { user, configured } = useAuth();
  const { posts, online } = useCommunityFeed(100);
  const addPost = useAddCommunityPost();

  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState(
    () => appName.toLowerCase().replace(/[^a-z0-9]/g, "") || "you"
  );
  const [messageDraft, setMessageDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const myStreak = useMemo(() => {
    if (!startDate) return "Day 1";
    const days = Math.max(1, Math.floor((Date.now() - new Date(startDate).getTime()) / 86400_000));
    return `Day ${days}`;
  }, [startDate]);

  const handlePost = async () => {
    const text = messageDraft.trim();
    const username = usernameDraft.trim().toLowerCase().replace(/[^a-z0-9_]/g, "") || "you";
    if (!text) return;
    setPosting(true);
    setPostError(null);
    try {
      await addPost({ username, message: text, streak: myStreak });
      setMessageDraft("");
      setIsComposerOpen(false);
    } catch (e: unknown) {
      const err = e as { message?: string };
      setPostError(err.message || "Could not post. Try again.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="py-8 space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-serif text-foreground">Community</h1>
          <div
            className={`flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest ${
              online ? "text-success" : "text-muted-foreground"
            }`}
            data-testid="community-status"
          >
            {online ? <Wifi size={12} /> : <WifiOff size={12} />}
            {online ? "Live" : "Offline"}
          </div>
        </div>
        <p className="text-muted-foreground text-sm">
          Anonymous wins, slip-ups, and encouragement from others on the path.
        </p>
        {!configured && (
          <p className="text-[10px] font-mono uppercase tracking-widest text-stat">
            Add Firebase config to enable the live feed.
          </p>
        )}
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm font-mono">
          {online ? "No posts yet. Be the first." : "No posts available offline."}
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      <button
        onClick={() => setIsComposerOpen(true)}
        disabled={configured && !user}
        style={{
          bottom: "calc(140px + env(safe-area-inset-bottom))",
          right: "16px",
        }}
        className="fixed z-[55] bg-stat text-background font-mono font-bold uppercase tracking-widest text-xs px-4 py-3 rounded-full shadow-xl shadow-black/40 flex items-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
        data-testid="button-post-update"
      >
        <Plus size={16} />
        Post Update
      </button>

      <Dialog open={isComposerOpen} onOpenChange={setIsComposerOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground font-serif text-xl flex items-center justify-between">
              Share an update
              <button onClick={() => setIsComposerOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Username</label>
              <Input
                value={usernameDraft}
                onChange={(e) => setUsernameDraft(e.target.value)}
                maxLength={20}
                placeholder="you"
                className="bg-background border-border text-foreground"
                data-testid="input-post-username"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                Streak: <span className="text-primary font-mono">{myStreak}</span>
              </label>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Message</label>
              <Textarea
                value={messageDraft}
                onChange={(e) => setMessageDraft(e.target.value)}
                maxLength={280}
                placeholder="What's on your mind today?"
                className="bg-background border-border text-foreground resize-none h-28"
                data-testid="input-post-message"
              />
              <p className="text-[10px] font-mono text-muted-foreground/60 mt-1 text-right">
                {messageDraft.length}/280
              </p>
            </div>
            {postError && (
              <p className="text-xs font-mono text-destructive">{postError}</p>
            )}
          </div>

          <DialogFooter className="flex-row justify-between sm:justify-between pt-2">
            <Button variant="ghost" onClick={() => setIsComposerOpen(false)}>Cancel</Button>
            <Button
              onClick={handlePost}
              disabled={!messageDraft.trim() || posting}
              className="font-mono uppercase tracking-widest text-xs"
              data-testid="button-submit-post"
            >
              {posting ? "Posting…" : "Post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

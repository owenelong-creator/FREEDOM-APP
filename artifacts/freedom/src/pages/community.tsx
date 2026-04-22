import { useState, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { Plus, X } from "lucide-react";
import { useFreedom, CommunityPost } from "@/lib/context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const REACTION_EMOJIS = ["❤️", "🔥", "💪", "🙌", "🌱"];

const PLACEHOLDER_POSTS: CommunityPost[] = [
  { id: "p1",  username: "quietwave",       streak: "Day 3",       message: "First weekend totally clean. The cravings hit hard around 10pm but I went for a walk instead.", timestamp: hoursAgo(2),   reactions: { "❤️": 12, "💪": 8 } },
  { id: "p2",  username: "northstar88",     streak: "Day 14",      message: "Two weeks. I forgot what mornings without shame felt like.", timestamp: hoursAgo(5),   reactions: { "🔥": 23, "🙌": 14, "❤️": 9 } },
  { id: "p3",  username: "ironroot",        streak: "Day 47",      message: "Pro tip: delete the apps. Not pause. Delete.", timestamp: hoursAgo(8),   reactions: { "💪": 41, "🔥": 27 } },
  { id: "p4",  username: "lighthousekid",   streak: "Day 1",       message: "Restarting today. Fell hard last night but I'm here.", timestamp: hoursAgo(12),  reactions: { "❤️": 56, "🌱": 31, "💪": 22 } },
  { id: "p5",  username: "calmtide",        streak: "Day 90",      message: "3 months. The urge surf timer saved me at least 20 times.", timestamp: hoursAgo(18),  reactions: { "🔥": 88, "🙌": 44, "💪": 30 } },
  { id: "p6",  username: "cedarpath",       streak: "Day 7",       message: "First full week! Sleep is wild now — actually rested.", timestamp: hoursAgo(22),  reactions: { "❤️": 19, "🌱": 11 } },
  { id: "p7",  username: "phoenix_rx",      streak: "Day 22",      message: "Journaling triggers honestly changed everything for me.", timestamp: daysAgo(1),    reactions: { "🙌": 17, "❤️": 13 } },
  { id: "p8",  username: "stillwater_19",   streak: "Day 5",       message: "Anyone else use cold showers when an urge hits? Works every time.", timestamp: daysAgo(1),    reactions: { "🔥": 26, "💪": 18 } },
  { id: "p9",  username: "harborlight",     streak: "Day 60",      message: "Two months. To anyone on day 1: it really does get easier. Promise.", timestamp: daysAgo(2),    reactions: { "❤️": 102, "🙌": 64, "🌱": 38 } },
  { id: "p10", username: "redwood_jay",     streak: "Day 11",      message: "Got through my hardest trigger today (late night, alone, bored). Logged it instead.", timestamp: daysAgo(2),    reactions: { "💪": 33, "❤️": 21 } },
  { id: "p11", username: "morningfog",      streak: "Day 30",      message: "One whole month. Fortress is fully locked down. No going back.", timestamp: daysAgo(3),    reactions: { "🔥": 71, "🙌": 40 } },
  { id: "p12", username: "blueheron_22",    streak: "Day 2",       message: "Day 2 and I want to quit quitting. Telling myself just one more hour at a time.", timestamp: daysAgo(3),    reactions: { "❤️": 45, "💪": 29, "🌱": 16 } },
  { id: "p13", username: "cliffside",       streak: "Day 120",     message: "Four months. My brain feels like it belongs to me again.", timestamp: daysAgo(4),    reactions: { "🔥": 134, "🙌": 80, "❤️": 52 } },
  { id: "p14", username: "softember",       streak: "Day 18",      message: "Therapy + this app = actual progress for the first time in years.", timestamp: daysAgo(5),    reactions: { "❤️": 38, "🙌": 24 } },
  { id: "p15", username: "ridgeway_sam",    streak: "Day 365",     message: "ONE YEAR today. Started here on day 1 with shaking hands. Keep going.", timestamp: daysAgo(6),    reactions: { "🔥": 412, "🙌": 287, "❤️": 196, "💪": 144 } },
];

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600_000).toISOString();
}
function daysAgo(d: number): string {
  return new Date(Date.now() - d * 86400_000).toISOString();
}

function PostCard({ post }: { post: CommunityPost }) {
  const { reactions: userReactions, toggleReaction } = useFreedom();
  const userReacted = userReactions[post.id] || {};

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
          const baseCount = post.reactions[emoji] || 0;
          const myAdd = userReacted[emoji] ? 1 : 0;
          const total = baseCount + myAdd;
          const liked = !!userReacted[emoji];
          return (
            <button
              key={emoji}
              onClick={() => toggleReaction(post.id, emoji)}
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
  const { appName, myPosts, addMyPost, startDate } = useFreedom();
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState(() => appName.toLowerCase().replace(/[^a-z0-9]/g, "") || "you");
  const [messageDraft, setMessageDraft] = useState("");

  const allPosts = useMemo(() => [...myPosts, ...PLACEHOLDER_POSTS], [myPosts]);

  const myStreak = useMemo(() => {
    if (!startDate) return "Day 1";
    const days = Math.max(1, Math.floor((Date.now() - new Date(startDate).getTime()) / 86400_000));
    return `Day ${days}`;
  }, [startDate]);

  const handlePost = () => {
    const text = messageDraft.trim();
    const username = usernameDraft.trim().toLowerCase().replace(/[^a-z0-9_]/g, "") || "you";
    if (!text) return;
    addMyPost({
      id: `mine-${Date.now()}`,
      username,
      streak: myStreak,
      message: text,
      timestamp: new Date().toISOString(),
      reactions: {},
      isMine: true,
    });
    setMessageDraft("");
    setIsComposerOpen(false);
  };

  return (
    <div className="py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-serif text-foreground">Community</h1>
        <p className="text-muted-foreground text-sm">Anonymous wins, slip-ups, and encouragement from others on the path.</p>
      </div>

      <div className="space-y-3">
        {allPosts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      <button
        onClick={() => setIsComposerOpen(true)}
        style={{
          bottom: "calc(140px + env(safe-area-inset-bottom))",
          right: "16px",
        }}
        className="fixed z-[55] bg-stat text-background font-mono font-bold uppercase tracking-widest text-xs px-4 py-3 rounded-full shadow-xl shadow-black/40 flex items-center gap-2 active:scale-95 transition-transform"
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
          </div>

          <DialogFooter className="flex-row justify-between sm:justify-between pt-2">
            <Button variant="ghost" onClick={() => setIsComposerOpen(false)}>Cancel</Button>
            <Button
              onClick={handlePost}
              disabled={!messageDraft.trim()}
              className="font-mono uppercase tracking-widest text-xs"
              data-testid="button-submit-post"
            >
              Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

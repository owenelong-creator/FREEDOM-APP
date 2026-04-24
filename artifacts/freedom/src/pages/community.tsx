import { useState, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Plus,
  X,
  Wifi,
  WifiOff,
  MoreVertical,
  Pencil,
  Trash2,
  Flag,
  MessageCircle,
  Send,
} from "lucide-react";
import { useFreedom } from "@/lib/context";
import { useAuth } from "@/lib/auth-context";
import {
  useCommunityFeed,
  useAddCommunityPost,
  useToggleCommunityReaction,
  useUpdateCommunityPost,
  useDeleteCommunityPost,
  usePostComments,
  useAddComment,
  useUpdateComment,
  useDeleteComment,
  useReportContent,
  type CommunityComment,
} from "@/lib/community-store";
import type { CommunityPost } from "@/lib/context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ImageUpload from "@/components/image-upload";

const REACTION_EMOJIS = ["❤️", "🔥", "💪", "🙌", "🌱"];

type ReportTarget =
  | { kind: "post"; postId: string; snapshot: string; authorUid?: string; authorUsername?: string }
  | {
      kind: "comment";
      postId: string;
      commentId: string;
      snapshot: string;
      authorUid?: string;
      authorUsername?: string;
    };

function ItemMenu({
  isOwner,
  onEdit,
  onDelete,
  onReport,
  testIdPrefix,
}: {
  isOwner: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onReport: () => void;
  testIdPrefix: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="More options"
          className="p-1 -m-1 text-muted-foreground/60 hover:text-foreground transition-colors rounded"
          data-testid={`${testIdPrefix}-menu-trigger`}
        >
          <MoreVertical size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 bg-card border-border">
        {isOwner && onEdit && (
          <DropdownMenuItem
            onClick={onEdit}
            className="text-xs font-mono uppercase tracking-widest cursor-pointer"
            data-testid={`${testIdPrefix}-menu-edit`}
          >
            <Pencil size={12} className="mr-2" /> Edit
          </DropdownMenuItem>
        )}
        {isOwner && onDelete && (
          <DropdownMenuItem
            onClick={onDelete}
            className="text-xs font-mono uppercase tracking-widest text-destructive focus:text-destructive cursor-pointer"
            data-testid={`${testIdPrefix}-menu-delete`}
          >
            <Trash2 size={12} className="mr-2" /> Delete
          </DropdownMenuItem>
        )}
        {isOwner && <DropdownMenuSeparator />}
        <DropdownMenuItem
          onClick={onReport}
          className="text-xs font-mono uppercase tracking-widest cursor-pointer"
          data-testid={`${testIdPrefix}-menu-report`}
        >
          <Flag size={12} className="mr-2" /> Report
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CommentRow({
  comment,
  postId,
  myUid,
  onReport,
}: {
  comment: CommunityComment;
  postId: string;
  myUid?: string;
  onReport: (target: ReportTarget) => void;
}) {
  const updateComment = useUpdateComment();
  const deleteComment = useDeleteComment();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.message);
  const [editImage, setEditImage] = useState<string | null>(comment.imageUrl || null);
  const [editError, setEditError] = useState<string | null>(null);
  const isOwner = !!myUid && comment.uid === myUid;

  const handleSave = async () => {
    const next = draft.trim();
    const imageChanged = editImage !== (comment.imageUrl || null);
    if (!next && !editImage) {
      setEditError("Comment can't be empty.");
      return;
    }
    if (next === comment.message && !imageChanged) {
      setEditing(false);
      return;
    }
    await updateComment(postId, comment.id, { message: next, imageUrl: editImage });
    setEditing(false);
    setEditError(null);
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this comment?")) return;
    await deleteComment(postId, comment.id);
  };

  return (
    <div className="flex gap-2 items-start py-2" data-testid={`comment-${comment.id}`}>
      <div className="w-6 h-6 mt-0.5 rounded-full bg-muted/60 flex items-center justify-center text-[10px] font-mono font-bold text-muted-foreground shrink-0">
        {comment.username.slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="text-xs font-medium text-foreground truncate">@{comment.username}</span>
            <span className="text-[10px] font-mono text-muted-foreground/70">
              {formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true })}
              {comment.editedAt ? " · edited" : ""}
            </span>
          </div>
          <ItemMenu
            isOwner={isOwner}
            onEdit={isOwner ? () => { setDraft(comment.message); setEditImage(comment.imageUrl || null); setEditing(true); } : undefined}
            onDelete={isOwner ? handleDelete : undefined}
            onReport={() =>
              onReport({
                kind: "comment",
                postId,
                commentId: comment.id,
                snapshot: comment.message,
                authorUid: comment.uid,
                authorUsername: comment.username,
              })
            }
            testIdPrefix={`comment-${comment.id}`}
          />
        </div>
        {editing ? (
          <div className="mt-1 space-y-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={280}
              className="bg-background border-border text-foreground resize-none h-16 text-sm"
              data-testid={`comment-${comment.id}-edit-input`}
            />
            <ImageUpload
              scope="comments"
              value={editImage}
              onChange={setEditImage}
              onError={setEditError}
            />
            {editError && <p className="text-[11px] font-mono text-destructive">{editError}</p>}
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => { setDraft(comment.message); setEditImage(comment.imageUrl || null); setEditing(false); setEditError(null); }}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} className="font-mono uppercase tracking-widest text-[10px]">
                Save
              </Button>
            </div>
          </div>
        ) : (
          <>
            {comment.message && (
              <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-snug mt-0.5">
                {comment.message}
              </p>
            )}
            {comment.imageUrl && (
              <img
                src={comment.imageUrl}
                alt="comment attachment"
                className="mt-1.5 max-h-60 rounded-md border border-border"
                loading="lazy"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CommentThread({
  postId,
  myUid,
  myUsername,
  onReport,
}: {
  postId: string;
  myUid?: string;
  myUsername: string;
  onReport: (target: ReportTarget) => void;
}) {
  const comments = usePostComments(postId, true);
  const addComment = useAddComment();
  const [draft, setDraft] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text && !image) return;
    setPosting(true);
    setError(null);
    try {
      await addComment(postId, { message: text, username: myUsername, imageUrl: image });
      setDraft("");
      setImage(null);
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err.message || "Could not post comment.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="border-t border-border/60 pt-3 mt-2 space-y-1">
      {comments.length === 0 && (
        <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground/60 py-1">
          Be the first to reply.
        </p>
      )}
      <div className="divide-y divide-border/40">
        {comments.map((c) => (
          <CommentRow key={c.id} comment={c} postId={postId} myUid={myUid} onReport={onReport} />
        ))}
      </div>
      {myUid ? (
        <div className="space-y-2 pt-2">
          <div className="flex items-end gap-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={280}
              placeholder="Write a reply…"
              className="bg-background border-border text-foreground resize-none h-12 min-h-[3rem] text-sm py-2"
              data-testid={`comment-input-${postId}`}
            />
            <Button
              size="sm"
              onClick={handleSend}
              disabled={(!draft.trim() && !image) || posting}
              className="h-10 px-3"
              data-testid={`comment-submit-${postId}`}
            >
              <Send size={14} />
            </Button>
          </div>
          <ImageUpload scope="comments" value={image} onChange={setImage} onError={setError} />
        </div>
      ) : (
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60 pt-2">
          Sign in to reply.
        </p>
      )}
      {error && <p className="text-xs font-mono text-destructive">{error}</p>}
    </div>
  );
}

function PostCard({
  post,
  myUid,
  myUsername,
  onReport,
}: {
  post: CommunityPost;
  myUid?: string;
  myUsername: string;
  onReport: (target: ReportTarget) => void;
}) {
  const { reactions: userReactions, toggleReaction } = useFreedom();
  const toggleRemote = useToggleCommunityReaction();
  const updatePost = useUpdateCommunityPost();
  const deletePost = useDeleteCommunityPost();
  const userReacted = userReactions[post.id] || {};
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.message);
  const [editImage, setEditImage] = useState<string | null>(post.imageUrl || null);
  const [editError, setEditError] = useState<string | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);

  const isOwner = !!myUid && post.uid === myUid;

  const handleClick = (emoji: string) => {
    const wasLiked = !!userReacted[emoji];
    toggleReaction(post.id, emoji);
    toggleRemote(post.id, emoji, wasLiked);
  };

  const handleSaveEdit = async () => {
    const next = draft.trim();
    const imageChanged = editImage !== (post.imageUrl || null);
    if (!next && !editImage) {
      setEditError("Post can't be empty.");
      return;
    }
    if (next === post.message && !imageChanged) {
      setEditing(false);
      return;
    }
    await updatePost(post.id, { message: next, imageUrl: editImage });
    setEditing(false);
    setEditError(null);
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this post and all its comments?")) return;
    await deletePost(post.id);
  };

  return (
    <div
      id={`post-${post.id}`}
      className="bg-card border border-border rounded-lg p-4 space-y-3"
      data-testid={`post-${post.id}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-mono font-bold">
            {post.username.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">@{post.username}</div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-primary">
              {post.streak}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground font-mono">
            {formatDistanceToNow(new Date(post.timestamp), { addSuffix: true })}
            {post.editedAt ? " · edited" : ""}
          </span>
          <ItemMenu
            isOwner={isOwner}
            onEdit={isOwner ? () => { setDraft(post.message); setEditImage(post.imageUrl || null); setEditing(true); } : undefined}
            onDelete={isOwner ? handleDelete : undefined}
            onReport={() =>
              onReport({
                kind: "post",
                postId: post.id,
                snapshot: post.message,
                authorUid: post.uid,
                authorUsername: post.username,
              })
            }
            testIdPrefix={`post-${post.id}`}
          />
        </div>
      </div>

      {editing ? (
        <div className="space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={280}
            className="bg-background border-border text-foreground resize-none h-24"
            data-testid={`post-${post.id}-edit-input`}
          />
          <ImageUpload scope="posts" value={editImage} onChange={setEditImage} onError={setEditError} />
          {editError && <p className="text-[11px] font-mono text-destructive">{editError}</p>}
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => { setDraft(post.message); setEditImage(post.imageUrl || null); setEditing(false); setEditError(null); }}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveEdit} className="font-mono uppercase tracking-widest text-[10px]">
              Save
            </Button>
          </div>
        </div>
      ) : (
        <>
          {post.message && (
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {post.message}
            </p>
          )}
          {post.imageUrl && (
            <img
              src={post.imageUrl}
              alt="post attachment"
              className="rounded-lg border border-border max-h-96 w-full object-cover"
              loading="lazy"
            />
          )}
        </>
      )}

      <div className="flex flex-wrap gap-2 pt-1 items-center">
        {REACTION_EMOJIS.map((emoji) => {
          const baseCount = Math.max(0, post.reactions[emoji] || 0);
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

        {!post.id.startsWith("local-") && (
          <button
            onClick={() => setCommentsOpen((v) => !v)}
            className={`ml-auto flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono border transition-colors ${
              commentsOpen
                ? "bg-stat/15 border-stat/40 text-stat"
                : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
            }`}
            data-testid={`button-toggle-comments-${post.id}`}
          >
            <MessageCircle size={12} />
            {commentsOpen ? "Hide replies" : "Reply"}
          </button>
        )}
      </div>

      {commentsOpen && !post.id.startsWith("local-") && (
        <CommentThread
          postId={post.id}
          myUid={myUid}
          myUsername={myUsername}
          onReport={onReport}
        />
      )}
    </div>
  );
}

export default function Community() {
  const { appName, startDate } = useFreedom();
  const { user, configured } = useAuth();
  const { posts, online } = useCommunityFeed(100);
  const addPost = useAddCommunityPost();
  const reportContent = useReportContent();

  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState(
    () => appName.toLowerCase().replace(/[^a-z0-9]/g, "") || "you"
  );
  const [messageDraft, setMessageDraft] = useState("");
  const [composerImage, setComposerImage] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = useState(false);

  const myUsername = useMemo(
    () => appName.toLowerCase().replace(/[^a-z0-9_]/g, "") || "you",
    [appName]
  );

  const myStreak = useMemo(() => {
    if (!startDate) return "Day 1";
    const days = Math.max(
      1,
      Math.floor((Date.now() - new Date(startDate).getTime()) / 86400_000)
    );
    return `Day ${days}`;
  }, [startDate]);

  const handlePost = async () => {
    const text = messageDraft.trim();
    const username =
      usernameDraft.trim().toLowerCase().replace(/[^a-z0-9_]/g, "") || "you";
    if (!text && !composerImage) return;
    setPosting(true);
    setPostError(null);
    try {
      await addPost({ username, message: text, streak: myStreak, imageUrl: composerImage });
      setMessageDraft("");
      setComposerImage(null);
      setIsComposerOpen(false);
    } catch (e: unknown) {
      const err = e as { message?: string };
      setPostError(err.message || "Could not post. Try again.");
    } finally {
      setPosting(false);
    }
  };

  const closeReport = () => {
    setReportTarget(null);
    setReportReason("");
    setReportError(null);
    setReportSuccess(false);
  };

  const submitReport = async () => {
    if (!reportTarget) return;
    setReportSubmitting(true);
    setReportError(null);
    try {
      await reportContent({
        kind: reportTarget.kind,
        postId: reportTarget.postId,
        commentId: reportTarget.kind === "comment" ? reportTarget.commentId : undefined,
        reason: reportReason.trim(),
        contentSnapshot: reportTarget.snapshot,
        authorUid: reportTarget.authorUid,
        authorUsername: reportTarget.authorUsername,
      });
      setReportSuccess(true);
      setTimeout(closeReport, 1200);
    } catch (e: unknown) {
      const err = e as { message?: string };
      setReportError(err.message || "Could not send report.");
    } finally {
      setReportSubmitting(false);
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
            <PostCard
              key={post.id}
              post={post}
              myUid={user?.uid}
              myUsername={myUsername}
              onReport={(t) => {
                setReportTarget(t);
                setReportReason("");
                setReportError(null);
                setReportSuccess(false);
              }}
            />
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
              <button
                onClick={() => setIsComposerOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
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
            <ImageUpload
              scope="posts"
              value={composerImage}
              onChange={setComposerImage}
              onError={setPostError}
            />
            {postError && <p className="text-xs font-mono text-destructive">{postError}</p>}
          </div>

          <DialogFooter className="flex-row justify-between sm:justify-between pt-2">
            <Button variant="ghost" onClick={() => setIsComposerOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handlePost}
              disabled={(!messageDraft.trim() && !composerImage) || posting}
              className="font-mono uppercase tracking-widest text-xs"
              data-testid="button-submit-post"
            >
              {posting ? "Posting…" : "Post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reportTarget} onOpenChange={(v) => (!v ? closeReport() : null)}>
        <DialogContent className="bg-card border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground font-serif text-xl">
              Report {reportTarget?.kind}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Tell us what's wrong. Reports are sent privately for review.
            </DialogDescription>
          </DialogHeader>

          {reportSuccess ? (
            <div className="py-6 text-center text-sm text-primary font-mono">
              Thanks — report received.
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <Textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                maxLength={500}
                placeholder="Optional: describe the issue (spam, abuse, etc.)"
                className="bg-background border-border text-foreground resize-none h-24 text-sm"
                data-testid="input-report-reason"
              />
              {reportError && (
                <p className="text-xs font-mono text-destructive">{reportError}</p>
              )}
            </div>
          )}

          {!reportSuccess && (
            <DialogFooter className="flex-row justify-between sm:justify-between pt-2">
              <Button variant="ghost" onClick={closeReport}>
                Cancel
              </Button>
              <Button
                onClick={submitReport}
                disabled={reportSubmitting}
                className="font-mono uppercase tracking-widest text-xs"
                data-testid="button-submit-report"
              >
                {reportSubmitting ? "Sending…" : "Send report"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from "react";
import { format } from "date-fns";
import { Ban, ShieldCheck, Send } from "lucide-react";
import type { BanRecord } from "@/lib/bans";
import { useSubmitAppeal } from "@/lib/appeals";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function BannedScreen({ ban }: { ban: BanRecord }) {
  const submitAppeal = useSubmitAppeal();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alreadyAppealed = !!ban.appealAt;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await submitAppeal(draft);
      setOpen(false);
      setDraft("");
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err.message || "Could not send your appeal.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="py-12 px-2 text-center space-y-6"
      data-testid="banned-screen"
    >
      <div className="mx-auto w-16 h-16 rounded-2xl bg-destructive/15 border border-destructive/30 flex items-center justify-center">
        <Ban size={28} className="text-destructive" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-serif text-foreground">
          You're banned from the Community
        </h1>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Your access to post, comment, and report has been permanently removed
          for violating community guidelines. The rest of Freedom still works
          normally.
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 max-w-sm mx-auto text-left space-y-2">
        {ban.reason && (
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Reason
            </div>
            <p className="text-sm text-foreground/90 mt-0.5 break-words">
              {ban.reason}
            </p>
          </div>
        )}
        {ban.createdAt && (
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Issued
            </div>
            <p className="text-sm text-foreground/90 mt-0.5">
              {format(new Date(ban.createdAt), "MMM d, yyyy · h:mm a")}
            </p>
          </div>
        )}
      </div>

      {alreadyAppealed ? (
        <div
          className="max-w-sm mx-auto rounded-lg border border-border bg-card p-4 space-y-2"
          data-testid="appeal-submitted"
        >
          <div className="flex items-center justify-center gap-2 text-stat">
            <ShieldCheck size={18} />
            <span className="text-sm font-medium">Appeal received</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Submitted{" "}
            {ban.appealAt
              ? format(new Date(ban.appealAt), "MMM d, yyyy · h:mm a")
              : "recently"}
            . We'll take another look.
          </p>
          {ban.appealMessage && (
            <p className="text-xs text-foreground/80 italic mt-2 whitespace-pre-wrap">
              "{ban.appealMessage}"
            </p>
          )}
        </div>
      ) : (
        <Button
          onClick={() => setOpen(true)}
          className="font-mono uppercase tracking-widest text-xs"
          data-testid="button-appeal"
        >
          Ask for a second chance
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground font-serif text-xl">
              Ask for a second chance
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Tell the moderation team why you should be unbanned. Be honest —
              one shot.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 pt-1">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={1000}
              placeholder="What happened, and what you'll do differently…"
              className="bg-background border-border resize-none h-32"
              data-testid="appeal-message"
            />
            <p className="text-[10px] font-mono text-muted-foreground/60 text-right">
              {draft.length}/1000
            </p>
            {error && <p className="text-xs font-mono text-destructive">{error}</p>}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={submitting}
              className="font-mono uppercase tracking-widest text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !draft.trim()}
              className="font-mono uppercase tracking-widest text-xs"
              data-testid="appeal-submit"
            >
              <Send size={12} className="mr-1" />
              {submitting ? "Sending…" : "Send appeal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

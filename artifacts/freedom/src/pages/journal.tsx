import { useState, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { Trash2, Heart, Pencil, Check, X, Plus } from "lucide-react";
import { useFreedom, MAX_REASONS, MAX_REASON_LENGTH, type Reason } from "@/lib/context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function ReasonItem({
  reason,
  onUpdate,
  onDelete,
}: {
  reason: Reason;
  onUpdate: (id: string, text: string) => { ok: boolean; error?: string };
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(reason.text);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    const result = onUpdate(reason.id, draft);
    if (!result.ok) {
      setError(result.error || "Could not save.");
      return;
    }
    setError(null);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(reason.text);
    setError(null);
    setEditing(false);
  };

  return (
    <div
      className="bg-background border border-border rounded-md p-3 space-y-2"
      data-testid={`reason-${reason.id}`}
    >
      {editing ? (
        <>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_REASON_LENGTH))}
            className="bg-background border-border resize-none h-20 text-foreground text-sm"
            data-testid={`reason-${reason.id}-input`}
          />
          {error && <p className="text-[11px] font-mono text-destructive">{error}</p>}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-muted-foreground/60">
              {draft.length}/{MAX_REASON_LENGTH}
            </span>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                className="font-mono uppercase tracking-widest text-[10px] h-7 px-2"
              >
                <X size={12} className="mr-1" /> Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!draft.trim()}
                className="font-mono uppercase tracking-widest text-[10px] h-7 px-2"
                data-testid={`reason-${reason.id}-save`}
              >
                <Check size={12} className="mr-1" /> Save
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-start gap-2">
          <p className="flex-1 text-sm text-foreground font-serif leading-snug whitespace-pre-wrap">
            {reason.text}
          </p>
          <div className="flex flex-col gap-1 shrink-0">
            <button
              type="button"
              onClick={() => { setDraft(reason.text); setEditing(true); }}
              className="text-muted-foreground/70 hover:text-foreground p-1 -m-1"
              aria-label="Edit reason"
              data-testid={`reason-${reason.id}-edit`}
            >
              <Pencil size={13} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(reason.id)}
              className="text-muted-foreground/50 hover:text-destructive p-1 -m-1"
              aria-label="Delete reason"
              data-testid={`reason-${reason.id}-delete`}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function WhyImDoingThisCard() {
  const { reasons, addReason, updateReason, deleteReason } = useFreedom();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isEmpty = reasons.length === 0;
  const atMax = reasons.length >= MAX_REASONS;
  const showAddForm = adding || isEmpty;

  const handleAdd = () => {
    const result = addReason(draft);
    if (!result.ok) {
      setError(result.error || "Could not add reason.");
      return;
    }
    setDraft("");
    setError(null);
    setAdding(false);
  };

  const handleCancelAdd = () => {
    setDraft("");
    setError(null);
    setAdding(false);
  };

  return (
    <div
      className="bg-card border border-border rounded-lg p-4 space-y-3"
      data-testid="why-card"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Heart size={14} className="text-primary" />
          <h2 className="text-xs font-mono uppercase tracking-widest text-foreground">
            Why I'm Fighting For Freedom
          </h2>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground/60 tabular-nums">
          {reasons.length}/{MAX_REASONS}
        </span>
      </div>

      {!isEmpty && (
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Add up to {MAX_REASONS} reasons. They'll appear as a swipeable
          carousel on your home screen.
        </p>
      )}

      {reasons.length > 0 && (
        <div className="space-y-2">
          {reasons.map((r) => (
            <ReasonItem
              key={r.id}
              reason={r}
              onUpdate={updateReason}
              onDelete={deleteReason}
            />
          ))}
        </div>
      )}

      {showAddForm ? (
        <div className="space-y-2 border-t border-border/50 pt-3">
          {isEmpty && (
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Write the real reasons — the ones you'll need to remember at 2 AM.
              They'll show up on your home screen as a swipeable carousel.
            </p>
          )}
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_REASON_LENGTH))}
            placeholder="For my future self. For the kids I want to have one day…"
            className="bg-background border-border resize-none h-20 text-foreground placeholder:text-muted-foreground/50 text-sm"
            data-testid="reason-new-input"
          />
          {error && <p className="text-[11px] font-mono text-destructive">{error}</p>}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-muted-foreground/60">
              {draft.length}/{MAX_REASON_LENGTH}
            </span>
            <div className="flex gap-1">
              {!isEmpty && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelAdd}
                  className="font-mono uppercase tracking-widest text-[10px] h-7 px-2"
                >
                  <X size={12} className="mr-1" /> Cancel
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={!draft.trim()}
                className="font-mono uppercase tracking-widest text-[10px] h-7 px-2"
                data-testid="reason-new-save"
              >
                <Check size={12} className="mr-1" /> Add
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setAdding(true)}
          disabled={atMax}
          className="w-full font-mono uppercase tracking-widest text-[10px] border border-dashed border-border/60 h-8"
          data-testid="reason-add"
        >
          <Plus size={12} className="mr-1" />
          {atMax ? `Max ${MAX_REASONS} reasons reached` : "Add another reason"}
        </Button>
      )}
    </div>
  );
}

const COMMON_TAGS = [
  "bored", "lonely", "tired", "saw something", 
  "late night", "stressed", "social media", "anxious"
];

export default function Journal() {
  const { journalEntries, addJournalEntry, deleteJournalEntry, addUrgeSession } = useFreedom();
  const [text, setText] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [overcameOpen, setOvercameOpen] = useState(false);

  const confirmDelete = () => {
    if (pendingDeleteId) {
      deleteJournalEntry(pendingDeleteId);
      setPendingDeleteId(null);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = () => {
    if (!text.trim() && selectedTags.length === 0) return;

    addJournalEntry({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      text: text.trim(),
      tags: selectedTags
    });

    setText("");
    setSelectedTags([]);
    setOvercameOpen(true);
  };

  const handleOvercameAnswer = (overcame: boolean) => {
    if (overcame) {
      addUrgeSession({
        timestamp: new Date().toISOString(),
        completed: true,
      });
    }
    setOvercameOpen(false);
  };

  const topTriggers = useMemo(() => {
    if (journalEntries.length === 0) return [];
    
    const tagCounts: Record<string, number> = {};
    journalEntries.forEach(entry => {
      entry.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    
    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [journalEntries]);

  return (
    <div className="py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-serif text-foreground">Trigger Journal</h1>
        <p className="text-muted-foreground text-sm">Document your urges to identify patterns.</p>
      </div>

      <WhyImDoingThisCard />

      <div className="bg-card border border-border rounded-lg p-4 space-y-4">
        <Textarea 
          placeholder="What triggered this urge? What are you feeling?"
          className="bg-background border-border resize-none h-24 text-foreground placeholder:text-muted-foreground/50"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        
        <div className="flex flex-wrap gap-2">
          {COMMON_TAGS.map(tag => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1 rounded-full text-xs font-mono transition-colors ${
                selectedTags.includes(tag)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
        
        <div className="flex justify-end">
          <Button 
            onClick={handleSubmit}
            disabled={!text.trim() && selectedTags.length === 0}
            className="font-mono uppercase tracking-widest text-xs"
          >
            Log Entry
          </Button>
        </div>
      </div>

      {topTriggers.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <h3 className="text-xs font-mono uppercase tracking-widest text-primary mb-3">Patterns</h3>
          <p className="text-sm text-foreground">
            Most common triggers:{" "}
            {topTriggers.map(([tag, count], i) => (
              <span key={tag} className="font-medium">
                {tag} ({count}x){i < topTriggers.length - 1 ? ", " : ""}
              </span>
            ))}
          </p>
        </div>
      )}

      <div className="space-y-4">
        {journalEntries.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm font-mono">
            No entries yet.
          </div>
        ) : (
          journalEntries.map((entry) => (
            <div key={entry.id} className="border-b border-border/50 pb-4 last:border-0">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs text-muted-foreground font-mono">
                  {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                </span>
                <button 
                  onClick={() => setPendingDeleteId(entry.id)}
                  className="text-muted-foreground/50 hover:text-destructive transition-colors"
                  data-testid={`button-delete-${entry.id}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              
              {entry.text && (
                <p className="text-foreground text-sm mb-3 whitespace-pre-wrap">
                  {entry.text}
                </p>
              )}
              
              {entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {entry.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-muted rounded-full text-[10px] font-mono text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <Dialog open={overcameOpen} onOpenChange={(o) => !o && setOvercameOpen(false)}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground font-serif text-xl">Did you overcome this urge?</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              If you got through it, we'll add it to your Urges Surfed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row justify-between sm:justify-between pt-4">
            <Button
              variant="ghost"
              onClick={() => handleOvercameAnswer(false)}
              data-testid="button-overcame-no"
            >
              No
            </Button>
            <Button
              onClick={() => handleOvercameAnswer(true)}
              data-testid="button-overcame-yes"
            >
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pendingDeleteId} onOpenChange={(o) => !o && setPendingDeleteId(null)}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground font-serif text-xl">Delete log?</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Do you want to delete this log? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row justify-between sm:justify-between pt-4">
            <Button
              variant="ghost"
              onClick={() => setPendingDeleteId(null)}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              data-testid="button-confirm-delete"
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

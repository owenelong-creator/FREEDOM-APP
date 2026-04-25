import { useState, useMemo, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { Trash2, Heart, Pencil, Check, X } from "lucide-react";
import { useFreedom } from "@/lib/context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function WhyImDoingThisCard() {
  const { whyReason, setWhyReason } = useFreedom();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(whyReason);

  useEffect(() => {
    if (!editing) setDraft(whyReason);
  }, [whyReason, editing]);

  const isEmpty = !whyReason.trim();
  const showEditor = editing || isEmpty;

  const handleSave = () => {
    setWhyReason(draft.trim());
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(whyReason);
    setEditing(false);
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
            Why I'm Doing This
          </h2>
        </div>
        {!showEditor && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-muted-foreground/70 hover:text-foreground p-1 -m-1"
            aria-label="Edit reason"
            data-testid="why-edit"
          >
            <Pencil size={14} />
          </button>
        )}
      </div>

      {showEditor ? (
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Write the real reason — the one you'll need to remember at 2 AM. It
            shows up on your home screen as a reminder.
          </p>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 500))}
            placeholder="For my future self. For the kids I want to have one day. Because I'm sick of being a slave to this…"
            className="bg-background border-border resize-none h-24 text-foreground placeholder:text-muted-foreground/50"
            data-testid="why-input"
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-muted-foreground/60">
              {draft.length}/500
            </span>
            <div className="flex gap-2">
              {!isEmpty && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancel}
                  className="font-mono uppercase tracking-widest text-[10px]"
                  data-testid="why-cancel"
                >
                  <X size={12} className="mr-1" /> Cancel
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!draft.trim()}
                className="font-mono uppercase tracking-widest text-[10px]"
                data-testid="why-save"
              >
                <Check size={12} className="mr-1" /> Save
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <blockquote className="border-l-2 border-primary/60 pl-3 py-1">
          <p className="text-foreground font-serif text-base leading-relaxed whitespace-pre-wrap">
            {whyReason}
          </p>
        </blockquote>
      )}
    </div>
  );
}

const COMMON_TAGS = [
  "bored", "lonely", "tired", "saw something", 
  "late night", "stressed", "social media", "anxious"
];

export default function Journal() {
  const { journalEntries, addJournalEntry, deleteJournalEntry } = useFreedom();
  const [text, setText] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

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

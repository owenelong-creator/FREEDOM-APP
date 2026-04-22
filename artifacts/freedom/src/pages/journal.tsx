import { useState, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { Trash2 } from "lucide-react";
import { useFreedom } from "@/lib/context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

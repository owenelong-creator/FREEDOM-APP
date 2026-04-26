import { useEffect, useState } from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { useUnseenWarnings } from "@/lib/notifications-store";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function WarningNotifications() {
  const { items, markSeen } = useUnseenWarnings();
  const [activeId, setActiveId] = useState<string | null>(null);

  const active = items.find((n) => n.id === activeId) || items[0] || null;

  useEffect(() => {
    if (!activeId && items.length > 0) {
      setActiveId(items[0].id);
    }
  }, [items, activeId]);

  if (!active) return null;

  const Icon = active.kind === "removal" ? ShieldAlert : AlertTriangle;
  const title = active.kind === "removal" ? "Content removed" : "Community warning";

  const handleClose = async () => {
    const id = active.id;
    setActiveId(null);
    await markSeen(id);
  };

  return (
    <Dialog open={!!active} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        className="bg-card border-border sm:max-w-md"
        data-testid={`warning-notification-${active.id}`}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Icon size={20} className="text-destructive" />
            <DialogTitle className="text-foreground font-serif text-xl">
              {title}
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <p className="text-sm text-foreground/90">{active.message}</p>
          {active.targetMessage && (
            <div className="rounded-md border border-border bg-background/60 p-3">
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
                Reported content
              </div>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">
                {active.targetMessage}
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            onClick={handleClose}
            className="font-mono uppercase tracking-widest text-xs"
            data-testid="button-warning-acknowledge"
          >
            I understand
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

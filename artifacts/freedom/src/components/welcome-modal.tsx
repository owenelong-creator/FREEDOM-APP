import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const WELCOMED_KEY = "freedom_welcomed_uids";

function getWelcomed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(WELCOMED_KEY) || "[]");
  } catch {
    return [];
  }
}

function markWelcomed(uid: string) {
  const list = getWelcomed();
  if (!list.includes(uid)) {
    localStorage.setItem(WELCOMED_KEY, JSON.stringify([...list, uid]));
  }
}

export default function WelcomeModal() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const meta = user.metadata;
    const created = meta?.creationTime ? new Date(meta.creationTime).getTime() : 0;
    const lastSignIn = meta?.lastSignInTime ? new Date(meta.lastSignInTime).getTime() : 0;
    // Treat as new if account is younger than 5 minutes OR sign-in time is
    // within ~10s of creation, AND we haven't shown the welcome on this device.
    const isNew =
      Math.abs(lastSignIn - created) < 60_000 || Date.now() - created < 5 * 60_000;
    if (isNew && !getWelcomed().includes(user.uid)) {
      setOpen(true);
    }
  }, [user]);

  const handleClose = () => {
    if (user) markWelcomed(user.uid);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? handleClose() : null)}>
      <DialogContent
        className="bg-card border-border sm:max-w-sm text-center"
        data-testid="welcome-modal"
      >
        <DialogHeader>
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mb-2">
            <Sparkles className="text-primary" size={26} />
          </div>
          <DialogTitle className="text-foreground font-serif text-2xl">
            Welcome to Freedom
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm text-foreground/90 leading-relaxed">
          <p className="font-serif text-base text-foreground">
            You're taking a brave step.
          </p>
          <p>
            One day at a time —{" "}
            <span className="text-foreground font-medium">you've got this.</span>
          </p>
          <p className="text-xs font-mono uppercase tracking-widest text-primary/80 pt-1">
            We're all in this together
          </p>
        </div>

        <Button
          onClick={handleClose}
          className="w-full font-mono uppercase tracking-widest text-xs mt-2"
          data-testid="button-welcome-continue"
        >
          Let's begin
        </Button>
      </DialogContent>
    </Dialog>
  );
}

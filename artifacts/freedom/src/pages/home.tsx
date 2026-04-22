import { useState, useEffect } from "react";
import { differenceInSeconds, differenceInDays } from "date-fns";
import { motion } from "framer-motion";
import { useFreedom } from "@/lib/context";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const MILESTONES = [
  { days: 1, title: "Decision made", desc: "The hardest step is behind you." },
  { days: 3, title: "Brain fog clearing", desc: "Your mind is beginning to wake up." },
  { days: 7, title: "Willpower compounding", desc: "One full week. The foundation is set." },
  { days: 14, title: "Dopamine rebuilding", desc: "Your baseline is resetting to normal." },
  { days: 30, title: "New identity forming", desc: "You are no longer the person who started." },
  { days: 60, title: "Old self is a stranger", desc: "The urges are whispers now." },
  { days: 90, title: "Rewired", desc: "A true shift in your brain's pathways." },
  { days: 180, title: "Half a year", desc: "Six months of unshakeable freedom." },
  { days: 365, title: "One year", desc: "You did it." },
];

export default function Home() {
  const { startDate, setStartDate, urgeSessions, resetAll } = useFreedom();
  const [now, setNow] = useState(new Date());
  
  const [resetStep, setResetStep] = useState(1);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [isResetOpen, setIsResetOpen] = useState(false);

  useEffect(() => {
    if (!startDate) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [startDate]);

  if (!startDate) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8 px-4">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-serif font-bold text-foreground">Freedom</h1>
          <p className="text-muted-foreground text-lg max-w-xs mx-auto">
            The hardest step is the first one. When did you make the decision?
          </p>
        </div>
        <div className="w-full max-w-xs space-y-4">
          <Input 
            type="datetime-local" 
            className="w-full bg-card border-border text-foreground py-6"
            onChange={(e) => {
              if (e.target.value) {
                setStartDate(new Date(e.target.value).toISOString());
              }
            }}
          />
          <Button 
            className="w-full py-6 font-mono tracking-widest uppercase font-bold"
            onClick={() => {
              if (!startDate) {
                setStartDate(new Date().toISOString());
              }
            }}
          >
            Begin
          </Button>
        </div>
      </div>
    );
  }

  const start = new Date(startDate);
  const totalSeconds = Math.max(0, differenceInSeconds(now, start));
  
  const days = Math.floor(totalSeconds / (24 * 3600));
  const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const handleReset = () => {
    setStartDate(new Date().toISOString());
    setIsResetOpen(false);
    setResetStep(1);
    setResetConfirmText("");
  };

  return (
    <div className="flex flex-col py-12 space-y-16">
      <div className="flex flex-col items-center text-center space-y-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center"
        >
          <span className="text-[8rem] leading-none font-sans font-bold text-foreground tracking-tighter tabular-nums">
            {days}
          </span>
          <span className="text-muted-foreground font-mono uppercase tracking-[0.3em] text-sm mt-2">
            Days
          </span>
        </motion.div>

        <div className="flex space-x-6 text-2xl font-mono text-muted-foreground tabular-nums pt-4">
          <div className="flex flex-col items-center">
            <span className="text-foreground">{hours.toString().padStart(2, '0')}</span>
            <span className="text-[10px] uppercase tracking-widest mt-1">HRS</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-foreground">{minutes.toString().padStart(2, '0')}</span>
            <span className="text-[10px] uppercase tracking-widest mt-1">MIN</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-foreground">{seconds.toString().padStart(2, '0')}</span>
            <span className="text-[10px] uppercase tracking-widest mt-1">SEC</span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground px-2">Path</h3>
        <div className="flex overflow-x-auto pb-4 px-2 snap-x snap-mandatory hide-scrollbar space-x-4">
          {MILESTONES.map((m) => {
            const achieved = days >= m.days;
            const current = days < m.days && (m.days === MILESTONES.find(x => x.days > days)?.days);
            
            return (
              <div 
                key={m.days}
                className={`snap-center shrink-0 w-64 p-5 rounded-lg border flex flex-col space-y-2 ${
                  achieved 
                    ? "border-primary/50 bg-primary/5" 
                    : current 
                      ? "border-border bg-card" 
                      : "border-border/50 bg-card/50 opacity-50"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className={`font-mono text-sm font-bold ${achieved ? "text-primary" : "text-foreground"}`}>
                    Day {m.days}
                  </span>
                  {achieved && <div className="w-2 h-2 rounded-full bg-primary" />}
                </div>
                <h4 className="font-serif font-medium text-foreground">{m.title}</h4>
                <p className="text-xs text-muted-foreground">{m.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-4">
        <div className="bg-card border border-card-border rounded-2xl p-6 space-y-6">
          <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground text-center">
            Your Stats
          </h3>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <div className="text-3xl font-bold tabular-nums" style={{ color: "hsl(var(--stat))" }}>
                {days}
              </div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                Days
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold tabular-nums" style={{ color: "hsl(var(--stat))" }}>
                {urgeSessions.length}
              </div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                Urges Surfed
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-bold tabular-nums" style={{ color: "hsl(var(--stat))" }}>
                {MILESTONES.filter((m) => days >= m.days).length}
              </div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                Milestones
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-border/60 flex flex-col items-center">
            <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground/70 mb-3">
              Danger Zone
            </span>
            <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
              <DialogTrigger asChild>
                <button
                  className="danger-pulse bg-destructive text-destructive-foreground font-mono font-bold uppercase tracking-widest text-xs px-8 py-3 rounded-full hover:brightness-110 active:scale-95 transition-all"
                  data-testid="button-danger-zone-reset"
                >
                  Reset Timer
                </button>
              </DialogTrigger>
          <DialogContent className="bg-card border-border sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-foreground font-serif text-2xl">Reset Timer</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {resetStep === 1 
                  ? `Are you sure you want to reset? You will lose ${days} days of progress.`
                  : "Type 'RESET' to confirm."}
              </DialogDescription>
            </DialogHeader>
            
            {resetStep === 2 && (
              <Input 
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder="RESET"
                className="font-mono uppercase bg-background border-border text-foreground"
              />
            )}

            <DialogFooter className="flex-row justify-between sm:justify-between pt-4">
              <Button variant="ghost" onClick={() => { setIsResetOpen(false); setResetStep(1); setResetConfirmText(""); }}>
                Cancel
              </Button>
              {resetStep === 1 ? (
                <Button variant="destructive" onClick={() => setResetStep(2)}>
                  Continue
                </Button>
              ) : (
                <Button 
                  variant="destructive" 
                  disabled={resetConfirmText !== "RESET"}
                  onClick={handleReset}
                >
                  Confirm Reset
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}

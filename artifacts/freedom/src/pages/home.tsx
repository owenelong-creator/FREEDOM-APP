import { useState, useEffect, useMemo } from "react";
import { differenceInSeconds } from "date-fns";
import { motion } from "framer-motion";
import { useFreedom } from "@/lib/context";
import { VERSES } from "@/lib/verses";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const RESET_QUOTES = [
  "Every setback is a setup for a comeback.",
  "You're not starting over, you're starting stronger.",
  "This is your moment. Own it.",
  "Progress isn't perfect, but it's yours.",
  "One day at a time. You've got this.",
  "The only bad day is the one you didn't learn from.",
  "Fall down seven times, stand up eight.",
  "You are stronger than your strongest excuse.",
  "Small steps forward are still forward.",
  "Your future self is watching. Make them proud.",
  "Pain is temporary. Pride is forever.",
  "What you're building is worth the fight.",
  "You've survived 100% of your bad days.",
  "Discipline is choosing between what you want now and what you want most.",
  "Every reset is a new beginning.",
  "You're allowed to be a work in progress.",
  "The comeback is always stronger than the setback.",
  "You didn't come this far to only come this far.",
  "Keep going. Your breakthrough is closer than you think.",
  "Today is day one of the rest of your life.",
  "Strength grows in the moments you think you can't continue.",
  "You are the author of your next chapter.",
  "Turn the page. A new story starts today.",
  "Resilience is accepting the storm and still choosing to dance in the rain.",
  "You've got more fight in you than you know.",
  "Don't count the days, make the days count.",
  "This is tough, but so are you.",
  "You are not defined by your worst moment.",
  "Growth happens when you choose to begin again.",
  "One reset at a time. You're doing great.",
];

const RESET_QUOTES_RECENT_KEY = "freedom_reset_quote_recent";
const RESET_QUOTES_AVOID_RECENT = 10;

function pickResetQuote(): string {
  let recent: number[] = [];
  try {
    const raw = localStorage.getItem(RESET_QUOTES_RECENT_KEY);
    if (raw) recent = JSON.parse(raw);
    if (!Array.isArray(recent)) recent = [];
  } catch {
    recent = [];
  }
  const recentSet = new Set(recent);
  const candidates: number[] = [];
  for (let i = 0; i < RESET_QUOTES.length; i++) {
    if (!recentSet.has(i)) candidates.push(i);
  }
  const pool = candidates.length > 0 ? candidates : RESET_QUOTES.map((_, i) => i);
  const idx = pool[Math.floor(Math.random() * pool.length)];
  const nextRecent = [...recent, idx].slice(-RESET_QUOTES_AVOID_RECENT);
  try {
    localStorage.setItem(RESET_QUOTES_RECENT_KEY, JSON.stringify(nextRecent));
  } catch {
    /* ignore */
  }
  return RESET_QUOTES[idx];
}

const DAILY_QUOTES = [
  "The chains you break today free the future you tomorrow.",
  "Discipline is choosing what you want most over what you want now.",
  "You don't have to be ready. You just have to begin.",
  "The cave you fear holds the treasure you seek.",
  "Your story isn't over. This is the turning page.",
  "Strength doesn't come from what you can do. It comes from overcoming what you thought you couldn't.",
  "The urge will pass. The pride will not.",
  "Quiet your mind. Watch the wave roll by.",
  "Every clean day is a vote for who you're becoming.",
  "You are not your worst moment. You are this one.",
  "Pain is temporary. Quitting on yourself lasts forever.",
  "Today is a new chance. Take it.",
  "Your future self is already thanking you.",
  "Small wins, stacked daily, become a different life.",
  "The only person you have to be better than is who you were yesterday.",
  "Protect your peace like it's the rarest thing you own.",
  "Brave isn't the absence of fear. It's moving forward anyway.",
  "Your habits are a vote for the person you want to be.",
  "One urge surfed is one urge weaker.",
  "Light always wins. Just give it a little more time.",
  "Don't break the chain. Don't break yourself.",
  "Healing isn't linear. Keep going anyway.",
  "Progress, not perfection.",
  "You've already done the hardest part: deciding.",
  "Every craving is a chance to grow stronger.",
  "Be patient with yourself. You're rebuilding.",
  "The mountain is climbed one step at a time.",
  "Freedom is not a destination. It's a daily practice.",
  "Your only competition is who you were last week.",
  "Stay soft. Stay strong. Stay free.",
];

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86400_000);
}

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
  const { startDate, setStartDate, urgeSessions, resetAll, reasons, showDailyVerse } = useFreedom();
  const [now, setNow] = useState(new Date());
  
  const [resetStep, setResetStep] = useState(1);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [encouragement, setEncouragement] = useState<string | null>(null);

  useEffect(() => {
    if (!startDate) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [startDate]);

  // Hooks MUST be called unconditionally before any early return — moving
  // dailyQuote up here fixes the "Rendered more hooks than during the previous
  // render" crash that fired the moment the user picked a start date.
  const dailyQuote = useMemo(
    () => DAILY_QUOTES[dayOfYear(now) % DAILY_QUOTES.length],
    // changes once per calendar day
    [now.getFullYear(), now.getMonth(), now.getDate()]
  );

  // Daily Bible verse — index drifts each day, plus a small year-based offset
  // so two adjacent years don't show the exact same calendar-day verse.
  const dailyVerse = useMemo(
    () =>
      VERSES[
        (dayOfYear(now) + now.getFullYear() * 7) % VERSES.length
      ],
    [now.getFullYear(), now.getMonth(), now.getDate()]
  );

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

  // Fire emoji grows with streak length
  const fireSize = Math.min(48 + days * 1.4, 120);

  const handleReset = () => {
    setStartDate(new Date().toISOString());
    setIsResetOpen(false);
    setResetStep(1);
    setResetConfirmText("");
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try { navigator.vibrate(50); } catch { /* ignore */ }
    }
    setEncouragement(pickResetQuote());
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

        {/* Streak counter with growing fire */}
        <motion.div
          key={days}
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 18 }}
          className="flex items-center gap-3 pt-6"
          data-testid="streak-counter"
        >
          <span style={{ fontSize: `${fireSize}px`, lineHeight: 1 }} aria-hidden="true">
            🔥
          </span>
          <div className="flex flex-col items-start">
            <span
              className="font-bold tabular-nums leading-none"
              style={{ color: "hsl(var(--stat))", fontSize: `${Math.min(28 + days * 0.4, 56)}px` }}
            >
              {days}
            </span>
            <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground mt-1">
              {days === 1 ? "Day Sober" : "Days Sober"}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Personal reasons — set in the Journal page, swipe to navigate */}
      {reasons.length > 0 && (
        <div data-testid="why-reminder" className="space-y-3">
          <div className="flex items-center gap-2 px-2">
            <span aria-hidden="true">❤️</span>
            <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-primary">
              Why I'm Fighting For Freedom
            </div>
            {reasons.length > 1 && (
              <span className="ml-auto text-[10px] font-mono text-muted-foreground/60 tabular-nums">
                {reasons.length} reasons · swipe →
              </span>
            )}
          </div>
          <div
            className="flex overflow-x-auto pb-2 px-1 snap-x snap-mandatory hide-scrollbar gap-3"
            data-testid="reasons-carousel"
          >
            {reasons.map((reason, idx) => (
              <div
                key={reason.id}
                className="snap-center shrink-0 w-[88%] sm:w-[420px] bg-primary/5 border border-primary/30 rounded-2xl px-6 py-5"
                data-testid={`reason-card-${idx}`}
              >
                <blockquote className="border-l-2 border-primary/60 pl-3 h-full flex items-center">
                  <p className="text-foreground font-serif text-lg leading-snug whitespace-pre-wrap">
                    {reason.text}
                  </p>
                </blockquote>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily Bible verse (optional, off by default — set in Settings) */}
      {showDailyVerse && (
        <div
          className="bg-card border border-card-border rounded-2xl px-6 py-5 mx-1"
          data-testid="daily-verse"
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-primary">
              Daily Scripture
            </div>
            <div
              className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70"
              data-testid="daily-verse-ref"
            >
              {dailyVerse.ref}
            </div>
          </div>
          <p
            className="text-foreground font-serif text-base leading-snug"
            data-testid="daily-verse-text"
          >
            “{dailyVerse.text}”
          </p>
        </div>
      )}

      {/* Daily motivational quote */}
      <div className="bg-card border border-card-border rounded-2xl px-6 py-5 mx-1">
        <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-primary mb-2">
          Today's Reminder
        </div>
        <p
          className="text-foreground font-serif text-lg leading-snug"
          data-testid="daily-quote"
        >
          “{dailyQuote}”
        </p>
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
                {urgeSessions.filter((u) => u.completed).length}
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

      <Dialog open={!!encouragement} onOpenChange={(o) => !o && setEncouragement(null)}>
        <DialogContent
          className="bg-card border-border p-0 overflow-hidden sm:max-w-md w-[88vw]"
          style={{ height: "55vh" }}
        >
          <div className="h-full w-full flex flex-col items-center justify-center text-center px-6 py-8 space-y-8">
            <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-primary">
              Fresh Start
            </div>
            <p className="text-foreground font-serif text-2xl leading-snug max-w-xs">
              {encouragement}
            </p>
            <button
              onClick={() => setEncouragement(null)}
              className="bg-primary text-primary-foreground font-mono font-bold uppercase tracking-widest text-xs px-8 py-3 rounded-full hover:bg-accent active:scale-95 transition-all"
              data-testid="button-encouragement-close"
            >
              I've Got This
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

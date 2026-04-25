import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, MessageSquare, ShieldAlert } from "lucide-react";
import { useFreedom } from "@/lib/context";

function HelpResourcesCard() {
  return (
    <div
      className="w-full max-w-sm bg-card/70 backdrop-blur border border-border/60 rounded-lg p-3 space-y-2"
      data-testid="help-resources"
    >
      <div className="flex items-center gap-2">
        <ShieldAlert size={14} className="text-destructive" />
        <h3 className="font-mono text-[10px] uppercase tracking-widest text-foreground">
          Need immediate help?
        </h3>
      </div>

      <div className="space-y-1">
        <a
          href="tel:988"
          className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 active:bg-muted transition-colors"
          data-testid="hotline-988"
        >
          <Phone size={14} className="text-primary mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm text-foreground font-medium">988</div>
            <div className="text-[10px] text-muted-foreground leading-tight">
              Suicide & Crisis Lifeline · 24/7
            </div>
          </div>
        </a>

        <a
          href="tel:18006624357"
          className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 active:bg-muted transition-colors"
          data-testid="hotline-samhsa"
        >
          <Phone size={14} className="text-primary mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm text-foreground font-medium">
              1-800-662-HELP (4357)
            </div>
            <div className="text-[10px] text-muted-foreground leading-tight">
              SAMHSA Helpline · substance use & mental health
            </div>
          </div>
        </a>

        <a
          href="sms:741741?body=HOME"
          className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 active:bg-muted transition-colors"
          data-testid="hotline-text"
        >
          <MessageSquare size={14} className="text-primary mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm text-foreground font-medium">
              Text HOME to 741741
            </div>
            <div className="text-[10px] text-muted-foreground leading-tight">
              Crisis Text Line · free, confidential
            </div>
          </div>
        </a>
      </div>
    </div>
  );
}

const DURATION_SECONDS = 300; // 5 minutes

const QUOTES = [
  "Is 5 minutes of browsing worth losing your streak?",
  "Put the phone down. The urge will pass. It always does.",
  "Future-you is watching. Don't betray them.",
  "This feeling is a wave. Surf it. Don't drown in it.",
  "You've gotten through worse than this.",
  "Notice the urge. Name it. Watch it shrink.",
  "Your brain is lying to you right now.",
  "Discomfort is the currency of growth."
];

export default function UrgeSurfModal() {
  const { setIsUrgeSurfing, addUrgeSession } = useFreedom();
  const [timeLeft, setTimeLeft] = useState(DURATION_SECONDS);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [showExitEarly, setShowExitEarly] = useState(false);
  const [phase, setPhase] = useState<"inhale" | "hold" | "exhale">("inhale");

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  useEffect(() => {
    if (timeLeft === 0) return;

    // Show exit early button after 60 seconds (when time left is DURATION - 60)
    if (DURATION_SECONDS - timeLeft >= 60) {
      setShowExitEarly(true);
    }

    // Rotate quotes every 15 seconds
    if (timeLeft % 15 === 0 && timeLeft !== DURATION_SECONDS) {
      setQuoteIndex((prev) => (prev + 1) % QUOTES.length);
    }
  }, [timeLeft]);

  useEffect(() => {
    if (timeLeft === 0) return;

    // Breathing logic: 4s inhale, 4s hold, 6s exhale (14s total cycle)
    const cycleTime = (DURATION_SECONDS - timeLeft) % 14;
    
    if (cycleTime < 4) {
      setPhase("inhale");
    } else if (cycleTime < 8) {
      setPhase("hold");
    } else {
      setPhase("exhale");
    }
  }, [timeLeft]);

  const handleFinish = (completed: boolean) => {
    addUrgeSession({
      timestamp: new Date().toISOString(),
      completed
    });
    setIsUrgeSurfing(false);
  };

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timeString = `${mins}:${secs.toString().padStart(2, "0")}`;

  if (timeLeft === 0) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-sm space-y-8"
        >
          <h2 className="text-3xl font-serif text-foreground">You did it.</h2>
          <p className="text-muted-foreground text-lg">The wave passed. You are still in control.</p>
          <button
            onClick={() => handleFinish(true)}
            className="w-full bg-primary text-primary-foreground py-4 rounded-md font-mono uppercase tracking-widest text-sm font-bold"
          >
            Return to Freedom
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-between p-6">
      <div className="w-full flex justify-center pt-12">
        <span className="font-mono text-5xl font-bold tracking-tighter text-foreground tabular-nums">
          {timeString}
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full relative">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            animate={{
              scale: phase === "inhale" ? 1.5 : phase === "hold" ? 1.5 : 0.8,
              opacity: phase === "hold" ? 0.3 : 0.1
            }}
            transition={{
              duration: phase === "inhale" ? 4 : phase === "hold" ? 4 : 6,
              ease: "easeInOut"
            }}
            className="w-48 h-48 rounded-full bg-primary"
          />
        </div>
        
        <div className="z-10 text-center space-y-2 h-20 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={phase}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
              className="text-primary font-mono tracking-widest uppercase text-sm"
            >
              {phase === "inhale" ? "Breathe In" : phase === "hold" ? "Hold" : "Breathe Out"}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="mt-12 h-28 flex items-center justify-center w-full max-w-sm text-center px-4">
          <AnimatePresence mode="wait">
            <motion.p
              key={quoteIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="text-xl font-serif text-muted-foreground leading-relaxed"
            >
              "{QUOTES[quoteIndex]}"
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      <div className="w-full flex flex-col items-center gap-4 pb-6">
        <HelpResourcesCard />
        {showExitEarly ? (
          <button
            onClick={() => handleFinish(false)}
            className="text-muted-foreground text-sm font-mono opacity-50 hover:opacity-100 transition-opacity"
          >
            I'm safe, exit early
          </button>
        ) : (
          <div className="text-muted-foreground text-sm font-mono opacity-30">
            Ride it out
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Clock, BookOpen, Shield, Settings, AlertCircle, Users } from "lucide-react";
import { useFreedom } from "@/lib/context";
import UrgeSurfModal from "./urge-surf-modal";

const navItems = [
  { path: "/", icon: Clock, label: "Clock" },
  { path: "/journal", icon: BookOpen, label: "Journal" },
  { path: "/community", icon: Users, label: "Community" },
  { path: "/fortress", icon: Shield, label: "Fortress" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { isUrgeSurfing, setIsUrgeSurfing } = useFreedom();
  const [firstTapDone, setFirstTapDone] = useState(false);

  const handleFirstTap = () => {
    if (firstTapDone) return;
    setFirstTapDone(true);
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try { navigator.vibrate([400, 100, 400]); } catch { /* ignore */ }
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground overflow-x-hidden">
      <main
        className="flex-1 w-full max-w-md mx-auto relative px-4"
        style={{ paddingBottom: "calc(120px + env(safe-area-inset-bottom))" }}
      >
        {children}
      </main>

      {/* Floating Urge Button - only show if not in urge mode. Sits above bottom nav. */}
      {!isUrgeSurfing && (
        <button
          onClick={() => setIsUrgeSurfing(true)}
          style={{
            bottom: "calc(80px + env(safe-area-inset-bottom))",
            right: "16px",
          }}
          className="fixed z-[60] bg-primary text-primary-foreground font-mono font-bold uppercase tracking-widest text-sm px-5 py-3 rounded-full shadow-xl shadow-primary/30 flex items-center gap-2 active:scale-95 transition-transform hover:bg-accent"
          data-testid="button-urge-floating"
        >
          <AlertCircle size={18} />
          I have an urge
        </button>
      )}

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-t border-border" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex justify-around items-center h-16 max-w-md mx-auto">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location === path;
            return (
              <Link
                key={path}
                href={path}
                onClick={() => {
                  if (!isActive && typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
                    try { navigator.vibrate(30); } catch { /* ignore */ }
                  }
                }}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground transition-colors"}`}
              >
                <Icon size={24} strokeWidth={isActive ? 2 : 1.5} />
                <span className="text-[10px] font-medium tracking-wide">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Urge Surf Modal Overlay */}
      {isUrgeSurfing && <UrgeSurfModal />}

      {/* First-tap rumble overlay — invisible, captures one tap then disappears */}
      {!firstTapDone && (
        <div
          onPointerDown={handleFirstTap}
          className="fixed inset-0 z-[9999] bg-transparent"
          aria-hidden="true"
          data-testid="overlay-first-tap"
        />
      )}
    </div>
  );
}

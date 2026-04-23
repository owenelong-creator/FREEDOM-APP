import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, AlertTriangle } from "lucide-react";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.2.8 3.9 1.5l2.7-2.6C17 3.3 14.7 2.3 12 2.3 6.7 2.3 2.4 6.6 2.4 12s4.3 9.7 9.6 9.7c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M16.36 12.7c0-2.4 2-3.55 2.05-3.6-1.13-1.65-2.88-1.88-3.5-1.9-1.49-.15-2.91.88-3.66.88-.77 0-1.93-.86-3.18-.84-1.63.02-3.14.95-3.99 2.42-1.7 2.95-.43 7.3 1.22 9.7.81 1.16 1.77 2.47 3.04 2.43 1.22-.05 1.68-.79 3.16-.79 1.46 0 1.88.79 3.18.76 1.32-.02 2.15-1.18 2.95-2.36.93-1.36 1.32-2.69 1.34-2.76-.03-.01-2.58-.99-2.61-3.94zM13.96 5.27c.66-.81 1.11-1.92.99-3.04-.96.04-2.13.65-2.82 1.45-.61.71-1.16 1.86-1.02 2.95 1.07.08 2.18-.55 2.85-1.36z" />
    </svg>
  );
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [emailOpen, setEmailOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!auth.configured) {
    // Firebase env vars missing — keep app working in pure-local mode.
    return <>{children}</>;
  }

  if (auth.loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  if (auth.user) {
    return <>{children}</>;
  }

  const wrap = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      setError(err.message || err.code || "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background text-foreground px-6 py-10">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-serif font-bold">Freedom</h1>
          <p className="text-muted-foreground text-sm">
            Sign in to sync your progress across every device.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            disabled={busy}
            onClick={() => wrap(auth.signInWithGoogle)}
            className="w-full bg-card hover:bg-muted text-foreground border border-border h-12 justify-center gap-3 font-mono uppercase tracking-widest text-xs"
            data-testid="button-signin-google"
          >
            <GoogleIcon /> Continue with Google
          </Button>
          <Button
            disabled={busy}
            onClick={() => wrap(auth.signInWithApple)}
            className="w-full bg-foreground hover:bg-foreground/90 text-background h-12 justify-center gap-3 font-mono uppercase tracking-widest text-xs"
            data-testid="button-signin-apple"
          >
            <AppleIcon /> Continue with Apple
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setEmailOpen((v) => !v)}
            className="w-full border-border h-12 justify-center gap-3 font-mono uppercase tracking-widest text-xs"
            data-testid="button-signin-email-toggle"
          >
            <Mail size={16} /> {emailOpen ? "Hide email form" : "Continue with Email"}
          </Button>
        </div>

        {emailOpen && (
          <div className="space-y-3 bg-card border border-border rounded-lg p-4">
            <Input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-background border-border"
              data-testid="input-email"
            />
            <Input
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              placeholder="Password (8+ characters)"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className="bg-background border-border"
              data-testid="input-password"
            />
            <div className="flex gap-2">
              <Button
                disabled={busy || !email || pw.length < 6}
                onClick={() =>
                  wrap(() =>
                    mode === "signin"
                      ? auth.signInWithEmail(email, pw)
                      : auth.signUpWithEmail(email, pw)
                  )
                }
                className="flex-1 font-mono uppercase tracking-widest text-xs"
                data-testid="button-email-submit"
              >
                {busy ? <Loader2 className="animate-spin" size={16} /> : mode === "signin" ? "Sign In" : "Create Account"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
                className="font-mono text-xs"
                data-testid="button-toggle-mode"
              >
                {mode === "signin" ? "Sign up" : "Sign in"}
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 text-destructive text-xs font-mono bg-destructive/10 border border-destructive/30 rounded p-3">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <p className="text-[10px] font-mono text-muted-foreground/60 text-center uppercase tracking-widest">
          Your data is private. We sync your progress, not your name.
        </p>
      </div>
    </div>
  );
}

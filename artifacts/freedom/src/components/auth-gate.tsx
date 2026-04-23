import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, AlertTriangle, Shield, ArrowLeft } from "lucide-react";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.2.8 3.9 1.5l2.7-2.6C17 3.3 14.7 2.3 12 2.3 6.7 2.3 2.4 6.6 2.4 12s4.3 9.7 9.6 9.7c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z"
      />
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
      const code = err.code || "";
      const friendly =
        code === "auth/invalid-credential" || code === "auth/wrong-password"
          ? "That email or password isn't right."
          : code === "auth/user-not-found"
            ? "No account found with that email."
            : code === "auth/email-already-in-use"
              ? "An account with that email already exists."
              : code === "auth/weak-password"
                ? "Password should be at least 6 characters."
                : code === "auth/popup-closed-by-user"
                  ? "Sign-in was cancelled."
                  : err.message || "Sign-in failed.";
      setError(friendly);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[100dvh] relative overflow-hidden bg-background text-foreground">
      {/* Ambient gradient backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(60% 40% at 50% 0%, hsl(var(--primary) / 0.18) 0%, transparent 70%), radial-gradient(40% 35% at 80% 100%, hsl(var(--stat) / 0.12) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 min-h-[100dvh] flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-10">
          {/* Brand */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center shadow-lg shadow-primary/10">
              <Shield className="text-primary" size={28} strokeWidth={2.2} />
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl font-serif font-bold tracking-tight">
                Freedom
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-[18rem]">
                Take back control — one day at a time. Your progress, private
                and synced across every device.
              </p>
            </div>
          </div>

          {!emailOpen ? (
            <div className="space-y-3">
              <Button
                disabled={busy}
                onClick={() => wrap(auth.signInWithGoogle)}
                className="w-full bg-card hover:bg-muted text-foreground border border-border h-12 justify-center gap-3 font-medium rounded-xl"
                data-testid="button-signin-google"
              >
                <GoogleIcon /> Continue with Google
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setError(null);
                  setEmailOpen(true);
                }}
                className="w-full border-border h-12 justify-center gap-3 font-medium rounded-xl"
                data-testid="button-signin-email-toggle"
              >
                <Mail size={16} /> Continue with Email
              </Button>
            </div>
          ) : (
            <div className="space-y-4 bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setEmailOpen(false);
                    setError(null);
                  }}
                  className="flex items-center gap-1 text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground"
                  data-testid="button-back-to-providers"
                >
                  <ArrowLeft size={12} /> Back
                </button>
                <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                  {mode === "signin" ? "Sign in" : "Create account"}
                </span>
              </div>

              <div className="space-y-2.5">
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-background border-border h-11"
                  data-testid="input-email"
                />
                <Input
                  type="password"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  placeholder="Password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  className="bg-background border-border h-11"
                  data-testid="input-password"
                />
              </div>

              <Button
                disabled={busy || !email || pw.length < 6}
                onClick={() =>
                  wrap(() =>
                    mode === "signin"
                      ? auth.signInWithEmail(email, pw)
                      : auth.signUpWithEmail(email, pw)
                  )
                }
                className="w-full h-11 font-medium rounded-xl"
                data-testid="button-email-submit"
              >
                {busy ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : mode === "signin" ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setMode((m) => (m === "signin" ? "signup" : "signin"));
                  setError(null);
                }}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-toggle-mode"
              >
                {mode === "signin"
                  ? "New here? Create an account"
                  : "Already have an account? Sign in"}
              </button>
            </div>
          )}

          {error && (
            <div
              className="flex items-start gap-2 text-destructive text-xs bg-destructive/10 border border-destructive/30 rounded-xl p-3"
              data-testid="text-auth-error"
            >
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <p className="text-[10px] font-mono text-muted-foreground/60 text-center uppercase tracking-widest">
            Private by default · Your data, your device
          </p>
        </div>
      </div>
    </div>
  );
}

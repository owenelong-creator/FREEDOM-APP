import { useState, useMemo } from "react";
import { Link } from "wouter";
import { format, startOfWeek, addWeeks, isSameWeek } from "date-fns";
import { Shield, Sun, Moon, LogOut, UserCircle, ShieldAlert, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useIsAdmin } from "@/lib/admin";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useFreedom } from "@/lib/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function Settings() {
  const { startDate, setStartDate, urgeSessions, journalEntries, fortressItems, resetAll, appName, setAppName, theme, setTheme, usernameCooldownRemainingMs } = useFreedom();
  const { user, signOut, configured } = useAuth();
  const isAdmin = useIsAdmin();

  // Group urges into the last 8 weeks
  const weeklyUrges = useMemo(() => {
    const buckets: { label: string; count: number }[] = [];
    const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    for (let i = 7; i >= 0; i--) {
      const weekStart = addWeeks(thisWeekStart, -i);
      const count = urgeSessions.filter((u) =>
        isSameWeek(new Date(u.timestamp), weekStart, { weekStartsOn: 1 })
      ).length;
      buckets.push({ label: format(weekStart, "MMM d"), count });
    }
    return buckets;
  }, [urgeSessions]);

  const [resetStep, setResetStep] = useState(1);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState(appName);
  const [nameMessage, setNameMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const handleSaveName = () => {
    const result = setAppName(nameDraft);
    if (result.ok) {
      setNameMessage({ kind: "ok", text: "Name saved." });
    } else {
      setNameMessage({ kind: "err", text: result.error || "Could not save name." });
    }
    setTimeout(() => setNameMessage(null), 3000);
  };

  const handleExport = () => {
    const data = {
      startDate,
      urgeSessions,
      journalEntries,
      fortressItems,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `freedom-export-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleWipe = () => {
    resetAll();
    setIsResetOpen(false);
    setResetStep(1);
    setResetConfirmText("");
  };

  const totalFortressItems = 7; // Sync with fortress items count
  const isFullyProtected = fortressItems.length === totalFortressItems;

  return (
    <div className="py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-serif text-foreground">Settings</h1>
      </div>

      <div className="space-y-6">
        {configured && (
          <div className="space-y-4">
            <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
              Account
            </h3>
            <div className="bg-card border border-border p-4 rounded-lg flex items-center justify-between" data-testid="account-card">
              <div className="flex items-center gap-3 min-w-0">
                <UserCircle size={28} className="text-primary shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm text-foreground font-medium truncate" data-testid="account-email">
                    {user?.email || user?.displayName || "Signed in"}
                  </div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    {user ? "Synced across devices" : "Not signed in"}
                  </div>
                </div>
              </div>
              {user && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut()}
                  className="font-mono text-xs gap-1"
                  data-testid="button-sign-out"
                >
                  <LogOut size={14} /> Sign out
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
            Username
          </h3>
          <div className="bg-card border border-border p-4 rounded-lg space-y-3">
            <label className="text-xs text-muted-foreground block">
              Your username appears on community posts. You can change it once every 30 days.
            </label>
            <div className="flex gap-2">
              <Input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                maxLength={24}
                placeholder="My Freedom"
                disabled={usernameCooldownRemainingMs > 0}
                className="bg-background border-border text-foreground"
                data-testid="input-app-name"
              />
              <Button
                onClick={handleSaveName}
                disabled={nameDraft.trim() === appName.trim() || !nameDraft.trim() || usernameCooldownRemainingMs > 0}
                className="font-mono uppercase tracking-widest text-xs"
                data-testid="button-save-name"
              >
                Save
              </Button>
            </div>
            {usernameCooldownRemainingMs > 0 && (
              <p
                className="text-[10px] font-mono uppercase tracking-widest text-stat"
                data-testid="text-username-cooldown"
              >
                Locked · {Math.ceil(usernameCooldownRemainingMs / (24 * 60 * 60 * 1000))} days until you can change again
              </p>
            )}
            {nameMessage && (
              <p
                className={`text-xs font-mono ${
                  nameMessage.kind === "ok" ? "text-primary" : "text-destructive"
                }`}
                data-testid="text-name-message"
              >
                {nameMessage.text}
              </p>
            )}
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70">
              Currently: @{appName}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
            Commitment
          </h3>
          <div className="bg-card border border-border p-4 rounded-lg space-y-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Start Date</label>
              <Input 
                type="datetime-local" 
                value={startDate ? format(new Date(startDate), "yyyy-MM-dd'T'HH:mm") : ""}
                onChange={(e) => {
                  if (e.target.value) {
                    setStartDate(new Date(e.target.value).toISOString());
                  }
                }}
                className="bg-background border-border text-foreground"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
            Appearance
          </h3>
          <div className="bg-card border border-border p-4 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === "dark" ? (
                <Moon size={18} className="text-primary" />
              ) : (
                <Sun size={18} className="text-stat" />
              )}
              <div>
                <div className="text-sm text-foreground font-medium">
                  {theme === "dark" ? "Dark Mode" : "Light Mode"}
                </div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  Tap to switch theme
                </div>
              </div>
            </div>
            <button
              role="switch"
              aria-checked={theme === "dark"}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                theme === "dark" ? "bg-primary" : "bg-muted-foreground/30"
              }`}
              data-testid="button-theme-toggle"
            >
              <span
                className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-background shadow transition-transform"
                style={{ transform: theme === "dark" ? "translateX(28px)" : "translateX(0)" }}
              />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
            Statistics
          </h3>

          <div className="bg-card border border-border p-4 rounded-lg space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Urges Per Week
              </span>
              <span className="text-[10px] font-mono text-muted-foreground/60">
                Last 8 weeks
              </span>
            </div>
            <div className="h-40 w-full" data-testid="chart-urges-weekly">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyUrges} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 10 }}
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    width={28}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    itemStyle={{ color: "hsl(var(--primary))" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "hsl(var(--primary))" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card border border-border p-4 rounded-lg flex flex-col">
              <span className="text-2xl font-mono text-foreground mb-1">{urgeSessions.length}</span>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Urges Surfed</span>
            </div>
            <div className="bg-card border border-border p-4 rounded-lg flex flex-col">
              <span className="text-2xl font-mono text-foreground mb-1">{journalEntries.length}</span>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Journal Entries</span>
            </div>
            <div className="bg-card border border-border p-4 rounded-lg flex flex-col col-span-2 relative overflow-hidden">
              {isFullyProtected && (
                <div className="absolute top-0 right-0 p-4 opacity-10 text-primary">
                  <Shield size={48} />
                </div>
              )}
              <div className="relative z-10 flex flex-col">
                <span className="text-2xl font-mono text-foreground mb-1">
                  {fortressItems.length} <span className="text-sm text-muted-foreground">/ {totalFortressItems}</span>
                </span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
                  <span>Fortress Defenses Active</span>
                  {isFullyProtected && (
                    <span className="text-primary font-bold tracking-widest">· Protected</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="space-y-4">
            <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
              Moderation
            </h3>
            <Link
              href="/admin"
              className="flex items-center justify-between bg-card border border-border p-4 rounded-lg hover:bg-card/80 transition-colors"
              data-testid="link-admin-reports"
            >
              <div className="flex items-center gap-3">
                <ShieldAlert size={20} className="text-destructive" />
                <div>
                  <div className="text-sm text-foreground font-medium">Reports</div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    Review reported posts and comments
                  </div>
                </div>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </Link>
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
            Data
          </h3>
          <div className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start font-mono text-xs uppercase tracking-widest"
              onClick={handleExport}
            >
              Export Data
            </Button>
            
            <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="w-full justify-start font-mono text-xs uppercase tracking-widest">
                  Wipe All Data
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-foreground font-serif text-2xl">Wipe Data</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    {resetStep === 1 
                      ? "This will delete your start date, all journal entries, urge history, and fortress settings. This cannot be undone."
                      : "Type 'WIPE' to confirm."}
                  </DialogDescription>
                </DialogHeader>
                
                {resetStep === 2 && (
                  <Input 
                    value={resetConfirmText}
                    onChange={(e) => setResetConfirmText(e.target.value)}
                    placeholder="WIPE"
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
                      disabled={resetConfirmText !== "WIPE"}
                      onClick={handleWipe}
                    >
                      Confirm Wipe
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="pt-8 pb-4 text-center">
          <p className="text-xs font-mono text-muted-foreground/50 uppercase tracking-widest">
            {appName} v1.4.0
          </p>
        </div>
      </div>
    </div>
  );
}

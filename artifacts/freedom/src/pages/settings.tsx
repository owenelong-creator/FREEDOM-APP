import { useState } from "react";
import { format } from "date-fns";
import { Shield } from "lucide-react";
import { useFreedom } from "@/lib/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function Settings() {
  const { startDate, setStartDate, urgeSessions, journalEntries, fortressItems, resetAll, appName, setAppName } = useFreedom();

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
        <div className="space-y-4">
          <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
            App Name
          </h3>
          <div className="bg-card border border-border p-4 rounded-lg space-y-3">
            <label className="text-xs text-muted-foreground block">
              Choose your own name for this app. Must be unique and appropriate.
            </label>
            <div className="flex gap-2">
              <Input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                maxLength={24}
                placeholder="My Freedom"
                className="bg-background border-border text-foreground"
                data-testid="input-app-name"
              />
              <Button
                onClick={handleSaveName}
                disabled={nameDraft.trim() === appName.trim() || !nameDraft.trim()}
                className="font-mono uppercase tracking-widest text-xs"
                data-testid="button-save-name"
              >
                Save
              </Button>
            </div>
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
              Currently: {appName}
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
            Statistics
          </h3>
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
            {appName} v1.0.3
          </p>
        </div>
      </div>
    </div>
  );
}

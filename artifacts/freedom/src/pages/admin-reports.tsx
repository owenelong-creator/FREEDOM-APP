import { useState } from "react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import {
  ShieldAlert,
  Trash2,
  UserX,
  Clock,
  Check,
  ExternalLink,
  Loader2,
  Inbox,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  useIsAdmin,
  useReports,
  useUpdateReport,
  useDeleteReportedContent,
  useBanUser,
  useSuspendUser,
  type Report,
  type ReportStatus,
} from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
type SuspendChoice = { label: string; days: number | "custom" };
const SUSPEND_PRESETS: SuspendChoice[] = [
  { label: "1 day", days: 1 },
  { label: "7 days", days: 7 },
  { label: "14 days", days: 14 },
  { label: "30 days", days: 30 },
  { label: "Custom…", days: "custom" },
];

function ReportCard({ report }: { report: Report }) {
  const updateReport = useUpdateReport();
  const deleteContent = useDeleteReportedContent();
  const banUser = useBanUser();
  const suspendUser = useSuspendUser();
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendDays, setSuspendDays] = useState<number>(7);
  const [, navigate] = useLocation();

  const [notes, setNotes] = useState(report.notes || "");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setError(null);
    try {
      await fn();
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err.message || "Action failed.");
    } finally {
      setBusy(null);
    }
  };

  const handleSaveNotes = () =>
    run("notes", () => updateReport(report.id, { notes }));

  const handleDelete = () =>
    run("delete", async () => {
      if (!window.confirm(`Delete this ${report.kind}?`)) return;
      await deleteContent(report);
      await updateReport(report.id, { status: "resolved", notes });
    });

  const handleBan = () =>
    run("ban", async () => {
      if (!report.authorUid) {
        setError("No author UID on this report.");
        return;
      }
      if (
        !window.confirm(
          `Permanently ban @${report.authorUsername || report.authorUid}? They won't be able to post or comment.`
        )
      )
        return;
      await banUser(report.authorUid, `Reported ${report.kind} ${report.id}`);
      await updateReport(report.id, { status: "resolved", notes });
    });

  const handleSuspend = (days: number) =>
    run("suspend", async () => {
      if (!report.authorUid) {
        setError("No author UID on this report.");
        return;
      }
      const safeDays = Math.max(1, Math.min(3650, Math.round(days)));
      await suspendUser(
        report.authorUid,
        safeDays,
        `Reported ${report.kind} ${report.id}`
      );
      await updateReport(report.id, { status: "resolved", notes });
      setSuspendOpen(false);
    });

  const handleDismiss = () =>
    run("dismiss", () => updateReport(report.id, { status: "dismissed", notes }));

  const handleReopen = () =>
    run("reopen", () => updateReport(report.id, { status: "open" }));

  const handleViewInContext = () => {
    navigate(`/community#post-${report.postId}`);
  };

  return (
    <div
      className="bg-card border border-border rounded-lg p-4 space-y-3"
      data-testid={`report-${report.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            {report.kind} · {formatDistanceToNow(new Date(report.timestamp), { addSuffix: true })}
          </div>
          <div className="text-sm text-foreground">
            <span className="text-muted-foreground">Reported by</span>{" "}
            <span className="font-mono">{report.reporterUid?.slice(0, 8) || "anon"}…</span>
          </div>
          <div className="text-sm text-foreground">
            <span className="text-muted-foreground">Author</span>{" "}
            <span className="font-medium">@{report.authorUsername || "unknown"}</span>{" "}
            <span className="text-muted-foreground font-mono text-[11px]">
              {report.authorUid?.slice(0, 8) || ""}
            </span>
          </div>
        </div>
        <span
          className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-full border ${
            report.status === "open"
              ? "border-stat/40 text-stat bg-stat/10"
              : report.status === "resolved"
                ? "border-primary/40 text-primary bg-primary/10"
                : "border-border text-muted-foreground"
          }`}
        >
          {report.status}
        </span>
      </div>

      <div className="bg-background/60 border border-border/60 rounded-md p-3 space-y-2">
        <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          Reported content
        </div>
        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
          {report.contentSnapshot || "(no text snapshot)"}
        </p>
      </div>

      {report.reason && (
        <div className="text-sm">
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block mb-1">
            Reason given
          </span>
          <p className="text-foreground/90 italic">"{report.reason}"</p>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground block">
          Admin notes
        </label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={1000}
          placeholder="Add internal notes…"
          className="bg-background border-border text-foreground resize-none h-16 text-sm"
          data-testid={`report-${report.id}-notes`}
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSaveNotes}
            disabled={busy === "notes" || notes === (report.notes || "")}
            className="text-[10px] font-mono uppercase tracking-widest"
            data-testid={`report-${report.id}-save-notes`}
          >
            {busy === "notes" ? "Saving…" : "Save notes"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          size="sm"
          variant="destructive"
          disabled={!!busy}
          onClick={handleDelete}
          className="text-[10px] font-mono uppercase tracking-widest gap-1"
          data-testid={`report-${report.id}-delete`}
        >
          {busy === "delete" ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
          Delete content
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              disabled={!!busy || !report.authorUid}
              className="text-[10px] font-mono uppercase tracking-widest gap-1 border-stat/40 text-stat hover:bg-stat/10"
              data-testid={`report-${report.id}-suspend`}
            >
              {busy === "suspend" ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Clock size={12} />
              )}
              Suspend
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44 bg-card border-border">
            <DropdownMenuLabel className="text-[10px] font-mono uppercase tracking-widest">
              Suspend duration
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {SUSPEND_PRESETS.map((opt) => (
              <DropdownMenuItem
                key={opt.label}
                className="text-xs cursor-pointer"
                onClick={() => {
                  if (opt.days === "custom") {
                    setSuspendOpen(true);
                  } else {
                    handleSuspend(opt.days);
                  }
                }}
                data-testid={`report-${report.id}-suspend-${typeof opt.days === "number" ? opt.days : "custom"}`}
              >
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          size="sm"
          variant="outline"
          disabled={!!busy || !report.authorUid}
          onClick={handleBan}
          className="text-[10px] font-mono uppercase tracking-widest gap-1 border-destructive/40 text-destructive hover:bg-destructive/10"
          data-testid={`report-${report.id}-ban`}
        >
          {busy === "ban" ? <Loader2 size={12} className="animate-spin" /> : <UserX size={12} />}
          Ban (permanent)
        </Button>
        {report.status !== "open" ? (
          <Button
            size="sm"
            variant="outline"
            disabled={!!busy}
            onClick={handleReopen}
            className="text-[10px] font-mono uppercase tracking-widest gap-1"
            data-testid={`report-${report.id}-reopen`}
          >
            Reopen
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={!!busy}
            onClick={handleDismiss}
            className="text-[10px] font-mono uppercase tracking-widest gap-1"
            data-testid={`report-${report.id}-dismiss`}
          >
            {busy === "dismiss" ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            Dismiss
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={handleViewInContext}
          className="text-[10px] font-mono uppercase tracking-widest gap-1 ml-auto"
          data-testid={`report-${report.id}-view`}
        >
          <ExternalLink size={12} /> View in context
        </Button>
      </div>

      {error && <p className="text-xs font-mono text-destructive">{error}</p>}

      <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}>
        <DialogContent className="bg-card border-border sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-foreground font-serif text-lg">
              Custom suspension
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              How many days should @{report.authorUsername || "this user"} be suspended?
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2 space-y-2">
            <Input
              type="number"
              min={1}
              max={3650}
              value={suspendDays}
              onChange={(e) => setSuspendDays(Number(e.target.value) || 1)}
              className="bg-background border-border text-foreground"
              data-testid={`report-${report.id}-suspend-custom-input`}
            />
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Min 1 · Max 3650 days
            </p>
          </div>
          <DialogFooter className="flex-row justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setSuspendOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => handleSuspend(suspendDays)}
              disabled={busy === "suspend"}
              className="font-mono uppercase tracking-widest text-xs"
              data-testid={`report-${report.id}-suspend-confirm`}
            >
              {busy === "suspend" ? "Suspending…" : `Suspend ${suspendDays}d`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReportSection({ status, label }: { status: ReportStatus; label: string }) {
  const { reports, loading, error } = useReports(status);
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground border-b border-border pb-2 flex items-center justify-between">
        <span>{label}</span>
        <span className="text-foreground font-bold">{reports.length}</span>
      </h2>
      {error && <p className="text-xs text-destructive font-mono">{error}</p>}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-muted-foreground" size={20} />
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-xs font-mono uppercase tracking-widest gap-2">
          <Inbox size={20} />
          {status === "open" ? "No open reports" : `No ${status} reports`}
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <ReportCard key={r.id} report={r} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function AdminReports() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();

  if (!user) {
    return (
      <div className="py-16 text-center text-muted-foreground text-sm font-mono">
        Sign in required.
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="py-16 text-center space-y-2">
        <ShieldAlert className="mx-auto text-muted-foreground" size={32} />
        <p className="text-muted-foreground text-sm font-mono uppercase tracking-widest">
          Admins only
        </p>
      </div>
    );
  }

  return (
    <div className="py-8 space-y-8">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <ShieldAlert className="text-primary" size={22} />
          <h1 className="text-2xl font-serif text-foreground">Admin · Reports</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Triage incoming community reports. Actions are immediate.
        </p>
      </div>

      <ReportSection status="open" label="Open" />
      <ReportSection status="resolved" label="Resolved" />
      <ReportSection status="dismissed" label="Dismissed" />
    </div>
  );
}

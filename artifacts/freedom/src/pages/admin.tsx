import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { formatDistanceToNow, format } from "date-fns";
import {
  ShieldAlert,
  ExternalLink,
  Trash2,
  Check,
  ArrowLeft,
  Clock,
  Ban,
  Users,
  MessageSquare,
  RotateCcw,
} from "lucide-react";
import {
  useAdminReports,
  useDismissReport,
  useDeleteReportedContent,
  type ReportRecord,
  type ReportStatus,
} from "@/lib/community-store";
import { useIsAdmin } from "@/lib/admin";
import {
  useSuspendUser,
  useBanUser,
  useAllBans,
  useLiftBan,
  type BanRecord,
} from "@/lib/bans";
import { useAllAppeals, type AppealRecord } from "@/lib/appeals";
import { useSeedTestPosts, useSeedTestReports } from "@/lib/test-seed";
import { useAuth } from "@/lib/auth-context";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STATUS_TABS: { id: ReportStatus | "all"; label: string }[] = [
  { id: "open", label: "Open" },
  { id: "removed", label: "Removed" },
  { id: "dismissed", label: "Dismissed" },
  { id: "all", label: "All" },
];

function StatusPill({ status }: { status: ReportStatus }) {
  const styles: Record<ReportStatus, string> = {
    open: "bg-destructive/15 text-destructive border-destructive/30",
    removed: "bg-stat/15 text-stat border-stat/30",
    dismissed: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-widest border ${styles[status]}`}
    >
      {status}
    </span>
  );
}

const SUSPEND_PRESETS = [
  { days: 1, label: "1 day" },
  { days: 7, label: "7 days" },
  { days: 14, label: "14 days" },
  { days: 30, label: "30 days" },
];

function SuspendDialog({
  report,
  open,
  onOpenChange,
}: {
  report: ReportRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const suspend = useSuspendUser();
  const deleteContent = useDeleteReportedContent();
  const [days, setDays] = useState<number>(7);
  const [customDays, setCustomDays] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const effectiveDays = customDays.trim()
    ? Math.max(1, Math.floor(Number(customDays) || 0))
    : days;

  const handleSubmit = async () => {
    if (!report.targetUid) {
      setError("This report has no associated user.");
      return;
    }
    if (!effectiveDays || effectiveDays < 1) {
      setError("Enter a number of days greater than zero.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await suspend({
        uid: report.targetUid,
        username: report.targetUsername,
        days: effectiveDays,
        reason: `Reported ${report.targetType}: ${report.reason || "—"}`,
      });
      // Also remove the offending content so it doesn't keep harming the feed.
      try {
        await deleteContent(report);
      } catch (delErr) {
        console.warn("[freedom] suspend: content delete failed", delErr);
      }
      toast({
        title: "User suspended",
        description: `@${report.targetUsername || "user"} suspended for ${effectiveDays} day${
          effectiveDays === 1 ? "" : "s"
        }. Reported ${report.targetType} removed.`,
      });
      onOpenChange(false);
      setCustomDays("");
      setDays(7);
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err.message || "Could not suspend user.");
    } finally {
      setBusy(false);
    }
  };

  const untilPreview = new Date(
    Date.now() + effectiveDays * 86_400_000
  ).toLocaleString();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground font-serif text-xl flex items-center gap-2">
            <Clock size={18} /> Suspend @{report.targetUsername || "user"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Temporary block from posting, commenting, and reporting in the community.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Preset
            </div>
            <div className="grid grid-cols-4 gap-2">
              {SUSPEND_PRESETS.map((p) => {
                const active = !customDays && days === p.days;
                return (
                  <button
                    key={p.days}
                    type="button"
                    onClick={() => {
                      setDays(p.days);
                      setCustomDays("");
                    }}
                    className={`py-2 rounded-md font-mono text-[11px] uppercase tracking-widest border transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                    }`}
                    data-testid={`suspend-preset-${p.days}`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Custom (days)
            </label>
            <Input
              type="number"
              min={1}
              max={3650}
              placeholder="e.g. 90"
              value={customDays}
              onChange={(e) => setCustomDays(e.target.value)}
              className="bg-background border-border"
              data-testid="suspend-custom-days"
            />
          </div>

          <div className="rounded-md border border-border/60 bg-background/40 p-3">
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Suspension lifts
            </div>
            <div className="text-sm text-foreground mt-0.5">{untilPreview}</div>
          </div>

          {error && <p className="text-xs font-mono text-destructive">{error}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={busy}
            className="font-mono uppercase tracking-widest text-xs"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={busy || !report.targetUid}
            className="font-mono uppercase tracking-widest text-xs"
            data-testid="suspend-confirm"
          >
            {busy ? "Suspending…" : `Suspend ${effectiveDays}d`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BanDialog({
  report,
  open,
  onOpenChange,
}: {
  report: ReportRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const banUser = useBanUser();
  const deleteContent = useDeleteReportedContent();
  const [confirmText, setConfirmText] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canSubmit = confirmText.trim().toUpperCase() === "BAN" && !!report.targetUid;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await banUser({
        uid: report.targetUid!,
        username: report.targetUsername,
        reason: reason || `Reported ${report.targetType}: ${report.reason || "—"}`,
      });
      // Also remove the offending content as part of the ban action.
      try {
        await deleteContent(report);
      } catch (delErr) {
        console.warn("[freedom] ban: content delete failed", delErr);
      }
      toast({
        title: "User banned",
        description: `@${report.targetUsername || "user"} permanently banned. Reported ${report.targetType} removed.`,
        variant: "destructive",
      });
      onOpenChange(false);
      setConfirmText("");
      setReason("");
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err.message || "Could not ban user.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-destructive/40 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive font-serif text-xl flex items-center gap-2">
            <Ban size={18} /> Ban @{report.targetUsername || "user"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Permanent. Blocks the user from posting, commenting, and reporting forever. They can still read the feed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Reason (optional)
            </label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Repeated harassment after warning…"
              className="bg-background border-border"
              data-testid="ban-reason"
            />
          </div>

          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 space-y-2">
            <p className="text-xs text-destructive">
              Type <span className="font-mono font-bold">BAN</span> to confirm.
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="BAN"
              className="bg-background border-destructive/40 font-mono uppercase tracking-widest"
              autoCapitalize="characters"
              autoComplete="off"
              data-testid="ban-confirm-input"
            />
          </div>

          {error && <p className="text-xs font-mono text-destructive">{error}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={busy}
            className="font-mono uppercase tracking-widest text-xs"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={busy || !canSubmit}
            className="font-mono uppercase tracking-widest text-xs"
            data-testid="ban-confirm"
          >
            {busy ? "Banning…" : "Ban permanently"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReportCard({ report }: { report: ReportRecord }) {
  const [, navigate] = useLocation();
  const dismissReport = useDismissReport();
  const deleteContent = useDeleteReportedContent();
  const [busy, setBusy] = useState<"dismiss" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [banOpen, setBanOpen] = useState(false);

  const handleViewContext = () => {
    const focus =
      report.targetType === "post"
        ? `post-${report.postId}`
        : `comment-${report.targetId}-in-${report.postId}`;
    navigate(`/community#${focus}`);
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this content and notify the user?")) return;
    setBusy("delete");
    setError(null);
    try {
      await deleteContent(report);
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err.message || "Could not delete content.");
    } finally {
      setBusy(null);
    }
  };

  const handleDismiss = async () => {
    setBusy("dismiss");
    setError(null);
    try {
      await dismissReport(report);
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err.message || "Could not dismiss report.");
    } finally {
      setBusy(null);
    }
  };

  const isResolved = report.status !== "open";

  return (
    <div
      className="bg-card border border-border rounded-lg p-4 space-y-3"
      data-testid={`admin-report-${report.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              {report.targetType}
            </span>
            <StatusPill status={report.status} />
          </div>
          <div className="text-xs font-mono text-muted-foreground/80">
            {format(new Date(report.createdAt), "MMM d, yyyy · h:mm a")} ·{" "}
            {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
          </div>
        </div>
      </div>

      <div className="rounded-md border border-border/60 bg-background/40 p-3 space-y-2">
        <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          Reported {report.targetType} by @{report.targetUsername || "unknown"}
        </div>
        <p
          className="text-sm text-foreground whitespace-pre-wrap"
          data-testid={`admin-report-${report.id}-content`}
        >
          {report.targetMessage?.trim() || (
            <span className="text-muted-foreground italic">(no text content)</span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="space-y-0.5">
          <div className="font-mono uppercase tracking-widest text-muted-foreground">Reporter</div>
          <div className="text-foreground/90 truncate" title={report.reporterEmail || ""}>
            {report.reporterEmail || report.reporterUid || "anonymous"}
          </div>
        </div>
        <div className="space-y-0.5">
          <div className="font-mono uppercase tracking-widest text-muted-foreground">Reason</div>
          <div className="text-foreground/90 break-words">{report.reason || "—"}</div>
        </div>
      </div>

      {error && <p className="text-xs font-mono text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          size="sm"
          variant="outline"
          onClick={handleViewContext}
          className="font-mono uppercase tracking-widest text-[10px]"
          data-testid={`admin-report-${report.id}-view`}
        >
          <ExternalLink size={12} className="mr-1" /> View in context
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={handleDelete}
          disabled={busy !== null || isResolved}
          className="font-mono uppercase tracking-widest text-[10px]"
          data-testid={`admin-report-${report.id}-delete`}
        >
          <Trash2 size={12} className="mr-1" />
          {busy === "delete" ? "Deleting…" : "Delete content"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDismiss}
          disabled={busy !== null || isResolved}
          className="font-mono uppercase tracking-widest text-[10px]"
          data-testid={`admin-report-${report.id}-dismiss`}
        >
          <Check size={12} className="mr-1" />
          {busy === "dismiss" ? "Dismissing…" : "Dismiss report"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setSuspendOpen(true)}
          disabled={!report.targetUid}
          className="font-mono uppercase tracking-widest text-[10px] border-stat/40 text-stat hover:bg-stat/10"
          data-testid={`admin-report-${report.id}-suspend`}
        >
          <Clock size={12} className="mr-1" /> Suspend user
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setBanOpen(true)}
          disabled={!report.targetUid}
          className="font-mono uppercase tracking-widest text-[10px] border-destructive/40 text-destructive hover:bg-destructive/10"
          data-testid={`admin-report-${report.id}-ban`}
        >
          <Ban size={12} className="mr-1" /> Ban user
        </Button>
      </div>

      <SuspendDialog report={report} open={suspendOpen} onOpenChange={setSuspendOpen} />
      <BanDialog report={report} open={banOpen} onOpenChange={setBanOpen} />
    </div>
  );
}

type AdminView = "reports" | "restricted";

const VIEW_TABS: { id: AdminView; label: string; icon: typeof MessageSquare }[] = [
  { id: "reports", label: "Reports", icon: MessageSquare },
  { id: "restricted", label: "Restricted Users", icon: Users },
];

export default function Admin() {
  const isAdmin = useIsAdmin();
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [view, setView] = useState<AdminView>("reports");
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("open");
  const { reports, loading: loadingReports, error } = useAdminReports(statusFilter);
  const seedPosts = useSeedTestPosts();
  const seedReports = useSeedTestReports();
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  const handleSeed = async () => {
    if (!user) return;
    setSeeding(true);
    setSeedMessage(null);
    try {
      const r = await seedPosts();
      const reportsAdded = await seedReports(user.uid, user.email || null);
      setSeedMessage(
        `Created ${r.posts} dummy posts, ${r.comments} comment, ${reportsAdded} reports.`
      );
    } catch (e: unknown) {
      const err = e as { message?: string };
      setSeedMessage(err.message || "Failed to seed test data.");
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-muted-foreground text-sm font-mono">
        Loading…
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="py-16 px-2 text-center space-y-4">
        <ShieldAlert size={32} className="mx-auto text-destructive" />
        <h1 className="text-xl font-serif text-foreground">Admin only</h1>
        <p className="text-sm text-muted-foreground">
          This page is restricted to the moderation team.
        </p>
        <Button variant="outline" onClick={() => navigate("/settings")}>
          Back to Settings
        </Button>
      </div>
    );
  }

  return (
    <div className="py-8 space-y-6">
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate("/settings")}
          className="text-muted-foreground hover:text-foreground p-1 -ml-1"
          aria-label="Back to settings"
          data-testid="admin-back"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="space-y-1">
          <h1 className="text-2xl font-serif text-foreground">Admin</h1>
          <p className="text-xs text-muted-foreground">
            Review reports and manage restricted users.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {VIEW_TABS.map((tab) => {
          const active = view === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg font-mono text-[11px] uppercase tracking-widest border transition-colors ${
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:bg-muted/40"
              }`}
              data-testid={`admin-view-${tab.id}`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="bg-card border border-border rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-xs font-medium text-foreground">Test data</div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Seed 3 rude dummy posts + reports for testing
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSeed}
            disabled={seeding}
            className="font-mono uppercase tracking-widest text-[10px]"
            data-testid="admin-seed"
          >
            {seeding ? "Seeding…" : "Seed dummy data"}
          </Button>
        </div>
        {seedMessage && (
          <p className="text-[11px] font-mono text-muted-foreground">{seedMessage}</p>
        )}
      </div>

      {view === "reports" ? (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            {STATUS_TABS.map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-full font-mono text-[10px] uppercase tracking-widest border transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                  }`}
                  data-testid={`admin-tab-${tab.id}`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {error && (
            <p className="text-xs font-mono text-destructive">
              Failed to load reports: {error}
            </p>
          )}

          {loadingReports ? (
            <div className="text-center py-12 text-sm font-mono text-muted-foreground">
              Loading reports…
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12 text-sm font-mono text-muted-foreground">
              No {statusFilter === "all" ? "" : statusFilter} reports.
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => (
                <ReportCard key={r.id} report={r} />
              ))}
            </div>
          )}
        </>
      ) : (
        <RestrictedUsersPanel />
      )}
    </div>
  );
}

function daysLeft(untilIso: string | null): number {
  if (!untilIso) return 0;
  const ms = new Date(untilIso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

function RestrictedUserCard({
  ban,
  appeal,
}: {
  ban: BanRecord;
  appeal: AppealRecord | undefined;
}) {
  const liftBan = useLiftBan();
  const [busy, setBusy] = useState(false);
  const isBan = ban.kind === "ban";
  const left = daysLeft(ban.until);
  const expired = ban.kind === "suspension" && left === 0;

  const handleLift = async () => {
    if (!window.confirm(`Lift ${isBan ? "ban" : "suspension"} for @${ban.username || "user"}?`)) return;
    setBusy(true);
    try {
      await liftBan(ban.uid);
      toast({
        title: isBan ? "Ban lifted" : "Suspension lifted",
        description: `@${ban.username || "user"} can post again.`,
      });
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast({
        title: "Could not lift",
        description: err.message || "Try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`bg-card border rounded-lg p-4 space-y-3 ${
        isBan ? "border-destructive/30" : "border-border"
      }`}
      data-testid={`restricted-${ban.uid}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {isBan ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-widest border bg-destructive/15 text-destructive border-destructive/30">
                <Ban size={10} className="inline mr-1 -mt-0.5" />
                Banned
              </span>
            ) : expired ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-widest border bg-muted text-muted-foreground border-border">
                Expired
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-widest border bg-warning/15 text-warning border-warning/30">
                <Clock size={10} className="inline mr-1 -mt-0.5" />
                {left} day{left === 1 ? "" : "s"} left
              </span>
            )}
            {appeal && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-widest border bg-stat/15 text-stat border-stat/30">
                Appeal
              </span>
            )}
          </div>
          <div className="text-sm font-medium text-foreground break-all">
            @{ban.username || "(unknown)"}
          </div>
          <div className="text-[10px] font-mono text-muted-foreground/80 break-all">
            uid: {ban.uid}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
        {ban.createdAt && (
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Issued
            </div>
            <div className="text-foreground/90">
              {format(new Date(ban.createdAt), "MMM d, h:mm a")}
            </div>
          </div>
        )}
        {ban.until && (
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {expired ? "Lifted (auto)" : "Lifts at"}
            </div>
            <div className="text-foreground/90">
              {format(new Date(ban.until), "MMM d, h:mm a")}
            </div>
          </div>
        )}
      </div>

      {ban.reason && (
        <div className="rounded-md border border-border/60 bg-background/40 p-2">
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            Reason
          </div>
          <p className="text-xs text-foreground/90 mt-0.5 break-words">{ban.reason}</p>
        </div>
      )}

      {appeal && (
        <div className="rounded-md border border-stat/30 bg-stat/5 p-2 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] font-mono uppercase tracking-widest text-stat">
              Appeal · {appeal.status}
            </div>
            {appeal.createdAt && (
              <div className="text-[10px] font-mono text-muted-foreground">
                {formatDistanceToNow(new Date(appeal.createdAt), { addSuffix: true })}
              </div>
            )}
          </div>
          <p className="text-xs text-foreground/90 italic whitespace-pre-wrap break-words">
            "{appeal.message}"
          </p>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          variant="outline"
          onClick={handleLift}
          disabled={busy}
          className="font-mono uppercase tracking-widest text-[10px]"
          data-testid={`lift-${ban.uid}`}
        >
          <RotateCcw size={12} className="mr-1" />
          {busy ? "Lifting…" : isBan ? "Lift ban" : "End suspension"}
        </Button>
      </div>
    </div>
  );
}

function RestrictedUsersPanel() {
  const { bans, loading, error } = useAllBans();
  const { latestByUid: appealsByUid } = useAllAppeals();

  const { activeSuspensions, banned, expired } = useMemo(() => {
    const now = Date.now();
    const activeSuspensions: BanRecord[] = [];
    const banned: BanRecord[] = [];
    const expired: BanRecord[] = [];
    for (const b of bans) {
      if (b.kind === "ban") {
        banned.push(b);
      } else if (b.until && new Date(b.until).getTime() > now) {
        activeSuspensions.push(b);
      } else {
        expired.push(b);
      }
    }
    return { activeSuspensions, banned, expired };
  }, [bans]);

  if (loading) {
    return (
      <div className="text-center py-12 text-sm font-mono text-muted-foreground">
        Loading restricted users…
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-xs font-mono text-destructive">Failed to load: {error}</p>
    );
  }

  if (bans.length === 0) {
    return (
      <div className="text-center py-12 text-sm font-mono text-muted-foreground">
        No restricted users.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Section
        title="Currently suspended"
        count={activeSuspensions.length}
        accent="warning"
      >
        {activeSuspensions.map((b) => (
          <RestrictedUserCard
            key={b.uid}
            ban={b}
            appeal={appealsByUid.get(b.uid)}
          />
        ))}
      </Section>

      <Section title="Permanently banned" count={banned.length} accent="destructive">
        {banned.map((b) => (
          <RestrictedUserCard
            key={b.uid}
            ban={b}
            appeal={appealsByUid.get(b.uid)}
          />
        ))}
      </Section>

      {expired.length > 0 && (
        <Section title="Expired suspensions" count={expired.length} accent="muted">
          {expired.map((b) => (
            <RestrictedUserCard
              key={b.uid}
              ban={b}
              appeal={appealsByUid.get(b.uid)}
            />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  accent,
  children,
}: {
  title: string;
  count: number;
  accent: "warning" | "destructive" | "muted";
  children: React.ReactNode;
}) {
  const accentClass =
    accent === "destructive"
      ? "text-destructive"
      : accent === "warning"
      ? "text-warning"
      : "text-muted-foreground";
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className={`font-mono text-[11px] uppercase tracking-widest ${accentClass}`}>
          {title}
        </h2>
        <span className="text-[10px] font-mono text-muted-foreground">{count}</span>
      </div>
      {count === 0 ? (
        <p className="text-xs font-mono text-muted-foreground/70 px-1">— none —</p>
      ) : (
        <div className="space-y-3">{children}</div>
      )}
    </div>
  );
}

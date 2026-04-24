import { useState } from "react";
import { useLocation } from "wouter";
import { formatDistanceToNow, format } from "date-fns";
import { ShieldAlert, ExternalLink, Trash2, Check, ArrowLeft } from "lucide-react";
import {
  useAdminReports,
  useDismissReport,
  useDeleteReportedContent,
  type ReportRecord,
  type ReportStatus,
} from "@/lib/community-store";
import { useIsAdmin } from "@/lib/admin";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

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

function ReportCard({ report }: { report: ReportRecord }) {
  const [, navigate] = useLocation();
  const dismissReport = useDismissReport();
  const deleteContent = useDeleteReportedContent();
  const [busy, setBusy] = useState<"dismiss" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      </div>
    </div>
  );
}

export default function Admin() {
  const isAdmin = useIsAdmin();
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("open");
  const { reports, loading: loadingReports, error } = useAdminReports(statusFilter);

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
          <h1 className="text-2xl font-serif text-foreground">Admin · Reports</h1>
          <p className="text-xs text-muted-foreground">
            Review reported posts and comments. Actions are logged in Firestore.
          </p>
        </div>
      </div>

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
    </div>
  );
}

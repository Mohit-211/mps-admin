import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { AUDIT_FAILURES, leadsApi } from "../../api/audits";
import { useAuth } from "../../auth/useAuth";
import { AuditResultView } from "../../components/audit/AuditResultView";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { DownloadButton } from "../../components/ui/DownloadButton";
import { BackLink, DetailSkeleton } from "../../components/ui/PageHeader";
import { Detail, DetailList, Notice, Panel } from "../../components/ui/Panel";
import { ErrorState } from "../../components/ui/States";
import { useQuery } from "../../hooks/useQuery";
import { formatDateTime, humanize } from "../../lib/format";

export function LeadDetailPage() {
  const { leadId = "" } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const lead = useQuery(`lead:${leadId}`, (signal) => leadsApi.get(leadId, signal));
  const [deleting, setDeleting] = useState(false);

  if (lead.error) {
    return (
      <div className="page-container">
        <BackLink to="/leads" label="Free-audit leads" />
        <div className="surface">
          <ErrorState error={lead.error} onRetry={lead.reload} />
        </div>
      </div>
    );
  }
  const d = lead.data;
  if (!d) {
    return (
      <div className="page-container">
        <BackLink to="/leads" label="Free-audit leads" />
        <DetailSkeleton />
      </div>
    );
  }

  const l = d.lead;
  const verified = !!l?.verified_at;
  const ready = verified && d.stage === "done";

  return (
    <div className="page-container">
      <BackLink to="/leads" label="Free-audit leads" />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-semibold text-[var(--color-text-primary)]">{l?.business_name || d.business.name || "Free audit"}</h1>
            {verified ? <Badge tone="green">Verified</Badge> : l ? <Badge tone="amber">Not verified</Badge> : <Badge tone="gray">No form</Badge>}
            <Badge tone="gray">{humanize(d.stage)}</Badge>
          </div>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            “{d.keyword}” · centre: {d.center.source === "city" ? (d.center.label ?? "a city") : "business address"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DownloadButton
            path={leadsApi.pdfPath(d.id)}
            filename={`free-audit-${d.id}.pdf`}
            disabled={!ready}
            title={ready ? undefined : "Only a verified, finished audit has a PDF."}
            reasons={{ audit_not_ready: "No full report: the email wasn't verified, or the audit failed." }}
          />
          {can("leads.manage") && (
            <Button variant="secondary" size="sm" className="text-[var(--color-danger)]" onClick={() => setDeleting(true)}>
              <Trash2 size={15} /> Delete
            </Button>
          )}
        </div>
      </div>

      <div className="mb-5 grid gap-5 xl:grid-cols-2">
        <Panel title="Lead">
          {l ? (
            <DetailList>
              <Detail label="Name">{l.name ?? "—"}</Detail>
              <Detail label="Email">{l.email ? <a href={`mailto:${l.email}`} className="text-[var(--color-primary)] hover:underline">{l.email}</a> : "—"}</Detail>
              <Detail label="Phone">{l.phone ? <a href={`tel:${l.phone}`} className="text-[var(--color-primary)] hover:underline">{l.phone}</a> : "—"}</Detail>
              <Detail label="Business (as typed)">{l.business_name ?? "—"}</Detail>
              <Detail label="Form sent">{formatDateTime(l.submitted_at)}</Detail>
              <Detail label="Email verified">{l.verified_at ? formatDateTime(l.verified_at) : "Not yet"}</Detail>
              <Detail label="Consent">
                {l.consent_at ? `${formatDateTime(l.consent_at)}${l.consent_text_version ? ` (text version ${l.consent_text_version})` : ""}` : "—"}
              </Detail>
            </DetailList>
          ) : (
            <p className="px-5 py-6 text-sm text-[var(--color-text-muted)]">The visitor saw the preview but didn't send the lead form.</p>
          )}
        </Panel>
        <Panel title="Audit">
          <DetailList>
            <Detail label="Business on Google">
              {d.business.name ?? "—"}
              {d.business.address && <div className="text-xs text-[var(--color-text-secondary)]">{d.business.address}</div>}
              <div className="text-[11px] text-[var(--color-text-muted)]">{d.attribution.text}</div>
            </Detail>
            <Detail label="Started">{formatDateTime(d.created_at)}</Detail>
            <Detail label="Finished">{formatDateTime(d.finished_at)}</Detail>
            <Detail label="Report emailed">{formatDateTime(d.report_emailed_at)}</Detail>
            <Detail label="Kept until">{formatDateTime(d.expires_at)}</Detail>
            {d.api_calls && (
              <Detail label="Google calls">
                {Object.entries(d.api_calls)
                  .map(([k, v]) => `${humanize(k)} ${v}`)
                  .join(" · ")}
              </Detail>
            )}
          </DetailList>
        </Panel>
      </div>

      {d.stage === "failed" ? (
        <Notice tone="red">The audit failed: {AUDIT_FAILURES[d.failure_reason ?? ""] ?? d.failure_reason ?? "unknown reason"}.</Notice>
      ) : d.result ? (
        <AuditResultView business={d.business} result={d.result} actions={d.actions} grid={d.grid} warnings={d.warnings} attribution={d.attribution.text} />
      ) : (
        <Notice tone="blue">
          {verified ? "The full report is still being prepared." : "No full report: it's made only after the lead verifies their email."}
        </Notice>
      )}

      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        title="Delete this lead?"
        description="The lead and its report are deleted for good (for privacy requests). The deletion is audit-logged."
        confirmLabel="Delete lead"
        danger
        onConfirm={async () => {
          await leadsApi.remove(d.id);
          toast.success("Lead deleted.");
          navigate("/leads", { replace: true });
        }}
      />
    </div>
  );
}

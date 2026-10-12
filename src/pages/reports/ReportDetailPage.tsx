import { Link, useParams } from "react-router-dom";

import { REPORT_PDF_REASONS, REPORT_TYPE_LABELS, reportsApi } from "../../api/reports";
import { ReportStatusBadge } from "../../components/StateBadges";
import { DownloadButton } from "../../components/ui/DownloadButton";
import { BackLink, DetailSkeleton } from "../../components/ui/PageHeader";
import { Detail, DetailList, Notice, Panel } from "../../components/ui/Panel";
import { ErrorState } from "../../components/ui/States";
import { useQuery } from "../../hooks/useQuery";
import { formatDateTime } from "../../lib/format";
import { ReportBlocks } from "./ReportBlocks";

export function ReportDetailPage() {
  const { reportId = "" } = useParams();
  const report = useQuery(`report:${reportId}`, (signal) => reportsApi.get(reportId, signal));

  if (report.error) {
    return (
      <div className="page-container">
        <BackLink to="/reports" label="Reports" />
        <div className="surface">
          <ErrorState error={report.error} onRetry={report.reload} />
        </div>
      </div>
    );
  }
  const d = report.data;
  if (!d) {
    return (
      <div className="page-container">
        <BackLink to="/reports" label="Reports" />
        <DetailSkeleton />
      </div>
    );
  }

  const r = d.report;
  const doc = d.document;

  return (
    <div className="page-container">
      <BackLink to="/reports" label="Reports" />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
              {doc?.title ?? REPORT_TYPE_LABELS[r.type] ?? r.type}
            </h1>
            <ReportStatusBadge status={r.status} />
          </div>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {r.location?.name ?? "Location"}
            {r.location?.deleted ? " (deleted location)" : ""}
            {doc?.period ? ` · ${doc.period}` : ""}
          </p>
        </div>
        {r.status === "ready" && (
          <DownloadButton path={reportsApi.pdfPath(r.report_id)} filename={`report-${r.report_id}.pdf`} reasons={REPORT_PDF_REASONS} />
        )}
      </div>

      {r.status === "failed" && (
        <div className="mb-5">
          <Notice tone="red">
            <strong>Failed:</strong> {r.failure_reason ?? "No reason was recorded."}
          </Notice>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Panel title="Report" className="self-start">
          <DetailList>
            <Detail label="Organization">
              {r.organization ? (
                <Link to={`/organizations/${r.organization.id}`} className="font-medium text-[var(--color-primary)] hover:underline">
                  {r.organization.name ?? "Organization"}
                </Link>
              ) : (
                "—"
              )}
            </Detail>
            {r.client?.name && <Detail label="Client">{r.client.name}</Detail>}
            <Detail label="Type">{REPORT_TYPE_LABELS[r.type] ?? r.type}</Detail>
            <Detail label="Sections">{r.sections.join(", ") || "—"}</Detail>
            <Detail label="Trigger">{r.trigger === "schedule" ? "Scheduled" : "Manual"}</Detail>
            {r.range && <Detail label="Range">{r.range}</Detail>}
            {r.run_at && <Detail label="Rank run">{formatDateTime(r.run_at)}</Detail>}
            <Detail label="Created">{formatDateTime(r.created_at)}</Detail>
            <Detail label="Generated">{formatDateTime(r.generated_at)}</Detail>
            <Detail label="Expires">{formatDateTime(r.expires_at)}</Detail>
            {r.pdf && (
              <Detail label="PDF">
                {r.pdf.pages} page{r.pdf.pages === 1 ? "" : "s"} · {Math.round(r.pdf.bytes / 1024)} KB
              </Detail>
            )}
          </DetailList>
        </Panel>

        <section className="surface p-5">
          {doc ? (
            <>
              <ReportBlocks blocks={doc.blocks} />
              {(doc.attribution || d.attribution) && (
                <p className="mt-6 text-xs text-[var(--color-text-muted)]">{doc.attribution ?? d.attribution?.text}</p>
              )}
            </>
          ) : (
            <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">
              {r.status === "expired"
                ? "This report has expired; its content was removed."
                : r.status === "failed"
                  ? "Nothing to show: the report failed."
                  : "The content appears once the report is ready."}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

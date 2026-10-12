import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  REPORT_PDF_REASONS,
  REPORT_TYPE_LABELS,
  reportsApi,
  type ReportListQuery,
  type ReportRow,
} from "../../api/reports";
import { ReportStatusBadge } from "../../components/StateBadges";
import { DataTable } from "../../components/table/DataTable";
import type { AdminTableFeatures } from "../../components/table/tableConfig";
import { DownloadButton } from "../../components/ui/DownloadButton";
import { Pagination } from "../../components/ui/Pagination";
import { ErrorState } from "../../components/ui/States";
import { useQuery } from "../../hooks/useQuery";
import { formatDate, formatDateTime } from "../../lib/format";

const LIMIT = 20;

/** Customers' generated reports, newest first. Failed rows show why: the main reason to open this list. */
export function ReportsTable({
  filters,
  page,
  onPageChange,
  showOrganization = true,
  emptyMessage = "No reports.",
}: {
  filters: Omit<ReportListQuery, "page" | "limit">;
  page: number;
  onPageChange: (page: number) => void;
  showOrganization?: boolean;
  emptyMessage?: string;
}) {
  const navigate = useNavigate();
  const query = { ...filters, page, limit: LIMIT };
  const reports = useQuery(`reports:${JSON.stringify(query)}`, (signal) => reportsApi.list(query, signal));

  const columns = useMemo<ColumnDef<AdminTableFeatures, ReportRow, unknown>[]>(
    () => [
      {
        id: "created",
        header: "Created",
        cell: ({ row }) => <span className="whitespace-nowrap">{formatDateTime(row.original.created_at)}</span>,
      },
      ...(showOrganization
        ? [
            {
              id: "organization",
              header: "Organization",
              cell: ({ row }: { row: { original: ReportRow } }) =>
                row.original.organization ? (
                  <Link
                    to={`/organizations/${row.original.organization.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="font-medium text-[var(--color-primary)] hover:underline"
                  >
                    {row.original.organization.name ?? "Organization"}
                  </Link>
                ) : (
                  "—"
                ),
            } as ColumnDef<AdminTableFeatures, ReportRow, unknown>,
          ]
        : []),
      {
        id: "location",
        header: "Location",
        cell: ({ row }) => {
          const r = row.original;
          return (
            <div className="min-w-0">
              <div className="truncate text-[var(--color-text-primary)]">{r.location?.name ?? "—"}</div>
              <div className="truncate text-xs text-[var(--color-text-muted)]">
                {r.location?.deleted ? "Deleted location" : (r.client?.name ?? "")}
              </div>
            </div>
          );
        },
      },
      {
        id: "type",
        header: "Type",
        cell: ({ row }) => (
          <div>
            <div className="text-[var(--color-text-primary)]">{REPORT_TYPE_LABELS[row.original.type] ?? row.original.type}</div>
            <div className="text-xs text-[var(--color-text-muted)]">
              {row.original.trigger === "schedule" ? "Scheduled" : "Manual"}
              {row.original.range ? ` · ${row.original.range}` : ""}
              {row.original.run_at ? ` · run ${formatDate(row.original.run_at)}` : ""}
            </div>
          </div>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <div className="max-w-[280px]">
            <ReportStatusBadge status={row.original.status} />
            {row.original.failure_reason && (
              <div className="mt-1 text-xs text-[var(--color-danger)]">{row.original.failure_reason}</div>
            )}
          </div>
        ),
      },
      {
        id: "pdf",
        header: "",
        cell: ({ row }) =>
          row.original.status === "ready" && row.original.pdf ? (
            <div className="flex justify-end">
              <DownloadButton
                path={reportsApi.pdfPath(row.original.report_id)}
                filename={`report-${row.original.report_id}.pdf`}
                reasons={REPORT_PDF_REASONS}
              >
                PDF
              </DownloadButton>
            </div>
          ) : null,
      },
    ],
    [showOrganization],
  );

  if (reports.error) return <ErrorState error={reports.error} onRetry={reports.reload} />;

  return (
    <>
      <DataTable
        bare
        data={reports.data?.reports ?? []}
        columns={columns}
        loading={reports.loading}
        enableSorting={false}
        onRowClick={(r) => navigate(`/reports/${r.report_id}`)}
        emptyMessage={emptyMessage}
      />
      {reports.data && reports.data.total > 0 && (
        <div className="border-t border-[var(--color-border-light)] px-3">
          <Pagination page={page} limit={LIMIT} total={reports.data.total} onPageChange={onPageChange} />
        </div>
      )}
    </>
  );
}

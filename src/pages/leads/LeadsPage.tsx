import type { ColumnDef } from "@tanstack/react-table";
import { Check } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { leadsApi, type LeadListQuery, type LeadRow } from "../../api/audits";
import { GradeBadge } from "../../components/StateBadges";
import { DataTable } from "../../components/table/DataTable";
import { TableToolbar } from "../../components/table/TableToolbar";
import type { AdminTableFeatures } from "../../components/table/tableConfig";
import { Badge } from "../../components/ui/Badge";
import { DownloadButton } from "../../components/ui/DownloadButton";
import { filterClass, compactInputClass } from "../../components/ui/fieldStyles";
import { PageHeader } from "../../components/ui/PageHeader";
import { Pagination } from "../../components/ui/Pagination";
import { ErrorState } from "../../components/ui/States";
import { useQuery } from "../../hooks/useQuery";
import { useUrlSearch, useUrlState } from "../../hooks/useUrlState";
import { formatDateTime, fromDateInput, todayStamp } from "../../lib/format";

const LIMIT = 25;

/** The marketing site's free audits with their leads. Unverified ones disappear after 7 days; verified ones are kept 2 years. */
export function LeadsPage() {
  const navigate = useNavigate();
  const { get, update, page, setPage } = useUrlState();
  const { search, setSearch, q } = useUrlSearch();
  // default filter: verified
  const verified = (get("verified") || "true") as "true" | "false" | "all";
  const from = get("from");
  const to = get("to");

  const filters: Omit<LeadListQuery, "page" | "limit"> = {
    verified: verified === "all" ? undefined : verified === "true",
    q: q || undefined,
    from: from ? (fromDateInput(from) ?? undefined) : undefined,
    to: to ? (fromDateInput(to, true) ?? undefined) : undefined,
  };
  const query = { ...filters, page, limit: LIMIT };
  const leads = useQuery(`leads:${JSON.stringify(query)}`, (signal) => leadsApi.list(query, signal));

  const columns = useMemo<ColumnDef<AdminTableFeatures, LeadRow, unknown>[]>(
    () => [
      { id: "date", header: "Date", cell: ({ row }) => <span className="whitespace-nowrap">{formatDateTime(row.original.created_at)}</span> },
      {
        id: "person",
        header: "Person",
        cell: ({ row }) => {
          const l = row.original.lead;
          if (!l) return <span className="text-[var(--color-text-muted)]">No form yet</span>;
          return (
            <div className="min-w-0">
              <div className="truncate font-semibold text-[var(--color-text-primary)]">{l.name ?? "—"}</div>
              <div className="truncate text-xs text-[var(--color-text-muted)]">{l.email ?? "—"}</div>
              {l.phone && <div className="truncate text-xs text-[var(--color-text-muted)]">{l.phone}</div>}
            </div>
          );
        },
      },
      {
        id: "business",
        header: "Business",
        cell: ({ row }) => (
          <div className="min-w-0 max-w-[260px]">
            <div className="truncate text-[var(--color-text-primary)]">{row.original.lead?.business_name || row.original.business.name || "—"}</div>
            <div className="truncate text-xs text-[var(--color-text-muted)]">{row.original.business.address ?? ""}</div>
          </div>
        ),
      },
      {
        id: "verified",
        header: "Verified",
        cell: ({ row }) =>
          row.original.lead?.verified_at ? (
            <span className="inline-flex items-center gap-1 text-[var(--color-success)]" title={row.original.lead.verified_at}>
              <Check size={15} /> Yes
            </span>
          ) : row.original.lead ? (
            <Badge tone="amber">Pending</Badge>
          ) : (
            <Badge tone="gray">No form</Badge>
          ),
      },
      {
        id: "keyword",
        header: "Keyword / centre",
        cell: ({ row }) => (
          <div className="min-w-0 max-w-[200px]">
            <div className="truncate">“{row.original.keyword}”</div>
            <div className="truncate text-xs text-[var(--color-text-muted)]">
              {row.original.center.source === "city" ? (row.original.center.label ?? "A city") : "Business address"}
            </div>
          </div>
        ),
      },
      {
        id: "rank",
        header: "Rank at centre",
        cell: ({ row }) => {
          const s = row.original.summary;
          if (!s) return "—";
          return s.center_rank === null ? "30+" : `#${s.center_rank}`;
        },
      },
      {
        id: "score",
        header: "Quick score",
        cell: ({ row }) => <GradeBadge score={row.original.score?.score} grade={row.original.score?.grade} />,
      },
    ],
    [],
  );

  return (
    <div className="page-container">
      <PageHeader
        title="Free-audit leads"
        description="Every free audit started on mypageseo.com, with the lead's details once they sent the form. Only verified leads have the full report."
        actions={
          <DownloadButton
            path={leadsApi.exportPath}
            query={filters}
            filename={`free-audit-leads-${todayStamp()}.csv`}
          >
            Export CSV
          </DownloadButton>
        }
      />
      <div className="surface overflow-hidden">
        <TableToolbar
          searchPlaceholder="Name, email, phone, business or keyword…"
          searchValue={search}
          onSearchChange={setSearch}
          filters={
            <div className="flex flex-wrap items-center gap-2">
              <select aria-label="Verified" className={filterClass} value={verified} onChange={(e) => update({ verified: e.target.value === "true" ? null : e.target.value })}>
                <option value="true">Verified</option>
                <option value="false">Not verified</option>
                <option value="all">All</option>
              </select>
              <label className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
                From
                <input type="date" aria-label="From" className={`${compactInputClass} w-auto`} value={from} onChange={(e) => update({ from: e.target.value || null })} />
              </label>
              <label className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
                to
                <input type="date" aria-label="To" className={`${compactInputClass} w-auto`} value={to} onChange={(e) => update({ to: e.target.value || null })} />
              </label>
            </div>
          }
        />
        {leads.error ? (
          <ErrorState error={leads.error} onRetry={leads.reload} />
        ) : (
          <>
            <DataTable
              bare
              data={leads.data?.leads ?? []}
              columns={columns}
              loading={leads.loading}
              enableSorting={false}
              onRowClick={(l) => navigate(`/leads/${l.id}`)}
              emptyMessage={q || from || to ? "No leads match these filters." : verified === "true" ? "No verified leads yet." : "No leads."}
            />
            {leads.data && leads.data.total > 0 && (
              <div className="border-t border-[var(--color-border-light)] px-3">
                <Pagination page={page} limit={LIMIT} total={leads.data.total} onPageChange={setPage} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

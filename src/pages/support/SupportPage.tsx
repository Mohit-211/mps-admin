import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { supportApi, TICKET_STATUS_LABELS, TICKET_STATUSES, type Ticket, type TicketListQuery, type TicketStatus } from "../../api/support";
import { useAuth } from "../../auth/useAuth";
import { OrgLink } from "../../components/EntityLinks";
import { PriorityBadge, TicketStatusBadge } from "../../components/StateBadges";
import { DataTable } from "../../components/table/DataTable";
import { TableToolbar } from "../../components/table/TableToolbar";
import type { AdminTableFeatures } from "../../components/table/tableConfig";
import { OrgChip } from "../../components/ui/FilterChip";
import { checkboxClass } from "../../components/ui/fieldStyles";
import { PageHeader } from "../../components/ui/PageHeader";
import { Pagination } from "../../components/ui/Pagination";
import { ErrorState } from "../../components/ui/States";
import { Tabs } from "../../components/ui/Tabs";
import { useQuery } from "../../hooks/useQuery";
import { useUrlSearch, useUrlState } from "../../hooks/useUrlState";
import { formatRelative } from "../../lib/format";

const LIMIT = 20;
type View = TicketStatus | "all";

export function SupportPage() {
  const navigate = useNavigate();
  const { admin } = useAuth();
  const { get, update, page, setPage } = useUrlState();
  const { search, setSearch, q } = useUrlSearch();
  const view = ((TICKET_STATUSES as string[]).includes(get("status")) ? get("status") : get("status") === "all" ? "all" : "open") as View;
  const unassigned = get("unassigned") === "true";
  const mine = get("mine") === "true";
  const organizationId = get("organization_id");

  const counts = useQuery("ticket-counts-page", (signal) => supportApi.counts(signal));
  const query: TicketListQuery = {
    status: view === "all" ? undefined : view,
    unassigned: unassigned || undefined,
    assigned_to: mine && !unassigned ? admin?.id : undefined,
    organization_id: organizationId || undefined,
    q: q || undefined,
    page,
    limit: LIMIT,
  };
  const tickets = useQuery(`tickets:${JSON.stringify(query)}`, (signal) => supportApi.list(query, signal));

  const columns = useMemo<ColumnDef<AdminTableFeatures, Ticket, unknown>[]>(
    () => [
      {
        id: "subject",
        header: "Ticket",
        cell: ({ row }) => (
          <div className="min-w-0 max-w-[360px]">
            <div className="truncate font-semibold text-[var(--color-text-primary)]">{row.original.subject}</div>
            <div className="text-xs text-[var(--color-text-muted)]">
              <span className="font-mono">{row.original.number}</span>
              {row.original.category ? ` · ${row.original.category}` : ""} · {row.original.messages} message
              {row.original.messages === 1 ? "" : "s"}
            </div>
          </div>
        ),
      },
      {
        id: "customer",
        header: "Customer",
        cell: ({ row }) => (
          <div className="min-w-0">
            <OrgLink id={row.original.organization.id} className="block truncate font-medium">
              {row.original.organization.name ?? "Organization"}
            </OrgLink>
            <div className="truncate text-xs text-[var(--color-text-muted)]">{row.original.created_by.email ?? "—"}</div>
          </div>
        ),
      },
      { id: "status", header: "Status", cell: ({ row }) => <TicketStatusBadge status={row.original.status} /> },
      { id: "priority", header: "Priority", cell: ({ row }) => <PriorityBadge priority={row.original.priority} /> },
      {
        id: "assignee",
        header: "Assigned to",
        cell: ({ row }) =>
          row.original.assigned_to ? (
            row.original.assigned_to.name || row.original.assigned_to.email
          ) : (
            <span className="text-[var(--color-text-muted)]">Unassigned</span>
          ),
      },
      {
        id: "last",
        header: "Last message",
        cell: ({ row }) => (
          <div>
            <div>{formatRelative(row.original.last_message_at, "—")}</div>
            <div className="text-xs text-[var(--color-text-muted)]">
              {row.original.last_message_by === "team" ? "by the team" : row.original.last_message_by === "user" ? "by the customer" : ""}
            </div>
          </div>
        ),
      },
    ],
    [],
  );

  const c = counts.data;
  const tabLabel = (status: TicketStatus) => `${TICKET_STATUS_LABELS[status]}${c ? ` (${c[status]})` : ""}`;

  return (
    <div className="page-container">
      <PageHeader
        title="Support"
        description="Customer tickets. Replies reach the customer as “MyPageSEO team”. There are no email alerts for new tickets yet, so check this queue."
      />

      <div className="surface overflow-hidden">
        <Tabs
          tabs={[...TICKET_STATUSES.map((s) => ({ value: s as View, label: tabLabel(s) })), { value: "all" as View, label: "All" }]}
          value={view}
          onChange={(v) => update({ status: v === "open" ? null : v })}
        />
        <TableToolbar
          searchPlaceholder="Ticket number (TCK-00…) or subject words…"
          searchValue={search}
          onSearchChange={setSearch}
          filters={
            <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--color-text-secondary)]">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className={checkboxClass}
                  checked={unassigned}
                  onChange={(e) => update({ unassigned: e.target.checked ? "true" : null, mine: null })}
                />
                Unassigned{c ? ` (${c.unassigned_open} open)` : ""}
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className={checkboxClass}
                  checked={mine}
                  onChange={(e) => update({ mine: e.target.checked ? "true" : null, unassigned: null })}
                />
                Assigned to me
              </label>
              {organizationId && <OrgChip onClear={() => update({ organization_id: null })} />}
            </div>
          }
        />
        {tickets.error ? (
          <ErrorState error={tickets.error} onRetry={tickets.reload} />
        ) : (
          <>
            <DataTable
              bare
              data={tickets.data?.tickets ?? []}
              columns={columns}
              loading={tickets.loading}
              enableSorting={false}
              onRowClick={(t) => navigate(`/support/${t.id}`)}
              emptyMessage={q || unassigned || mine ? "No tickets match these filters." : "No tickets here."}
            />
            {tickets.data && tickets.data.total > 0 && (
              <div className="border-t border-[var(--color-border-light)] px-3">
                <Pagination page={page} limit={LIMIT} total={tickets.data.total} onPageChange={setPage} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

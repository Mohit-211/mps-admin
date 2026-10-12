import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import {
  ORG_STATE_LABELS,
  ORG_STATES,
  organizationsApi,
  type OrganizationListQuery,
  type OrganizationRow,
  type OrgState,
} from "../../api/organizations";
import type { OrgType } from "../../api/users";
import { OrgStateBadge } from "../../components/StateBadges";
import { DataTable } from "../../components/table/DataTable";
import { TableToolbar } from "../../components/table/TableToolbar";
import type { AdminTableFeatures } from "../../components/table/tableConfig";
import { Badge } from "../../components/ui/Badge";
import { filterClass } from "../../components/ui/fieldStyles";
import { PageHeader } from "../../components/ui/PageHeader";
import { Pagination } from "../../components/ui/Pagination";
import { ErrorState } from "../../components/ui/States";
import { Tabs } from "../../components/ui/Tabs";
import { useQuery } from "../../hooks/useQuery";
import { useUrlSearch, useUrlState } from "../../hooks/useUrlState";
import { formatDate, formatFromNow } from "../../lib/format";

const LIMIT = 20;
type View = "all" | OrgType;

export function OrganizationsPage() {
  const navigate = useNavigate();
  const { get, update, page, setPage } = useUrlState();
  const { search, setSearch, q } = useUrlSearch();
  const view = (["business", "agency"].includes(get("type")) ? get("type") : "all") as View;
  const state = get("state") as "" | OrgState;
  const plan = get("plan") as "" | "standard" | "custom";
  const trialEnding = Number(get("trial_ending_days")) || 0;

  const query: OrganizationListQuery = {
    q: q || undefined,
    type: view === "all" ? undefined : view,
    state: state || undefined,
    plan: plan || undefined,
    trial_ending_days: trialEnding || undefined,
    page,
    limit: LIMIT,
  };
  const orgs = useQuery(`orgs:${JSON.stringify(query)}`, (signal) => organizationsApi.list(query, signal));

  const columns = useMemo<ColumnDef<AdminTableFeatures, OrganizationRow, unknown>[]>(
    () => [
      {
        id: "name",
        header: "Organization",
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate font-semibold text-[var(--color-text-primary)]">{row.original.name}</div>
            <div className="truncate text-xs text-[var(--color-text-muted)]">{row.original.owner_email ?? "No owner email"}</div>
          </div>
        ),
      },
      {
        id: "type",
        header: "Type",
        cell: ({ row }) => (
          <span className="capitalize">
            {row.original.type}
            {row.original.country ? ` · ${row.original.country}` : ""}
          </span>
        ),
      },
      {
        id: "plan",
        header: "Plan",
        cell: ({ row }) =>
          row.original.plan === "custom" ? <Badge tone="purple">Custom</Badge> : <span>Standard</span>,
      },
      {
        id: "state",
        header: "State",
        cell: ({ row }) => (
          <div>
            <OrgStateBadge state={row.original.state} />
            {row.original.state === "trialing" && row.original.trial_ends_at && (
              <div className="mt-1 text-xs text-[var(--color-text-muted)]" title={row.original.trial_ends_at}>
                ends {formatFromNow(row.original.trial_ends_at)}
              </div>
            )}
          </div>
        ),
      },
      {
        id: "locations",
        header: "Locations",
        cell: ({ row }) => {
          const l = row.original.locations;
          return (
            <div>
              <span className="font-medium text-[var(--color-text-primary)]">
                {l.used} / {l.allowed}
              </span>
              <div className="text-xs text-[var(--color-text-muted)]">
                {l.free > 0 ? `${l.free} free · ` : ""}cap {l.max ?? "none"}
              </div>
            </div>
          );
        },
      },
      {
        id: "users",
        header: "Users",
        cell: ({ row }) => `${row.original.users.used} / ${row.original.users.limit ?? "∞"}`,
      },
      {
        id: "tokens",
        header: "Tokens",
        cell: ({ row }) => row.original.token_balance.toLocaleString(),
      },
      {
        id: "created",
        header: "Created",
        cell: ({ row }) => formatDate(row.original.created_at),
      },
    ],
    [],
  );

  const filtered = !!(q || state || plan || trialEnding);

  return (
    <div className="page-container">
      <PageHeader
        title="Organizations"
        description="One row per Business or Agency account, with its plan, billing state and usage."
      />

      <div className="surface overflow-hidden">
        <Tabs
          tabs={[
            { value: "all", label: "All" },
            { value: "business", label: "Businesses" },
            { value: "agency", label: "Agencies" },
          ]}
          value={view}
          onChange={(v) => update({ type: v === "all" ? null : v })}
        />
        <TableToolbar
          searchPlaceholder="Search by name or owner email…"
          searchValue={search}
          onSearchChange={setSearch}
          filters={
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Billing state"
                className={filterClass}
                value={state}
                onChange={(e) => update({ state: e.target.value || null })}
              >
                <option value="">Any state</option>
                {ORG_STATES.map((s) => (
                  <option key={s} value={s}>
                    {ORG_STATE_LABELS[s]}
                  </option>
                ))}
              </select>
              <select
                aria-label="Plan"
                className={filterClass}
                value={plan}
                onChange={(e) => update({ plan: e.target.value || null })}
              >
                <option value="">Any plan</option>
                <option value="standard">Standard</option>
                <option value="custom">Custom</option>
              </select>
              <select
                aria-label="Trial ending"
                className={filterClass}
                value={trialEnding ? String(trialEnding) : ""}
                onChange={(e) => update({ trial_ending_days: e.target.value || null })}
              >
                <option value="">Any trial end</option>
                <option value="3">Trial ends within 3 days</option>
                <option value="7">Trial ends within 7 days</option>
                <option value="14">Trial ends within 14 days</option>
                <option value="30">Trial ends within 30 days</option>
              </select>
            </div>
          }
        />

        {orgs.error ? (
          <ErrorState error={orgs.error} onRetry={orgs.reload} />
        ) : (
          <>
            <DataTable
              bare
              data={orgs.data?.organizations ?? []}
              columns={columns}
              loading={orgs.loading}
              enableSorting={false}
              onRowClick={(org) => navigate(`/organizations/${org.id}`)}
              emptyMessage={filtered ? "No organizations match these filters." : "No organizations yet."}
            />
            {orgs.data && orgs.data.total > 0 && (
              <div className="border-t border-[var(--color-border-light)] px-3">
                <Pagination page={page} limit={LIMIT} total={orgs.data.total} onPageChange={setPage} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

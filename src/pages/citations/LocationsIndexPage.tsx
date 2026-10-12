import type { ColumnDef } from "@tanstack/react-table";
import { ListPlus } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { adminsApi } from "../../api/admins";
import { citationsApi, type CitationCountry, type LocationIndexRow } from "../../api/citations";
import { useAuth } from "../../auth/useAuth";
import { OrgLink } from "../../components/EntityLinks";
import { GradeBadge } from "../../components/StateBadges";
import { DataTable } from "../../components/table/DataTable";
import { TableToolbar } from "../../components/table/TableToolbar";
import type { AdminTableFeatures } from "../../components/table/tableConfig";
import { Button } from "../../components/ui/Button";
import { OrgChip } from "../../components/ui/FilterChip";
import { filterClass } from "../../components/ui/fieldStyles";
import { Pagination } from "../../components/ui/Pagination";
import { ErrorState } from "../../components/ui/States";
import { useQuery } from "../../hooks/useQuery";
import { useUrlSearch, useUrlState } from "../../hooks/useUrlState";
import { formatPercent, formatRelative } from "../../lib/format";

const LIMIT = 50;

const PRESETS = [
  { label: "No list yet", changes: { list: "none", sort: null } },
  { label: "Lowest score", changes: { list: null, sort: "score" } },
  { label: "Not checked for longest", changes: { list: null, sort: "checked" } },
];

/** Every live location with its citation summary: the place to start (the queue misses locations without a list). */
export function LocationsIndexPage() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const { get, update, page, setPage } = useUrlState();
  const { search, setSearch, q } = useUrlSearch();
  const country = get("country") as "" | CitationCountry;
  const list = get("list") as "" | "has" | "none";
  const sort = (get("sort") || "name") as "name" | "score" | "checked";
  const organizationId = get("organization_id");
  const clientId = get("client_id");
  const assignedAdminId = get("assigned_admin_id");
  // The "Assigned to" filter lists employees whose citation view can be limited (Phase 21). Only a super admin
  // can list employees; for others a ?assigned_admin_id= link still works.
  const staff = useQuery(`assignable-staff:${can("admins.manage")}`, (signal) =>
    can("admins.manage") ? adminsApi.list(true, signal) : Promise.resolve(null),
  );
  const assignable = (staff.data ?? []).filter((a) => a.permissions.includes("citations.view") && !a.permissions.includes("platform.read"));

  const query = {
    q: q || undefined,
    country: country || undefined,
    list: list || undefined,
    sort,
    organization_id: organizationId || undefined,
    client_id: clientId || undefined,
    assigned_admin_id: assignedAdminId || undefined,
    page,
    limit: LIMIT,
  };
  const locations = useQuery(`cit-locations:${JSON.stringify(query)}`, (signal) => citationsApi.locations(query, signal));

  const columns = useMemo<ColumnDef<AdminTableFeatures, LocationIndexRow, unknown>[]>(
    () => [
      {
        id: "location",
        header: "Location",
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate font-semibold text-[var(--color-text-primary)]">{row.original.location.name}</div>
            <div className="truncate text-xs text-[var(--color-text-muted)]">
              {[row.original.location.city, row.original.location.country].filter(Boolean).join(", ") || "—"}
            </div>
          </div>
        ),
      },
      {
        id: "organization",
        header: "Organization / client",
        cell: ({ row }) => (
          <div className="min-w-0">
            <OrgLink id={row.original.location.organization?.id} className="block truncate font-medium">
              {row.original.location.organization?.name ?? "—"}
            </OrgLink>
            {row.original.location.client && (
              <div className="truncate text-xs text-[var(--color-text-muted)]">Client: {row.original.location.client.name ?? "—"}</div>
            )}
          </div>
        ),
      },
      {
        id: "score",
        header: "Citation Health",
        cell: ({ row }) =>
          row.original.citations ? (
            <div>
              <GradeBadge score={row.original.citations.score} grade={row.original.citations.grade} />
              <div className="mt-0.5 text-xs text-[var(--color-text-muted)]">coverage {formatPercent(row.original.citations.coverage)}</div>
            </div>
          ) : (
            <span className="text-[var(--color-text-muted)]">No list yet</span>
          ),
      },
      {
        id: "listings",
        header: "Listings",
        cell: ({ row }) => {
          const c = row.original.citations;
          if (!c) return "—";
          return (
            <div className="text-xs">
              <div className="text-sm text-[var(--color-text-primary)]">{c.total}</div>
              {c.counts.nap_wrong > 0 && <div className="text-[var(--color-danger)]">{c.counts.nap_wrong} NAP wrong</div>}
              {c.counts.not_checked > 0 && <div className="text-[var(--color-text-muted)]">{c.counts.not_checked} not checked</div>}
            </div>
          );
        },
      },
      {
        id: "staff",
        header: "Assigned to",
        cell: ({ row }) => {
          const people = row.original.assigned_staff ?? [];
          if (people.length === 0) return <span className="text-xs text-[var(--color-text-muted)]">Nobody</span>;
          return (
            <div className="flex flex-wrap gap-1">
              {people.map((p) => (
                <span key={p.id} className="rounded-full bg-[var(--color-primary-light)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-primary)]">
                  {p.name ?? "Staff"}
                </span>
              ))}
            </div>
          );
        },
      },
      {
        id: "checked",
        header: "Last checked",
        cell: ({ row }) => (row.original.citations ? formatRelative(row.original.citations.last_checked_at) : "—"),
      },
      {
        id: "action",
        header: "",
        cell: ({ row }) =>
          !row.original.citations && can("citations.manage") ? (
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/citations/locations/${row.original.location.id}?suggest=1`);
                }}
              >
                <ListPlus size={14} /> Build list
              </Button>
            </div>
          ) : null,
      },
    ],
    [can, navigate],
  );

  return (
    <div className="surface overflow-hidden">
      <TableToolbar
        searchPlaceholder="Search by location name or city…"
        searchValue={search}
        onSearchChange={setSearch}
        filters={
          <div className="flex flex-wrap items-center gap-2">
            <select aria-label="Country" className={filterClass} value={country} onChange={(e) => update({ country: e.target.value || null })}>
              <option value="">US and Canada</option>
              <option value="US">United States</option>
              <option value="CA">Canada</option>
            </select>
            <select aria-label="List" className={filterClass} value={list} onChange={(e) => update({ list: e.target.value || null })}>
              <option value="">With or without a list</option>
              <option value="has">Has a list</option>
              <option value="none">No list yet</option>
            </select>
            <select aria-label="Sort" className={filterClass} value={sort} onChange={(e) => update({ sort: e.target.value === "name" ? null : e.target.value })}>
              <option value="name">Sort by name</option>
              <option value="score">Lowest score first</option>
              <option value="checked">Least recently checked</option>
            </select>
            {assignable.length > 0 ? (
              <select
                aria-label="Assigned to"
                className={filterClass}
                value={assignedAdminId}
                onChange={(e) => update({ assigned_admin_id: e.target.value || null })}
              >
                <option value="">Assigned to anyone</option>
                {assignable.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name || a.email}
                    {a.citation_scope !== "assigned" ? " (no locations assigned)" : ""}
                  </option>
                ))}
              </select>
            ) : (
              assignedAdminId && <OrgChip label="One employee's locations" onClear={() => update({ assigned_admin_id: null })} />
            )}
            {organizationId && <OrgChip onClear={() => update({ organization_id: null, client_id: null })} />}
          </div>
        }
      />
      <div className="flex flex-wrap gap-2 border-b border-[var(--color-border-light)] px-4 py-2.5">
        <span className="self-center text-xs text-[var(--color-text-muted)]">Presets:</span>
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => update(preset.changes)}
            className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          >
            {preset.label}
          </button>
        ))}
      </div>
      {locations.error ? (
        <ErrorState error={locations.error} onRetry={locations.reload} />
      ) : (
        <>
          <DataTable
            bare
            data={locations.data?.locations ?? []}
            columns={columns}
            loading={locations.loading}
            enableSorting={false}
            onRowClick={(row) => navigate(`/citations/locations/${row.location.id}`)}
            emptyMessage="No locations match these filters."
          />
          {locations.data && locations.data.total > 0 && (
            <div className="border-t border-[var(--color-border-light)] px-3">
              <Pagination page={page} limit={LIMIT} total={locations.data.total} onPageChange={setPage} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

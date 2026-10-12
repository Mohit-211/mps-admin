import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import {
  CITATION_STATUS_LABELS,
  CITATION_STATUSES,
  citationsApi,
  DIRECTORY_TYPE_LABELS,
  DIRECTORY_TYPES,
  type CitationStatus,
  type DirectoryType,
  type LocationRef,
  type QueueFilters,
} from "../../api/citations";
import { CitationStatusBadge } from "../../components/StateBadges";
import { OrgChip } from "../../components/ui/FilterChip";
import { filterClass } from "../../components/ui/fieldStyles";
import { Pagination } from "../../components/ui/Pagination";
import { ErrorState } from "../../components/ui/States";
import { Tabs } from "../../components/ui/Tabs";
import { useQuery } from "../../hooks/useQuery";
import { useUrlState } from "../../hooks/useUrlState";
import { formatDate, formatDateTime, formatRelative } from "../../lib/format";

type Queue = "unchecked" | "stale" | "recent";
const LIMIT = 25;

export function WorkQueuePage() {
  const { get, update, page, setPage } = useUrlState();
  const queue = (["stale", "recent"].includes(get("queue")) ? get("queue") : "unchecked") as Queue;
  const type = get("type") as "" | DirectoryType;
  const status = get("status") as "" | CitationStatus;
  const days = Number(get("days")) || (queue === "stale" ? 90 : 7);
  const organizationId = get("organization_id");
  const directoryId = get("directory_id");

  const filters: QueueFilters = {
    type: type || undefined,
    organization_id: organizationId || undefined,
    client_id: get("client_id") || undefined,
    directory_id: directoryId || undefined,
    page,
    limit: LIMIT,
    ...(queue !== "unchecked" ? { status: status || undefined, days } : {}),
  };

  return (
    <div className="surface overflow-hidden">
      <Tabs
        tabs={[
          { value: "unchecked", label: "Unchecked" },
          { value: "stale", label: "Stale" },
          { value: "recent", label: "Recent changes" },
        ]}
        value={queue}
        onChange={(v) => update({ queue: v === "unchecked" ? null : v, days: null, status: null })}
      />
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border-light)] p-4">
        <select aria-label="Directory type" className={filterClass} value={type} onChange={(e) => update({ type: e.target.value || null })}>
          <option value="">Any directory type</option>
          {DIRECTORY_TYPES.map((t) => (
            <option key={t} value={t}>
              {DIRECTORY_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        {queue !== "unchecked" && (
          <>
            <select aria-label="Status" className={filterClass} value={status} onChange={(e) => update({ status: e.target.value || null })}>
              <option value="">{queue === "recent" ? "Any new status" : "Any status"}</option>
              {CITATION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {CITATION_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <select aria-label="Days" className={filterClass} value={String(days)} onChange={(e) => update({ days: e.target.value })}>
              {(queue === "stale" ? [30, 60, 90, 180, 365] : [1, 7, 14, 30, 90]).map((d) => (
                <option key={d} value={d}>
                  {queue === "stale" ? `Not checked for ${d}+ days` : `Last ${d} day${d === 1 ? "" : "s"}`}
                </option>
              ))}
            </select>
          </>
        )}
        {organizationId && <OrgChip onClear={() => update({ organization_id: null, client_id: null })} />}
        {directoryId && <OrgChip label="One directory" onClear={() => update({ directory_id: null })} />}
      </div>
      {queue === "unchecked" && <UncheckedQueue filters={filters} page={page} setPage={setPage} />}
      {queue === "stale" && <StaleQueue filters={filters} page={page} setPage={setPage} />}
      {queue === "recent" && <RecentQueue filters={filters} page={page} setPage={setPage} />}
    </div>
  );
}

type QueueProps = { filters: QueueFilters; page: number; setPage: (p: number) => void };

function LocationCell({ location }: { location: LocationRef }) {
  return (
    <Link to={`/citations/locations/${location.id}`} className="block min-w-0">
      <span className="block truncate font-semibold text-[var(--color-primary)] hover:underline">{location.name}</span>
      <span className="block truncate text-xs text-[var(--color-text-muted)]">
        {[location.city, location.organization?.name, location.client?.name].filter(Boolean).join(" · ")}
      </span>
    </Link>
  );
}

function QueueTable({ head, children, empty, loading }: { head: string[]; children: ReactNode[]; empty: string; loading: boolean }) {
  return (
    <div className="table-scroll">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="bg-[var(--color-surface-muted)] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-4 py-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {children.length === 0 ? (
            <tr>
              <td colSpan={head.length} className="px-4 py-12 text-center text-[var(--color-text-muted)]">
                {loading ? "Loading…" : empty}
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}

function UncheckedQueue({ filters, page, setPage }: QueueProps) {
  const data = useQuery(`queue-unchecked:${JSON.stringify(filters)}`, (signal) => citationsApi.queueUnchecked(filters, signal));
  if (data.error) return <ErrorState error={data.error} onRetry={data.reload} />;
  return (
    <>
      <QueueTable head={["Location", "Not checked", "On the list", "Waiting since"]} empty="Nothing left unchecked." loading={data.loading}>
        {(data.data?.locations ?? []).map((row) => (
          <tr key={row.location.id} className="border-t border-[var(--color-border-light)] text-[var(--color-text-secondary)]">
            <td className="px-4 py-3">
              <LocationCell location={row.location} />
            </td>
            <td className="px-4 py-3 font-semibold text-[var(--color-text-primary)]">{row.unchecked}</td>
            <td className="px-4 py-3">{row.active_entries}</td>
            <td className="px-4 py-3">
              {formatDate(row.oldest_added_at)} <span className="text-xs text-[var(--color-text-muted)]">({formatRelative(row.oldest_added_at)})</span>
            </td>
          </tr>
        ))}
      </QueueTable>
      {data.data && data.data.total > 0 && (
        <div className="border-t border-[var(--color-border-light)] px-3">
          <Pagination page={page} limit={LIMIT} total={data.data.total} onPageChange={setPage} />
        </div>
      )}
    </>
  );
}

function StaleQueue({ filters, page, setPage }: QueueProps) {
  const data = useQuery(`queue-stale:${JSON.stringify(filters)}`, (signal) => citationsApi.queueStale(filters, signal));
  if (data.error) return <ErrorState error={data.error} onRetry={data.reload} />;
  return (
    <>
      <QueueTable head={["Location", "Directory", "Status", "Last checked"]} empty="Nothing is stale." loading={data.loading}>
        {(data.data?.entries ?? []).map((entry) => (
          <tr key={entry.id} className="border-t border-[var(--color-border-light)] text-[var(--color-text-secondary)]">
            <td className="px-4 py-3">
              <LocationCell location={entry.location} />
            </td>
            <td className="px-4 py-3">
              <div className="text-[var(--color-text-primary)]">{entry.directory.name}</div>
              <div className="text-xs text-[var(--color-text-muted)]">{DIRECTORY_TYPE_LABELS[entry.directory.type]}</div>
            </td>
            <td className="px-4 py-3">
              <CitationStatusBadge status={entry.status} />
            </td>
            <td className="px-4 py-3">
              {formatDate(entry.last_checked_at)} <span className="text-xs text-[var(--color-text-muted)]">({entry.days_since_check} days)</span>
            </td>
          </tr>
        ))}
      </QueueTable>
      {data.data && data.data.total > 0 && (
        <div className="border-t border-[var(--color-border-light)] px-3">
          <Pagination page={page} limit={LIMIT} total={data.data.total} onPageChange={setPage} />
        </div>
      )}
    </>
  );
}

function RecentQueue({ filters, page, setPage }: QueueProps) {
  const data = useQuery(`queue-recent:${JSON.stringify(filters)}`, (signal) => citationsApi.queueRecent(filters, signal));
  if (data.error) return <ErrorState error={data.error} onRetry={data.reload} />;
  return (
    <>
      <QueueTable head={["When", "Location", "Directory", "Change", "By"]} empty="No changes in this period." loading={data.loading}>
        {(data.data?.changes ?? []).map((c) => (
          <tr key={c.id} className="border-t border-[var(--color-border-light)] text-[var(--color-text-secondary)]">
            <td className="whitespace-nowrap px-4 py-3">{formatDateTime(c.at)}</td>
            <td className="px-4 py-3">
              <LocationCell location={c.location} />
            </td>
            <td className="px-4 py-3 text-[var(--color-text-primary)]">{c.directory?.name ?? "—"}</td>
            <td className="px-4 py-3">
              {c.to ? (
                <span className="inline-flex flex-wrap items-center gap-1 text-xs">
                  {c.from && c.from !== c.to && (
                    <>
                      <CitationStatusBadge status={c.from} /> →
                    </>
                  )}
                  <CitationStatusBadge status={c.to} />
                </span>
              ) : (
                c.action.replace(/_/g, " ")
              )}
              {c.note && <div className="mt-0.5 text-xs text-[var(--color-text-muted)]">“{c.note}”</div>}
            </td>
            <td className="px-4 py-3">{c.by.name ?? "Admin"}</td>
          </tr>
        ))}
      </QueueTable>
      {data.data && data.data.total > 0 && (
        <div className="border-t border-[var(--color-border-light)] px-3">
          <Pagination page={page} limit={LIMIT} total={data.data.total} onPageChange={setPage} />
        </div>
      )}
    </>
  );
}

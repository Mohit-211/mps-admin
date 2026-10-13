import { ExternalLink, ListPlus, Plus, RotateCcw, Search, Sparkles, StickyNote } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import {
  CITATION_STATUS_LABELS,
  CITATION_STATUSES,
  citationsApi,
  DIRECTORY_TYPE_LABELS,
  NAP_FIELDS,
  type CitationEntry,
  type CitationStatus,
  type LocationCitations,
} from "../../api/citations";
import { useAuth } from "../../auth/useAuth";
import { OrgLink } from "../../components/EntityLinks";
import { CitationStatusBadge, GradeLetter } from "../../components/StateBadges";
import { Button } from "../../components/ui/Button";
import { checkboxClass, filterClass, compactInputClass } from "../../components/ui/fieldStyles";
import { BackLink, DetailSkeleton } from "../../components/ui/PageHeader";
import { Notice, Panel } from "../../components/ui/Panel";
import { ErrorState } from "../../components/ui/States";
import { useQuery } from "../../hooks/useQuery";
import { errorMessage } from "../../lib/api";
import { formatPercent, formatRelative } from "../../lib/format";
import { AddDirectoriesDialog, BulkResultDialog, SuggestDialog } from "./CitationDialogs";
import { DiscoverDialog } from "./DiscoverDialog";
import { EntryDialog } from "./EntryDialog";

export function LocationCitationsPage() {
  const { locationId = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const { can } = useAuth();
  const canManage = can("citations.manage");
  const data = useQuery(`cit-location:${locationId}`, (signal) => citationsApi.location(locationId, signal));
  const [selected, setSelected] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<"" | CitationStatus>("");
  const [openEntry, setOpenEntry] = useState<CitationEntry | null>(null);
  const [dialog, setDialog] = useState<"suggest" | "add" | "discover" | null>(null);
  const [bulkStatus, setBulkStatus] = useState<"" | CitationStatus>("");
  const [bulkNote, setBulkNote] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ updated: number; unchanged: number; skipped: { entry_id: string; reason: string }[] } | null>(null);
  const autoSuggested = useRef(false);

  // "Build list" from the locations index opens the suggestion preview straight away.
  useEffect(() => {
    if (params.get("suggest") === "1" && data.data && canManage && !autoSuggested.current) {
      autoSuggested.current = true;
      setDialog("suggest");
      setParams((p) => {
        const next = new URLSearchParams(p);
        next.delete("suggest");
        return next;
      }, { replace: true });
    }
  }, [params, data.data, canManage, setParams]);

  if (data.error) {
    return (
      <div>
        <BackLink to="/citations/locations" label="Locations" />
        <div className="surface">
          <ErrorState error={data.error} onRetry={data.reload} notFound="Not found or not assigned to you." />
        </div>
      </div>
    );
  }
  const d = data.data;
  if (!d) {
    return (
      <div>
        <BackLink to="/citations/locations" label="Locations" />
        <DetailSkeleton />
      </div>
    );
  }

  const entries = statusFilter ? d.entries.filter((e) => e.status === statusFilter) : d.entries;
  const allSelected = entries.length > 0 && entries.every((e) => selected.includes(e.id));

  const replaceEntry = (entry: CitationEntry) => {
    // the health score changes with every save: reload the whole list
    data.reload();
    setOpenEntry((current) => (current?.id === entry.id ? entry : current));
  };

  const applyBulk = async () => {
    if (!bulkStatus || selected.length === 0) return;
    if (selected.length > 200) {
      toast.error("Select at most 200 entries at a time.");
      return;
    }
    setBulkBusy(true);
    try {
      const result = await citationsApi.bulk({ entry_ids: selected, status: bulkStatus, ...(bulkNote.trim() ? { note: bulkNote.trim() } : {}) });
      setBulkResult(result);
      setSelected([]);
      setBulkNote("");
      data.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBulkBusy(false);
    }
  };

  const restore = async (entry: CitationEntry) => {
    try {
      await citationsApi.restoreEntry(entry.id);
      toast.success(`${entry.directory.name} is back on the list.`);
      data.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <div className="space-y-5">
      <BackLink to="/citations/locations" label="Locations" />

      <LocationHeader data={d} />

      {!d.category_matched && (
        <Notice>
          No directory category matches this business ({d.business_categories.join(", ") || "no category"}). Only general directories
          are suggested. Map its category under Categories.
        </Notice>
      )}

      <div className="surface overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-light)] p-4">
          <div className="flex flex-wrap items-center gap-2">
            <select aria-label="Status" className={filterClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "" | CitationStatus)}>
              <option value="">All statuses ({d.entries.length})</option>
              {CITATION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {CITATION_STATUS_LABELS[s]} ({d.health.counts[s] ?? 0})
                </option>
              ))}
            </select>
          </div>
          {canManage && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => setDialog("suggest")}>
                <Sparkles size={14} /> Suggest directories
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setDialog("add")}>
                <Plus size={14} /> Add by hand
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setDialog("discover")} title="An AI web search; results wait in Suggested for review">
                <Search size={14} /> Find local directories
              </Button>
            </div>
          )}
        </div>

        {canManage && selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border-light)] bg-[var(--color-primary-light)] px-4 py-2.5">
            <span className="text-sm font-medium text-[var(--color-primary)]">{selected.length} selected</span>
            <select aria-label="New status" className={filterClass} value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as "" | CitationStatus)}>
              <option value="">Set status to…</option>
              {CITATION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {CITATION_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <input
              aria-label="Comment for the history (optional)"
              placeholder="Comment for the history (optional)"
              className={`${compactInputClass} w-full sm:w-64`}
              maxLength={500}
              value={bulkNote}
              onChange={(e) => setBulkNote(e.target.value)}
            />
            <Button size="sm" onClick={applyBulk} loading={bulkBusy} disabled={!bulkStatus}>
              Apply
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
              Clear
            </Button>
          </div>
        )}

        <div className="table-scroll">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-[var(--color-surface-muted)] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
              <tr>
                {canManage && (
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label="Select all"
                      className={checkboxClass}
                      checked={allSelected}
                      onChange={(e) => setSelected(e.target.checked ? entries.map((x) => x.id) : [])}
                    />
                  </th>
                )}
                <th className="px-4 py-3">Directory</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Listing</th>
                <th className="px-4 py-3">NAP found</th>
                <th className="px-4 py-3">Last checked</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 6 : 5} className="px-4 py-12 text-center text-[var(--color-text-muted)]">
                    {d.entries.length === 0 ? (
                      <span className="inline-flex flex-col items-center gap-3">
                        No citation list yet.
                        {canManage && (
                          <Button size="sm" onClick={() => setDialog("suggest")}>
                            <ListPlus size={14} /> Build the list
                          </Button>
                        )}
                      </span>
                    ) : (
                      "No entries with this status."
                    )}
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr
                    key={entry.id}
                    onClick={() => setOpenEntry(entry)}
                    className="cursor-pointer border-t border-[var(--color-border-light)] align-top text-[var(--color-text-secondary)] hover:bg-[var(--color-background)]"
                  >
                    {canManage && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Select ${entry.directory.name}`}
                          className={checkboxClass}
                          checked={selected.includes(entry.id)}
                          onChange={(e) => setSelected((ids) => (e.target.checked ? [...ids, entry.id] : ids.filter((x) => x !== entry.id)))}
                        />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 font-semibold text-[var(--color-text-primary)]">
                        {entry.directory.name}
                        {entry.notes && (
                          <span title={`Internal note: ${entry.notes}`}>
                            <StickyNote size={13} className="text-[#a66d16]" />
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)]">
                        {DIRECTORY_TYPE_LABELS[entry.directory.type]}
                        {entry.directory.authority !== null ? ` · authority ${entry.directory.authority}` : ""}
                        {!entry.directory.is_active ? " · inactive directory" : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <CitationStatusBadge status={entry.status} />
                    </td>
                    <td className="max-w-[200px] px-4 py-3">
                      {entry.listing_url ? (
                        <a
                          href={entry.listing_url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex max-w-full items-center gap-1 truncate text-xs text-[var(--color-primary)] hover:underline"
                        >
                          <span className="truncate">{entry.listing_url.replace(/^https?:\/\//, "")}</span>
                          <ExternalLink size={11} className="shrink-0" />
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <NapFound entry={entry} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs">{formatRelative(entry.last_checked_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {d.removed_from_list.length > 0 && (
        <details className="surface">
          <summary className="cursor-pointer px-5 py-3.5 text-sm font-semibold text-[var(--color-text-primary)]">
            Taken off this location's list ({d.removed_from_list.length})
          </summary>
          <ul className="divide-y divide-[var(--color-border-light)] border-t border-[var(--color-border-light)]">
            {d.removed_from_list.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                <button type="button" className="text-left" onClick={() => setOpenEntry(entry)}>
                  <span className="font-medium text-[var(--color-text-primary)]">{entry.directory.name}</span>{" "}
                  <span className="text-xs text-[var(--color-text-muted)]">{DIRECTORY_TYPE_LABELS[entry.directory.type]}</span>
                </button>
                {canManage && (
                  <Button size="sm" variant="secondary" onClick={() => restore(entry)}>
                    <RotateCcw size={13} /> Restore
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

      <EntryDialog
        entry={openEntry}
        nap={d.location.nap}
        canManage={canManage}
        onClose={() => setOpenEntry(null)}
        onSaved={replaceEntry}
      />
      <DiscoverDialog
        open={dialog === "discover"}
        onClose={() => setDialog(null)}
        location={{ id: d.location.id, name: d.location.name, city: d.location.city }}
      />
      <SuggestDialog open={dialog === "suggest"} locationId={d.location.id} onClose={() => setDialog(null)} onAdded={data.reload} />
      <AddDirectoriesDialog
        open={dialog === "add"}
        location={d}
        onClose={() => setDialog(null)}
        onAdded={data.reload}
      />
      <BulkResultDialog result={bulkResult} entries={d.entries} onClose={() => setBulkResult(null)} />
    </div>
  );
}

function LocationHeader({ data: d }: { data: LocationCitations }) {
  const l = d.location;
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="surface p-5">
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">{l.name}</h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          {[l.city, l.state, l.country].filter(Boolean).join(", ")}
          {" · "}
          <OrgLink id={l.organization?.id} className="font-medium">
            {l.organization?.name ?? "Organization"}
          </OrgLink>
          {l.client ? ` · client ${l.client.name ?? "—"}` : ""}
        </p>
        <div className="mt-4 rounded-md border-2 border-[var(--color-primary-light)] bg-[var(--color-background)] p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-primary)]">
            Every listing should show (NAP)
          </p>
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {NAP_FIELDS.map((f) => (
              <div key={f.key}>
                <dt className="text-xs text-[var(--color-text-muted)]">{f.label}</dt>
                <dd className="break-words text-sm font-medium text-[var(--color-text-primary)]">{l.nap[f.key] || "—"}</dd>
              </div>
            ))}
          </dl>
        </div>
        {d.category_groups.length > 0 && (
          <p className="mt-3 text-xs text-[var(--color-text-muted)]">
            Directory categories: {d.category_groups.map((g) => g.name).join(", ")} · business categories:{" "}
            {d.business_categories.join(", ") || "—"}
          </p>
        )}
      </section>
      <Panel title="Citation Health">
        <div className="p-5">
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold text-[var(--color-text-primary)]">{d.health.score ?? "—"}</span>
            {d.health.grade && <GradeLetter grade={d.health.grade} />}
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            Coverage {formatPercent(d.health.coverage)} · {d.health.scored ?? 0} of {d.health.total} scored
          </p>
          <ul className="mt-3 space-y-1 text-xs">
            {CITATION_STATUSES.filter((s) => d.health.counts[s]).map((s) => (
              <li key={s} className="flex justify-between text-[var(--color-text-secondary)]">
                <span>{CITATION_STATUS_LABELS[s]}</span>
                <span className="font-semibold text-[var(--color-text-primary)]">{d.health.counts[s]}</span>
              </li>
            ))}
          </ul>
        </div>
      </Panel>
    </div>
  );
}

/** The NAP as found, with the server's mismatch_fields highlighted (never compared in the browser). */
function NapFound({ entry }: { entry: CitationEntry }) {
  const found = entry.nap_found;
  if (!found || NAP_FIELDS.every((f) => !found[f.key])) return <span className="text-xs text-[var(--color-text-muted)]">Not recorded</span>;
  return (
    <dl className="space-y-0.5 text-xs">
      {NAP_FIELDS.filter((f) => found[f.key]).map((f) => {
        const wrong = entry.mismatch_fields.includes(f.key);
        return (
          <div key={f.key} className={wrong ? "font-medium text-[var(--color-danger)]" : ""}>
            <span className="text-[var(--color-text-muted)]">{f.label}:</span> {found[f.key]}
            {wrong && " ✗"}
          </div>
        );
      })}
    </dl>
  );
}

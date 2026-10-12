import { Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  citationsApi,
  DIRECTORY_TYPE_LABELS,
  type CitationCountry,
  type CitationEntry,
  type LocationCitations,
} from "../../api/citations";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { FormError } from "../../components/ui/Field";
import { checkboxClass } from "../../components/ui/fieldStyles";
import { Modal } from "../../components/ui/Modal";
import { Notice } from "../../components/ui/Panel";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useQuery } from "../../hooks/useQuery";
import { errorMessage } from "../../lib/api";

// ---- suggest: always a dry run first ----

export function SuggestDialog(props: { open: boolean; locationId: string; onClose: () => void; onAdded: () => void }) {
  return props.open ? <SuggestBody {...props} /> : null;
}

function SuggestBody({ locationId, onClose, onAdded }: { locationId: string; onClose: () => void; onAdded: () => void }) {
  const preview = useQuery(`suggest-preview:${locationId}`, () => citationsApi.suggest(locationId, true));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const p = preview.data;

  const apply = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await citationsApi.suggest(locationId, false);
      toast.success(`${result.added.length} director${result.added.length === 1 ? "y" : "ies"} added as “not checked”.`);
      onAdded();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      size="lg"
      onClose={busy ? () => undefined : onClose}
      title="Suggest directories"
      description="Active directories for the location's country, region and category groups. It only adds, as “not checked”, and never re-adds one taken off the list."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={apply} loading={busy} disabled={!p || p.added.length === 0}>
            Add {p ? p.added.length : ""} director{p?.added.length === 1 ? "y" : "ies"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <FormError message={error ?? (preview.error ? errorMessage(preview.error) : null)} />
        {!p && !preview.error && <p className="py-6 text-center text-sm text-[var(--color-text-muted)]">Previewing…</p>}
        {p && (
          <>
            {p.reason === "unsupported_country" && (
              <Notice tone="red">This location isn't in the US or Canada, so no directories can be suggested.</Notice>
            )}
            {!p.category_matched && p.reason !== "unsupported_country" && (
              <Notice>No directory category matches this business. Only general directories are suggested. Map its category under Categories.</Notice>
            )}
            <p className="text-sm text-[var(--color-text-secondary)]">
              {p.added.length} to add · {p.already_listed} already on the list
              {p.region ? ` · region ${p.region}` : ""}
              {p.category_groups.length ? ` · ${p.category_groups.map((g) => g.name).join(", ")}` : ""}
            </p>
            {p.added.length > 0 && (
              <ul className="max-h-80 divide-y divide-[var(--color-border-light)] overflow-y-auto rounded-md border border-[var(--color-border)]">
                {p.added.map((d) => (
                  <li key={d.directory_id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="text-[var(--color-text-primary)]">{d.name}</span>
                    <Badge tone="gray">{DIRECTORY_TYPE_LABELS[d.type] ?? d.type}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

// ---- add directories by hand ----

export function AddDirectoriesDialog(props: { open: boolean; location: LocationCitations; onClose: () => void; onAdded: () => void }) {
  return props.open ? <AddBody {...props} /> : null;
}

const countryOf = (country: string | null | undefined): CitationCountry | undefined => {
  const c = (country ?? "").toLowerCase();
  if (c === "us" || c.includes("united states")) return "US";
  if (c === "ca" || c.includes("canada")) return "CA";
  return undefined;
};

function AddBody({ location, onClose, onAdded }: { location: LocationCitations; onClose: () => void; onAdded: () => void }) {
  const [term, setTerm] = useState("");
  const q = useDebouncedValue(term.trim(), 300);
  const country = countryOf(location.location.country);
  const results = useQuery(`dir-pick:${q}:${country}`, (signal) =>
    citationsApi.directories({ q: q || undefined, active: true, country, limit: 50 }, signal),
  );
  const listed = new Set([...location.entries, ...location.removed_from_list].map((e) => e.directory.id));
  const removed = new Set(location.removed_from_list.map((e) => e.directory.id));
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await citationsApi.addEntries(location.location.id, picked);
      toast.success(
        [`${result.added} added`, result.restored ? `${result.restored} restored` : null, result.already_listed ? `${result.already_listed} already listed` : null]
          .filter(Boolean)
          .join(" · "),
      );
      onAdded();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      size="lg"
      onClose={busy ? () => undefined : onClose}
      title="Add directories by hand"
      description={`Active directories${country ? ` for ${country === "US" ? "the US" : "Canada"}` : ""}. Picking one that was taken off the list restores it.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={add} loading={busy} disabled={picked.length === 0}>
            Add {picked.length || ""}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <FormError message={error} />
        <label className="relative block">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search directories…"
            className="h-10 w-full rounded-md border border-[var(--color-border)] pl-9 pr-3 text-sm outline-none focus:border-[var(--color-primary)]"
            autoFocus
          />
        </label>
        <ul className="max-h-80 divide-y divide-[var(--color-border-light)] overflow-y-auto rounded-md border border-[var(--color-border)]">
          {results.error ? (
            <li className="px-3 py-3 text-sm text-[var(--color-danger)]">{errorMessage(results.error)}</li>
          ) : !results.data ? (
            <li className="px-3 py-3 text-sm text-[var(--color-text-muted)]">Loading…</li>
          ) : results.data.directories.length === 0 ? (
            <li className="px-3 py-3 text-sm text-[var(--color-text-muted)]">No directories found.</li>
          ) : (
            results.data.directories.map((d) => {
              const onList = listed.has(d.id) && !removed.has(d.id);
              return (
                <li key={d.id}>
                  <label className={`flex items-center gap-3 px-3 py-2 text-sm ${onList ? "opacity-50" : "cursor-pointer hover:bg-[var(--color-surface-muted)]"}`}>
                    <input
                      type="checkbox"
                      className={checkboxClass}
                      disabled={onList}
                      checked={onList || picked.includes(d.id)}
                      onChange={(e) => setPicked((ids) => (e.target.checked ? [...ids, d.id] : ids.filter((x) => x !== d.id)))}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[var(--color-text-primary)]">{d.name}</span>
                      <span className="block truncate text-xs text-[var(--color-text-muted)]">
                        {d.domain} · {DIRECTORY_TYPE_LABELS[d.type]}
                        {d.regions.length ? ` · ${d.regions.join(", ")}` : ""}
                      </span>
                    </span>
                    {onList && <span className="text-xs text-[var(--color-text-muted)]">On the list</span>}
                    {removed.has(d.id) && <Badge tone="amber">Taken off</Badge>}
                  </label>
                </li>
              );
            })
          )}
        </ul>
        {results.data && results.data.total > results.data.directories.length && (
          <p className="text-xs text-[var(--color-text-muted)]">Showing the first {results.data.directories.length} of {results.data.total}. Search to narrow.</p>
        )}
      </div>
    </Modal>
  );
}

// ---- bulk result ----

const SKIP_REASONS: Record<string, string> = {
  nap_mismatch: "NAP differs from the location's (can't be “live, correct”)",
  entry_removed: "Taken off the list",
  not_found: "Not found or not assigned to you",
};

export function BulkResultDialog({
  result,
  entries,
  onClose,
}: {
  result: { updated: number; unchanged: number; skipped: { entry_id: string; reason: string }[] } | null;
  entries: CitationEntry[];
  onClose: () => void;
}) {
  if (!result) return null;
  const name = new Map(entries.map((e) => [e.id, e.directory.name]));
  return (
    <Modal
      open
      onClose={onClose}
      title="Bulk update done"
      description={`${result.updated} updated · ${result.unchanged} unchanged · ${result.skipped.length} skipped`}
      footer={<Button onClick={onClose}>Close</Button>}
    >
      {result.skipped.length === 0 ? (
        <p className="text-sm text-[var(--color-text-secondary)]">Nothing was skipped.</p>
      ) : (
        <ul className="divide-y divide-[var(--color-border-light)] rounded-md border border-[var(--color-border)]">
          {result.skipped.map((s) => (
            <li key={s.entry_id} className="flex flex-col px-3 py-2 text-sm">
              <span className="font-medium text-[var(--color-text-primary)]">{name.get(s.entry_id) ?? "Entry"}</span>
              <span className="text-xs text-[var(--color-text-secondary)]">{SKIP_REASONS[s.reason] ?? s.reason}</span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

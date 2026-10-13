import { AlertTriangle, Check, ExternalLink, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import {
  citationsApi,
  DIRECTORY_TYPE_LABELS,
  DIRECTORY_TYPES,
  type CitationCountry,
  type DirectoryCategory,
  type DirectorySuggestion,
  type DirectoryType,
  type DiscoveryScope,
  type SuggestionStatus,
} from "../../api/citations";
import { useAuth } from "../../auth/useAuth";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Field, FormError } from "../../components/ui/Field";
import { OrgChip } from "../../components/ui/FilterChip";
import { checkboxClass, filterClass, inputClass, textareaClass } from "../../components/ui/fieldStyles";
import { Modal } from "../../components/ui/Modal";
import { Pagination } from "../../components/ui/Pagination";
import { ErrorState } from "../../components/ui/States";
import { Tabs } from "../../components/ui/Tabs";
import { useQuery } from "../../hooks/useQuery";
import { useUrlState } from "../../hooks/useUrlState";
import { ApiError, errorMessage } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import { DiscoverDialog } from "./DiscoverDialog";

const LIMIT = 25;

/** Phase 22: directories suggested by the AI search, waiting for an admin to accept or dismiss. */
export function SuggestionsPage() {
  const { can, admin } = useAuth();
  const canManage = can("citations.manage");
  const { get, update, page, setPage } = useUrlState();
  const status = (["accepted", "dismissed"].includes(get("status")) ? get("status") : "pending") as SuggestionStatus;
  const scope = get("scope") as "" | DiscoveryScope;
  const country = get("country") as "" | CitationCountry;
  const locationId = get("location_id");
  const [selected, setSelected] = useState<string[]>([]);
  const [accepting, setAccepting] = useState<DirectorySuggestion | null>(null);
  const [dismissing, setDismissing] = useState<DirectorySuggestion[] | null>(null);
  const [discovering, setDiscovering] = useState(false);

  const query = { status, scope: scope || undefined, country: country || undefined, location_id: locationId || undefined, page, limit: LIMIT };
  const list = useQuery(`suggestions:${JSON.stringify(query)}`, (signal) => citationsApi.suggestions(query, signal));
  const categories = useQuery("cit-categories", (signal) => citationsApi.categories(signal));
  const rows = list.data?.suggestions ?? [];
  const pending = status === "pending" && canManage;

  return (
    <div className="surface overflow-hidden">
      <Tabs
        tabs={[
          { value: "pending", label: "Pending" },
          { value: "accepted", label: "Accepted" },
          { value: "dismissed", label: "Dismissed" },
        ]}
        value={status}
        onChange={(v) => {
          setSelected([]);
          update({ status: v === "pending" ? null : v });
        }}
      />
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border-light)] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Search kind" className={filterClass} value={scope} onChange={(e) => update({ scope: e.target.value || null })}>
            <option value="">Every search</option>
            <option value="general">General</option>
            <option value="category">By business category</option>
            <option value="location">For a location</option>
          </select>
          <select aria-label="Country" className={filterClass} value={country} onChange={(e) => update({ country: e.target.value || null })}>
            <option value="">US and Canada</option>
            <option value="US">US</option>
            <option value="CA">Canada</option>
          </select>
          {locationId && <OrgChip label="One location" onClear={() => update({ location_id: null })} />}
        </div>
        <div className="flex flex-wrap gap-2">
          {pending && selected.length > 0 && (
            <Button size="sm" variant="secondary" className="text-[var(--color-danger)]" onClick={() => setDismissing(rows.filter((r) => selected.includes(r.id)))}>
              Dismiss {selected.length} selected
            </Button>
          )}
          {canManage && admin?.citation_scope !== "assigned" && (
            <Button size="sm" onClick={() => setDiscovering(true)}>
              <Sparkles size={14} /> Discover directories
            </Button>
          )}
        </div>
      </div>

      {list.error ? (
        <ErrorState error={list.error} onRetry={list.reload} />
      ) : (
        <>
          <ul className="divide-y divide-[var(--color-border-light)]">
            {!list.data ? (
              <li className="px-4 py-12 text-center text-sm text-[var(--color-text-muted)]">Loading…</li>
            ) : rows.length === 0 ? (
              <li className="px-4 py-12 text-center text-sm text-[var(--color-text-muted)]">
                {status === "pending" ? "Nothing waiting for review. Run a search to find more directories." : `No ${status} suggestions.`}
              </li>
            ) : (
              rows.map((s) => (
                <SuggestionRow
                  key={s.id}
                  suggestion={s}
                  categories={categories.data ?? []}
                  selectable={pending}
                  selected={selected.includes(s.id)}
                  onSelect={(on) => setSelected((ids) => (on ? [...ids, s.id] : ids.filter((x) => x !== s.id)))}
                  onAccept={() => setAccepting(s)}
                  onDismiss={() => setDismissing([s])}
                  canManage={canManage}
                />
              ))
            )}
          </ul>
          {list.data && list.data.total > 0 && (
            <div className="border-t border-[var(--color-border-light)] px-3">
              <Pagination page={page} limit={LIMIT} total={list.data.total} onPageChange={setPage} />
            </div>
          )}
        </>
      )}

      <DiscoverDialog open={discovering} onClose={() => setDiscovering(false)} />
      {accepting && (
        <AcceptDialog
          suggestion={accepting}
          categories={categories.data ?? []}
          onClose={() => setAccepting(null)}
          onDismissInstead={() => {
            setDismissing([accepting]);
            setAccepting(null);
          }}
          onDone={() => {
            setSelected((ids) => ids.filter((x) => x !== accepting.id));
            list.reload();
          }}
        />
      )}
      {dismissing && (
        <DismissDialog
          suggestions={dismissing}
          onClose={() => setDismissing(null)}
          onDone={() => {
            setSelected([]);
            list.reload();
          }}
        />
      )}
    </div>
  );
}

function scopeLabel(s: DirectorySuggestion["scope"]) {
  const place = [s.city, s.region, s.country].filter(Boolean).join(", ");
  if (s.kind === "location") return `Location search${place ? ` · ${place}` : ""}${s.business_category ? ` · ${s.business_category}` : ""}`;
  if (s.kind === "category") return `Category: ${s.business_category ?? "—"}${place ? ` · ${place}` : ""}`;
  return `General${place ? ` · ${place}` : ""}`;
}

function SuggestionRow({
  suggestion: s,
  categories,
  selectable,
  selected,
  onSelect,
  onAccept,
  onDismiss,
  canManage,
}: {
  suggestion: DirectorySuggestion;
  categories: DirectoryCategory[];
  selectable: boolean;
  selected: boolean;
  onSelect: (on: boolean) => void;
  onAccept: () => void;
  onDismiss: () => void;
  canManage: boolean;
}) {
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  return (
    <li className="flex gap-3 px-4 py-3.5">
      {selectable && (
        <input type="checkbox" aria-label={`Select ${s.name}`} className={`${checkboxClass} mt-1`} checked={selected} onChange={(e) => onSelect(e.target.checked)} />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-[var(--color-text-primary)]">{s.name}</span>
          <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline">
            {s.domain} <ExternalLink size={11} />
          </a>
          <Badge tone="gray">{DIRECTORY_TYPE_LABELS[s.type] ?? s.type}</Badge>
          <span className="text-xs text-[var(--color-text-muted)]">
            {s.countries.join(", ")}
            {s.regions.length ? ` · ${s.regions.join(", ")}` : ""}
          </span>
          {s.url_check && !s.url_check.ok && (
            <span title={s.url_check.reason ?? undefined}>
              <Badge tone="amber">
                <AlertTriangle size={11} className="mr-1 inline" /> Site didn't answer when checked
              </Badge>
            </span>
          )}
        </div>
        {s.why && <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{s.why}</p>}
        {s.category_ids.length > 0 && (
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">Categories: {s.category_ids.map((id) => categoryName.get(id) ?? "…").join(", ")}</p>
        )}
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          {s.scope.kind === "location" && s.scope.location_id ? (
            <Link to={`/citations/locations/${s.scope.location_id}`} className="text-[var(--color-primary)] hover:underline">
              {scopeLabel(s.scope)}
            </Link>
          ) : (
            scopeLabel(s.scope)
          )}
          {" · "}searched by {s.created_by?.name ?? "an admin"} {formatDateTime(s.created_at)}
          {s.decided_at && ` · ${s.status} by ${s.decided_by?.name ?? "an admin"} ${formatDateTime(s.decided_at)}`}
          {s.note && ` · “${s.note}”`}
        </p>
        {s.sources.length > 0 && (
          <details className="mt-1">
            <summary className="cursor-pointer text-xs font-medium text-[var(--color-text-secondary)]">Sources ({s.sources.length})</summary>
            <ul className="mt-1 space-y-0.5 text-xs">
              {s.sources.map((src) => (
                <li key={src} className="truncate">
                  <a href={src} target="_blank" rel="noreferrer" className="text-[var(--color-primary)] hover:underline">
                    {src}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
      {s.status === "pending" && canManage && (
        <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row sm:items-start">
          <Button size="sm" onClick={onAccept}>
            <Check size={14} /> Accept
          </Button>
          <Button size="sm" variant="ghost" className="text-[var(--color-danger)]" onClick={onDismiss}>
            <X size={14} /> Dismiss
          </Button>
        </div>
      )}
      {s.status === "accepted" && <Badge tone="green">Added to the list</Badge>}
    </li>
  );
}

function AcceptDialog({
  suggestion: s,
  categories,
  onClose,
  onDone,
  onDismissInstead,
}: {
  suggestion: DirectorySuggestion;
  categories: DirectoryCategory[];
  onClose: () => void;
  onDone: () => void;
  onDismissInstead: () => void;
}) {
  const [name, setName] = useState(s.name);
  const [url, setUrl] = useState(s.url);
  const [type, setType] = useState<DirectoryType>(s.type);
  const [countries, setCountries] = useState<CitationCountry[]>(s.countries);
  const [regions, setRegions] = useState(s.regions.join(", "));
  const [categoryIds, setCategoryIds] = useState<string[]>(s.category_ids);
  const [authority, setAuthority] = useState("");
  const locationScope = s.scope.kind === "location" && !!s.scope.location_id;
  const [addToLocation, setAddToLocation] = useState(locationScope);
  const [problems, setProblems] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [taken, setTaken] = useState(false);
  const [busy, setBusy] = useState(false);
  const toggle = <T,>(list: T[], v: T, on: boolean) => (on ? [...list, v] : list.filter((x) => x !== v));

  const accept = async () => {
    const auth = authority.trim() === "" ? null : Number(authority);
    const local: Record<string, string> = {};
    if (!name.trim()) local.name = "Enter a name.";
    if (countries.length === 0) local.countries = "Choose at least one country.";
    if (type === "niche" && categoryIds.length === 0) local.category_ids = "A niche directory needs at least one category.";
    if (auth !== null && (!Number.isInteger(auth) || auth < 0 || auth > 100)) local.authority = "A whole number from 0 to 100, or empty.";
    setProblems(local);
    if (Object.keys(local).length) return;
    setBusy(true);
    setError(null);
    try {
      const result = await citationsApi.acceptSuggestion(s.id, {
        name: name.trim(),
        url: url.trim(),
        type,
        countries,
        regions: regions.split(/[\s,|]+/).map((r) => r.trim().toUpperCase()).filter(Boolean),
        category_ids: categoryIds,
        authority: auth,
        ...(locationScope ? { add_to_location: addToLocation } : {}),
      });
      toast.success(`${result.directory.name} was added to the directory list${result.added_to_location ? " and to the location's citation list" : ""}.`);
      onDone();
      onClose();
    } catch (e) {
      const reason = e instanceof ApiError ? e.reason : undefined;
      if (reason === "domain_taken") setTaken(true);
      else if (reason === "invalid_directory") {
        const list = ((e as ApiError).data?.problems as { field: string; message: string }[]) ?? [];
        setProblems(Object.fromEntries(list.map((p) => [p.field, p.message])));
        setError("Fix the highlighted fields.");
      } else if (reason === "already_decided") {
        toast.info("Someone already decided this suggestion.");
        onDone();
        onClose();
      } else setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      size="lg"
      onClose={busy ? () => undefined : onClose}
      title={`Accept ${s.name}`}
      description="It becomes a normal directory on the master list. Check the details first."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={accept} loading={busy} disabled={taken}>
            Accept and add
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormError message={error} />
        {taken && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-[#fbf3df] px-3 py-2.5 text-sm text-[#8a5a12]">
            Someone already added a directory with this domain.
            <Button size="sm" variant="secondary" onClick={onDismissInstead}>
              Dismiss the suggestion
            </Button>
          </div>
        )}
        {s.url_check && !s.url_check.ok && (
          <div className="rounded-md bg-[#fbf3df] px-3 py-2.5 text-xs text-[#8a5a12]">The site didn't answer when checked. Open it and make sure it's real before accepting.</div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="acc-name" error={problems.name}>
            <input id="acc-name" className={inputClass} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="URL" htmlFor="acc-url" error={problems.url}>
            <input id="acc-url" className={inputClass} maxLength={300} value={url} onChange={(e) => setUrl(e.target.value)} />
          </Field>
          <Field label="Type" htmlFor="acc-type" error={problems.type}>
            <select id="acc-type" className={inputClass} value={type} onChange={(e) => setType(e.target.value as DirectoryType)}>
              {DIRECTORY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {DIRECTORY_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Authority (0–100)" htmlFor="acc-authority" error={problems.authority} hint="Optional.">
            <input id="acc-authority" type="number" min={0} max={100} className={inputClass} value={authority} onChange={(e) => setAuthority(e.target.value)} />
          </Field>
          <Field label="Countries" htmlFor="acc-countries" error={problems.countries}>
            <div id="acc-countries" className="flex gap-4 pt-2">
              {(["US", "CA"] as CitationCountry[]).map((c) => (
                <label key={c} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className={checkboxClass} checked={countries.includes(c)} onChange={(e) => setCountries(toggle(countries, c, e.target.checked))} />
                  {c === "US" ? "United States" : "Canada"}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Regions" htmlFor="acc-regions" error={problems.regions} hint="2-letter codes. Empty: the whole country.">
            <input id="acc-regions" className={inputClass} value={regions} onChange={(e) => setRegions(e.target.value)} />
          </Field>
        </div>
        <Field
          label="Categories"
          htmlFor="acc-categories"
          error={problems.category_ids ?? problems.categories}
          hint={type === "niche" ? "Required for a niche directory." : "None: it fits every business."}
        >
          <div id="acc-categories" className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
            {categories.map((c) => (
              <label key={c.id} className="flex items-center gap-2 rounded-md border border-[var(--color-border)] px-2.5 py-1.5 text-sm">
                <input type="checkbox" className={checkboxClass} checked={categoryIds.includes(c.id)} onChange={(e) => setCategoryIds(toggle(categoryIds, c.id, e.target.checked))} />
                {c.name}
              </label>
            ))}
          </div>
        </Field>
        {locationScope && (
          <label className="flex items-center gap-2.5 text-sm text-[var(--color-text-primary)]">
            <input type="checkbox" className={checkboxClass} checked={addToLocation} onChange={(e) => setAddToLocation(e.target.checked)} />
            Also add to this location's citation list (as “not checked”)
          </label>
        )}
      </div>
    </Modal>
  );
}

function DismissDialog({ suggestions, onClose, onDone }: { suggestions: DirectorySuggestion[]; onClose: () => void; onDone: () => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const many = suggestions.length > 1;

  const dismiss = async () => {
    setBusy(true);
    setError(null);
    let done = 0;
    let decided = 0;
    const failed: string[] = [];
    // one call per row (there's no bulk route)
    for (const s of suggestions) {
      try {
        await citationsApi.dismissSuggestion(s.id, note.trim() || undefined);
        done += 1;
      } catch (e) {
        if (e instanceof ApiError && e.reason === "already_decided") decided += 1;
        else failed.push(`${s.name}: ${errorMessage(e)}`);
      }
    }
    setBusy(false);
    if (done || decided) {
      toast.success(`${done} dismissed${decided ? ` · ${decided} already decided by someone else` : ""}. They won't be suggested again.`);
      onDone();
    }
    if (failed.length) setError(failed.join(" "));
    else onClose();
  };

  return (
    <Modal
      open
      onClose={busy ? () => undefined : onClose}
      title={many ? `Dismiss ${suggestions.length} suggestions?` : `Dismiss ${suggestions[0]?.name}?`}
      description="Dismissed domains are never suggested again."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" onClick={dismiss} loading={busy}>
            Dismiss
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <FormError message={error} />
        <Field label="Reason (optional)" htmlFor="dismiss-note">
          <textarea id="dismiss-note" className={textareaClass} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. paid-only listings, spammy" />
        </Field>
      </div>
    </Modal>
  );
}

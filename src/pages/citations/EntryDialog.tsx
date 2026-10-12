import { CheckCheck, ExternalLink, MinusCircle, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  CITATION_STATUS_LABELS,
  CITATION_STATUSES,
  citationsApi,
  DIRECTORY_TYPE_LABELS,
  NAP_FIELDS,
  type CitationEntry,
  type CitationStatus,
  type EntryUpdate,
  type Nap,
  type NapField,
} from "../../api/citations";
import { CitationStatusBadge } from "../../components/StateBadges";
import { Button } from "../../components/ui/Button";
import { Field, FormError } from "../../components/ui/Field";
import { inputClass, textareaClass } from "../../components/ui/fieldStyles";
import { Modal } from "../../components/ui/Modal";
import { Notice } from "../../components/ui/Panel";
import { Pagination } from "../../components/ui/Pagination";
import { ErrorState } from "../../components/ui/States";
import { Tabs } from "../../components/ui/Tabs";
import { useQuery } from "../../hooks/useQuery";
import { ApiError, errorMessage } from "../../lib/api";
import { formatDateTime, formatRelative, humanize } from "../../lib/format";

type EntryDialogProps = {
  entry: CitationEntry | null;
  /** What every listing should show. */
  nap: Nap;
  canManage: boolean;
  onClose: () => void;
  onSaved: (entry: CitationEntry) => void;
};

export function EntryDialog(props: EntryDialogProps) {
  // keyed by entry, so the form starts from that entry's values
  return props.entry ? <EntryDialogBody key={props.entry.id} {...props} entry={props.entry} /> : null;
}

function EntryDialogBody({ entry, nap, canManage, onClose, onSaved }: EntryDialogProps & { entry: CitationEntry }) {
  const [tab, setTab] = useState<"check" | "history">(canManage && entry.active ? "check" : "history");
  return (
    <Modal
      open
      size="lg"
      onClose={onClose}
      title={entry.directory.name}
      description={
        <span className="inline-flex flex-wrap items-center gap-2">
          <CitationStatusBadge status={entry.status} />
          {DIRECTORY_TYPE_LABELS[entry.directory.type]}
          <a href={entry.directory.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[var(--color-primary)] hover:underline">
            {entry.directory.domain} <ExternalLink size={11} />
          </a>
          · checked {formatRelative(entry.last_checked_at)}
        </span>
      }
    >
      <div className="-mx-5 -mt-5 mb-4">
        <Tabs
          tabs={[
            ...(canManage && entry.active ? [{ value: "check" as const, label: "Record a check" }] : []),
            { value: "history" as const, label: "History" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>
      {!entry.active && (
        <div className="mb-4">
          <Notice>This directory was taken off the location's list. It no longer counts in the score; restore it to record checks.</Notice>
        </div>
      )}
      {tab === "check" ? (
        <CheckForm entry={entry} nap={nap} onClose={onClose} onSaved={onSaved} />
      ) : (
        <History entry={entry} canManage={canManage} onSaved={onSaved} onClose={onClose} />
      )}
    </Modal>
  );
}

/** For an employee limited to assigned locations, any other entry answers 404 (Phase 21). */
const notAssigned = (e: unknown) => (e instanceof ApiError && e.status === 404 ? "Not found or not assigned to you." : null);

// The backend's limits (citations.validation.ts napFound).
const NAP_MAX: Record<NapField, number> = { name: 200, address: 300, phone: 40, website: 300 };

const napOf = (entry: CitationEntry): Record<NapField, string> => ({
  name: entry.nap_found?.name ?? "",
  address: entry.nap_found?.address ?? "",
  phone: entry.nap_found?.phone ?? "",
  website: entry.nap_found?.website ?? "",
});

function CheckForm({
  entry,
  nap,
  onClose,
  onSaved,
}: {
  entry: CitationEntry;
  nap: Nap;
  onClose: () => void;
  onSaved: (entry: CitationEntry) => void;
}) {
  const [status, setStatus] = useState<CitationStatus>(entry.status);
  const [listingUrl, setListingUrl] = useState(entry.listing_url ?? "");
  const [found, setFound] = useState(napOf(entry));
  const [notes, setNotes] = useState(entry.notes ?? "");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mismatch, setMismatch] = useState<{ fields: NapField[]; body: EntryUpdate } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const build = (): EntryUpdate => {
    const body: EntryUpdate = {};
    if (status !== entry.status) body.status = status;
    if (listingUrl.trim() !== (entry.listing_url ?? "")) body.listing_url = listingUrl.trim() || null;
    const original = napOf(entry);
    if (NAP_FIELDS.some((f) => found[f.key].trim() !== original[f.key])) {
      body.nap_found = Object.fromEntries(NAP_FIELDS.map((f) => [f.key, found[f.key].trim() || null])) as Partial<Nap>;
    }
    if (notes.trim() !== (entry.notes ?? "")) body.notes = notes.trim() || null;
    if (note.trim()) body.note = note.trim();
    return body;
  };

  const send = async (body: EntryUpdate, label: string, success: string) => {
    setBusy(label);
    setError(null);
    try {
      const result = await citationsApi.updateEntry(entry.id, body);
      onSaved(result.entry);
      toast.success(success);
      onClose();
    } catch (e) {
      const reason = e instanceof ApiError ? e.reason : undefined;
      if (reason === "nap_mismatch") {
        setMismatch({ fields: ((e as ApiError).data?.mismatch_fields as NapField[]) ?? [], body });
      } else if (reason === "entry_removed") {
        setError("This directory was taken off the list. Restore it first.");
      } else setError(notAssigned(e) ?? errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const save = () => {
    const body = build();
    const meaningful = Object.keys(body).filter((k) => k !== "note");
    if (meaningful.length === 0) {
      setError("Nothing changed. If you checked and nothing changed, use “Checked, no change”.");
      return;
    }
    void send(body, "save", "Check recorded.");
  };

  const checkedNoChange = () => send({ checked: true, ...(note.trim() ? { note: note.trim() } : {}) }, "checked", "Recorded as checked, no change.");

  const remove = async () => {
    setBusy("remove");
    try {
      const result = await citationsApi.removeEntry(entry.id, note.trim() || undefined);
      onSaved(result.entry);
      toast.success(`${entry.directory.name} was taken off the list.`);
      onClose();
    } catch (e) {
      setError(notAssigned(e) ?? errorMessage(e));
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <FormError message={error} />

      {mismatch && (
        <div className="rounded-md border border-[#e8cf86] bg-[#fdf6dc] p-3 text-sm text-[#5c4210]">
          <p>
            The NAP you entered differs from the location's on:{" "}
            <strong>{mismatch.fields.map((f) => NAP_FIELDS.find((x) => x.key === f)?.label ?? f).join(", ") || "some fields"}</strong>.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => {
                setStatus("nap_wrong");
                void send({ ...mismatch.body, status: "nap_wrong" }, "nap_wrong", "Saved as NAP wrong.");
              }}
              loading={busy === "nap_wrong"}
            >
              Save as NAP wrong
            </Button>
            <Button size="sm" variant="secondary" onClick={() => send({ ...mismatch.body, confirm: true }, "confirm", "Saved as live, correct.")} loading={busy === "confirm"}>
              Save anyway (live, correct)
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setMismatch(null)}>
              Back
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Status" htmlFor="entry-status" hint={status === "removed" ? "The listing itself was taken down." : undefined}>
          <select id="entry-status" className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as CitationStatus)}>
            {CITATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {CITATION_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Listing URL" htmlFor="entry-url">
          <input id="entry-url" type="url" maxLength={500} className={inputClass} placeholder="https://…" value={listingUrl} onChange={(e) => setListingUrl(e.target.value)} />
        </Field>
      </div>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-[var(--color-text-primary)]">NAP as found on the listing</legend>
        <p className="mb-2 text-xs text-[var(--color-text-muted)]">The server compares it with the location's NAP after normalising. Leave a field empty if it isn't shown.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {NAP_FIELDS.map((f) => (
            <Field
              key={f.key}
              label={f.label}
              htmlFor={`nap-${f.key}`}
              hint={
                <>
                  Should be: <span className="text-[var(--color-text-secondary)]">{nap[f.key] || "—"}</span>
                  {nap[f.key] && (
                    <button type="button" className="ml-2 font-semibold text-[var(--color-primary)]" onClick={() => setFound((v) => ({ ...v, [f.key]: nap[f.key] ?? "" }))}>
                      Same
                    </button>
                  )}
                </>
              }
            >
              <input
                id={`nap-${f.key}`}
                className={`${inputClass} ${entry.mismatch_fields.includes(f.key) ? "border-[var(--color-danger)]" : ""}`}
                maxLength={NAP_MAX[f.key]}
                value={found[f.key]}
                onChange={(e) => setFound((v) => ({ ...v, [f.key]: e.target.value }))}
              />
            </Field>
          ))}
        </div>
      </fieldset>

      <Field label="Internal note on this entry" htmlFor="entry-notes" hint="Kept on the entry. Customers never see it.">
        <textarea id="entry-notes" className={textareaClass} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <Field label="Comment on this change (optional)" htmlFor="entry-note" hint="Shown in the history next to this change. Customers never see it.">
        <input id="entry-note" className={inputClass} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>

      <div className="flex flex-col-reverse gap-2 border-t border-[var(--color-border-light)] pt-4 sm:flex-row sm:items-center sm:justify-between">
        {confirmRemove ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-[var(--color-text-secondary)]">Take it off the list? History is kept.</span>
            <Button size="sm" variant="danger" onClick={remove} loading={busy === "remove"}>
              Take off list
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmRemove(false)}>
              Keep
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" className="text-[var(--color-danger)]" onClick={() => setConfirmRemove(true)}>
            <MinusCircle size={14} /> Take off list
          </Button>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={checkedNoChange} loading={busy === "checked"} title="Updates the last-checked date only">
            <CheckCheck size={15} /> Checked, no change
          </Button>
          <Button onClick={save} loading={busy === "save"}>
            Save check
          </Button>
        </div>
      </div>
    </div>
  );
}

const LIMIT = 20;

function History({
  entry,
  canManage,
  onSaved,
  onClose,
}: {
  entry: CitationEntry;
  canManage: boolean;
  onSaved: (entry: CitationEntry) => void;
  onClose: () => void;
}) {
  const [page, setPage] = useState(1);
  const history = useQuery(`entry-history:${entry.id}:${page}`, (signal) => citationsApi.history(entry.id, { page, limit: LIMIT }, signal));
  const [busy, setBusy] = useState(false);

  const restore = async () => {
    setBusy(true);
    try {
      const result = await citationsApi.restoreEntry(entry.id);
      onSaved(result.entry);
      toast.success(`${entry.directory.name} is back on the list.`);
      onClose();
    } catch (e) {
      toast.error(notAssigned(e) ?? errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {!entry.active && canManage && (
        <Button size="sm" variant="secondary" onClick={restore} loading={busy}>
          <RotateCcw size={14} /> Restore to the list
        </Button>
      )}
      {history.error ? (
        <ErrorState error={history.error} onRetry={history.reload} notFound="Not found or not assigned to you." />
      ) : !history.data ? (
        <p className="py-6 text-center text-sm text-[var(--color-text-muted)]">Loading…</p>
      ) : history.data.history.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--color-text-muted)]">No changes yet.</p>
      ) : (
        <ol className="divide-y divide-[var(--color-border-light)] rounded-md border border-[var(--color-border)]">
          {history.data.history.map((h) => (
            <li key={h.id} className="px-3 py-2.5 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-[var(--color-text-primary)]">
                  {humanize(h.action)}
                  {h.from !== h.to && h.to && (
                    <span className="font-normal text-[var(--color-text-secondary)]">
                      : {h.from ? CITATION_STATUS_LABELS[h.from] : "—"} → {CITATION_STATUS_LABELS[h.to]}
                    </span>
                  )}
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {h.by.name ?? "Admin"} · {formatDateTime(h.at)}
                </span>
              </div>
              {h.changed_fields.length > 0 && (
                <div className="text-xs text-[var(--color-text-muted)]">Changed: {h.changed_fields.map((f) => humanize(f)).join(", ")}</div>
              )}
              {h.note && <div className="mt-0.5 text-xs text-[var(--color-text-secondary)]">“{h.note}”</div>}
            </li>
          ))}
        </ol>
      )}
      {history.data && history.data.total > LIMIT && (
        <Pagination page={page} limit={LIMIT} total={history.data.total} onPageChange={setPage} />
      )}
    </div>
  );
}

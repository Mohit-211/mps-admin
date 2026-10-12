import type { ColumnDef } from "@tanstack/react-table";
import { Ban, Pencil, Plus, RotateCcw, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  citationsApi,
  DIRECTORY_TYPE_LABELS,
  DIRECTORY_TYPES,
  type CitationCountry,
  type Directory,
  type DirectoryCategory,
  type DirectoryInput,
  type DirectoryType,
  type ImportResult,
} from "../../api/citations";
import { useAuth } from "../../auth/useAuth";
import { DataTable } from "../../components/table/DataTable";
import { TableToolbar } from "../../components/table/TableToolbar";
import type { AdminTableFeatures } from "../../components/table/tableConfig";
import { ActionMenu } from "../../components/ui/ActionMenu";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { DownloadButton } from "../../components/ui/DownloadButton";
import { Field, FormError } from "../../components/ui/Field";
import { checkboxClass, filterClass, inputClass, textareaClass } from "../../components/ui/fieldStyles";
import { Modal } from "../../components/ui/Modal";
import { Notice } from "../../components/ui/Panel";
import { Pagination } from "../../components/ui/Pagination";
import { ErrorState } from "../../components/ui/States";
import { useQuery } from "../../hooks/useQuery";
import { useUrlSearch, useUrlState } from "../../hooks/useUrlState";
import { ApiError, errorMessage } from "../../lib/api";
import { todayStamp } from "../../lib/format";

const LIMIT = 50;

export function DirectoriesPage() {
  const { can } = useAuth();
  const canManage = can("citations.manage");
  const { get, update, page, setPage } = useUrlState();
  const { search, setSearch, q } = useUrlSearch();
  const type = get("type") as "" | DirectoryType;
  const country = get("country") as "" | CitationCountry;
  const categoryId = get("category_id");
  const active = get("active") as "" | "true" | "false";
  const [editing, setEditing] = useState<Directory | "new" | null>(null);
  const [deactivating, setDeactivating] = useState<Directory | null>(null);
  const [importing, setImporting] = useState(false);

  const categories = useQuery("cit-categories", (signal) => citationsApi.categories(signal));
  const query = {
    q: q || undefined,
    type: type || undefined,
    country: country || undefined,
    category_id: categoryId || undefined,
    active: active === "" ? undefined : active === "true",
    page,
    limit: LIMIT,
  };
  const dirs = useQuery(`directories:${JSON.stringify(query)}`, (signal) => citationsApi.directories(query, signal));

  const reactivate = async (d: Directory) => {
    try {
      await citationsApi.updateDirectory(d.id, { is_active: true });
      toast.success(`${d.name} is active again.`);
      dirs.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const columns = useMemo<ColumnDef<AdminTableFeatures, Directory, unknown>[]>(
    () => [
      {
        id: "name",
        header: "Directory",
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate font-semibold text-[var(--color-text-primary)]">{row.original.name}</span>
              {!row.original.is_active && <Badge tone="gray">Inactive</Badge>}
            </div>
            <a
              href={row.original.url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="truncate text-xs text-[var(--color-primary)] hover:underline"
            >
              {row.original.domain}
            </a>
          </div>
        ),
      },
      { id: "type", header: "Type", cell: ({ row }) => DIRECTORY_TYPE_LABELS[row.original.type] ?? row.original.type },
      {
        id: "where",
        header: "Countries / regions",
        cell: ({ row }) => (
          <div>
            {row.original.countries.join(", ")}
            {row.original.regions.length > 0 && <div className="text-xs text-[var(--color-text-muted)]">{row.original.regions.join(", ")}</div>}
          </div>
        ),
      },
      {
        id: "categories",
        header: "Categories",
        cell: ({ row }) =>
          row.original.categories.length === 0 ? (
            <span className="text-[var(--color-text-muted)]">Every business</span>
          ) : (
            <span className="text-xs">{row.original.categories.map((c) => c.name).join(", ")}</span>
          ),
      },
      { id: "authority", header: "Authority", cell: ({ row }) => row.original.authority ?? "—" },
      {
        id: "actions",
        header: "",
        cell: ({ row }) =>
          canManage ? (
            <div className="flex justify-end">
              <ActionMenu
                label={`Actions for ${row.original.name}`}
                items={[
                  { label: "Edit", icon: Pencil, onSelect: () => setEditing(row.original) },
                  { label: "Deactivate", icon: Ban, danger: true, hidden: !row.original.is_active, onSelect: () => setDeactivating(row.original) },
                  { label: "Reactivate", icon: RotateCcw, hidden: row.original.is_active, onSelect: () => reactivate(row.original) },
                ]}
              />
            </div>
          ) : null,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canManage],
  );

  return (
    <div className="surface overflow-hidden">
      <TableToolbar
        searchPlaceholder="Search directories…"
        searchValue={search}
        onSearchChange={setSearch}
        filters={
          <div className="flex flex-wrap items-center gap-2">
            <select aria-label="Type" className={filterClass} value={type} onChange={(e) => update({ type: e.target.value || null })}>
              <option value="">Any type</option>
              {DIRECTORY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {DIRECTORY_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <select aria-label="Country" className={filterClass} value={country} onChange={(e) => update({ country: e.target.value || null })}>
              <option value="">US and Canada</option>
              <option value="US">US</option>
              <option value="CA">Canada</option>
            </select>
            <select aria-label="Category" className={filterClass} value={categoryId} onChange={(e) => update({ category_id: e.target.value || null })}>
              <option value="">Any category</option>
              {(categories.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select aria-label="Active" className={filterClass} value={active} onChange={(e) => update({ active: e.target.value || null })}>
              <option value="">Active and inactive</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        }
      />
      <div className="flex flex-wrap justify-end gap-2 border-b border-[var(--color-border-light)] px-4 py-2.5">
        <DownloadButton path={citationsApi.exportPath} filename={`citation-directories-${todayStamp()}.csv`}>
          Export CSV
        </DownloadButton>
        {canManage && (
          <>
            <Button size="sm" variant="secondary" onClick={() => setImporting(true)}>
              <Upload size={14} /> Import CSV
            </Button>
            <Button size="sm" onClick={() => setEditing("new")}>
              <Plus size={14} /> New directory
            </Button>
          </>
        )}
      </div>
      {dirs.error ? (
        <ErrorState error={dirs.error} onRetry={dirs.reload} />
      ) : (
        <>
          <DataTable
            bare
            data={dirs.data?.directories ?? []}
            columns={columns}
            loading={dirs.loading}
            enableSorting={false}
            onRowClick={canManage ? (d) => setEditing(d) : undefined}
            emptyMessage="No directories match these filters."
          />
          {dirs.data && dirs.data.total > 0 && (
            <div className="border-t border-[var(--color-border-light)] px-3">
              <Pagination page={page} limit={LIMIT} total={dirs.data.total} onPageChange={setPage} />
            </div>
          )}
        </>
      )}

      {editing && (
        <DirectoryForm
          directory={editing === "new" ? null : editing}
          categories={categories.data ?? []}
          onClose={() => setEditing(null)}
          onSaved={dirs.reload}
        />
      )}
      {importing && <ImportDialog onClose={() => setImporting(false)} onApplied={dirs.reload} />}
      <ConfirmDialog
        open={!!deactivating}
        onClose={() => setDeactivating(null)}
        title={`Deactivate ${deactivating?.name ?? ""}?`}
        description="It's no longer suggested for new lists. Locations that already list it keep their entries and history."
        confirmLabel="Deactivate"
        danger
        onConfirm={async () => {
          if (!deactivating) return;
          await citationsApi.deactivateDirectory(deactivating.id);
          toast.success(`${deactivating.name} deactivated.`);
          dirs.reload();
        }}
      />
    </div>
  );
}

// ---- create / edit ----

function DirectoryForm({
  directory,
  categories,
  onClose,
  onSaved,
}: {
  directory: Directory | null;
  categories: DirectoryCategory[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(directory?.name ?? "");
  const [url, setUrl] = useState(directory?.url ?? "");
  const [type, setType] = useState<DirectoryType>(directory?.type ?? "general");
  const [countries, setCountries] = useState<CitationCountry[]>(directory?.countries ?? ["US"]);
  const [categoryIds, setCategoryIds] = useState<string[]>(directory?.categories.map((c) => c.id) ?? []);
  const [regions, setRegions] = useState(directory?.regions.join(", ") ?? "");
  const [authority, setAuthority] = useState(directory?.authority === null || directory?.authority === undefined ? "" : String(directory.authority));
  const [notes, setNotes] = useState(directory?.notes ?? "");
  const [active, setActive] = useState(directory?.is_active ?? true);
  const [problems, setProblems] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const usedBy = useQuery(`directory:${directory?.id ?? "new"}`, (signal) =>
    directory ? citationsApi.directory(directory.id, signal) : Promise.resolve(null),
  );

  const save = async () => {
    const auth = authority.trim() === "" ? null : Number(authority);
    const local: Record<string, string> = {};
    if (!name.trim()) local.name = "Enter a name.";
    if (!/^https?:\/\//i.test(url.trim())) local.url = "Enter the full URL, starting with http:// or https://.";
    if (countries.length === 0) local.countries = "Choose at least one country.";
    if (type === "niche" && categoryIds.length === 0) local.category_ids = "A niche directory needs at least one category.";
    if (auth !== null && (!Number.isInteger(auth) || auth < 0 || auth > 100)) local.authority = "A whole number from 0 to 100, or empty.";
    setProblems(local);
    if (Object.keys(local).length) return;

    const body: DirectoryInput = {
      name: name.trim(),
      url: url.trim(),
      type,
      countries,
      category_ids: categoryIds,
      regions: regions.split(/[\s,|]+/).map((r) => r.trim().toUpperCase()).filter(Boolean),
      authority: auth,
      notes: notes.trim() || null,
      is_active: active,
    };
    setBusy(true);
    setError(null);
    try {
      if (directory) await citationsApi.updateDirectory(directory.id, body);
      else await citationsApi.createDirectory(body);
      toast.success(directory ? "Directory saved." : "Directory created.");
      onSaved();
      onClose();
    } catch (e) {
      const reason = e instanceof ApiError ? e.reason : undefined;
      if (reason === "invalid_directory") {
        const list = ((e as ApiError).data?.problems as { field: string; message: string }[]) ?? [];
        setProblems(Object.fromEntries(list.map((p) => [p.field, p.message])));
        setError("Fix the highlighted fields.");
      } else if (reason === "domain_taken") {
        setProblems({ url: `Another directory already uses ${String((e as ApiError).data?.domain ?? "this domain")}.` });
      } else setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const toggle = <T,>(list: T[], value: T, on: boolean) => (on ? [...list, value] : list.filter((x) => x !== value));

  return (
    <Modal
      open
      size="lg"
      onClose={busy ? () => undefined : onClose}
      title={directory ? `Edit ${directory.name}` : "New directory"}
      description={usedBy.data ? `On ${usedBy.data.used_by_locations ?? 0} location list${usedBy.data.used_by_locations === 1 ? "" : "s"}.` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy}>
            {directory ? "Save" : "Create directory"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormError message={error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="dir-name" error={problems.name}>
            <input id="dir-name" className={inputClass} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="URL" htmlFor="dir-url" error={problems.url} hint="Its domain must be unique.">
            <input id="dir-url" type="url" className={inputClass} maxLength={300} value={url} onChange={(e) => setUrl(e.target.value)} />
          </Field>
          <Field label="Type" htmlFor="dir-type" error={problems.type}>
            <select id="dir-type" className={inputClass} value={type} onChange={(e) => setType(e.target.value as DirectoryType)}>
              {DIRECTORY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {DIRECTORY_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Authority (0–100)" htmlFor="dir-authority" error={problems.authority} hint="Optional. Weighs the score.">
            <input id="dir-authority" type="number" min={0} max={100} className={inputClass} value={authority} onChange={(e) => setAuthority(e.target.value)} />
          </Field>
          <Field label="Countries" htmlFor="dir-countries" error={problems.countries}>
            <div id="dir-countries" className="flex gap-4 pt-2">
              {(["US", "CA"] as CitationCountry[]).map((c) => (
                <label key={c} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className={checkboxClass} checked={countries.includes(c)} onChange={(e) => setCountries(toggle(countries, c, e.target.checked))} />
                  {c === "US" ? "United States" : "Canada"}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Regions" htmlFor="dir-regions" error={problems.regions} hint="2-letter state / province codes, e.g. TX, ON. Empty: the whole country.">
            <input id="dir-regions" className={inputClass} value={regions} onChange={(e) => setRegions(e.target.value)} placeholder="TX, ON" />
          </Field>
        </div>
        <Field
          label="Categories"
          htmlFor="dir-categories"
          error={problems.category_ids ?? problems.categories}
          hint={type === "niche" ? "Required for a niche directory." : "None: the directory fits every business."}
        >
          <div id="dir-categories" className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
            {categories.length === 0 && <span className="text-sm text-[var(--color-text-muted)]">No categories yet.</span>}
            {categories.map((c) => (
              <label key={c.id} className="flex items-center gap-2 rounded-md border border-[var(--color-border)] px-2.5 py-1.5 text-sm">
                <input type="checkbox" className={checkboxClass} checked={categoryIds.includes(c.id)} onChange={(e) => setCategoryIds(toggle(categoryIds, c.id, e.target.checked))} />
                {c.name}
                {!c.is_active && <span className="text-xs text-[var(--color-text-muted)]">(inactive)</span>}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Notes" htmlFor="dir-notes" error={problems.notes}>
          <textarea id="dir-notes" className={textareaClass} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <label className="flex items-center gap-2.5 text-sm">
          <input type="checkbox" className={checkboxClass} checked={active} onChange={(e) => setActive(e.target.checked)} />
          Active (suggested for new lists)
        </label>
      </div>
    </Modal>
  );
}

// ---- CSV import: dry run first, then apply ----

function ImportDialog({ onClose, onApplied }: { onClose: () => void; onApplied: () => void }) {
  const [csv, setCsv] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (dryRun: boolean) => {
    if (!csv) return;
    setBusy(true);
    setError(null);
    try {
      const r = await citationsApi.importDirectories(csv, dryRun);
      setResult(r);
      if (!dryRun && r.applied) {
        toast.success(`Import applied: ${r.created} created, ${r.updated} updated, ${r.unchanged} unchanged.`);
        onApplied();
        onClose();
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 422 && Array.isArray(e.data?.errors)) {
        setResult(e.data as unknown as ImportResult);
      } else if (e instanceof ApiError && e.reason === "invalid_csv_header") {
        const missing = (e.data?.missing as string[] | undefined) ?? [];
        const unknown = (e.data?.unknown as string[] | undefined) ?? [];
        setError(
          [e.message, missing.length ? `Missing: ${missing.join(", ")}.` : "", unknown.length ? `Unknown: ${unknown.join(", ")}.` : ""]
            .filter(Boolean)
            .join(" "),
        );
      } else setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const ok = result && result.errors.length === 0;

  return (
    <Modal
      open
      size="lg"
      onClose={busy ? () => undefined : onClose}
      title="Import directories from CSV"
      description="Upserts by domain; directories not in the file are left alone. All-or-nothing: any row error and nothing is applied."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          {ok && result.dry_run ? (
            <Button onClick={() => run(false)} loading={busy}>
              Apply import
            </Button>
          ) : (
            <Button onClick={() => run(true)} loading={busy} disabled={!csv}>
              Check file (dry run)
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <FormError message={error} />
        <Notice tone="blue">
          Columns: <code>name, url, type, countries, categories, regions, authority, notes, active</code> (name, url, type and
          countries required). Lists use <code>|</code>; categories are category slugs. Export first to get the format. Max 2,000 rows,
          1 MB.
        </Notice>
        <input
          type="file"
          accept=".csv,text/csv"
          className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-primary-light)] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[var(--color-primary)]"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            setResult(null);
            setError(null);
            if (!file) return setCsv(null);
            if (file.size > 1024 * 1024) {
              setCsv(null);
              return setError("The file is larger than 1 MB.");
            }
            setFileName(file.name);
            setCsv(await file.text());
          }}
        />
        {result && (
          <div className="space-y-3">
            <p className="text-sm text-[var(--color-text-primary)]">
              {result.dry_run ? "Dry run of" : "Import of"} <strong>{fileName}</strong>: {result.rows} rows · {result.created} to create ·{" "}
              {result.updated} to update · {result.unchanged} unchanged
            </p>
            {ok ? (
              <Notice tone="blue">No errors. Apply the import to save it.</Notice>
            ) : (
              <>
                <Notice tone="red">{result.errors.length} error{result.errors.length === 1 ? "" : "s"}: nothing was applied. Fix the file and check it again.</Notice>
                <div className="table-scroll max-h-64 overflow-y-auto rounded-md border border-[var(--color-border)]">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--color-surface-muted)] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
                      <tr>
                        <th className="px-3 py-2">Row</th>
                        <th className="px-3 py-2">Field</th>
                        <th className="px-3 py-2">Problem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.errors.map((err, i) => (
                        <tr key={i} className="border-t border-[var(--color-border-light)] text-[var(--color-text-secondary)]">
                          <td className="px-3 py-1.5">{err.row}</td>
                          <td className="px-3 py-1.5">{err.field}</td>
                          <td className="px-3 py-1.5">{err.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

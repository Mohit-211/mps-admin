import { Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { citationsApi, type DirectoryCategory } from "../../api/citations";
import { useAuth } from "../../auth/useAuth";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Field, FormError } from "../../components/ui/Field";
import { checkboxClass, inputClass } from "../../components/ui/fieldStyles";
import { Modal } from "../../components/ui/Modal";
import { ErrorState } from "../../components/ui/States";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useQuery } from "../../hooks/useQuery";
import { ApiError, errorMessage } from "../../lib/api";

/** Directory categories: industry groups (e.g. "Home services") mapped to Google business categories. */
export function CategoriesPage() {
  const { can } = useAuth();
  const canManage = can("citations.manage");
  const categories = useQuery("cit-categories", (signal) => citationsApi.categories(signal));
  const [editing, setEditing] = useState<DirectoryCategory | "new" | null>(null);
  const [deleting, setDeleting] = useState<DirectoryCategory | null>(null);

  return (
    <div className="surface overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-light)] p-4">
        <p className="text-sm text-[var(--color-text-secondary)]">
          A location gets niche directories when one of its Google business categories is mapped to the directory's category.
        </p>
        {canManage && (
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus size={14} /> New category
          </Button>
        )}
      </div>
      {categories.error ? (
        <ErrorState error={categories.error} onRetry={categories.reload} />
      ) : (
        <ul className="divide-y divide-[var(--color-border-light)]">
          {!categories.data ? (
            <li className="px-4 py-12 text-center text-sm text-[var(--color-text-muted)]">Loading…</li>
          ) : categories.data.length === 0 ? (
            <li className="px-4 py-12 text-center text-sm text-[var(--color-text-muted)]">No categories yet.</li>
          ) : (
            categories.data.map((c) => (
              <li key={c.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[var(--color-text-primary)]">{c.name}</span>
                    <code className="text-xs text-[var(--color-text-muted)]">{c.slug}</code>
                    {!c.is_active && <Badge tone="gray">Inactive</Badge>}
                    <Link to={`/citations/directories?category_id=${c.id}`} className="text-xs font-semibold text-[var(--color-primary)] hover:underline">
                      {c.directory_count} director{c.directory_count === 1 ? "y" : "ies"}
                    </Link>
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                    {c.business_categories.length === 0
                      ? "No Google business categories mapped yet."
                      : c.business_categories.map((b) => b.name).join(", ")}
                  </p>
                </div>
                {canManage && (
                  <div className="flex shrink-0 gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(c)}>
                      <Pencil size={14} /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" className="text-[var(--color-danger)]" onClick={() => setDeleting(c)}>
                      <Trash2 size={14} /> Delete
                    </Button>
                  </div>
                )}
              </li>
            ))
          )}
        </ul>
      )}

      {editing && <CategoryForm category={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={categories.reload} />}
      {deleting && <DeleteCategory category={deleting} onClose={() => setDeleting(null)} onDone={categories.reload} />}
    </div>
  );
}

function DeleteCategory({ category, onClose, onDone }: { category: DirectoryCategory; onClose: () => void; onDone: () => void }) {
  const [inUse, setInUse] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>, message: string) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      toast.success(message);
      onDone();
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.reason === "in_use") setInUse(Number(e.data?.directory_count) || category.directory_count);
      else setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={busy ? () => undefined : onClose}
      title={inUse !== null ? `${category.name} is in use` : `Delete ${category.name}?`}
      description={
        inUse !== null
          ? `${inUse} director${inUse === 1 ? "y uses" : "ies use"} it, so it can't be deleted. Deactivate it instead.`
          : "Only a category no directory uses can be deleted."
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          {inUse === null ? (
            <Button variant="danger" onClick={() => run(() => citationsApi.deleteCategory(category.id), `${category.name} deleted.`)} loading={busy}>
              Delete
            </Button>
          ) : (
            category.is_active && (
              <Button onClick={() => run(() => citationsApi.updateCategory(category.id, { is_active: false }), `${category.name} deactivated.`)} loading={busy}>
                Deactivate
              </Button>
            )
          )}
        </>
      }
    >
      <FormError message={error} />
    </Modal>
  );
}

function CategoryForm({ category, onClose, onSaved }: { category: DirectoryCategory | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [active, setActive] = useState(category?.is_active ?? true);
  const [mapped, setMapped] = useState<{ id: string; name: string }[]>(category?.business_categories ?? []);
  const [term, setTerm] = useState("");
  const q = useDebouncedValue(term.trim(), 300);
  const results = useQuery(`biz-cat:${q}`, (signal) => (q ? citationsApi.businessCategories(q, signal) : Promise.resolve([])));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) return setError("Enter a name.");
    if (slug && !/^[a-z0-9-]{1,60}$/.test(slug)) return setError("The slug uses lowercase letters, digits and dashes only.");
    const body = {
      name: name.trim(),
      ...(slug ? { slug } : {}),
      business_category_ids: mapped.map((m) => m.id),
      is_active: active,
    };
    setBusy(true);
    setError(null);
    try {
      if (category) await citationsApi.updateCategory(category.id, body);
      else await citationsApi.createCategory(body);
      toast.success(category ? "Category saved." : "Category created.");
      onSaved();
      onClose();
    } catch (e) {
      const reason = e instanceof ApiError ? e.reason : undefined;
      if (reason === "slug_taken") setError("Another category already uses this slug.");
      else if (reason === "unknown_business_category") setError("One of the business categories no longer exists. Remove it and try again.");
      else setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      size="lg"
      onClose={busy ? () => undefined : onClose}
      title={category ? `Edit ${category.name}` : "New category"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy}>
            {category ? "Save" : "Create category"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormError message={error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="cat-name">
            <input id="cat-name" className={inputClass} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Slug" htmlFor="cat-slug" hint={category ? "Used in the CSV import." : "Optional: made from the name. Used in the CSV import."}>
            <input id="cat-slug" className={inputClass} maxLength={60} value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} />
          </Field>
        </div>
        <Field label="Google business categories" htmlFor="cat-search" hint="A location matches when one of its categories is listed here.">
          <div className="rounded-md border border-[var(--color-border)]">
            {mapped.length > 0 && (
              <div className="flex flex-wrap gap-1.5 border-b border-[var(--color-border-light)] p-2">
                {mapped.map((m) => (
                  <span key={m.id} className="inline-flex items-center gap-1 rounded bg-[var(--color-primary-light)] py-0.5 pl-2 pr-1 text-xs text-[var(--color-primary)]">
                    {m.name}
                    <button type="button" aria-label={`Remove ${m.name}`} onClick={() => setMapped((list) => list.filter((x) => x.id !== m.id))} className="rounded p-0.5 hover:bg-white">
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                id="cat-search"
                type="search"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Search Google business categories, e.g. plumb…"
                className="h-10 w-full rounded-b-md bg-white pl-9 pr-3 text-sm outline-none"
              />
            </div>
            {q && (
              <ul className="max-h-48 overflow-y-auto border-t border-[var(--color-border-light)] py-1">
                {(results.data ?? []).length === 0 ? (
                  <li className="px-3 py-2 text-sm text-[var(--color-text-muted)]">{results.loading ? "Searching…" : "No matches."}</li>
                ) : (
                  results.data?.map((r) => {
                    const on = mapped.some((m) => m.id === r.id);
                    return (
                      <li key={r.id}>
                        <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-[var(--color-surface-muted)]">
                          <input
                            type="checkbox"
                            className={checkboxClass}
                            checked={on}
                            onChange={(e) => setMapped((list) => (e.target.checked ? [...list, r] : list.filter((x) => x.id !== r.id)))}
                          />
                          {r.name}
                        </label>
                      </li>
                    );
                  })
                )}
              </ul>
            )}
          </div>
        </Field>
        <label className="flex items-center gap-2.5 text-sm">
          <input type="checkbox" className={checkboxClass} checked={active} onChange={(e) => setActive(e.target.checked)} />
          Active
        </label>
      </div>
    </Modal>
  );
}

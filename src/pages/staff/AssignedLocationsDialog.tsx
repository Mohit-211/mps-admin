import { Search, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { adminsApi, type AssignedLocations } from "../../api/admins";
import type { Admin } from "../../api/auth";
import { citationsApi } from "../../api/citations";
import { Button } from "../../components/ui/Button";
import { FormError } from "../../components/ui/Field";
import { checkboxClass } from "../../components/ui/fieldStyles";
import { Modal } from "../../components/ui/Modal";
import { Notice } from "../../components/ui/Panel";
import { ErrorState } from "../../components/ui/States";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useQuery } from "../../hooks/useQuery";
import { ApiError, errorMessage } from "../../lib/api";

type Picked = AssignedLocations["locations"][number];

/**
 * Phase 21: the customer locations an employee works on in citations. A hard limit for them: every
 * citation screen covers only these. An empty list = every location. Super admin / admin always see all.
 */
export function AssignedLocationsDialog(props: { admin: Admin | null; onClose: () => void; onSaved: () => void }) {
  return props.admin ? <AssignedLocationsBody {...props} admin={props.admin} /> : null;
}

function AssignedLocationsBody({ admin, onClose, onSaved }: { admin: Admin; onClose: () => void; onSaved: () => void }) {
  const current = useQuery(`admin-locations:${admin.id}`, (signal) => adminsApi.locations(admin.id, signal));
  const label = admin.name || admin.email;

  return (
    <Modal open size="lg" onClose={onClose} title="Citation locations" description={label}>
      {current.error ? (
        <ErrorState error={current.error} onRetry={current.reload} />
      ) : !current.data ? (
        <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">Loading…</p>
      ) : !current.data.applies ? (
        <Notice tone="blue">
          This role sees every location. Super admins and admins always do, so locations can't be assigned to them.
        </Notice>
      ) : (
        <Editor admin={admin} initial={current.data.locations} onClose={onClose} onSaved={onSaved} />
      )}
    </Modal>
  );
}

function Editor({ admin, initial, onClose, onSaved }: { admin: Admin; initial: Picked[]; onClose: () => void; onSaved: () => void }) {
  const [picked, setPicked] = useState<Picked[]>(initial);
  const [term, setTerm] = useState("");
  const q = useDebouncedValue(term.trim(), 300);
  const results = useQuery(`assign-pick:${q}`, (signal) => citationsApi.locations({ q: q || undefined, limit: 25 }, signal));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ids = new Set(picked.map((p) => p.id));

  const toggle = (loc: Picked, on: boolean) => setPicked((list) => (on ? [...list, loc] : list.filter((x) => x.id !== loc.id)));

  const save = async (locationIds: string[]) => {
    setBusy(true);
    setError(null);
    try {
      const result = await adminsApi.setLocations(admin.id, locationIds);
      toast.success(
        result.citation_scope === "assigned"
          ? `${admin.name || admin.email} now works on ${result.locations.length} location${result.locations.length === 1 ? "" : "s"} only.`
          : `${admin.name || admin.email} sees every location again.`,
      );
      onSaved();
      onClose();
    } catch (e) {
      const reason = e instanceof ApiError ? e.reason : undefined;
      if (reason === "invalid_locations") {
        const unknown = new Set(((e as ApiError).data?.unknown as string[] | undefined) ?? []);
        setPicked((list) => list.filter((x) => !unknown.has(x.id)));
        setError(`${unknown.size} location${unknown.size === 1 ? " was" : "s were"} deleted meanwhile and removed from the list. Save again.`);
      } else if (reason === "assignment_not_applicable") {
        setError("This role already sees every location, so assignments don't apply.");
      } else setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <FormError message={error} />
      <Notice tone="blue">
        A hard limit: this employee sees and edits citations only for these locations; anything else looks like it doesn't exist.
        Directories and categories stay shared. Leave the list empty to let them work on every location.
      </Notice>

      <div>
        <p className="mb-1.5 text-sm font-medium text-[var(--color-text-primary)]">
          Assigned ({picked.length}){picked.length === 0 && <span className="font-normal text-[var(--color-text-muted)]"> · every location</span>}
        </p>
        {picked.length > 0 && (
          <ul className="max-h-48 divide-y divide-[var(--color-border-light)] overflow-y-auto rounded-md border border-[var(--color-border)]">
            {picked.map((loc) => (
              <li key={loc.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className={`min-w-0 ${loc.deleted ? "text-[var(--color-text-muted)] line-through" : ""}`}>
                  <span className="block truncate text-[var(--color-text-primary)]">{loc.name}</span>
                  <span className="block truncate text-xs text-[var(--color-text-muted)]">
                    {[loc.city, loc.organization?.name].filter(Boolean).join(" · ")}
                    {loc.deleted && " · deleted by the customer"}
                  </span>
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${loc.name}`}
                  onClick={() => toggle(loc, false)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-md border border-[var(--color-border)]">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Find a location by name or city…"
            className="h-10 w-full rounded-t-md bg-white pl-9 pr-3 text-sm outline-none"
            aria-label="Find a location"
          />
        </div>
        <ul className="max-h-60 divide-y divide-[var(--color-border-light)] overflow-y-auto border-t border-[var(--color-border-light)]">
          {results.error ? (
            <li className="px-3 py-3 text-sm text-[var(--color-danger)]">{errorMessage(results.error)}</li>
          ) : !results.data ? (
            <li className="px-3 py-3 text-sm text-[var(--color-text-muted)]">Loading…</li>
          ) : results.data.locations.length === 0 ? (
            <li className="px-3 py-3 text-sm text-[var(--color-text-muted)]">No locations found.</li>
          ) : (
            results.data.locations.map(({ location: l, assigned_staff }) => {
              const others = (assigned_staff ?? []).filter((s) => s.id !== admin.id);
              return (
                <li key={l.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-[var(--color-surface-muted)]">
                    <input
                      type="checkbox"
                      className={checkboxClass}
                      checked={ids.has(l.id)}
                      onChange={(e) =>
                        toggle(
                          { id: l.id, name: l.name, city: l.city, organization: l.organization ? { id: l.organization.id, name: l.organization.name } : null, deleted: false },
                          e.target.checked,
                        )
                      }
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[var(--color-text-primary)]">{l.name}</span>
                      {/* names repeat across customers: always show whose it is */}
                      <span className="block truncate text-xs text-[var(--color-text-muted)]">
                        {[l.city, l.organization?.name, l.client?.name && `client ${l.client.name}`].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    {others.length > 0 && (
                      <span className="shrink-0 text-xs text-[var(--color-text-muted)]">Also: {others.map((s) => s.name ?? "staff").join(", ")}</span>
                    )}
                  </label>
                </li>
              );
            })
          )}
        </ul>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-[var(--color-border-light)] pt-4 sm:flex-row sm:justify-between">
        <Button variant="ghost" onClick={() => save([])} disabled={busy || initial.length === 0}>
          Let them work on every location
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => save(picked.map((p) => p.id))} loading={busy}>
            Save {picked.length} location{picked.length === 1 ? "" : "s"}
          </Button>
        </div>
      </div>
    </div>
  );
}

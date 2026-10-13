import { Loader2, Search, Sparkles } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { citationsApi, DISCOVERY_ERRORS, type CitationCountry, type DiscoverInput } from "../../api/citations";
import { useAuth } from "../../auth/useAuth";
import { Button } from "../../components/ui/Button";
import { Field, FormError } from "../../components/ui/Field";
import { inputClass } from "../../components/ui/fieldStyles";
import { Modal } from "../../components/ui/Modal";
import { Notice } from "../../components/ui/Panel";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useQuery } from "../../hooks/useQuery";
import { ApiError, errorMessage } from "../../lib/api";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Set: a local search for this location. Unset: a general or category search. */
  location?: { id: string; name: string; city: string | null } | null;
};

/**
 * Phase 22: ask Perplexity for more directories. Nothing is added automatically: every result waits
 * in the "Suggested" review list for an admin to accept or dismiss.
 */
export function DiscoverDialog(props: Props) {
  return props.open ? <DiscoverBody {...props} /> : null;
}

function DiscoverBody({ onClose, location }: Props) {
  const navigate = useNavigate();
  const { admin, can } = useAuth();
  const [scope, setScope] = useState<"general" | "category">("general");
  const [country, setCountry] = useState<CitationCountry>("US");
  const [region, setRegion] = useState("");
  const [category, setCategory] = useState<{ id: string; name: string } | null>(null);
  const [term, setTerm] = useState("");
  const q = useDebouncedValue(term.trim(), 300);
  const categories = useQuery(`discover-cat:${q}`, (signal) => (q && !category ? citationsApi.businessCategories(q, signal) : Promise.resolve([])));
  const [count, setCount] = useState(15);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // a limited employee may only run local searches for their own locations
  const limited = admin?.citation_scope === "assigned";

  const run = async () => {
    let body: DiscoverInput;
    if (location) body = { scope: "location", location_id: location.id, count };
    else if (scope === "category") {
      if (!category) return setError("Choose a business category.");
      body = { scope: "category", country, business_category_id: category.id, count };
    } else {
      if (region && !/^[A-Za-z]{2}$/.test(region)) return setError("The region is a 2-letter state or province code, e.g. TX or ON.");
      body = { scope: "general", country, ...(region ? { region: region.toUpperCase() } : {}), count };
    }
    setBusy(true);
    setError(null);
    try {
      const result = await citationsApi.discover(body);
      const n = result.created.length;
      toast.success(`${n} new suggestion${n === 1 ? "" : "s"}${result.skipped_duplicates ? ` (${result.skipped_duplicates} skipped: already on the list or suggested before)` : ""}.`, {
        // cost is for super admins only
        description: can("admins.manage") ? `Search cost: $${result.cost_usd.toFixed(4)}` : undefined,
      });
      const params = new URLSearchParams({ scope: body.scope });
      if (body.scope === "location") params.set("location_id", body.location_id);
      else params.set("country", body.country);
      onClose();
      navigate(`/citations/suggestions?${params.toString()}`);
    } catch (e) {
      const reason = e instanceof ApiError ? e.reason : undefined;
      setError((reason && DISCOVERY_ERRORS[reason]) || errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      size="lg"
      onClose={busy ? () => undefined : onClose}
      title={location ? "Find local directories" : "Discover directories"}
      description={
        location
          ? `Local directories, the chamber and local listings for ${location.name}${location.city ? ` (${location.city})` : ""}, plus its industry.`
          : "An AI web search for directories to add to the master list."
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={run} loading={busy} disabled={!location && limited}>
            {!busy && <Sparkles size={15} />}
            {busy ? "Searching the web…" : "Search"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormError message={error} />
        <Notice tone="blue">Nothing is added automatically: results go to the “Suggested” list, where you accept or dismiss each one.</Notice>

        {!location && limited ? (
          <Notice>You work on assigned locations only, so you can search from one of your locations' citation lists instead.</Notice>
        ) : (
          !location && (
            <>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { value: "general", title: "General", body: "National and regional directories for any business." },
                    { value: "category", title: "By business category", body: "Industry directories and associations." },
                  ] as const
                ).map((o) => (
                  <label
                    key={o.value}
                    className={`flex cursor-pointer gap-3 rounded-md border px-3 py-2.5 ${
                      scope === o.value ? "border-[var(--color-primary)] bg-[var(--color-primary-light)]" : "border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]"
                    }`}
                  >
                    <input type="radio" name="discover-scope" className="mt-1 accent-[var(--color-primary)]" checked={scope === o.value} onChange={() => setScope(o.value)} />
                    <span>
                      <span className="block text-sm font-medium text-[var(--color-text-primary)]">{o.title}</span>
                      <span className="block text-xs text-[var(--color-text-secondary)]">{o.body}</span>
                    </span>
                  </label>
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Country" htmlFor="discover-country">
                  <select id="discover-country" className={inputClass} value={country} onChange={(e) => setCountry(e.target.value as CitationCountry)}>
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                  </select>
                </Field>
                {scope === "general" && (
                  <Field label="Region (optional)" htmlFor="discover-region" hint="A state or province code, e.g. TX or ON.">
                    <input id="discover-region" className={`${inputClass} uppercase`} maxLength={2} value={region} onChange={(e) => setRegion(e.target.value)} />
                  </Field>
                )}
              </div>
              {scope === "category" && (
                <Field label="Business category" htmlFor="discover-category">
                  {category ? (
                    <div className="flex items-center justify-between rounded-md border border-[var(--color-primary)] bg-[var(--color-primary-light)] px-3 py-2 text-sm">
                      {category.name}
                      <button type="button" className="text-xs font-semibold text-[var(--color-primary)]" onClick={() => setCategory(null)}>
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-md border border-[var(--color-border)]">
                      <div className="relative">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                        <input
                          id="discover-category"
                          type="search"
                          value={term}
                          onChange={(e) => setTerm(e.target.value)}
                          placeholder="Search Google business categories, e.g. dog trainer…"
                          className="h-10 w-full rounded-md bg-white pl-9 pr-3 text-sm outline-none"
                        />
                      </div>
                      {q && (
                        <ul className="max-h-48 overflow-y-auto border-t border-[var(--color-border-light)] py-1">
                          {(categories.data ?? []).length === 0 ? (
                            <li className="px-3 py-2 text-sm text-[var(--color-text-muted)]">{categories.loading ? "Searching…" : "No matches."}</li>
                          ) : (
                            categories.data?.map((c) => (
                              <li key={c.id}>
                                <button type="button" onClick={() => setCategory(c)} className="w-full px-3 py-1.5 text-left text-sm hover:bg-[var(--color-surface-muted)]">
                                  {c.name}
                                </button>
                              </li>
                            ))
                          )}
                        </ul>
                      )}
                    </div>
                  )}
                </Field>
              )}
            </>
          )
        )}

        <Field label={`How many to look for: ${count}`} htmlFor="discover-count" hint="5 to 25. Directories already listed, suggested or dismissed are never suggested again.">
          <input id="discover-count" type="range" min={5} max={25} value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-full accent-[var(--color-primary)]" />
        </Field>

        {busy && (
          <p className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <Loader2 size={15} className="animate-spin" /> Searching the web… this takes 10–30 seconds.
          </p>
        )}
      </div>
    </Modal>
  );
}

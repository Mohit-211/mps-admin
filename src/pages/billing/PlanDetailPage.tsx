import { Plus } from "lucide-react";
import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import {
  AI_COST_FIELDS,
  billingApi,
  CURRENCIES,
  FEATURE_LABELS,
  FEATURES,
  type Currency,
  type Plan,
  type PlanSettings,
  type TokenPack,
} from "../../api/billing";
import { useAuth } from "../../auth/useAuth";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Field, FormError } from "../../components/ui/Field";
import { checkboxClass, inputClass, compactInputClass } from "../../components/ui/fieldStyles";
import { Modal } from "../../components/ui/Modal";
import { BackLink, DetailSkeleton } from "../../components/ui/PageHeader";
import { Notice, Panel } from "../../components/ui/Panel";
import { ErrorState } from "../../components/ui/States";
import { useQuery } from "../../hooks/useQuery";
import { ApiError, errorMessage } from "../../lib/api";
import { formatDate, formatDateTime, formatMoney } from "../../lib/format";
import { pricesByCurrency } from "./prices";

export function PlanDetailPage() {
  const { planId = "" } = useParams();
  const [params] = useSearchParams();
  const { can } = useAuth();
  const canManage = can("billing.manage");
  const plan = useQuery(`plan:${planId}`, (signal) => billingApi.plan(planId, signal));
  const packs = useQuery("packs", (signal) => billingApi.packs(signal));
  const [priceCurrency, setPriceCurrency] = useState<Currency | null>(null);

  if (plan.error) {
    return (
      <div>
        <BackLink to="/billing/plans" label="Plans & pricing" />
        <div className="surface">
          <ErrorState error={plan.error} onRetry={plan.reload} />
        </div>
      </div>
    );
  }
  const p = plan.data;
  if (!p) {
    return (
      <div>
        <BackLink to="/billing/plans" label="Plans & pricing" />
        <DetailSkeleton />
      </div>
    );
  }

  const byCurrency = pricesByCurrency(p.prices);
  const isNew = params.get("new") === "1" && p.prices.length === 0;

  return (
    <div className="space-y-5">
      <div>
        <BackLink to="/billing/plans" label="Plans & pricing" />
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">{p.name}</h2>
          <Badge tone={p.kind === "custom" ? "purple" : "blue"}>{p.kind === "custom" ? "Custom" : "Standard"}</Badge>
          {!p.is_active && <Badge tone="gray">Retired</Badge>}
          {p.organization_id && (
            <Link to={`/organizations/${p.organization_id}?tab=subscription`} className="text-sm font-semibold text-[var(--color-primary)] hover:underline">
              {p.organization_name ? `For ${p.organization_name}` : "Open organization"}
            </Link>
          )}
        </div>
      </div>

      {isNew && (
        <Notice tone="amber">
          This custom plan has no prices yet. Add a price for the organization's currency now, or checkout answers “price not
          set”.
        </Notice>
      )}

      <Panel
        title="Prices per location"
        description="First location + each additional location, per month. A new price applies from each organization's first renewal on or after its date; history is kept."
      >
        <div className="grid divide-y divide-[var(--color-border-light)] md:grid-cols-2 md:divide-x md:divide-y-0">
          {byCurrency.map(({ currency, current, upcoming, history }) => (
            <div key={currency} className="p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{currency}</h3>
                {canManage && (
                  <Button size="sm" variant="secondary" onClick={() => setPriceCurrency(currency)}>
                    <Plus size={14} /> Add a price
                  </Button>
                )}
              </div>
              <p className="text-xs font-medium uppercase tracking-[0.06em] text-[var(--color-text-muted)]">In effect now</p>
              {current ? (
                <p className="mt-1 text-lg font-semibold text-[var(--color-text-primary)]">
                  {formatMoney(current.first_location_price, currency)}
                  <span className="text-sm font-normal text-[var(--color-text-secondary)]">
                    {" "}
                    first · {formatMoney(current.additional_location_price, currency)} each additional
                  </span>
                </p>
              ) : (
                <p className="mt-1 text-sm font-medium text-[var(--color-danger)]">Not set: checkout in {currency} is refused.</p>
              )}
              {current && <p className="text-xs text-[var(--color-text-muted)]">Since {formatDate(current.effective_from)}</p>}

              {upcoming.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium uppercase tracking-[0.06em] text-[var(--color-text-muted)]">Scheduled</p>
                  <ul className="mt-1 space-y-1">
                    {upcoming.map((price) => (
                      <li key={price.effective_from} className="rounded-md bg-[#edf3f7] px-3 py-2 text-sm text-[#2c6890]">
                        From <strong>{formatDate(price.effective_from)}</strong>: {formatMoney(price.first_location_price, currency)} first,{" "}
                        {formatMoney(price.additional_location_price, currency)} additional
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {history.length > 0 && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-xs font-medium text-[var(--color-text-secondary)]">
                    Earlier prices ({history.length})
                  </summary>
                  <ul className="mt-1 space-y-1 text-xs text-[var(--color-text-secondary)]">
                    {history.map((price) => (
                      <li key={price.effective_from}>
                        {formatDate(price.effective_from)}: {formatMoney(price.first_location_price, currency)} /{" "}
                        {formatMoney(price.additional_location_price, currency)}
                        {price.set_at ? ` (set ${formatDateTime(price.set_at)})` : ""}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          ))}
        </div>
      </Panel>

      <PlanSettingsForm plan={p} packs={packs.data ?? []} canManage={canManage} onSaved={(updated) => plan.setData(updated)} />

      <AddPriceDialog
        plan={p}
        currency={priceCurrency}
        onClose={() => setPriceCurrency(null)}
        onSaved={(updated) => plan.setData(updated)}
      />
    </div>
  );
}

// ---- add a price ----

function AddPriceDialog({
  plan,
  currency,
  onClose,
  onSaved,
}: {
  plan: Plan;
  currency: Currency | null;
  onClose: () => void;
  onSaved: (plan: Plan) => void;
}) {
  return currency ? <AddPriceForm plan={plan} currency={currency} onClose={onClose} onSaved={onSaved} /> : null;
}

const todayUtc = () => new Date().toISOString().slice(0, 10);

function AddPriceForm({
  plan,
  currency: initialCurrency,
  onClose,
  onSaved,
}: {
  plan: Plan;
  currency: Currency;
  onClose: () => void;
  onSaved: (plan: Plan) => void;
}) {
  const [currency, setCurrency] = useState<Currency>(initialCurrency);
  const [first, setFirst] = useState("");
  const [additional, setAdditional] = useState("");
  const [from, setFrom] = useState(todayUtc());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const replaces = plan.prices.find((p) => p.currency === currency && p.effective_from.slice(0, 10) === from);

  const save = async () => {
    const f = Number(first);
    const a = Number(additional);
    const valid = (n: number, s: string) => s.trim() !== "" && Number.isFinite(n) && n >= 0 && n <= 100000 && Math.round(n * 100) === n * 100;
    if (!valid(f, first) || !valid(a, additional)) {
      setError("Enter both prices as amounts from 0 to 100,000 with at most 2 decimals.");
      return;
    }
    if (!from) {
      setError("Choose the date the price starts.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await billingApi.addPrice(plan.id, {
        currency,
        first_location_price: f,
        additional_location_price: a,
        effective_from: `${from}T00:00:00.000Z`,
      });
      toast.success(`${currency} price saved. It applies from each organization's first renewal on or after ${formatDate(`${from}T00:00:00.000Z`)}.`);
      onSaved(updated);
      onClose();
    } catch (e) {
      setError(e instanceof ApiError && e.reason === "effective_from_in_past" ? "A price must start today or later." : errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const f = Number(first) || 0;
  const a = Number(additional) || 0;

  return (
    <Modal
      open
      onClose={busy ? () => undefined : onClose}
      title={`Add a price to ${plan.name}`}
      description="Prices are dated. Organizations move to it at their first renewal on or after the date."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy}>
            Save price
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormError message={error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Currency" htmlFor="price-currency">
            <select id="price-currency" className={inputClass} value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Effective from" htmlFor="price-from" hint="00:00 UTC on this date. Today or later.">
            <input id="price-from" type="date" min={todayUtc()} className={inputClass} value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label={`First location (${currency} / month)`} htmlFor="price-first">
            <input
              id="price-first"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              className={inputClass}
              value={first}
              onChange={(e) => setFirst(e.target.value)}
              autoFocus
            />
          </Field>
          <Field label={`Each additional location (${currency} / month)`} htmlFor="price-additional">
            <input
              id="price-additional"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              className={inputClass}
              value={additional}
              onChange={(e) => setAdditional(e.target.value)}
            />
          </Field>
        </div>
        {(first || additional) && (
          <div className="rounded-md bg-[var(--color-surface-muted)] px-3 py-2.5 text-xs text-[var(--color-text-secondary)]">
            Monthly: 1 location {formatMoney(f, currency)} · 3 locations {formatMoney(f + 2 * a, currency)} · 10 locations{" "}
            {formatMoney(f + 9 * a, currency)}
          </div>
        )}
        {replaces && (
          <Notice>
            A {currency} price already starts on this date ({formatMoney(replaces.first_location_price, currency)} /{" "}
            {formatMoney(replaces.additional_location_price, currency)}). Saving replaces it.
          </Notice>
        )}
      </div>
    </Modal>
  );
}

// ---- plan settings ----

type Draft = {
  name: string;
  entitlements: Record<string, boolean>;
  users_per_location: string;
  noCap: boolean;
  max_locations: string;
  trial: { days: string; locations: string; users: string; tokens: string };
  tokens_per_refresh: { rankings: string; gbp: string };
  ai_token_costs: Record<string, string>;
  monthly_token_grant: string;
  token_pack_discount_percent: string;
  pack_prices: Record<string, string>; // `${pack_id}:${currency}` → price
  is_active: boolean;
};

const toDraft = (p: Plan): Draft => ({
  name: p.name,
  // a feature missing from the plan counts as on (backend: entitlements[f] !== false)
  entitlements: Object.fromEntries(FEATURES.map((f) => [f, p.entitlements[f] !== false])),
  users_per_location: String(p.users_per_location),
  noCap: p.max_locations === null,
  max_locations: p.max_locations === null ? "" : String(p.max_locations),
  trial: {
    days: String(p.trial.days),
    locations: String(p.trial.locations),
    users: String(p.trial.users),
    tokens: String(p.trial.tokens),
  },
  tokens_per_refresh: { rankings: String(p.tokens_per_refresh.rankings), gbp: String(p.tokens_per_refresh.gbp) },
  ai_token_costs: Object.fromEntries(AI_COST_FIELDS.map((f) => [f.key, String(p.ai_token_costs?.[f.key] ?? f.fallback)])),
  monthly_token_grant: String(p.monthly_token_grant),
  token_pack_discount_percent: String(p.token_pack_discount_percent),
  pack_prices: Object.fromEntries(p.token_pack_prices.map((x) => [`${x.pack_id}:${x.currency}`, String(x.price)])),
  is_active: p.is_active,
});

/** Whole numbers within a range; returns the problem or the number. */
const int = (value: string, label: string, min: number, max: number): number | string => {
  const n = Number(value);
  if (value.trim() === "" || !Number.isInteger(n) || n < min || n > max) return `${label}: a whole number from ${min} to ${max}.`;
  return n;
};

function PlanSettingsForm({
  plan,
  packs,
  canManage,
  onSaved,
}: {
  plan: Plan;
  packs: TokenPack[];
  canManage: boolean;
  onSaved: (plan: Plan) => void;
}) {
  // Adding a price doesn't touch these settings, so unsaved edits survive it; a save resets the form.
  const [draft, setDraft] = useState<Draft>(() => toDraft(plan));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const custom = plan.kind === "custom";
  const readOnly = !canManage;

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const build = (): PlanSettings | string => {
    const errors: string[] = [];
    const num = (v: string, label: string, min: number, max: number) => {
      const r = int(v, label, min, max);
      if (typeof r === "string") errors.push(r);
      return typeof r === "number" ? r : 0;
    };
    const settings: PlanSettings = {
      name: draft.name.trim(),
      entitlements: Object.fromEntries(FEATURES.map((f) => [f, !!draft.entitlements[f]])),
      users_per_location: num(draft.users_per_location, "Users per location", 1, 100),
      trial: {
        days: num(draft.trial.days, "Trial days", 0, 90),
        locations: num(draft.trial.locations, "Trial locations", 0, 100),
        users: num(draft.trial.users, "Trial users", 1, 100),
        tokens: num(draft.trial.tokens, "Trial tokens", 0, 10000),
      },
      tokens_per_refresh: {
        rankings: num(draft.tokens_per_refresh.rankings, "Rankings refresh", 0, 100),
        gbp: num(draft.tokens_per_refresh.gbp, "GBP refresh", 0, 100),
      },
      ai_token_costs: Object.fromEntries(
        AI_COST_FIELDS.map((f) => [f.key, num(draft.ai_token_costs[f.key] ?? "", f.label, 0, 100)]),
      ) as PlanSettings["ai_token_costs"],
      monthly_token_grant: num(draft.monthly_token_grant, "Monthly token grant", 0, 100000),
    };
    if (!settings.name) errors.push("Enter a plan name.");
    if (custom) {
      settings.max_locations = draft.noCap ? null : num(draft.max_locations, "Location cap", 1, 10000);
      settings.is_active = draft.is_active;
    } else {
      settings.max_locations = num(draft.max_locations, "Location cap", 1, 10000);
    }
    const pct = Number(draft.token_pack_discount_percent);
    if (draft.token_pack_discount_percent.trim() === "" || Number.isNaN(pct) || pct < 0 || pct > 100) {
      errors.push("Token pack discount: 0 to 100%.");
    } else settings.token_pack_discount_percent = pct;
    const packPrices: NonNullable<PlanSettings["token_pack_prices"]> = [];
    for (const [key, value] of Object.entries(draft.pack_prices)) {
      if (value.trim() === "") continue;
      const [pack_id, currency] = key.split(":");
      const price = Number(value);
      if (!Number.isFinite(price) || price < 0) errors.push("Pack prices must be 0 or more.");
      else packPrices.push({ pack_id, currency: currency as Currency, price });
    }
    settings.token_pack_prices = packPrices;
    if (errors.length) return errors[0];

    // send only what changed, so the audit log shows the real change
    const original = toDraft(plan);
    const before: Record<string, unknown> = {
      name: plan.name,
      entitlements: Object.fromEntries(FEATURES.map((f) => [f, !!original.entitlements[f]])),
      users_per_location: plan.users_per_location,
      trial: plan.trial,
      tokens_per_refresh: plan.tokens_per_refresh,
      ai_token_costs: Object.fromEntries(AI_COST_FIELDS.map((f) => [f.key, plan.ai_token_costs?.[f.key] ?? f.fallback])),
      monthly_token_grant: plan.monthly_token_grant,
      max_locations: plan.max_locations,
      is_active: plan.is_active,
      token_pack_discount_percent: plan.token_pack_discount_percent,
      token_pack_prices: plan.token_pack_prices,
    };
    const stable = (v: unknown) =>
      JSON.stringify(v, (_k, val) =>
        val && typeof val === "object" && !Array.isArray(val)
          ? Object.fromEntries(Object.entries(val as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)))
          : val,
      );
    const changed: PlanSettings = {};
    for (const [key, value] of Object.entries(settings)) {
      if (stable(value) !== stable(before[key])) (changed as Record<string, unknown>)[key] = value;
    }
    return changed;
  };

  const save = async () => {
    const body = build();
    if (typeof body === "string") {
      setError(body);
      return;
    }
    if (Object.keys(body).length === 0) {
      toast.info("Nothing changed.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await billingApi.updatePlan(plan.id, body);
      setDraft(toDraft(updated));
      onSaved(updated);
      toast.success("Plan saved.");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const numberInput = (id: string, value: string, onChange: (v: string) => void, props: { min?: number; max?: number; step?: string } = {}) => (
    <input
      id={id}
      type="number"
      className={inputClass}
      value={value}
      disabled={readOnly}
      onChange={(e) => onChange(e.target.value)}
      {...props}
    />
  );

  return (
    <Panel
      title="Plan settings"
      description={readOnly ? "Read-only: changing plans needs billing.manage." : "Saved together. Only changed fields are sent."}
      action={
        canManage && (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setDraft(toDraft(plan))} disabled={busy}>
              Reset
            </Button>
            <Button size="sm" onClick={save} loading={busy}>
              Save settings
            </Button>
          </div>
        )
      }
    >
      <div className="space-y-6 p-5">
        <FormError message={error} />

        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Plan name" htmlFor="plan-name">
            <input id="plan-name" className={inputClass} maxLength={120} value={draft.name} disabled={readOnly} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Users per paid location" htmlFor="plan-users" hint="Pooled across the organization, owner included.">
            {numberInput("plan-users", draft.users_per_location, (v) => set("users_per_location", v), { min: 1, max: 100 })}
          </Field>
          <Field label="Location cap" htmlFor="plan-cap" hint={custom ? undefined : "The standard plan always has a cap; more needs a custom plan."}>
            <div className="flex items-center gap-3">
              <input
                id="plan-cap"
                type="number"
                min={1}
                className={inputClass}
                value={draft.max_locations}
                disabled={readOnly || (custom && draft.noCap)}
                onChange={(e) => set("max_locations", e.target.value)}
              />
              {custom && (
                <label className="flex shrink-0 items-center gap-2 text-sm">
                  <input type="checkbox" className={checkboxClass} checked={draft.noCap} disabled={readOnly} onChange={(e) => set("noCap", e.target.checked)} />
                  No cap
                </label>
              )}
            </div>
          </Field>
        </div>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-[var(--color-text-primary)]">Features</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {FEATURES.map((feature) => (
              <label
                key={feature}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
              >
                <span className="text-[var(--color-text-primary)]">{FEATURE_LABELS[feature]}</span>
                <Switch
                  checked={!!draft.entitlements[feature]}
                  disabled={readOnly}
                  onChange={(checked) => set("entitlements", { ...draft.entitlements, [feature]: checked })}
                  label={FEATURE_LABELS[feature]}
                />
              </label>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-[var(--color-text-primary)]">Trial</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ["days", "Days", 0, 90],
                ["locations", "Locations", 0, 100],
                ["users", "Users", 1, 100],
                ["tokens", "Tokens", 0, 10000],
              ] as const
            ).map(([key, label, min, max]) => (
              <Field key={key} label={label} htmlFor={`trial-${key}`}>
                {numberInput(`trial-${key}`, draft.trial[key], (v) => set("trial", { ...draft.trial, [key]: v }), { min, max })}
              </Field>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-1 text-sm font-semibold text-[var(--color-text-primary)]">Token costs</h3>
          <p className="mb-3 text-xs text-[var(--color-text-muted)]">
            Tokens charged per action. The monthly automatic refresh is free. Customers' AI buttons answer “not configured” until
            the server has an OpenAI key.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Manual rankings refresh" htmlFor="cost-rankings">
              {numberInput("cost-rankings", draft.tokens_per_refresh.rankings, (v) => set("tokens_per_refresh", { ...draft.tokens_per_refresh, rankings: v }), { min: 0, max: 100 })}
            </Field>
            <Field label="Manual GBP refresh" htmlFor="cost-gbp">
              {numberInput("cost-gbp", draft.tokens_per_refresh.gbp, (v) => set("tokens_per_refresh", { ...draft.tokens_per_refresh, gbp: v }), { min: 0, max: 100 })}
            </Field>
            {AI_COST_FIELDS.map((f) => (
              <Field key={f.key} label={f.label} htmlFor={`cost-${f.key}`} hint={`Default ${f.fallback}`}>
                {numberInput(`cost-${f.key}`, draft.ai_token_costs[f.key] ?? "", (v) => set("ai_token_costs", { ...draft.ai_token_costs, [f.key]: v }), { min: 0, max: 100 })}
              </Field>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-[var(--color-text-primary)]">Tokens and token packs</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Monthly token grant" htmlFor="plan-grant" hint="Added at each paid period start.">
              {numberInput("plan-grant", draft.monthly_token_grant, (v) => set("monthly_token_grant", v), { min: 0, max: 100000 })}
            </Field>
            <Field label="Token pack discount (%)" htmlFor="plan-discount">
              {numberInput("plan-discount", draft.token_pack_discount_percent, (v) => set("token_pack_discount_percent", v), { min: 0, max: 100, step: "0.1" })}
            </Field>
          </div>
          {packs.length > 0 && (
            <details className="mt-4" open={plan.token_pack_prices.length > 0}>
              <summary className="cursor-pointer text-sm font-medium text-[var(--color-text-secondary)]">
                Pack prices for this plan ({plan.token_pack_prices.length} set)
              </summary>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                Optional: a fixed price on this plan instead of the pack's own price (and instead of the discount). Leave empty to use
                the pack price.
              </p>
              <div className="table-scroll mt-2">
                <table className="w-full min-w-[480px] text-sm">
                  <thead className="text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
                    <tr>
                      <th className="py-2 pr-4">Pack</th>
                      {CURRENCIES.map((c) => (
                        <th key={c} className="py-2 pr-4">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {packs.map((pack) => (
                      <tr key={pack.id} className="border-t border-[var(--color-border-light)]">
                        <td className="py-2 pr-4 text-[var(--color-text-primary)]">
                          {pack.name} <span className="text-xs text-[var(--color-text-muted)]">({pack.tokens} tokens)</span>
                        </td>
                        {CURRENCIES.map((c) => {
                          const listPrice = pack.prices.find((x) => x.currency === c)?.price;
                          const key = `${pack.id}:${c}`;
                          return (
                            <td key={c} className="py-2 pr-4">
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                aria-label={`${pack.name} ${c} price on this plan`}
                                placeholder={listPrice === undefined ? "—" : String(listPrice)}
                                className={`${compactInputClass} w-32`}
                                value={draft.pack_prices[key] ?? ""}
                                disabled={readOnly}
                                onChange={(e) => set("pack_prices", { ...draft.pack_prices, [key]: e.target.value })}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </section>

        {custom && (
          <label className="flex items-center gap-2.5 text-sm text-[var(--color-text-primary)]">
            <input type="checkbox" className={checkboxClass} checked={draft.is_active} disabled={readOnly} onChange={(e) => set("is_active", e.target.checked)} />
            Plan is active
          </label>
        )}
      </div>
    </Panel>
  );
}

function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault();
        onChange(!checked);
      }}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition disabled:opacity-60 ${
        checked ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]"
      }`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition ${checked ? "translate-x-[18px]" : "translate-x-0.5"}`} />
    </button>
  );
}

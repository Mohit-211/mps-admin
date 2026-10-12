import { useState } from "react";
import { toast } from "sonner";

import { billingApi, CURRENCIES, type BillingMethod, type Currency, type Plan } from "../../api/billing";
import { organizationsApi, type LimitOverrides, type OrganizationDetail } from "../../api/organizations";
import { Button } from "../../components/ui/Button";
import { Field, FormError } from "../../components/ui/Field";
import { checkboxClass, inputClass, textareaClass, compactInputClass } from "../../components/ui/fieldStyles";
import { Modal } from "../../components/ui/Modal";
import { Notice } from "../../components/ui/Panel";
import { ApiError, errorMessage } from "../../lib/api";
import { formatDateTimeZone, fromDateInput, isFuture } from "../../lib/format";

type DialogProps = { open: boolean; detail: OrganizationDetail; onClose: () => void; onSaved: () => void };

const intOrNull = (value: string): number | null => {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : NaN;
};

// ---- limits ----

export function LimitsDialog(props: DialogProps) {
  return props.open ? <LimitsForm {...props} /> : null;
}

type CapMode = "plan" | "none" | "number";

/**
 * PATCH …/limits replaces the whole override object. The form starts from every current override, so
 * saving sends them all back (a merge); an emptied field removes that override.
 */
function LimitsForm({ detail, onClose, onSaved }: DialogProps) {
  const current = detail.organization.limit_overrides ?? {};
  const planCap = detail.billing.plan.max_locations;
  const [free, setFree] = useState(current.free_locations ? String(current.free_locations) : "");
  const [extraUsers, setExtraUsers] = useState(current.extra_users ? String(current.extra_users) : "");
  const [capMode, setCapMode] = useState<CapMode>(
    current.max_locations === undefined ? "plan" : current.max_locations === null ? "none" : "number",
  );
  const [cap, setCap] = useState(typeof current.max_locations === "number" ? String(current.max_locations) : "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const build = (): LimitOverrides | string => {
    const body: LimitOverrides = {};
    const f = intOrNull(free);
    if (Number.isNaN(f) || (f !== null && (f < 0 || f > 1000))) return "Free locations must be a whole number from 0 to 1,000.";
    if (f) body.free_locations = f;
    const u = intOrNull(extraUsers);
    if (Number.isNaN(u) || (u !== null && (u < 0 || u > 1000))) return "Extra users must be a whole number from 0 to 1,000.";
    if (u) body.extra_users = u;
    if (capMode === "none") body.max_locations = null;
    if (capMode === "number") {
      const c = intOrNull(cap);
      if (c === null || Number.isNaN(c) || c < 1 || c > 10000) return "The location cap must be a whole number from 1 to 10,000.";
      body.max_locations = c;
    }
    return body;
  };

  const preview = build();

  const save = async (body: LimitOverrides) => {
    setBusy(true);
    setError(null);
    try {
      await organizationsApi.setLimits(detail.organization.id, body);
      toast.success(Object.keys(body).length ? "Limits saved." : "All limit overrides cleared.");
      onSaved();
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
      title="Edit limits"
      description="Overrides on top of the plan. Every override below is saved together: an emptied field removes it."
      footer={
        <>
          <Button variant="ghost" className="sm:mr-auto" onClick={() => save({})} disabled={busy || Object.keys(current).length === 0}>
            Clear all overrides
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={() => (typeof preview === "string" ? setError(preview) : save(preview))}
            loading={busy}
          >
            Save limits
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <FormError message={error} />
        <Field
          label="Free locations"
          htmlFor="limit-free"
          hint="Locations on top of what they pay for (or their trial allowance), never billed. Leave empty for none."
        >
          <input id="limit-free" type="number" min={0} max={1000} className={inputClass} value={free} onChange={(e) => setFree(e.target.value)} />
        </Field>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-[var(--color-text-primary)]">Location cap</legend>
          <div className="space-y-2">
            {(
              [
                { value: "plan", label: `Plan default (${planCap ?? "no cap"})` },
                { value: "none", label: "No cap" },
                { value: "number", label: "Custom cap" },
              ] as { value: CapMode; label: string }[]
            ).map((option) => (
              <label key={option.value} className="flex items-center gap-2.5 text-sm text-[var(--color-text-primary)]">
                <input
                  type="radio"
                  name="cap-mode"
                  className="accent-[var(--color-primary)]"
                  checked={capMode === option.value}
                  onChange={() => setCapMode(option.value)}
                />
                {option.label}
                {option.value === "number" && capMode === "number" && (
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    aria-label="Custom location cap"
                    className={`${compactInputClass} w-28`}
                    value={cap}
                    onChange={(e) => setCap(e.target.value)}
                  />
                )}
              </label>
            ))}
          </div>
        </fieldset>

        <Field
          label="Extra users"
          htmlFor="limit-users"
          hint={`Added to the pooled limit (${detail.billing.plan.users_per_location} users per paid location). Leave empty for none.`}
        >
          <input
            id="limit-users"
            type="number"
            min={0}
            max={1000}
            className={inputClass}
            value={extraUsers}
            onChange={(e) => setExtraUsers(e.target.value)}
          />
        </Field>

        <div className="rounded-md bg-[var(--color-surface-muted)] px-3 py-2.5 text-xs">
          <div className="mb-1 font-medium text-[var(--color-text-secondary)]">Will be saved as</div>
          <code className="break-all text-[var(--color-text-primary)]">
            {typeof preview === "string" ? "—" : JSON.stringify(preview)}
          </code>
          <div className="mt-1 text-[var(--color-text-muted)]">
            Now: <code>{JSON.stringify(current)}</code>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ---- trial ----

export function TrialDialog(props: DialogProps) {
  return props.open ? <TrialForm {...props} /> : null;
}

const toLocalInput = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/** `days` after the trial end if it's still ahead, else after now. */
const daysAfter = (trialEnd: string | null, days: number) => {
  const base = trialEnd && isFuture(trialEnd) ? new Date(trialEnd).getTime() : Date.now();
  return new Date(base + days * 86_400_000);
};

function TrialForm({ detail, onClose, onSaved }: DialogProps) {
  const currentEnd = detail.billing.trial_ends_at ? new Date(detail.billing.trial_ends_at) : null;
  // default: the current end if it's still ahead, else a week from now
  const [value, setValue] = useState(() =>
    toLocalInput(isFuture(detail.billing.trial_ends_at) && currentEnd ? currentEnd : daysAfter(null, 7)),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const extendBy = (days: number) => setValue(toLocalInput(daysAfter(detail.billing.trial_ends_at, days)));

  const save = async () => {
    const date = new Date(value);
    if (!value || Number.isNaN(date.getTime())) {
      setError("Choose a date and time.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await organizationsApi.setTrial(detail.organization.id, date.toISOString());
      toast.success(`Trial now ends ${formatDateTimeZone(date.toISOString())}.`);
      onSaved();
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
      onClose={busy ? () => undefined : onClose}
      title="Set trial end"
      description={
        currentEnd ? `The trial currently ends ${formatDateTimeZone(currentEnd.toISOString())}.` : "This organization has no trial end yet."
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy}>
            Save trial end
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormError message={error} />
        <Field label="Trial ends" htmlFor="trial-end" hint={`In your timezone (${zone}).`}>
          <input id="trial-end" type="datetime-local" className={inputClass} value={value} onChange={(e) => setValue(e.target.value)} />
        </Field>
        <div className="flex flex-wrap gap-2">
          {[7, 14, 30].map((days) => (
            <Button key={days} variant="secondary" size="sm" onClick={() => extendBy(days)}>
              +{days} days
            </Button>
          ))}
        </div>
        {detail.billing.state !== "trialing" && detail.billing.subscription && (
          <Notice>This organization has a subscription; the trial end has no effect while it's subscribed.</Notice>
        )}
      </div>
    </Modal>
  );
}

// ---- manual subscription ----

export function ManualSubscriptionDialog(props: DialogProps & { billingMethod: BillingMethod }) {
  return props.open ? <ManualSubscriptionForm {...props} /> : null;
}

function ManualSubscriptionForm({ detail, billingMethod, onClose, onSaved }: DialogProps & { billingMethod: BillingMethod }) {
  const b = detail.billing;
  const [quantity, setQuantity] = useState(String(Math.max(1, b.locations.active - b.locations.free)));
  const [startsAt, setStartsAt] = useState("");
  const [comp, setComp] = useState("");
  const [currency, setCurrency] = useState<Currency>(b.currency);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const q = Number(quantity);
    if (!Number.isInteger(q) || q < 1) {
      setError("Paid locations must be a whole number of at least 1.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await billingApi.startManualSubscription(detail.organization.id, {
        quantity: q,
        ...(startsAt ? { starts_at: fromDateInput(startsAt) ?? undefined } : {}),
        ...(comp ? { comp_until: fromDateInput(comp, true) } : {}),
        currency,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      toast.success(comp ? "Comped subscription started. No invoices until the comp ends." : "Manual subscription started. The first period was invoiced.");
      onSaved();
      onClose();
    } catch (e) {
      const reason = e instanceof ApiError ? e.reason : undefined;
      if (reason === "already_subscribed") setError("This organization already has an open subscription.");
      else if (reason === "enterprise_required")
        setError(`More than ${String((e as ApiError).data?.max ?? b.plan.max_locations)} locations needs a custom plan.`);
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
      title="Start a manual subscription"
      description="Billed by invoice. The first period is invoiced at once unless it's comped; you record payments by hand."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy}>
            Start subscription
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormError message={error} />
        {billingMethod !== "manual" && <Notice>The organization is switched to invoice billing.</Notice>}
        {!b.prices.current && !comp && (
          <Notice tone="red">
            The plan has no {b.currency} price yet, so the first invoice would be 0. Add the price first, or comp it.
          </Notice>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Paid locations" htmlFor="manual-qty" hint={`${b.locations.active} active now · cap ${b.plan.max_locations ?? "none"}`}>
            <input id="manual-qty" type="number" min={1} className={inputClass} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </Field>
          <Field label="Currency" htmlFor="manual-currency">
            <select id="manual-currency" className={inputClass} value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Starts (optional)" htmlFor="manual-start" hint="Default: now.">
            <input id="manual-start" type="date" className={inputClass} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </Field>
          <Field label="Comped until (optional)" htmlFor="manual-comp" hint="Free until the end of this day.">
            <input id="manual-comp" type="date" className={inputClass} value={comp} onChange={(e) => setComp(e.target.value)} />
          </Field>
        </div>
        <Field label="Internal note (optional)" htmlFor="manual-note">
          <textarea id="manual-note" className={textareaClass} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

// ---- custom plan ----

export function CustomPlanDialog(props: Omit<DialogProps, "onSaved"> & { onCreated: (plan: Plan) => void }) {
  return props.open ? <CustomPlanForm {...props} /> : null;
}

function CustomPlanForm({ detail, onClose, onCreated }: Omit<DialogProps, "onSaved"> & { onCreated: (plan: Plan) => void }) {
  const [name, setName] = useState(`${detail.organization.name} (custom)`);
  const [noCap, setNoCap] = useState(false);
  const [maxLocations, setMaxLocations] = useState(String(detail.billing.plan.max_locations ?? 20));
  const [usersPer, setUsersPer] = useState(String(detail.billing.plan.users_per_location));
  const [grant, setGrant] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [method, setMethod] = useState<"" | BillingMethod>("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const cap = Number(maxLocations);
    const users = Number(usersPer);
    const monthly = Number(grant);
    const pct = Number(discount);
    if (!name.trim()) return setError("Enter a plan name.");
    if (!noCap && (!Number.isInteger(cap) || cap < 1)) return setError("The location cap must be a whole number of at least 1.");
    if (!Number.isInteger(users) || users < 1 || users > 100) return setError("Users per location must be 1 to 100.");
    if (!Number.isInteger(monthly) || monthly < 0) return setError("The monthly token grant must be 0 or more.");
    if (Number.isNaN(pct) || pct < 0 || pct > 100) return setError("The token pack discount must be 0 to 100%.");
    setBusy(true);
    setError(null);
    try {
      const plan = await billingApi.createCustomPlan(detail.organization.id, {
        name: name.trim(),
        max_locations: noCap ? null : cap,
        users_per_location: users,
        monthly_token_grant: monthly,
        token_pack_discount_percent: pct,
        ...(method ? { billing_method: method } : {}),
      });
      toast.success("Custom plan created. Add its prices next.");
      onCreated(plan);
      onClose();
    } catch (e) {
      setError(
        e instanceof ApiError && e.reason === "custom_plan_exists" ? "This organization already has a custom plan; edit it instead." : errorMessage(e),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      size="lg"
      onClose={busy ? () => undefined : onClose}
      title="Give a custom plan"
      description="Copied from the standard plan, with your changes. It starts without prices: you add them on the plan page next."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy}>
            Create custom plan
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormError message={error} />
        <Field label="Plan name" htmlFor="custom-name">
          <input id="custom-name" className={inputClass} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Location cap" htmlFor="custom-cap">
            <div className="flex items-center gap-3">
              <input
                id="custom-cap"
                type="number"
                min={1}
                className={inputClass}
                value={maxLocations}
                disabled={noCap}
                onChange={(e) => setMaxLocations(e.target.value)}
              />
              <label className="flex shrink-0 items-center gap-2 text-sm">
                <input type="checkbox" className={checkboxClass} checked={noCap} onChange={(e) => setNoCap(e.target.checked)} />
                No cap
              </label>
            </div>
          </Field>
          <Field label="Users per paid location" htmlFor="custom-users">
            <input id="custom-users" type="number" min={1} max={100} className={inputClass} value={usersPer} onChange={(e) => setUsersPer(e.target.value)} />
          </Field>
          <Field label="Monthly token grant" htmlFor="custom-grant" hint="Added at each paid period start.">
            <input id="custom-grant" type="number" min={0} className={inputClass} value={grant} onChange={(e) => setGrant(e.target.value)} />
          </Field>
          <Field label="Token pack discount (%)" htmlFor="custom-discount">
            <input
              id="custom-discount"
              type="number"
              min={0}
              max={100}
              className={inputClass}
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Billing method" htmlFor="custom-method">
          <select id="custom-method" className={inputClass} value={method} onChange={(e) => setMethod(e.target.value as "" | BillingMethod)}>
            <option value="">Keep the current method</option>
            <option value="manual">Invoice (manual)</option>
            <option value="paypal">PayPal</option>
          </select>
        </Field>
        <p className="text-xs text-[var(--color-text-muted)]">
          Features, trial, token costs and pack prices can be changed on the plan page afterwards.
        </p>
      </div>
    </Modal>
  );
}

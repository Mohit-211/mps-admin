import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { billingApi, type Coupon, type TokenPack } from "../../api/billing";
import { useAuth } from "../../auth/useAuth";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Field, FormError } from "../../components/ui/Field";
import { checkboxClass, inputClass, textareaClass } from "../../components/ui/fieldStyles";
import { Modal } from "../../components/ui/Modal";
import { ErrorState } from "../../components/ui/States";
import { useQuery } from "../../hooks/useQuery";
import { ApiError, errorMessage } from "../../lib/api";
import { formatDate, fromDateInput, isFuture, toDateInput } from "../../lib/format";

/** Coupons apply to token packs only. The code can't be changed after creation. */
export function CouponsPage() {
  const { can } = useAuth();
  const canManage = can("billing.manage");
  const coupons = useQuery("coupons", (signal) => billingApi.coupons(signal));
  const packs = useQuery("packs", (signal) => billingApi.packs(signal));
  const [editing, setEditing] = useState<Coupon | "new" | null>(null);
  const packName = new Map((packs.data ?? []).map((p) => [p.id, p.name]));

  return (
    <div className="surface overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-light)] p-4">
        <p className="text-sm text-[var(--color-text-secondary)]">Discount codes for token packs. Subscriptions can't be discounted.</p>
        {canManage && (
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus size={14} /> New coupon
          </Button>
        )}
      </div>
      {coupons.error ? (
        <ErrorState error={coupons.error} onRetry={coupons.reload} />
      ) : (
        <div className="table-scroll">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-[var(--color-surface-muted)] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Packs</th>
                <th className="px-4 py-3">Used</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3">Note</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {!coupons.data ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[var(--color-text-muted)]">
                    Loading…
                  </td>
                </tr>
              ) : coupons.data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[var(--color-text-muted)]">
                    No coupons yet.
                  </td>
                </tr>
              ) : (
                coupons.data.map((c) => {
                  const expired = !!c.expires_at && !isFuture(c.expires_at);
                  const exhausted = c.max_redemptions !== null && c.redemptions >= c.max_redemptions;
                  return (
                    <tr key={c.id} className="border-t border-[var(--color-border-light)] text-[var(--color-text-secondary)]">
                      <td className="px-4 py-3">
                        <code className="font-semibold text-[var(--color-text-primary)]">{c.code}</code>{" "}
                        {!c.is_active ? (
                          <Badge tone="gray">Inactive</Badge>
                        ) : expired ? (
                          <Badge tone="gray">Expired</Badge>
                        ) : exhausted ? (
                          <Badge tone="gray">Used up</Badge>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">{c.discount_type === "percent" ? `${c.value}%` : `$${c.value} off`}</td>
                      <td className="px-4 py-3">
                        {c.pack_ids.length === 0 ? "All packs" : c.pack_ids.map((id) => packName.get(id) ?? "Unknown pack").join(", ")}
                      </td>
                      <td className="px-4 py-3">
                        {c.redemptions}
                        {c.max_redemptions !== null ? ` / ${c.max_redemptions}` : ""}
                      </td>
                      <td className="px-4 py-3">{c.expires_at ? formatDate(c.expires_at) : "Never"}</td>
                      <td className="max-w-[220px] truncate px-4 py-3" title={c.note ?? undefined}>
                        {c.note ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canManage && (
                          <Button size="sm" variant="ghost" onClick={() => setEditing(c)}>
                            <Pencil size={14} /> Edit
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <CouponForm
          coupon={editing === "new" ? null : editing}
          packs={packs.data ?? []}
          onClose={() => setEditing(null)}
          onSaved={coupons.reload}
        />
      )}
    </div>
  );
}

function CouponForm({
  coupon,
  packs,
  onClose,
  onSaved,
}: {
  coupon: Coupon | null;
  packs: TokenPack[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [code, setCode] = useState(coupon?.code ?? "");
  const [type, setType] = useState<"percent" | "fixed">(coupon?.discount_type ?? "percent");
  const [value, setValue] = useState(coupon ? String(coupon.value) : "");
  const [packIds, setPackIds] = useState<string[]>(coupon?.pack_ids ?? []);
  const [maxRedemptions, setMaxRedemptions] = useState(coupon?.max_redemptions ? String(coupon.max_redemptions) : "");
  const [expires, setExpires] = useState(toDateInput(coupon?.expires_at));
  const [active, setActive] = useState(coupon?.is_active ?? true);
  const [note, setNote] = useState(coupon?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const v = Number(value);
    if (!coupon && !/^[A-Za-z0-9_-]{3,40}$/.test(code.trim())) return setError("Codes are 3–40 letters, digits, - or _.");
    if (value.trim() === "" || !Number.isFinite(v) || v < 0 || (type === "percent" && v > 100)) {
      return setError(type === "percent" ? "Enter a percentage from 0 to 100." : "Enter an amount of 0 or more.");
    }
    const max = maxRedemptions.trim() === "" ? null : Number(maxRedemptions);
    if (max !== null && (!Number.isInteger(max) || max < 1)) return setError("Max uses must be a whole number of at least 1, or empty.");
    const body = {
      discount_type: type,
      value: v,
      pack_ids: packIds,
      max_redemptions: max,
      expires_at: fromDateInput(expires, true),
      is_active: active,
      note: note.trim() || null,
    };
    setBusy(true);
    setError(null);
    try {
      if (coupon) await billingApi.updateCoupon(coupon.id, body);
      else await billingApi.createCoupon({ ...body, code: code.trim().toUpperCase() });
      toast.success(coupon ? "Coupon saved." : "Coupon created.");
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError && err.reason === "code_taken" ? "A coupon with this code already exists." : errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      size="lg"
      onClose={busy ? () => undefined : onClose}
      title={coupon ? `Edit ${coupon.code}` : "New coupon"}
      description="Applies to token packs only."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy}>
            {coupon ? "Save" : "Create coupon"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormError message={error} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Code" htmlFor="coupon-code" hint={coupon ? "Can't be changed." : "Saved in capitals."}>
            <input
              id="coupon-code"
              className={`${inputClass} uppercase`}
              maxLength={40}
              value={code}
              disabled={!!coupon}
              onChange={(e) => setCode(e.target.value)}
            />
          </Field>
          <Field label="Type" htmlFor="coupon-type">
            <select id="coupon-type" className={inputClass} value={type} onChange={(e) => setType(e.target.value as "percent" | "fixed")}>
              <option value="percent">Percent off</option>
              <option value="fixed">Fixed amount off</option>
            </select>
          </Field>
          <Field label={type === "percent" ? "Percent" : "Amount (pack currency)"} htmlFor="coupon-value">
            <input id="coupon-value" type="number" min={0} step="0.01" className={inputClass} value={value} onChange={(e) => setValue(e.target.value)} />
          </Field>
          <Field label="Max uses" htmlFor="coupon-max" hint="Empty: unlimited.">
            <input id="coupon-max" type="number" min={1} className={inputClass} value={maxRedemptions} onChange={(e) => setMaxRedemptions(e.target.value)} />
          </Field>
          <Field label="Expires" htmlFor="coupon-expires" hint="End of this day. Empty: never.">
            <input id="coupon-expires" type="date" className={inputClass} value={expires} onChange={(e) => setExpires(e.target.value)} />
          </Field>
        </div>
        <Field label="Token packs" htmlFor="coupon-packs" hint="None selected: every pack.">
          <div id="coupon-packs" className="flex flex-wrap gap-2">
            {packs.length === 0 && <span className="text-sm text-[var(--color-text-muted)]">No token packs yet.</span>}
            {packs.map((pack) => (
              <label key={pack.id} className="flex items-center gap-2 rounded-md border border-[var(--color-border)] px-2.5 py-1.5 text-sm">
                <input
                  type="checkbox"
                  className={checkboxClass}
                  checked={packIds.includes(pack.id)}
                  onChange={(e) => setPackIds((ids) => (e.target.checked ? [...ids, pack.id] : ids.filter((x) => x !== pack.id)))}
                />
                {pack.name}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Internal note" htmlFor="coupon-note">
          <textarea id="coupon-note" className={textareaClass} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <label className="flex items-center gap-2.5 text-sm text-[var(--color-text-primary)]">
          <input type="checkbox" className={checkboxClass} checked={active} onChange={(e) => setActive(e.target.checked)} />
          Active
        </label>
      </div>
    </Modal>
  );
}

import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { billingApi, CURRENCIES, type Currency, type TokenPack } from "../../api/billing";
import { useAuth } from "../../auth/useAuth";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Field, FormError } from "../../components/ui/Field";
import { checkboxClass, inputClass } from "../../components/ui/fieldStyles";
import { Modal } from "../../components/ui/Modal";
import { ErrorState } from "../../components/ui/States";
import { useQuery } from "../../hooks/useQuery";
import { errorMessage } from "../../lib/api";
import { formatMoney } from "../../lib/format";

/** Token packs customers buy (prices per currency). Retire one by making it inactive. */
export function TokenPacksPage() {
  const { can } = useAuth();
  const canManage = can("billing.manage");
  const packs = useQuery("packs", (signal) => billingApi.packs(signal));
  const [editing, setEditing] = useState<TokenPack | "new" | null>(null);

  return (
    <div className="surface overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-light)] p-4">
        <p className="text-sm text-[var(--color-text-secondary)]">
          Manual refreshes and AI actions cost tokens. Customers buy packs; a custom plan can discount them.
        </p>
        {canManage && (
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus size={14} /> New token pack
          </Button>
        )}
      </div>
      {packs.error ? (
        <ErrorState error={packs.error} onRetry={packs.reload} />
      ) : (
        <div className="table-scroll">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-[var(--color-surface-muted)] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
              <tr>
                <th className="px-4 py-3">Pack</th>
                <th className="px-4 py-3">Tokens</th>
                {CURRENCIES.map((c) => (
                  <th key={c} className="px-4 py-3">
                    {c}
                  </th>
                ))}
                <th className="px-4 py-3">Tokens expire</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {!packs.data ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[var(--color-text-muted)]">
                    Loading…
                  </td>
                </tr>
              ) : packs.data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[var(--color-text-muted)]">
                    No token packs yet. Customers can't buy tokens until you add one.
                  </td>
                </tr>
              ) : (
                packs.data.map((pack) => (
                  <tr key={pack.id} className="border-t border-[var(--color-border-light)] text-[var(--color-text-secondary)]">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-[var(--color-text-primary)]">{pack.name}</span>{" "}
                      {!pack.is_active && <Badge tone="gray">Retired</Badge>}
                    </td>
                    <td className="px-4 py-3">{pack.tokens.toLocaleString()}</td>
                    {CURRENCIES.map((c) => {
                      const price = pack.prices.find((p) => p.currency === c);
                      return (
                        <td key={c} className="px-4 py-3">
                          {price ? formatMoney(price.price, null) : <span className="text-[var(--color-text-muted)]">Not sold</span>}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3">{pack.expires_after_days ? `after ${pack.expires_after_days} days` : "Never"}</td>
                    <td className="px-4 py-3">{pack.sort_order}</td>
                    <td className="px-4 py-3 text-right">
                      {canManage && (
                        <Button size="sm" variant="ghost" onClick={() => setEditing(pack)}>
                          <Pencil size={14} /> Edit
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {editing && <PackForm pack={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={packs.reload} />}
    </div>
  );
}

function PackForm({ pack, onClose, onSaved }: { pack: TokenPack | null; onClose: () => void; onSaved: () => void }) {
  const priceOf = (c: Currency) => pack?.prices.find((p) => p.currency === c)?.price;
  const [name, setName] = useState(pack?.name ?? "");
  const [tokens, setTokens] = useState(pack ? String(pack.tokens) : "");
  const [prices, setPrices] = useState<Record<Currency, string>>({
    USD: priceOf("USD") !== undefined ? String(priceOf("USD")) : "",
    CAD: priceOf("CAD") !== undefined ? String(priceOf("CAD")) : "",
  });
  const [expires, setExpires] = useState(pack?.expires_after_days ? String(pack.expires_after_days) : "");
  const [sortOrder, setSortOrder] = useState(String(pack?.sort_order ?? 0));
  const [active, setActive] = useState(pack?.is_active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const t = Number(tokens);
    if (!name.trim()) return setError("Enter a name.");
    if (!Number.isInteger(t) || t < 1) return setError("Tokens must be a whole number of at least 1.");
    const priceList = CURRENCIES.filter((c) => prices[c].trim() !== "").map((c) => ({ currency: c, price: Number(prices[c]) }));
    if (priceList.length === 0) return setError("Set a price in at least one currency.");
    if (priceList.some((p) => !Number.isFinite(p.price) || p.price < 0)) return setError("Prices must be 0 or more.");
    const e = expires.trim() === "" ? null : Number(expires);
    if (e !== null && (!Number.isInteger(e) || e < 1)) return setError("Expiry must be a whole number of days, or empty for never.");
    const order = Number(sortOrder);
    if (!Number.isInteger(order) || order < 0) return setError("Order must be 0 or more.");
    const body = { name: name.trim(), tokens: t, prices: priceList, expires_after_days: e, is_active: active, sort_order: order };
    setBusy(true);
    setError(null);
    try {
      if (pack) await billingApi.updatePack(pack.id, body);
      else await billingApi.createPack(body);
      toast.success(pack ? "Token pack saved." : "Token pack created.");
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={busy ? () => undefined : onClose}
      title={pack ? `Edit ${pack.name}` : "New token pack"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy}>
            {pack ? "Save" : "Create pack"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormError message={error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="pack-name">
            <input id="pack-name" className={inputClass} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Tokens" htmlFor="pack-tokens">
            <input id="pack-tokens" type="number" min={1} className={inputClass} value={tokens} onChange={(e) => setTokens(e.target.value)} />
          </Field>
          {CURRENCIES.map((c) => (
            <Field key={c} label={`Price (${c})`} htmlFor={`pack-${c}`} hint="Empty: not sold in this currency.">
              <input
                id={`pack-${c}`}
                type="number"
                min={0}
                step="0.01"
                className={inputClass}
                value={prices[c]}
                onChange={(e) => setPrices((p) => ({ ...p, [c]: e.target.value }))}
              />
            </Field>
          ))}
          <Field label="Tokens expire after (days)" htmlFor="pack-expires" hint="Empty: never.">
            <input id="pack-expires" type="number" min={1} className={inputClass} value={expires} onChange={(e) => setExpires(e.target.value)} />
          </Field>
          <Field label="Order" htmlFor="pack-order" hint="Lower shows first.">
            <input id="pack-order" type="number" min={0} className={inputClass} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          </Field>
        </div>
        <label className="flex items-center gap-2.5 text-sm text-[var(--color-text-primary)]">
          <input type="checkbox" className={checkboxClass} checked={active} onChange={(e) => setActive(e.target.checked)} />
          On sale (untick to retire the pack)
        </label>
      </div>
    </Modal>
  );
}

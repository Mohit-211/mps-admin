import { Coins } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AI_COST_FIELDS, billingApi, LEDGER_LABELS } from "../../api/billing";
import type { OrganizationDetail } from "../../api/organizations";
import { useAuth } from "../../auth/useAuth";
import { Button } from "../../components/ui/Button";
import { Field, FormError } from "../../components/ui/Field";
import { inputClass, textareaClass } from "../../components/ui/fieldStyles";
import { Modal } from "../../components/ui/Modal";
import { Pagination } from "../../components/ui/Pagination";
import { ErrorState } from "../../components/ui/States";
import { useQuery } from "../../hooks/useQuery";
import { ApiError, errorMessage } from "../../lib/api";
import { formatDateTime } from "../../lib/format";

const LIMIT = 20;

export function TokensTab({ detail, onChanged }: { detail: OrganizationDetail; onChanged: () => void }) {
  const { can } = useAuth();
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<"grant" | "adjustment" | null>(null);
  const orgId = detail.organization.id;
  const tokens = detail.billing.tokens;
  const ledger = useQuery(`ledger:${orgId}:${page}`, (signal) => billingApi.ledger(orgId, { page, limit: LIMIT }, signal));
  const locationName = new Map(detail.locations.map((l) => [l.id, l.name]));

  const balance = ledger.data?.balance ?? tokens.balance;

  return (
    <div>
      <div className="grid gap-5 border-b border-[var(--color-border-light)] p-5 lg:grid-cols-[220px_1fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Balance</p>
          <p className="mt-1 text-3xl font-bold text-[var(--color-text-primary)]">{balance.toLocaleString()}</p>
          {tokens.monthly_grant > 0 && (
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{tokens.monthly_grant} granted each paid month</p>
          )}
          {can("billing.manage") && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setDialog("grant")}>
                <Coins size={14} /> Give tokens
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setDialog("adjustment")}>
                Adjust
              </Button>
            </div>
          )}
        </div>
        <div className="text-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">What tokens cost on this plan</p>
          <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            <CostRow label="Manual rankings refresh" value={tokens.cost_per_refresh.rankings} />
            <CostRow label="Manual GBP refresh" value={tokens.cost_per_refresh.gbp} />
            {AI_COST_FIELDS.map((f) => (
              <CostRow key={f.key} label={f.label} value={tokens.ai_costs?.[f.key]} />
            ))}
          </div>
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">The monthly automatic refresh is free. Change costs on the plan.</p>
        </div>
      </div>

      {ledger.error ? (
        <ErrorState error={ledger.error} onRetry={ledger.reload} />
      ) : (
        <>
          <div className="table-scroll">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-[var(--color-surface-muted)] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
                <tr>
                  <th className="px-5 py-2.5">When</th>
                  <th className="px-5 py-2.5">Type</th>
                  <th className="px-5 py-2.5 text-right">Amount</th>
                  <th className="px-5 py-2.5 text-right">Balance</th>
                  <th className="px-5 py-2.5">Location</th>
                  <th className="px-5 py-2.5">Note</th>
                  <th className="px-5 py-2.5">By</th>
                </tr>
              </thead>
              <tbody>
                {(ledger.data?.entries ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-[var(--color-text-muted)]">
                      {ledger.loading ? "Loading…" : "No token activity yet."}
                    </td>
                  </tr>
                ) : (
                  ledger.data?.entries.map((e) => (
                    <tr key={e.id} className="border-t border-[var(--color-border-light)] text-[var(--color-text-secondary)]">
                      <td className="whitespace-nowrap px-5 py-2.5">{formatDateTime(e.at)}</td>
                      <td className="px-5 py-2.5">{LEDGER_LABELS[e.type] ?? e.type}</td>
                      <td
                        className={`px-5 py-2.5 text-right font-semibold ${e.amount < 0 ? "text-[var(--color-danger)]" : "text-[var(--color-success)]"}`}
                      >
                        {e.amount > 0 ? `+${e.amount}` : e.amount}
                      </td>
                      <td className="px-5 py-2.5 text-right">{e.balance_after}</td>
                      <td className="px-5 py-2.5">
                        {e.location_id ? (locationName.get(e.location_id) ?? <span className="text-xs">Removed location</span>) : "—"}
                      </td>
                      <td className="max-w-[240px] truncate px-5 py-2.5" title={e.note ?? undefined}>
                        {e.note ?? "—"}
                      </td>
                      <td className="px-5 py-2.5">{e.by ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {ledger.data && ledger.data.total > 0 && (
            <div className="border-t border-[var(--color-border-light)] px-3">
              <Pagination page={page} limit={LIMIT} total={ledger.data.total} onPageChange={setPage} />
            </div>
          )}
        </>
      )}

      <TokensDialog
        kind={dialog}
        organizationId={orgId}
        balance={balance}
        onClose={() => setDialog(null)}
        onSaved={() => {
          ledger.reload();
          onChanged();
        }}
      />
    </div>
  );
}

function CostRow({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-dashed border-[var(--color-border-light)] py-1">
      <span className="text-[var(--color-text-secondary)]">{label}</span>
      <span className="font-semibold text-[var(--color-text-primary)]">
        {value === undefined ? "—" : `${value} token${value === 1 ? "" : "s"}`}
      </span>
    </div>
  );
}

function TokensDialog({
  kind,
  ...props
}: {
  kind: "grant" | "adjustment" | null;
  organizationId: string;
  balance: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  return kind ? <TokensForm kind={kind} {...props} /> : null;
}

function TokensForm({
  kind,
  organizationId,
  balance,
  onClose,
  onSaved,
}: {
  kind: "grant" | "adjustment";
  organizationId: string;
  balance: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const grant = kind === "grant";
  const n = Number(amount);

  const save = async () => {
    if (!Number.isInteger(n) || n === 0 || (grant && n < 0)) {
      setError(grant ? "Enter a whole number above 0." : "Enter a whole number, positive to add or negative to remove.");
      return;
    }
    if (!note.trim()) {
      setError("Add a note: it's saved in the ledger and the audit log.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await billingApi.adjustTokens(organizationId, { amount: n, type: kind, note: note.trim() });
      toast.success(`Tokens updated. New balance: ${result.balance}.`);
      onSaved();
      onClose();
    } catch (e) {
      const reason = e instanceof ApiError ? e.reason : undefined;
      if (reason === "insufficient_tokens") setError(`That would take the balance below zero (it is ${balance}).`);
      else if (reason === "invalid_amount") setError("A grant must be positive.");
      else setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={busy ? () => undefined : onClose}
      title={grant ? "Give tokens" : "Adjust tokens"}
      description={
        grant
          ? "Free tokens, e.g. as goodwill. They show as a grant in the customer's ledger."
          : `Correct the balance (now ${balance}). Use a negative number to take tokens away; it can't go below zero.`
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy}>
            {grant ? "Give tokens" : "Save adjustment"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormError message={error} />
        <Field label="Tokens" htmlFor="tokens-amount" hint={!grant && n ? `New balance: ${balance + n}` : undefined}>
          <input
            id="tokens-amount"
            type="number"
            step={1}
            min={grant ? 1 : undefined}
            className={inputClass}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />
        </Field>
        <Field label="Note" htmlFor="tokens-note" hint="Required. Saved in the ledger and the audit log.">
          <textarea id="tokens-note" className={textareaClass} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

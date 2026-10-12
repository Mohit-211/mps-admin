import { useState } from "react";
import { toast } from "sonner";

import { billingApi, type Subscription } from "../../api/billing";
import { Button } from "../../components/ui/Button";
import { Field, FormError } from "../../components/ui/Field";
import { inputClass, textareaClass } from "../../components/ui/fieldStyles";
import { Modal } from "../../components/ui/Modal";
import { Notice } from "../../components/ui/Panel";
import { ApiError, errorMessage } from "../../lib/api";
import { fromDateInput, toDateInput } from "../../lib/format";

/** Comp until a date, the paid quantity (manual billing only) and the internal note. */
export function EditSubscriptionDialog({
  subscription,
  onClose,
  onSaved,
}: {
  subscription: Subscription | null;
  onClose: () => void;
  onSaved: (subscription: Subscription) => void;
}) {
  return subscription ? <EditSubscriptionForm subscription={subscription} onClose={onClose} onSaved={onSaved} /> : null;
}

function EditSubscriptionForm({
  subscription,
  onClose,
  onSaved,
}: {
  subscription: Subscription;
  onClose: () => void;
  onSaved: (subscription: Subscription) => void;
}) {
  const manual = subscription.billing_method === "manual";
  const [comp, setComp] = useState(toDateInput(subscription.comp_until));
  const [quantity, setQuantity] = useState(String(subscription.paid_quantity));
  const [note, setNote] = useState(subscription.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const body: { comp_until?: string | null; paid_quantity?: number; note?: string | null } = {};
    const compIso = fromDateInput(comp, true);
    if (toDateInput(subscription.comp_until) !== comp) body.comp_until = compIso;
    if (manual && Number(quantity) !== subscription.paid_quantity) {
      const q = Number(quantity);
      if (!Number.isInteger(q) || q < 1) {
        setError("Paid locations must be a whole number of at least 1.");
        return;
      }
      body.paid_quantity = q;
    }
    if (note !== (subscription.note ?? "")) body.note = note.trim() || null;
    if (Object.keys(body).length === 0) {
      onClose();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      onSaved(await billingApi.updateSubscription(subscription.id, body));
      toast.success("Subscription saved.");
      onClose();
    } catch (e) {
      setError(e instanceof ApiError && e.reason === "not_manual" ? "The paid quantity of a PayPal subscription changes only through payments." : errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={busy ? () => undefined : onClose}
      title="Edit subscription"
      description={`${subscription.organization_name ?? "Organization"} · ${manual ? "invoice billing" : "PayPal"}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormError message={error} />
        <Field
          label="Comped until"
          htmlFor="sub-comp"
          hint="Free until the end of this day (your local time): no invoices are issued before then. Clear it to end the comp."
        >
          <div className="flex gap-2">
            <input id="sub-comp" type="date" className={inputClass} value={comp} onChange={(e) => setComp(e.target.value)} />
            {comp && (
              <Button variant="secondary" onClick={() => setComp("")}>
                Clear
              </Button>
            )}
          </div>
        </Field>
        {manual ? (
          <Field label="Paid locations" htmlFor="sub-qty" hint="The quantity invoiced at each renewal.">
            <input
              id="sub-qty"
              type="number"
              min={1}
              className={inputClass}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </Field>
        ) : (
          <Notice tone="blue">The paid quantity of a PayPal subscription changes only through the customer's payments.</Notice>
        )}
        <Field label="Internal note" htmlFor="sub-note">
          <textarea id="sub-note" className={textareaClass} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

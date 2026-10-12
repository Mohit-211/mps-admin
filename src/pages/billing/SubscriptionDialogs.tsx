import { useState } from "react";
import { toast } from "sonner";

import { billingApi, type Subscription } from "../../api/billing";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { ApiError } from "../../lib/api";
import { formatDate } from "../../lib/format";
import { EditSubscriptionDialog } from "./EditSubscriptionDialog";

type Dialog = { kind: "edit" | "cancel" | "sync"; subscription: Subscription } | null;

/** Edit (comp / quantity / note), PayPal sync and cancel for one subscription. billing.manage only. */
export function useSubscriptionDialogs(onSaved: (subscription: Subscription) => void) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = () => setDialog(null);

  const dialogs = (
    <>
      <EditSubscriptionDialog
        subscription={dialog?.kind === "edit" ? dialog.subscription : null}
        onClose={close}
        onSaved={onSaved}
      />

      <ConfirmDialog
        open={dialog?.kind === "sync"}
        onClose={close}
        title="Re-read this subscription from PayPal?"
        description="Updates its status, period and payments from PayPal. Nothing is charged."
        confirmLabel="Sync with PayPal"
        onConfirm={async () => {
          if (dialog?.kind !== "sync") return;
          try {
            const updated = await billingApi.syncSubscription(dialog.subscription.id);
            onSaved(updated);
            toast.success(`Synced. Status: ${updated.status.replace(/_/g, " ")}.`);
          } catch (error) {
            const reason = error instanceof ApiError ? error.reason : undefined;
            if (reason === "not_paypal") throw new Error("This subscription isn't billed through PayPal.");
            if (reason === "billing_not_configured") throw new Error("PayPal isn't configured on the server yet.");
            throw error;
          }
        }}
      />

      <ConfirmDialog
        open={dialog?.kind === "cancel"}
        onClose={close}
        title="Cancel this subscription?"
        description={
          dialog?.kind === "cancel" && (
            <>
              {dialog.subscription.billing_method === "paypal"
                ? "It is cancelled at PayPal too. "
                : "No more invoices are issued. "}
              The customer keeps access until the end of the paid period
              {dialog.subscription.current_period_end ? ` (${formatDate(dialog.subscription.current_period_end)})` : ""}.
            </>
          )
        }
        confirmLabel="Cancel subscription"
        danger
        onConfirm={async () => {
          if (dialog?.kind !== "cancel") return;
          try {
            const updated = await billingApi.cancelSubscription(dialog.subscription.id, "");
            onSaved(updated);
            toast.success("Subscription cancelled.");
          } catch (error) {
            const reason = error instanceof ApiError ? error.reason : undefined;
            if (reason === "not_open") throw new Error("This subscription is no longer open.");
            if (reason === "billing_not_configured") throw new Error("PayPal isn't configured on the server yet.");
            throw error;
          }
        }}
      />
    </>
  );

  return {
    dialogs,
    edit: (subscription: Subscription) => setDialog({ kind: "edit", subscription }),
    sync: (subscription: Subscription) => setDialog({ kind: "sync", subscription }),
    cancel: (subscription: Subscription) => setDialog({ kind: "cancel", subscription }),
  };
}

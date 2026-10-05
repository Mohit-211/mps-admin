import { useState, type ReactNode } from "react";

import { Button } from "./Button";
import { Field, FormError } from "./Field";
import { textareaClass } from "./fieldStyles";
import { Modal } from "./Modal";

type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  /** Ask for a reason (the backend requires 3–500 characters). */
  requireReason?: boolean;
  reasonLabel?: string;
  /** Throw to show the error in the dialog; resolve to close it. */
  onConfirm: (reason: string) => Promise<void>;
  children?: ReactNode;
};

export function ConfirmDialog(props: ConfirmDialogProps) {
  // Mounted only while open, so the reason / error start empty every time.
  return props.open ? <ConfirmDialogBody {...props} /> : null;
}

function ConfirmDialogBody({
  onClose,
  title,
  description,
  confirmLabel,
  danger = false,
  requireReason = false,
  reasonLabel = "Reason",
  onConfirm,
  children,
}: ConfirmDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const tooShort = requireReason && reason.trim().length < 3;

  const submit = async () => {
    if (tooShort) {
      setError("Enter a reason (at least 3 characters).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onConfirm(reason.trim());
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={busy ? () => undefined : onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={submit} loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {children}
        {requireReason && (
          <Field label={reasonLabel} htmlFor="confirm-reason" hint="Saved in the audit log.">
            <textarea
              id="confirm-reason"
              className={textareaClass}
              value={reason}
              maxLength={500}
              onChange={(event) => setReason(event.target.value)}
              autoFocus
            />
          </Field>
        )}
        <FormError message={error} />
      </div>
    </Modal>
  );
}

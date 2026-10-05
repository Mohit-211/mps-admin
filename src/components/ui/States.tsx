import { AlertTriangle, ShieldOff } from "lucide-react";

import { ApiError, errorMessage } from "../../lib/api";
import { Button } from "./Button";

/** Inline error for a failed load, with a retry. A 403 explains the missing permission. */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const forbidden = error instanceof ApiError && error.status === 403;
  const Icon = forbidden ? ShieldOff : AlertTriangle;
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-secondary-light)] text-[var(--color-danger)]">
        <Icon size={18} />
      </div>
      <p className="text-sm font-semibold text-[var(--color-text-primary)]">
        {forbidden ? "You don't have access to this" : "Couldn't load this"}
      </p>
      <p className="mt-1 max-w-sm text-sm text-[var(--color-text-secondary)]">
        {forbidden ? "Ask a super admin if you need this permission." : errorMessage(error)}
      </p>
      {onRetry && !forbidden && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

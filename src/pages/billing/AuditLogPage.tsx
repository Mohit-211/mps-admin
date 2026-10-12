import { useState } from "react";

import { OrgChip } from "../../components/ui/FilterChip";
import { compactInputClass } from "../../components/ui/fieldStyles";
import { Button } from "../../components/ui/Button";
import { useUrlState } from "../../hooks/useUrlState";
import { AuditTable } from "./AuditTable";

// The actions the backend writes (src/services/**: audit(…, { action })).
const COMMON_ACTIONS = [
  "admin.create",
  "admin.update",
  "admin.password_link",
  "admin.password_set",
  "admin.free_audit.delete",
  "admin.organization.limits",
  "admin.organization.member_remove",
  "admin.organization.suspend",
  "admin.organization.trial",
  "admin.organization.unsuspend",
  "admin.user.create",
  "admin.user.delete",
  "admin.user.disable",
  "admin.user.enable",
  "admin.user.logout",
  "admin.user.resend_verification",
  "admin.user.update",
  "admin.user.verify",
  "billing.coupon.create",
  "billing.coupon.update",
  "billing.custom_plan.create",
  "billing.custom_plan.remove",
  "billing.invoice.paid",
  "billing.invoice.void",
  "billing.method",
  "billing.pack.create",
  "billing.pack.update",
  "billing.plan.price",
  "billing.plan.update",
  "billing.subscription.cancel",
  "billing.subscription.manual_start",
  "billing.subscription.sync",
  "billing.subscription.update",
  "billing.tokens.grant",
  "billing.tokens.adjustment",
];

/** Every billing.* and admin.* change: who, when, before → after. `action` is an exact match. */
export function AuditLogPage() {
  const { get, update, page, setPage } = useUrlState();
  const action = get("action");
  const organizationId = get("organization_id");
  const [draft, setDraft] = useState(action);

  return (
    <div className="surface overflow-hidden">
      <form
        className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border-light)] p-4"
        onSubmit={(e) => {
          e.preventDefault();
          update({ action: draft.trim() || null });
        }}
      >
        <input
          list="audit-actions"
          aria-label="Action (exact)"
          placeholder="Action (exact), e.g. billing.plan.price"
          className={`${compactInputClass} w-full sm:w-80`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <datalist id="audit-actions">
          {COMMON_ACTIONS.map((a) => (
            <option key={a} value={a} />
          ))}
        </datalist>
        <Button type="submit" size="sm" variant="secondary">
          Filter
        </Button>
        {action && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setDraft("");
              update({ action: null });
            }}
          >
            Clear
          </Button>
        )}
        {organizationId && <OrgChip onClear={() => update({ organization_id: null })} />}
      </form>
      <AuditTable organizationId={organizationId || undefined} action={action || undefined} page={page} onPageChange={setPage} />
    </div>
  );
}

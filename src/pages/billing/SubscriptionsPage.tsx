import { SUBSCRIPTION_STATUSES, type BillingMethod, type SubscriptionStatus } from "../../api/billing";
import { OrgChip } from "../../components/ui/FilterChip";
import { filterClass } from "../../components/ui/fieldStyles";
import { useUrlState } from "../../hooks/useUrlState";
import { humanize } from "../../lib/format";
import { SubscriptionsTable } from "./SubscriptionsTable";

export function SubscriptionsPage() {
  const { get, update, page, setPage } = useUrlState();
  const status = get("status") as "" | SubscriptionStatus;
  const method = get("billing_method") as "" | BillingMethod;
  const organizationId = get("organization_id");

  return (
    <div className="surface overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border-light)] p-4">
        <select aria-label="Status" className={filterClass} value={status} onChange={(e) => update({ status: e.target.value || null })}>
          <option value="">Any status</option>
          {SUBSCRIPTION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {humanize(s)}
            </option>
          ))}
        </select>
        <select
          aria-label="Billing method"
          className={filterClass}
          value={method}
          onChange={(e) => update({ billing_method: e.target.value || null })}
        >
          <option value="">PayPal and invoice</option>
          <option value="paypal">PayPal</option>
          <option value="manual">Invoice (manual)</option>
        </select>
        {organizationId && <OrgChip onClear={() => update({ organization_id: null })} />}
      </div>
      <SubscriptionsTable
        filters={{ status: status || undefined, billing_method: method || undefined, organization_id: organizationId || undefined }}
        page={page}
        onPageChange={setPage}
      />
    </div>
  );
}

import { AlertTriangle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { billingApi, type Plan } from "../../api/billing";
import { Badge } from "../../components/ui/Badge";
import { filterClass } from "../../components/ui/fieldStyles";
import { Notice } from "../../components/ui/Panel";
import { ErrorState } from "../../components/ui/States";
import { useQuery } from "../../hooks/useQuery";
import { useUrlState } from "../../hooks/useUrlState";
import { formatDate, formatMoney } from "../../lib/format";
import { pricesByCurrency } from "./prices";

export function PlansPage() {
  const navigate = useNavigate();
  const { get, update } = useUrlState();
  const kind = get("kind") as "" | "standard" | "custom";
  const plans = useQuery(`plans:${kind}`, (signal) => billingApi.plans(kind ? { kind } : {}, signal));

  const standard = plans.data?.find((p) => p.kind === "standard");
  const missing = standard ? pricesByCurrency(standard.prices).filter((c) => !c.current) : [];

  return (
    <div className="space-y-4">
      {missing.length > 0 && (
        <Notice tone="red">
          <span className="inline-flex items-start gap-2">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <span>
              The standard plan has no {missing.map((m) => m.currency).join(" or ")} price in effect, so customers in that
              currency get “price not set” at checkout.{" "}
              <Link to={`/billing/plans/${standard!.id}`} className="font-semibold underline">
                Add the price
              </Link>
              .
            </span>
          </span>
        </Notice>
      )}

      <div className="surface overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-light)] p-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            The standard plan (20-location cap) and each organization's custom plan. Prices apply from each organization's next
            renewal on or after their date.
          </p>
          <select aria-label="Plan kind" className={filterClass} value={kind} onChange={(e) => update({ kind: e.target.value || null })}>
            <option value="">All plans</option>
            <option value="standard">Standard</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {plans.error ? (
          <ErrorState error={plans.error} onRetry={plans.reload} />
        ) : (
          <div className="table-scroll">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-[var(--color-surface-muted)] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
                <tr>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">USD now</th>
                  <th className="px-4 py-3">CAD now</th>
                  <th className="px-4 py-3">Cap</th>
                  <th className="px-4 py-3">Users / location</th>
                  <th className="px-4 py-3">Monthly tokens</th>
                </tr>
              </thead>
              <tbody>
                {!plans.data ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-[var(--color-text-muted)]">
                      Loading…
                    </td>
                  </tr>
                ) : plans.data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-[var(--color-text-muted)]">
                      No plans.
                    </td>
                  </tr>
                ) : (
                  plans.data.map((plan) => <PlanRow key={plan.id} plan={plan} onOpen={() => navigate(`/billing/plans/${plan.id}`)} />)
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function PlanRow({ plan, onOpen }: { plan: Plan; onOpen: () => void }) {
  const byCurrency = pricesByCurrency(plan.prices);
  return (
    <tr onClick={onOpen} className="cursor-pointer border-t border-[var(--color-border-light)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background)]">
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-[var(--color-text-primary)]">{plan.name}</span>
          <Badge tone={plan.kind === "custom" ? "purple" : "blue"}>{plan.kind === "custom" ? "Custom" : "Standard"}</Badge>
          {!plan.is_active && <Badge tone="gray">Retired</Badge>}
        </div>
        {plan.organization_id && (
          <Link
            to={`/organizations/${plan.organization_id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
          >
            {plan.organization_name === null ? "Deleted organization" : (plan.organization_name ?? "Organization")}
          </Link>
        )}
      </td>
      {byCurrency.map(({ currency, current, upcoming }) => (
        <td key={currency} className="px-4 py-3">
          {current ? (
            <div className="text-[var(--color-text-primary)]">
              {formatMoney(current.first_location_price, null)} + {formatMoney(current.additional_location_price, null)}
            </div>
          ) : (
            <span className="text-[var(--color-danger)]">Not set</span>
          )}
          {upcoming[0] && (
            <div className="text-xs text-[var(--color-text-muted)]">
              {formatMoney(upcoming[0].first_location_price, null)} + {formatMoney(upcoming[0].additional_location_price, null)} from{" "}
              {formatDate(upcoming[0].effective_from)}
            </div>
          )}
        </td>
      ))}
      <td className="px-4 py-3">{plan.max_locations ?? "No cap"}</td>
      <td className="px-4 py-3">{plan.users_per_location}</td>
      <td className="px-4 py-3">{plan.monthly_token_grant}</td>
    </tr>
  );
}

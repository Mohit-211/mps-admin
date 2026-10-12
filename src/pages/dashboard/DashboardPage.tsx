import { AlarmClock, Building2, CreditCard, LifeBuoy, RefreshCw, Coins, UserPlus, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

import { ORG_STATE_LABELS, ORG_STATES } from "../../api/organizations";
import { overviewApi } from "../../api/overview";
import { useAuth } from "../../auth/useAuth";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { Panel } from "../../components/ui/Panel";
import { StatCard } from "../../components/ui/StatCard";
import { ErrorState } from "../../components/ui/States";
import { useQuery } from "../../hooks/useQuery";
import { formatDateTime, formatMoney } from "../../lib/format";

const STATE_COLORS: Record<string, string> = {
  trialing: "#3478a6",
  active: "#27855a",
  past_due: "#b7791f",
  inactive: "#899395",
  suspended_by_admin: "#c9302d",
};

export function DashboardPage() {
  const { can } = useAuth();
  const overview = useQuery("overview", (signal) => overviewApi.get(signal));
  const o = overview.data;
  const billing = can("billing.read");

  return (
    <div className="page-container">
      <PageHeader
        title="Dashboard"
        description="The platform at a glance. Every number links to the list behind it."
        actions={
          <>
            {o && <span className="text-xs text-[var(--color-text-muted)]">Updated {formatDateTime(o.generated_at)}</span>}
            <Button variant="secondary" size="sm" onClick={overview.reload} loading={overview.loading && !!o}>
              <RefreshCw size={14} /> Refresh
            </Button>
          </>
        }
      />

      {overview.error && !o ? (
        <div className="surface">
          <ErrorState error={overview.error} onRetry={overview.reload} />
        </div>
      ) : !o ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="surface h-[118px] animate-pulse bg-[var(--color-surface-muted)]" />
          ))}
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Organizations"
              value={o.organizations.total.toLocaleString()}
              sub={`${o.organizations.by_type.business ?? 0} business · ${o.organizations.by_type.agency ?? 0} agency`}
              icon={Building2}
              to="/organizations"
            />
            <StatCard
              label="Trials ending in 7 days"
              value={o.trials_ending_7d.toLocaleString()}
              sub="Still trialing, trial ends within a week"
              icon={AlarmClock}
              tone={o.trials_ending_7d > 0 ? "warning" : "default"}
              to="/organizations?state=trialing&trial_ending_days=7"
            />
            <StatCard
              label="Paying subscriptions"
              value={o.subscriptions.paying.toLocaleString()}
              sub={
                o.subscriptions.past_due > 0
                  ? `${o.subscriptions.past_due} past due · comped ones excluded`
                  : "Comped subscriptions excluded"
              }
              icon={CreditCard}
              to={billing ? "/billing/subscriptions?status=active" : undefined}
            />
            <StatCard
              label="Open tickets"
              value={o.open_tickets.toLocaleString()}
              sub="Open, in progress or waiting on the customer"
              icon={LifeBuoy}
              tone={o.open_tickets > 0 ? "warning" : "default"}
              to={can("support.read") ? "/support" : undefined}
            />
          </section>

          <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MoneyTiles
              label="MRR"
              icon={CreditCard}
              values={Object.entries(o.subscriptions.mrr).map(([currency, total]) => ({ currency, text: formatMoney(total, currency) }))}
              empty="No paying subscriptions yet"
              sub="Per month, open paid subscriptions"
              to={billing ? "/billing/subscriptions?status=active" : undefined}
            />
            <MoneyTiles
              label="Token sales, 30 days"
              icon={Coins}
              values={Object.entries(o.token_sales_30d).map(([currency, sale]) => ({
                currency,
                text: formatMoney(sale.total, currency),
                sub: `${sale.count} pack${sale.count === 1 ? "" : "s"} sold`,
              }))}
              empty="No token packs sold"
              sub="Paid token-pack invoices"
              to={billing ? "/billing/invoices?kind=token_pack&status=paid" : undefined}
            />
            <StatCard
              label="Signups, 30 days"
              value={o.signups_30d.users.toLocaleString()}
              sub={`Verified users · ${o.signups_30d.organizations} new organization${o.signups_30d.organizations === 1 ? "" : "s"}`}
              icon={UserPlus}
              to="/users"
            />
            <StatCard
              label="Past due"
              value={(o.organizations.by_state.past_due ?? 0).toLocaleString()}
              sub="Payment failed, in the 7-day grace period"
              icon={AlertTriangle}
              tone={(o.organizations.by_state.past_due ?? 0) > 0 ? "warning" : "default"}
              to="/organizations?state=past_due"
            />
          </section>

          <section className="mt-5">
            <Panel title="Organizations by billing state" description="Computed live for every active organization.">
              <ul className="divide-y divide-[var(--color-border-light)]">
                {ORG_STATES.map((state) => {
                  const count = o.organizations.by_state[state] ?? 0;
                  const share = o.organizations.total ? count / o.organizations.total : 0;
                  return (
                    <li key={state}>
                      <Link
                        to={`/organizations?state=${state}`}
                        className="flex items-center gap-4 px-5 py-3 hover:bg-[var(--color-background)]"
                      >
                        <span className="w-28 shrink-0 text-sm font-medium text-[var(--color-text-primary)]">
                          {ORG_STATE_LABELS[state]}
                        </span>
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
                          <span
                            className="block h-full rounded-full"
                            style={{ width: `${Math.max(count ? 2 : 0, share * 100)}%`, background: STATE_COLORS[state] }}
                          />
                        </span>
                        <span className="w-12 shrink-0 text-right text-sm font-semibold text-[var(--color-text-primary)]">
                          {count}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          </section>
        </>
      )}
    </div>
  );
}

/** One tile per currency: USD and CAD are never added together. */
function MoneyTiles({
  label,
  icon,
  values,
  empty,
  sub,
  to,
}: {
  label: string;
  icon: typeof Coins;
  values: { currency: string; text: string; sub?: string }[];
  empty: string;
  sub: string;
  to?: string;
}) {
  return (
    <StatCard
      label={label}
      icon={icon}
      to={to}
      value={
        values.length === 0 ? (
          <span className="text-base font-semibold text-[var(--color-text-muted)]">{empty}</span>
        ) : (
          <div className="space-y-0.5">
            {values.map((v) => (
              <div key={v.currency} className="flex items-baseline gap-2">
                <span>{v.text}</span>
                {v.sub && <span className="text-xs font-medium text-[var(--color-text-muted)]">{v.sub}</span>}
              </div>
            ))}
          </div>
        )
      }
      sub={sub}
    />
  );
}

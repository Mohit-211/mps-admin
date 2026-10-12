import { Link } from "react-router-dom";

import type { OrganizationBilling } from "../../api/billing";
import { CITATION_STATUS_LABELS, CITATION_STATUSES } from "../../api/citations";
import type { OrganizationDetail } from "../../api/organizations";
import { SubscriptionBadge } from "../../components/StateBadges";
import { Detail, DetailList } from "../../components/ui/Panel";
import { formatDate, formatDateTimeZone, formatFromNow, formatMoney, isFuture } from "../../lib/format";

/** Organization + billing state at a glance. */
export function OverviewTab({ detail, billing }: { detail: OrganizationDetail; billing: OrganizationBilling | null }) {
  const { organization: org, billing: b } = detail;
  const current = b.prices.current;
  const upcoming = b.prices.upcoming;
  const citationTotal = Object.values(detail.citations).reduce((sum, n) => sum + n, 0);

  return (
    <div className="grid gap-x-8 gap-y-2 p-5 xl:grid-cols-2">
      <section>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Account</h3>
        <DetailList>
          <Detail label="Owner">
            {org.owner.email ? (
              <Link to={`/users/${org.owner.id}`} className="font-medium text-[var(--color-primary)] hover:underline">
                {org.owner.email}
              </Link>
            ) : (
              "—"
            )}
          </Detail>
          <Detail label="Type">
            <span className="capitalize">{org.type}</span>
            {org.type === "agency" ? ` · ${detail.clients} client${detail.clients === 1 ? "" : "s"}` : ""}
          </Detail>
          <Detail label="Country / currency">
            {org.country ?? "—"} · {b.currency}
          </Detail>
          <Detail label="Created">{formatDate(org.created_at)}</Detail>
          <Detail label="Members">{detail.members.filter((m) => m.status === "active").length} active</Detail>
          <Detail label="Billing method">
            {billing ? (billing.organization.billing_method === "manual" ? "Invoice (manual)" : "PayPal") : "—"}
          </Detail>
          <Detail label="Organization ID">
            <code className="text-xs text-[var(--color-text-secondary)]">{org.id}</code>
          </Detail>
        </DetailList>
      </section>

      <section>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">Billing</h3>
        <DetailList>
          <Detail label="Plan">
            {b.plan.name}
            {b.plan.kind === "custom" ? " (custom)" : ""}
          </Detail>
          {b.state === "trialing" && (
            <Detail label="Trial ends">
              {formatDateTimeZone(b.trial_ends_at)} ({formatFromNow(b.trial_ends_at)})
            </Detail>
          )}
          {b.grace_ends_at && <Detail label="Grace period ends">{formatDateTimeZone(b.grace_ends_at)}</Detail>}
          <Detail label="Prices">
            {current
              ? `${formatMoney(current.first_location, b.currency)} first location, ${formatMoney(current.additional_location, b.currency)} each additional`
              : "Not set: checkout answers “price not set” until a price is added"}
            {upcoming && (
              <div className="text-xs text-[var(--color-text-secondary)]">
                From {formatDate(upcoming.effective_from)}: {formatMoney(upcoming.first_location, b.currency)} /{" "}
                {formatMoney(upcoming.additional_location, b.currency)}
              </div>
            )}
          </Detail>
          <Detail label="Subscription">
            {b.subscription ? (
              <span className="inline-flex flex-wrap items-center gap-2">
                <SubscriptionBadge status={b.subscription.status} />
                {b.subscription.paid_quantity} paid location{b.subscription.paid_quantity === 1 ? "" : "s"}
                {isFuture(b.subscription.comp_until)
                  ? ` · comped until ${formatDate(b.subscription.comp_until)}`
                  : ""}
              </span>
            ) : (
              "None"
            )}
          </Detail>
          <Detail label="Next renewal">
            {b.next_renewal
              ? `${formatDateTimeZone(b.next_renewal.date)} · ${b.next_renewal.quantity} location${b.next_renewal.quantity === 1 ? "" : "s"} · ${
                  b.next_renewal.amount === null ? "price not set" : formatMoney(b.next_renewal.amount, b.currency)
                }${b.next_renewal.fixed ? " (fixed)" : " (estimate)"}`
              : "—"}
          </Detail>
          <Detail label="Locations">
            {b.locations.active} active of {b.locations.allowed} allowed
            {b.locations.free > 0 ? ` (${b.locations.free} free)` : ""} · cap {b.locations.max ?? "none"}
          </Detail>
          <Detail label="Users">
            {b.users.used} of {b.users.limit}
          </Detail>
          <Detail label="Tokens">
            {b.tokens.balance.toLocaleString()}
            {b.tokens.monthly_grant > 0 ? ` · ${b.tokens.monthly_grant} granted monthly` : ""}
          </Detail>
          <Detail label="Read-only">{b.read_only ? "Yes" : "No"}</Detail>
        </DetailList>
      </section>

      <section className="xl:col-span-2">
        <h3 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
          Citations ({citationTotal} listings)
        </h3>
        {citationTotal === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No citation lists yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {CITATION_STATUSES.filter((s) => detail.citations[s]).map((s) => (
              <span key={s} className="rounded-md bg-[var(--color-surface-muted)] px-2.5 py-1.5 text-xs text-[var(--color-text-secondary)]">
                {CITATION_STATUS_LABELS[s]}: <strong className="text-[var(--color-text-primary)]">{detail.citations[s]}</strong>
              </span>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

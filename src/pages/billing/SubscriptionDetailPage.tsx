import { Pencil, RefreshCw, XCircle } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { billingApi, INVOICE_KIND_LABELS } from "../../api/billing";
import { useAuth } from "../../auth/useAuth";
import { InvoiceBadge, SubscriptionBadge } from "../../components/StateBadges";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { DownloadButton } from "../../components/ui/DownloadButton";
import { BackLink, DetailSkeleton } from "../../components/ui/PageHeader";
import { Detail, DetailList, Notice, Panel, PanelEmpty } from "../../components/ui/Panel";
import { ErrorState } from "../../components/ui/States";
import { useQuery } from "../../hooks/useQuery";
import { formatDate, formatDateTime, formatDateTimeZone, formatMoney, humanize, isFuture } from "../../lib/format";
import { useSubscriptionDialogs } from "./SubscriptionDialogs";
import { monthlyAmount } from "./prices";

export function SubscriptionDetailPage() {
  const { subscriptionId = "" } = useParams();
  const { can } = useAuth();
  const sub = useQuery(`subscription:${subscriptionId}`, (signal) => billingApi.subscription(subscriptionId, signal));
  const dialogs = useSubscriptionDialogs(() => sub.reload());
  const canManage = can("billing.manage");

  if (sub.error) {
    return (
      <div>
        <BackLink to="/billing/subscriptions" label="Subscriptions" />
        <div className="surface">
          <ErrorState error={sub.error} onRetry={sub.reload} />
        </div>
      </div>
    );
  }
  const s = sub.data;
  if (!s) {
    return (
      <div>
        <BackLink to="/billing/subscriptions" label="Subscriptions" />
        <DetailSkeleton />
      </div>
    );
  }

  const comped = isFuture(s.comp_until);
  const paypal = s.billing_method === "paypal";

  return (
    <div className="space-y-5">
      <div>
        <BackLink to="/billing/subscriptions" label="Subscriptions" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
              {paypal ? "PayPal" : "Invoice"} subscription
            </h2>
            <SubscriptionBadge status={s.status} />
            {comped && <Badge tone="purple">Comped until {formatDate(s.comp_until)}</Badge>}
            <Link to={`/organizations/${s.organization_id}?tab=subscription`} className="text-sm font-semibold text-[var(--color-primary)] hover:underline">
              Open organization
            </Link>
          </div>
          {canManage && (
            <div className="flex flex-wrap gap-2">
              {s.open && (
                <Button size="sm" variant="secondary" onClick={() => dialogs.edit(s)}>
                  <Pencil size={14} /> Edit
                </Button>
              )}
              {paypal && s.provider_subscription_id && (
                <Button size="sm" variant="secondary" onClick={() => dialogs.sync(s)}>
                  <RefreshCw size={14} /> Sync with PayPal
                </Button>
              )}
              {s.open && (
                <Button size="sm" variant="secondary" className="text-[var(--color-danger)]" onClick={() => dialogs.cancel(s)}>
                  <XCircle size={14} /> Cancel
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {paypal && (
        <Notice tone="blue">PayPal hasn't been tested live yet, so sync and cancel can't be confirmed end to end.</Notice>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Subscription">
          <DetailList>
            <Detail label="Paid locations">{s.paid_quantity}</Detail>
            <Detail label="Price">
              {formatMoney(s.price.first, s.currency)} first + {formatMoney(s.price.additional, s.currency)} each additional ={" "}
              <strong>{formatMoney(monthlyAmount(s), s.currency)}</strong> / month
            </Detail>
            <Detail label="Current period">
              {formatDateTimeZone(s.current_period_start)} → {formatDateTimeZone(s.current_period_end)}
            </Detail>
            <Detail label="Next renewal">
              {s.next_renewal
                ? `${s.next_renewal.quantity} location${s.next_renewal.quantity === 1 ? "" : "s"}, ${formatMoney(s.next_renewal.amount, s.currency)} (fixed)`
                : "Not fixed yet (fixed 11 days before the renewal)"}
            </Detail>
            {s.pending_lines.length > 0 && (
              <Detail label="On the next invoice">
                <ul className="space-y-0.5">
                  {s.pending_lines.map((line, i) => (
                    <li key={i}>
                      {line.label}: {formatMoney(line.amount, s.currency)}
                    </li>
                  ))}
                </ul>
              </Detail>
            )}
            <Detail label="Cancels at period end">{s.cancel_at_period_end ? "Yes" : "No"}</Detail>
            {s.cancelled_at && <Detail label="Cancelled">{formatDateTime(s.cancelled_at)}</Detail>}
            {s.past_due_since && <Detail label="Past due since">{formatDateTime(s.past_due_since)}</Detail>}
            <Detail label="Failed payments">{s.failed_payments}</Detail>
            <Detail label="Last payment">{formatDateTime(s.last_payment_at)}</Detail>
            {s.provider_subscription_id && (
              <Detail label="PayPal ID">
                <code className="text-xs">{s.provider_subscription_id}</code>
              </Detail>
            )}
            <Detail label="Note">{s.note || "—"}</Detail>
            <Detail label="Started">{formatDateTime(s.created_at)}</Detail>
          </DetailList>
        </Panel>

        <Panel title={`Events (${s.events.length})`}>
          {s.events.length === 0 ? (
            <PanelEmpty>No events.</PanelEmpty>
          ) : (
            <ol className="divide-y divide-[var(--color-border-light)]">
              {[...s.events].reverse().map((event, i) => (
                <li key={i} className="flex items-start justify-between gap-4 px-5 py-2.5 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium text-[var(--color-text-primary)]">{humanize(event.type)}</div>
                    {event.detail && <div className="break-words text-xs text-[var(--color-text-secondary)]">{event.detail}</div>}
                  </div>
                  <span className="shrink-0 text-xs text-[var(--color-text-muted)]">{formatDateTime(event.at)}</span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>

      <Panel title={`Invoices (${s.invoices.length})`}>
        {s.invoices.length === 0 ? (
          <PanelEmpty>No invoices yet.</PanelEmpty>
        ) : (
          <ul className="divide-y divide-[var(--color-border-light)]">
            {s.invoices.map((invoice) => (
              <li key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <code className="text-xs font-semibold text-[var(--color-text-primary)]">{invoice.number}</code>
                  <InvoiceBadge status={invoice.status} />
                  <span className="text-[var(--color-text-secondary)]">
                    {INVOICE_KIND_LABELS[invoice.kind]} · {formatMoney(invoice.total, invoice.currency)} · issued {formatDate(invoice.issued_at)}
                  </span>
                </div>
                {invoice.has_pdf && <DownloadButton path={billingApi.invoicePdfPath(invoice.id)} filename={`${invoice.number}.pdf`}>PDF</DownloadButton>}
              </li>
            ))}
          </ul>
        )}
        <p className="border-t border-[var(--color-border-light)] px-5 py-3 text-xs text-[var(--color-text-muted)]">
          Record payments and void invoices from{" "}
          <Link to={`/billing/invoices?organization_id=${s.organization_id}`} className="font-semibold text-[var(--color-primary)] hover:underline">
            Invoices
          </Link>
          .
        </p>
      </Panel>

      {dialogs.dialogs}
    </div>
  );
}

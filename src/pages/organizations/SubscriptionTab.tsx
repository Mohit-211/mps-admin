import { CalendarClock, ExternalLink, Gauge, Plus, RefreshCw, SlidersHorizontal, XCircle, Pencil } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { billingApi, type OrganizationBilling, type Subscription } from "../../api/billing";
import type { OrganizationDetail } from "../../api/organizations";
import { useAuth } from "../../auth/useAuth";
import { SubscriptionBadge } from "../../components/StateBadges";
import { ActionMenu } from "../../components/ui/ActionMenu";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Detail, DetailList, Notice, Panel, PanelEmpty } from "../../components/ui/Panel";
import { ErrorState } from "../../components/ui/States";
import { ApiError } from "../../lib/api";
import { formatDate, formatDateTimeZone, formatFromNow, formatMoney, isFuture } from "../../lib/format";
import { monthlyAmount } from "../billing/prices";
import { useSubscriptionDialogs } from "../billing/SubscriptionDialogs";
import { CustomPlanDialog, LimitsDialog, ManualSubscriptionDialog, TrialDialog } from "./OrganizationDialogs";

type Dialog = "limits" | "trial" | "manual" | "custom" | "remove-custom" | "method" | null;

export function SubscriptionTab({
  detail,
  billing,
  billingError,
  onChanged,
}: {
  detail: OrganizationDetail;
  billing: OrganizationBilling | null;
  billingError: unknown;
  onChanged: () => void;
}) {
  const { can } = useAuth();
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<Dialog>(null);
  const subDialogs = useSubscriptionDialogs(() => onChanged());
  const org = detail.organization;
  const b = detail.billing;
  const overrides = org.limit_overrides ?? {};
  const canWrite = can("platform.write");
  const canBillingRead = can("billing.read");
  const canManage = can("billing.manage");

  const openSub = billing?.subscriptions.find((s) => s.open) ?? null;
  const method = billing?.organization.billing_method ?? "paypal";

  return (
    <div className="space-y-5 p-5">
      <Notice tone="blue">
        <strong>Letting a customer add locations without paying</strong> (lightest first):
        <ol className="mt-1 list-decimal space-y-0.5 pl-5">
          <li>
            <strong>Free locations</strong> (limits below): extra locations on top of what they pay for or their trial
            allowance, never billed. Needs an active trial or subscription.
          </li>
          <li>
            <strong>Comped subscription</strong>: switch to invoice billing, then start a manual subscription with a
            “comped until” date. The whole account is free until then.
          </li>
          <li>
            <strong>Custom (enterprise) plan</strong>: its own prices, location cap, users per location and monthly
            tokens.
          </li>
        </ol>
      </Notice>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          title="Limits"
          description="Overrides on top of the plan."
          action={
            canWrite && (
              <Button size="sm" variant="secondary" onClick={() => setDialog("limits")}>
                <SlidersHorizontal size={14} /> Edit limits
              </Button>
            )
          }
        >
          <DetailList>
            <Detail label="Free locations">
              {overrides.free_locations ? `${overrides.free_locations} (never billed)` : "None"}
            </Detail>
            <Detail label="Location cap">
              {overrides.max_locations === undefined
                ? `Plan default (${b.plan.max_locations ?? "no cap"})`
                : overrides.max_locations === null
                  ? "No cap (override)"
                  : `${overrides.max_locations} (override)`}
            </Detail>
            <Detail label="Extra users">
              {overrides.extra_users ? `+${overrides.extra_users} on top of ${b.plan.users_per_location} per paid location` : "None"}
            </Detail>
            <Detail label="In use">
              {b.locations.active} of {b.locations.allowed} locations · {b.users.used} of {b.users.limit} users
            </Detail>
          </DetailList>
        </Panel>

        <Panel
          title="Trial"
          action={
            canWrite && (
              <Button size="sm" variant="secondary" onClick={() => setDialog("trial")}>
                <CalendarClock size={14} /> Set trial end
              </Button>
            )
          }
        >
          <DetailList>
            <Detail label="Trial ends">
              {b.trial_ends_at ? (
                <>
                  {formatDateTimeZone(b.trial_ends_at)}
                  <span className="text-[var(--color-text-secondary)]"> ({formatFromNow(b.trial_ends_at)})</span>
                </>
              ) : (
                "—"
              )}
            </Detail>
            <Detail label="State">{b.state === "trialing" ? "Trialing" : "Not trialing"}</Detail>
          </DetailList>
          <p className="border-t border-[var(--color-border-light)] px-5 py-3 text-xs text-[var(--color-text-muted)]">
            After the trial the organization is read-only until it subscribes. Extending it also resets the trial
            reminder emails.
          </p>
        </Panel>
      </div>

      {canBillingRead &&
        (billingError && !billing ? (
          <div className="surface">
            <ErrorState error={billingError} />
          </div>
        ) : !billing ? (
          <div className="surface h-40 animate-pulse bg-[var(--color-surface-muted)]" />
        ) : (
          <>
            <Panel
              title="Subscriptions"
              description={`Billing method: ${method === "manual" ? "invoice (manual)" : "PayPal"}`}
              action={
                canManage && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setDialog("method")}>
                      Switch to {method === "manual" ? "PayPal" : "invoice billing"}
                    </Button>
                    {!openSub && (
                      <Button size="sm" onClick={() => setDialog("manual")}>
                        <Plus size={14} /> Start manual subscription
                      </Button>
                    )}
                  </div>
                )
              }
            >
              {billing.subscriptions.length === 0 ? (
                <PanelEmpty>No subscriptions yet.</PanelEmpty>
              ) : (
                <ul className="divide-y divide-[var(--color-border-light)]">
                  {billing.subscriptions.map((s) => (
                    <SubscriptionRow
                      key={s.id}
                      subscription={s}
                      canManage={canManage}
                      onOpen={() => navigate(`/billing/subscriptions/${s.id}`)}
                      onEdit={() => subDialogs.edit({ ...s, organization_name: org.name })}
                      onSync={() => subDialogs.sync(s)}
                      onCancel={() => subDialogs.cancel(s)}
                    />
                  ))}
                </ul>
              )}
            </Panel>

            <Panel
              title="Plan"
              action={
                canManage &&
                (b.plan.kind === "custom" ? (
                  <Button size="sm" variant="secondary" className="text-[var(--color-danger)]" onClick={() => setDialog("remove-custom")}>
                    Back to the standard plan
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => setDialog("custom")}>
                    <Gauge size={14} /> Give a custom plan
                  </Button>
                ))
              }
            >
              <DetailList>
                <Detail label="Plan">
                  <span className="inline-flex flex-wrap items-center gap-2">
                    {b.plan.name}
                    {b.plan.kind === "custom" && <Badge tone="purple">Custom</Badge>}
                    <Link
                      to={`/billing/plans/${b.plan.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)] hover:underline"
                    >
                      Open plan <ExternalLink size={12} />
                    </Link>
                  </span>
                </Detail>
                <Detail label="Prices">
                  {b.prices.current
                    ? `${formatMoney(b.prices.current.first_location, b.currency)} first, ${formatMoney(b.prices.current.additional_location, b.currency)} additional`
                    : `No ${b.currency} price yet`}
                </Detail>
                <Detail label="Location cap / users">
                  {b.plan.max_locations ?? "No cap"} locations · {b.plan.users_per_location} users per paid location
                </Detail>
              </DetailList>
              {b.plan.kind === "custom" && !b.prices.current && (
                <div className="border-t border-[var(--color-border-light)] px-5 py-3">
                  <Notice tone="amber">
                    This custom plan has no {b.currency} price yet, so checkout answers “price not set”.{" "}
                    <Link to={`/billing/plans/${b.plan.id}`} className="font-semibold underline">
                      Add its prices
                    </Link>
                    .
                  </Notice>
                </div>
              )}
            </Panel>
          </>
        ))}

      <LimitsDialog open={dialog === "limits"} detail={detail} onClose={() => setDialog(null)} onSaved={onChanged} />
      <TrialDialog open={dialog === "trial"} detail={detail} onClose={() => setDialog(null)} onSaved={onChanged} />
      <ManualSubscriptionDialog
        open={dialog === "manual"}
        detail={detail}
        billingMethod={method}
        onClose={() => setDialog(null)}
        onSaved={onChanged}
      />
      <CustomPlanDialog
        open={dialog === "custom"}
        detail={detail}
        onClose={() => setDialog(null)}
        onCreated={(plan) => {
          onChanged();
          navigate(`/billing/plans/${plan.id}?new=1`);
        }}
      />

      <ConfirmDialog
        open={dialog === "method"}
        onClose={() => setDialog(null)}
        title={`Switch to ${method === "manual" ? "PayPal" : "invoice billing"}?`}
        description={
          method === "manual"
            ? "The customer subscribes and pays through PayPal from the billing page."
            : "The customer is billed by invoice; you record payments by hand. Use it for comped accounts and enterprise customers. Then start a manual subscription."
        }
        confirmLabel="Switch billing method"
        onConfirm={async () => {
          try {
            await billingApi.setBillingMethod(org.id, method === "manual" ? "paypal" : "manual");
          } catch (error) {
            if (error instanceof ApiError && error.reason === "subscription_open") {
              throw new Error("Cancel the open subscription first: the billing method can't change while it's open.");
            }
            throw error;
          }
          toast.success("Billing method saved.");
          onChanged();
        }}
      />

      <ConfirmDialog
        open={dialog === "remove-custom"}
        onClose={() => setDialog(null)}
        title="Back to the standard plan?"
        description="The custom plan is retired. The next renewal uses the standard plan's prices, cap and settings."
        confirmLabel="Use the standard plan"
        danger
        onConfirm={async () => {
          try {
            await billingApi.removeCustomPlan(org.id);
          } catch (error) {
            if (error instanceof ApiError && error.reason === "no_custom_plan") {
              onChanged();
              throw new Error("This organization is already on the standard plan.");
            }
            throw error;
          }
          toast.success("Back on the standard plan.");
          onChanged();
        }}
      />

      {subDialogs.dialogs}
    </div>
  );
}

function SubscriptionRow({
  subscription: s,
  canManage,
  onOpen,
  onEdit,
  onSync,
  onCancel,
}: {
  subscription: Subscription;
  canManage: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onSync: () => void;
  onCancel: () => void;
}) {
  const comped = isFuture(s.comp_until);
  return (
    <li className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
      <button type="button" onClick={onOpen} className="min-w-0 text-left">
        <div className="flex flex-wrap items-center gap-2">
          <SubscriptionBadge status={s.status} />
          {comped && <Badge tone="purple">Comped until {formatDate(s.comp_until)}</Badge>}
          <span className="text-sm font-medium text-[var(--color-text-primary)]">
            {s.billing_method === "manual" ? "Invoice" : "PayPal"} · {s.paid_quantity} location{s.paid_quantity === 1 ? "" : "s"} ·{" "}
            {formatMoney(monthlyAmount(s), s.currency)}/mo
          </span>
        </div>
        <div className="mt-1 text-xs text-[var(--color-text-muted)]">
          Started {formatDate(s.created_at)}
          {s.current_period_end ? ` · period ends ${formatDate(s.current_period_end)}` : ""}
          {s.note ? ` · ${s.note}` : ""}
        </div>
      </button>
      <ActionMenu
        label="Subscription actions"
        items={[
          { label: "Open", icon: ExternalLink, onSelect: onOpen },
          { label: "Edit comp / quantity", icon: Pencil, onSelect: onEdit, hidden: !canManage || !s.open },
          {
            label: "Sync with PayPal",
            icon: RefreshCw,
            onSelect: onSync,
            hidden: !canManage || s.billing_method !== "paypal" || !s.provider_subscription_id,
          },
          { label: "Cancel subscription", icon: XCircle, danger: true, onSelect: onCancel, hidden: !canManage || !s.open },
        ]}
      />
    </li>
  );
}

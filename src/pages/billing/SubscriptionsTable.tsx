import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";

import { billingApi, type BillingMethod, type Subscription, type SubscriptionStatus } from "../../api/billing";
import { SubscriptionBadge } from "../../components/StateBadges";
import { DataTable } from "../../components/table/DataTable";
import type { AdminTableFeatures } from "../../components/table/tableConfig";
import { Badge } from "../../components/ui/Badge";
import { Pagination } from "../../components/ui/Pagination";
import { ErrorState } from "../../components/ui/States";
import { useQuery } from "../../hooks/useQuery";
import { formatDate, formatMoney, isFuture } from "../../lib/format";
import { monthlyAmount } from "./prices";

const LIMIT = 20;

export function SubscriptionsTable({
  filters,
  page,
  onPageChange,
  showOrganization = true,
}: {
  filters: { status?: SubscriptionStatus; billing_method?: BillingMethod; organization_id?: string };
  page: number;
  onPageChange: (page: number) => void;
  showOrganization?: boolean;
}) {
  const navigate = useNavigate();
  const query = { ...filters, page, limit: LIMIT };
  const subs = useQuery(`subs:${JSON.stringify(query)}`, (signal) => billingApi.subscriptions(query, signal));

  const columns = useMemo<ColumnDef<AdminTableFeatures, Subscription, unknown>[]>(
    () => [
      ...(showOrganization
        ? [
            {
              id: "organization",
              header: "Organization",
              cell: ({ row }: { row: { original: Subscription } }) => (
                <Link
                  to={`/organizations/${row.original.organization_id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="font-semibold text-[var(--color-primary)] hover:underline"
                >
                  {row.original.organization_name ?? "Organization"}
                </Link>
              ),
            } as ColumnDef<AdminTableFeatures, Subscription, unknown>,
          ]
        : []),
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const s = row.original;
          const comped = isFuture(s.comp_until);
          return (
            <div className="flex flex-wrap items-center gap-1.5">
              <SubscriptionBadge status={s.status} />
              {comped && <Badge tone="purple">Comped</Badge>}
              {s.cancel_at_period_end && s.status !== "cancelled" && <Badge tone="gray">Cancels at period end</Badge>}
            </div>
          );
        },
      },
      {
        id: "method",
        header: "Billing",
        cell: ({ row }) => (row.original.billing_method === "manual" ? "Invoice" : "PayPal"),
      },
      {
        id: "quantity",
        header: "Locations",
        cell: ({ row }) => row.original.paid_quantity,
      },
      {
        id: "amount",
        header: "Per month",
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-[var(--color-text-primary)]">
              {formatMoney(monthlyAmount(row.original), row.original.currency)}
            </div>
            <div className="text-xs text-[var(--color-text-muted)]">
              {row.original.price.first} + {row.original.price.additional} / extra
            </div>
          </div>
        ),
      },
      {
        id: "period",
        header: "Current period ends",
        cell: ({ row }) => formatDate(row.original.current_period_end),
      },
      { id: "created", header: "Started", cell: ({ row }) => formatDate(row.original.created_at) },
    ],
    [showOrganization],
  );

  if (subs.error) return <ErrorState error={subs.error} onRetry={subs.reload} />;

  return (
    <>
      <DataTable
        bare
        data={subs.data?.subscriptions ?? []}
        columns={columns}
        loading={subs.loading}
        enableSorting={false}
        onRowClick={(s) => navigate(`/billing/subscriptions/${s.id}`)}
        emptyMessage="No subscriptions."
      />
      {subs.data && subs.data.total > 0 && (
        <div className="border-t border-[var(--color-border-light)] px-3">
          <Pagination page={page} limit={LIMIT} total={subs.data.total} onPageChange={onPageChange} />
        </div>
      )}
    </>
  );
}

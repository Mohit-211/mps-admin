import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, Ban, Download, HandCoins } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { billingApi, INVOICE_KIND_LABELS, type Invoice, type InvoiceKind, type InvoiceStatus } from "../../api/billing";
import { useAuth } from "../../auth/useAuth";
import { InvoiceBadge } from "../../components/StateBadges";
import { DataTable } from "../../components/table/DataTable";
import type { AdminTableFeatures } from "../../components/table/tableConfig";
import { ActionMenu } from "../../components/ui/ActionMenu";
import { Badge } from "../../components/ui/Badge";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Pagination } from "../../components/ui/Pagination";
import { ErrorState } from "../../components/ui/States";
import { useQuery } from "../../hooks/useQuery";
import { ApiError, downloadFile, errorMessage } from "../../lib/api";
import { formatDate, formatMoney } from "../../lib/format";

export type InvoiceFilters = {
  status?: InvoiceStatus;
  kind?: InvoiceKind;
  organization_id?: string;
  q?: string;
};

const LIMIT = 20;

/** Invoices with PDF download, record payment and void (open invoices, billing.manage). */
export function InvoicesTable({
  filters,
  page,
  onPageChange,
  showOrganization = true,
  emptyMessage = "No invoices.",
}: {
  filters: InvoiceFilters;
  page: number;
  onPageChange: (page: number) => void;
  showOrganization?: boolean;
  emptyMessage?: string;
}) {
  const { can } = useAuth();
  const canManage = can("billing.manage");
  const [dialog, setDialog] = useState<{ kind: "pay" | "void"; invoice: Invoice } | null>(null);

  const query = { ...filters, page, limit: LIMIT };
  const invoices = useQuery(`invoices:${JSON.stringify(query)}`, (signal) => billingApi.invoices(query, signal));

  const replace = (updated: Invoice) => {
    if (!invoices.data) return;
    invoices.setData({
      ...invoices.data,
      invoices: invoices.data.invoices.map((i) => (i.id === updated.id ? { ...i, ...updated } : i)),
    });
  };

  const columns = useMemo<ColumnDef<AdminTableFeatures, Invoice, unknown>[]>(
    () => [
      {
        id: "number",
        header: "Invoice",
        cell: ({ row }) => (
          <div>
            <div className="font-mono text-xs font-semibold text-[var(--color-text-primary)]">{row.original.number}</div>
            <div className="text-xs text-[var(--color-text-muted)]">{INVOICE_KIND_LABELS[row.original.kind] ?? row.original.kind}</div>
          </div>
        ),
      },
      ...(showOrganization
        ? [
            {
              id: "organization",
              header: "Customer",
              cell: ({ row }: { row: { original: Invoice } }) => {
                const i = row.original;
                const label = i.customer?.name || i.customer?.email || "Organization";
                return i.organization_id ? (
                  <Link
                    to={`/organizations/${i.organization_id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="font-medium text-[var(--color-primary)] hover:underline"
                  >
                    {label}
                  </Link>
                ) : (
                  label
                );
              },
            } as ColumnDef<AdminTableFeatures, Invoice, unknown>,
          ]
        : []),
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <div className="flex flex-wrap items-center gap-1.5">
            <InvoiceBadge status={row.original.status} />
            {row.original.mismatch && (
              <span title="PayPal charged a different amount from the invoice.">
                <Badge tone="red">
                  <AlertTriangle size={11} className="mr-1 inline" /> Amount mismatch
                </Badge>
              </span>
            )}
          </div>
        ),
      },
      {
        id: "total",
        header: "Total",
        cell: ({ row }) => {
          const i = row.original;
          return (
            <div>
              <div className="font-semibold text-[var(--color-text-primary)]">{formatMoney(i.total, i.currency)}</div>
              {i.charged_amount !== null && i.charged_amount !== undefined && i.charged_amount !== i.total && (
                <div className="text-xs text-[var(--color-danger)]">charged {formatMoney(i.charged_amount, i.currency)}</div>
              )}
            </div>
          );
        },
      },
      {
        id: "period",
        header: "Period",
        cell: ({ row }) =>
          row.original.period_start ? `${formatDate(row.original.period_start)} – ${formatDate(row.original.period_end)}` : "—",
      },
      { id: "issued", header: "Issued", cell: ({ row }) => formatDate(row.original.issued_at) },
      {
        id: "due",
        header: "Due / paid",
        cell: ({ row }) => {
          const i = row.original;
          if (i.paid_at) return <span title={i.payment_note ?? undefined}>Paid {formatDate(i.paid_at)}</span>;
          return i.due_at ? `Due ${formatDate(i.due_at)}` : "—";
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const i = row.original;
          return (
            <div className="flex justify-end">
              <ActionMenu
                label={`Actions for ${i.number}`}
                items={[
                  {
                    label: "Download PDF",
                    icon: Download,
                    hidden: !i.has_pdf,
                    onSelect: () =>
                      downloadFile(billingApi.invoicePdfPath(i.id), `${i.number}.pdf`).catch((error) =>
                        toast.error(errorMessage(error)),
                      ),
                  },
                  {
                    label: "Record payment",
                    icon: HandCoins,
                    hidden: !canManage || i.status !== "open",
                    onSelect: () => setDialog({ kind: "pay", invoice: i }),
                  },
                  {
                    label: "Void invoice",
                    icon: Ban,
                    danger: true,
                    hidden: !canManage || i.status !== "open",
                    onSelect: () => setDialog({ kind: "void", invoice: i }),
                  },
                ]}
              />
            </div>
          );
        },
      },
    ],
    [canManage, showOrganization],
  );

  const run = async (fn: () => Promise<Invoice>) => {
    try {
      replace(await fn());
    } catch (error) {
      if (error instanceof ApiError && error.reason === "invoice_not_open") {
        invoices.reload();
        throw new Error("This invoice is no longer open. The list was refreshed.");
      }
      throw error;
    }
  };

  if (invoices.error) return <ErrorState error={invoices.error} onRetry={invoices.reload} />;

  return (
    <>
      <DataTable
        bare
        data={invoices.data?.invoices ?? []}
        columns={columns}
        loading={invoices.loading}
        enableSorting={false}
        emptyMessage={emptyMessage}
      />
      {invoices.data && invoices.data.total > 0 && (
        <div className="border-t border-[var(--color-border-light)] px-3">
          <Pagination page={page} limit={LIMIT} total={invoices.data.total} onPageChange={onPageChange} />
        </div>
      )}

      <ConfirmDialog
        open={dialog?.kind === "pay"}
        onClose={() => setDialog(null)}
        title={`Record payment for ${dialog?.invoice.number ?? ""}?`}
        description={
          dialog && (
            <>
              Marks the invoice paid ({formatMoney(dialog.invoice.total, dialog.invoice.currency)}). Note how it was paid,
              e.g. “wire 4411”.
            </>
          )
        }
        confirmLabel="Record payment"
        requireReason
        reasonLabel="Payment note"
        onConfirm={async (note) => {
          if (!dialog) return;
          await run(() => billingApi.recordPayment(dialog.invoice.id, note));
          toast.success(`${dialog.invoice.number} marked paid.`);
        }}
      />
      <ConfirmDialog
        open={dialog?.kind === "void"}
        onClose={() => setDialog(null)}
        title={`Void ${dialog?.invoice.number ?? ""}?`}
        description="The invoice is cancelled and no longer due. An unpaid invoice that made the organization read-only stops counting."
        confirmLabel="Void invoice"
        danger
        requireReason
        reasonLabel="Note"
        onConfirm={async (note) => {
          if (!dialog) return;
          await run(() => billingApi.voidInvoice(dialog.invoice.id, note));
          toast.success(`${dialog.invoice.number} voided.`);
        }}
      />
    </>
  );
}

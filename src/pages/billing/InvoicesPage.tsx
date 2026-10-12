import { Search } from "lucide-react";

import { INVOICE_KIND_LABELS, INVOICE_KINDS, INVOICE_STATUSES, type InvoiceKind, type InvoiceStatus } from "../../api/billing";
import { OrgChip } from "../../components/ui/FilterChip";
import { filterClass } from "../../components/ui/fieldStyles";
import { useUrlSearch, useUrlState } from "../../hooks/useUrlState";
import { humanize } from "../../lib/format";
import { InvoicesTable } from "./InvoicesTable";

export function InvoicesPage() {
  const { get, update, page, setPage } = useUrlState();
  const { search, setSearch, q } = useUrlSearch();
  const status = get("status") as "" | InvoiceStatus;
  const kind = get("kind") as "" | InvoiceKind;
  const organizationId = get("organization_id");

  return (
    <div className="surface overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border-light)] p-4">
        <label className="relative block w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Invoice number, e.g. INV-2026-00"
            className="h-9 w-full rounded-md border border-[var(--color-border)] bg-white pl-9 pr-3 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)]"
          />
        </label>
        <select aria-label="Status" className={filterClass} value={status} onChange={(e) => update({ status: e.target.value || null })}>
          <option value="">Any status</option>
          {INVOICE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {humanize(s)}
            </option>
          ))}
        </select>
        <select aria-label="Kind" className={filterClass} value={kind} onChange={(e) => update({ kind: e.target.value || null })}>
          <option value="">Any kind</option>
          {INVOICE_KINDS.map((k) => (
            <option key={k} value={k}>
              {INVOICE_KIND_LABELS[k]}
            </option>
          ))}
        </select>
        {organizationId && <OrgChip onClear={() => update({ organization_id: null })} />}
      </div>
      <InvoicesTable
        filters={{
          status: status || undefined,
          kind: kind || undefined,
          organization_id: organizationId || undefined,
          q: q || undefined,
        }}
        page={page}
        onPageChange={setPage}
        emptyMessage={q || status || kind || organizationId ? "No invoices match these filters." : "No invoices yet."}
      />
    </div>
  );
}

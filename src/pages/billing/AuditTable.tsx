import { ChevronDown, ChevronRight } from "lucide-react";
import { Fragment, useState } from "react";
import { Link } from "react-router-dom";

import { billingApi, type AuditEntry } from "../../api/billing";
import { Pagination } from "../../components/ui/Pagination";
import { ErrorState } from "../../components/ui/States";
import { useQuery } from "../../hooks/useQuery";
import { formatDateTime } from "../../lib/format";

const LIMIT = 25;

/** The audit log (billing.* and admin.* actions): who, when, before → after. */
export function AuditTable({
  organizationId,
  action,
  page,
  onPageChange,
  showOrganization = true,
}: {
  organizationId?: string;
  action?: string;
  page: number;
  onPageChange: (page: number) => void;
  showOrganization?: boolean;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const query = { organization_id: organizationId, action: action || undefined, page, limit: LIMIT };
  const audit = useQuery(`audit:${JSON.stringify(query)}`, (signal) => billingApi.audit(query, signal));

  if (audit.error) return <ErrorState error={audit.error} onRetry={audit.reload} />;
  const entries = audit.data?.entries ?? [];

  return (
    <div className="relative">
      {audit.loading && entries.length > 0 && (
        <div className="absolute inset-x-0 top-0 z-10 h-0.5 animate-pulse bg-[var(--color-primary)]" />
      )}
      <div className="table-scroll">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead className="bg-[var(--color-surface-muted)] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
            <tr>
              <th className="w-8 px-3 py-3" />
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">By</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3">Note</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-[var(--color-text-muted)]">
                  {audit.loading ? "Loading…" : "No audit entries."}
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <Fragment key={entry.id}>
                  <tr
                    className="cursor-pointer border-b border-[var(--color-border-light)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background)]"
                    onClick={() => setOpen(open === entry.id ? null : entry.id)}
                  >
                    <td className="px-3 py-3 text-[var(--color-text-muted)]">
                      {open === entry.id ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{formatDateTime(entry.at)}</td>
                    <td className="px-4 py-3">
                      <code className="text-xs font-semibold text-[var(--color-text-primary)]">{entry.action}</code>
                    </td>
                    <td className="px-4 py-3">{entry.by.name ?? (entry.by.admin_id ? "Admin" : "System")}</td>
                    <td className="px-4 py-3">
                      <div className="text-xs">{entry.target ?? "—"}</div>
                      {showOrganization && entry.organization_id && (
                        <Link
                          to={`/organizations/${entry.organization_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
                        >
                          {entry.organization_name === null ? "Deleted organization" : (entry.organization_name ?? "Organization")}
                        </Link>
                      )}
                    </td>
                    <td className="max-w-[260px] truncate px-4 py-3" title={entry.note ?? undefined}>
                      {entry.note ?? "—"}
                    </td>
                  </tr>
                  {open === entry.id && (
                    <tr className="border-b border-[var(--color-border-light)] bg-[var(--color-background)]">
                      <td />
                      <td colSpan={5} className="px-4 py-3">
                        <div className="grid gap-3 md:grid-cols-2">
                          <ChangeBlock label="Before" value={entry.before} />
                          <ChangeBlock label="After" value={entry.after} />
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
      {audit.data && audit.data.total > 0 && (
        <div className="border-t border-[var(--color-border-light)] px-3">
          <Pagination page={page} limit={LIMIT} total={audit.data.total} onPageChange={onPageChange} />
        </div>
      )}
    </div>
  );
}

function ChangeBlock({ label, value }: { label: string; value: AuditEntry["before"] }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">{label}</div>
      {value === null || value === undefined ? (
        <p className="text-xs text-[var(--color-text-muted)]">—</p>
      ) : typeof value === "object" ? (
        <pre className="max-h-64 overflow-auto rounded-md bg-white p-2.5 text-[11px] leading-5 text-[var(--color-text-primary)] ring-1 ring-[var(--color-border)]">
          {JSON.stringify(value, null, 2)}
        </pre>
      ) : (
        <p className="break-words text-sm text-[var(--color-text-primary)]">{String(value)}</p>
      )}
    </div>
  );
}

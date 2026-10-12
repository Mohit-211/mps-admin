import { REPORT_STATUSES, REPORT_TYPE_LABELS, REPORT_TYPES, type ReportStatus, type ReportType } from "../../api/reports";
import { OrgChip } from "../../components/ui/FilterChip";
import { filterClass, compactInputClass } from "../../components/ui/fieldStyles";
import { PageHeader } from "../../components/ui/PageHeader";
import { useUrlState } from "../../hooks/useUrlState";
import { fromDateInput, humanize } from "../../lib/format";
import { ReportsTable } from "./ReportsTable";

/** Every customer's generated reports (read-only: admins can't create, email or archive them). */
export function ReportsPage() {
  const { get, update, page, setPage } = useUrlState();
  const type = get("type") as "" | ReportType;
  const status = get("status") as "" | ReportStatus;
  const trigger = get("trigger") as "" | "manual" | "schedule";
  const from = get("from");
  const to = get("to");
  const organizationId = get("organization_id");
  const locationId = get("location_id");

  return (
    <div className="page-container">
      <PageHeader
        title="Reports"
        description="Reports customers generated. Open a failed one to see why it failed. Read-only."
      />
      <div className="surface overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border-light)] p-4">
          <select aria-label="Type" className={filterClass} value={type} onChange={(e) => update({ type: e.target.value || null })}>
            <option value="">Any type</option>
            {REPORT_TYPES.map((t) => (
              <option key={t} value={t}>
                {REPORT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          <select aria-label="Status" className={filterClass} value={status} onChange={(e) => update({ status: e.target.value || null })}>
            <option value="">Any status</option>
            {REPORT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {humanize(s)}
              </option>
            ))}
          </select>
          <select aria-label="Trigger" className={filterClass} value={trigger} onChange={(e) => update({ trigger: e.target.value || null })}>
            <option value="">Manual and scheduled</option>
            <option value="manual">Manual</option>
            <option value="schedule">Scheduled</option>
          </select>
          <label className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
            From
            <input type="date" aria-label="Created from" className={`${compactInputClass} w-auto`} value={from} onChange={(e) => update({ from: e.target.value || null })} />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
            to
            <input type="date" aria-label="Created to" className={`${compactInputClass} w-auto`} value={to} onChange={(e) => update({ to: e.target.value || null })} />
          </label>
          {organizationId && <OrgChip onClear={() => update({ organization_id: null })} />}
          {locationId && <OrgChip label="One location" onClear={() => update({ location_id: null })} />}
        </div>
        <ReportsTable
          filters={{
            type: type || undefined,
            status: status || undefined,
            trigger: trigger || undefined,
            from: from ? (fromDateInput(from) ?? undefined) : undefined,
            to: to ? (fromDateInput(to, true) ?? undefined) : undefined,
            organization_id: organizationId || undefined,
            location_id: locationId || undefined,
          }}
          page={page}
          onPageChange={setPage}
          emptyMessage={type || status || trigger || from || to || organizationId ? "No reports match these filters." : "No reports yet."}
        />
      </div>
    </div>
  );
}

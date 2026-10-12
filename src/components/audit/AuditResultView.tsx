import { Check, Minus, X } from "lucide-react";

import {
  AUDIT_WARNINGS,
  type AuditBusiness,
  type AuditGrid,
  type AuditResult,
  type CheckState,
  type ChecklistItem,
} from "../../api/audits";
import { formatPercent } from "../../lib/format";
import { bucketOf } from "../../lib/rankBuckets";
import { Heatmap } from "../Heatmap";
import { GradeBadge } from "../StateBadges";
import { Notice, Panel } from "../ui/Panel";

const MAX_RANK = 30;

/** Rank display: null = not in the top 30. */
const rankText = (rank: number | null | undefined) => (rank === null || rank === undefined ? `${MAX_RANK}+` : `#${rank}`);

/** The quick-audit result, shared by the sales audit and the free-audit leads (same shape). */
export function AuditResultView({
  business,
  result,
  actions,
  grid,
  warnings,
  attribution,
}: {
  business: AuditBusiness;
  result: AuditResult;
  /** Up to 5, as in the PDF: [] = the profile looks complete; null / missing = not available (not done, or an older backend). */
  actions?: string[] | null;
  grid: AuditGrid;
  warnings: string[];
  attribution: string;
}) {
  const s = result.summary;
  const size = grid?.size ?? 7;
  const middle = Math.floor(size / 2);
  const cells = result.cells.map((c) => ({
    row: c.row,
    col: c.col,
    bucket: bucketOf(c.rank, c.status),
    text: c.status === "error" ? "–" : c.rank === null ? `${MAX_RANK}+` : String(c.rank),
  }));

  return (
    <div className="space-y-5">
      {warnings.length > 0 && (
        <Notice>
          {warnings.map((w) => (
            <div key={w}>{AUDIT_WARNINGS[w] ?? w}</div>
          ))}
        </Notice>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Across the area"
          value={s.area_rank ? `#${s.area_rank}` : "Not ranked"}
          sub={
            result.area
              ? `${result.area.ahead} business${result.area.ahead === 1 ? "" : "es"} rank higher on average`
              : "By average rank over the grid"
          }
          strong
        />
        <Kpi label="At the business" value={rankText(s.center_rank)} sub="Rank at its own address" />
        <Kpi label="Average rank" value={s.avg_rank === null ? "—" : s.avg_rank.toFixed(1)} sub={`Over ${s.points ?? 49} points, 30+ counted as 31`} />
        <Kpi label="Top-3 share" value={formatPercent(s.top3_rate)} sub={`In the top 30 at ${formatPercent(s.found_rate)} of points`} />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <Panel title="Heatmap" description={`${size}×${size} grid within ${grid?.radius_km ?? 5} km · ranks to ${MAX_RANK}`}>
          <div className="p-5">
            <Heatmap size={size} cells={cells} maxRank={MAX_RANK} center={{ row: middle, col: middle }} />
            <p className="mt-2 text-[11px] text-[var(--color-text-muted)]">North is up; the outlined cell is the business.</p>
          </div>
        </Panel>

        <Panel title="Who ranks higher" description="Businesses with a better average rank across the whole grid">
          {!result.higher ? (
            <p className="px-5 py-6 text-sm text-[var(--color-text-muted)]">Names couldn't be loaded for this audit.</p>
          ) : (
            <div className="table-scroll">
              <table className="w-full min-w-[480px] text-sm">
                <thead className="bg-[var(--color-surface-muted)] text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
                  <tr>
                    <th className="px-4 py-2">#</th>
                    <th className="px-4 py-2">Business</th>
                    <th className="px-4 py-2 text-right">Avg rank</th>
                    <th className="px-4 py-2 text-right">Top 3</th>
                  </tr>
                </thead>
                <tbody>
                  {result.higher.map((row, i) => (
                    <tr
                      key={i}
                      className={`border-t border-[var(--color-border-light)] ${row.is_self ? "bg-[var(--color-primary-light)] font-semibold" : ""}`}
                    >
                      <td className="px-4 py-2 text-[var(--color-text-secondary)]">{row.rank ?? "—"}</td>
                      <td className="px-4 py-2">
                        <div className="text-[var(--color-text-primary)]">
                          {row.name ?? "Unnamed"}
                          {row.is_self && " (this business)"}
                        </div>
                        {row.address && <div className="text-xs font-normal text-[var(--color-text-muted)]">{row.address}</div>}
                      </td>
                      <td className="px-4 py-2 text-right text-[var(--color-text-secondary)]">
                        {row.avg_rank === null || row.avg_rank === undefined ? "—" : row.avg_rank.toFixed(1)}
                      </td>
                      <td className="px-4 py-2 text-right text-[var(--color-text-secondary)]">{formatPercent(row.top3_rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="px-4 py-2 text-[11px] text-[var(--color-text-muted)]">{attribution}</p>
            </div>
          )}
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          title="Quick GBP score"
          description="Public profile only: rating, reviews, category, hours, website, phone, description"
          action={business.score && <GradeBadge score={business.score.score} grade={business.score.grade} />}
        >
          {business.checklist?.length ? <Checklist items={business.checklist} /> : <p className="px-5 py-6 text-sm text-[var(--color-text-muted)]">No checklist.</p>}
        </Panel>

        <Panel title="Compared with the area's top 3">
          <Comparison business={business} result={result} />
          <p className="px-4 pb-3 text-[11px] text-[var(--color-text-muted)]">{attribution}</p>
        </Panel>
      </div>

      {actions && (
        <Panel title="What to work on first" description="The same list as in the PDF.">
          {actions.length === 0 ? (
            <p className="px-5 py-4 text-sm text-[var(--color-text-secondary)]">The public profile looks complete. Rankings are the next step.</p>
          ) : (
            <ol className="list-decimal space-y-1.5 py-4 pl-10 pr-5 text-sm text-[var(--color-text-primary)]">
              {actions.map((action, i) => (
                <li key={i}>{action}</li>
              ))}
            </ol>
          )}
        </Panel>
      )}
    </div>
  );
}

function Kpi({ label, value, sub, strong = false }: { label: string; value: string; sub: string; strong?: boolean }) {
  return (
    <div className={`surface p-4 ${strong ? "border-[var(--color-primary)] bg-[var(--color-primary-light)]" : ""}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">{value}</p>
      <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{sub}</p>
    </div>
  );
}

const STATE_ICON: Record<CheckState, { icon: typeof Check; className: string }> = {
  good: { icon: Check, className: "bg-[#e8f5ee] text-[#27855a]" },
  partial: { icon: Minus, className: "bg-[#fbf3df] text-[#a66d16]" },
  missing: { icon: X, className: "bg-[#f9e9e8] text-[#c9302d]" },
};

function Checklist({ items }: { items: ChecklistItem[] }) {
  return (
    <ul className="divide-y divide-[var(--color-border-light)]">
      {items.map((item) => {
        const { icon: Icon, className } = STATE_ICON[item.state] ?? STATE_ICON.missing;
        return (
          <li key={item.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${className}`}>
              <Icon size={13} />
            </span>
            <span className="flex-1 text-[var(--color-text-primary)]">{item.label}</span>
            <span className="text-xs text-[var(--color-text-secondary)]">{item.detail}</span>
          </li>
        );
      })}
    </ul>
  );
}

function Comparison({ business, result }: { business: AuditBusiness; result: AuditResult }) {
  const columns = [
    { name: business.name ?? "This business", self: true, facts: business, score: business.score ?? null, checklist: business.checklist ?? null },
    ...result.competitors.map((c) => ({ name: c.name ?? "Unnamed", self: false, facts: c.facts, score: c.score, checklist: c.checklist })),
  ];
  if (result.competitors.length === 0) {
    return <p className="px-5 py-6 text-sm text-[var(--color-text-muted)]">No competitors to compare.</p>;
  }
  const yes = (v: unknown) => (v ? "Yes" : "No");
  const rows: { label: string; value: (c: (typeof columns)[number]) => string }[] = [
    { label: "Quick score", value: (c) => (c.score ? `${c.score.score} (${c.score.grade})` : "—") },
    { label: "Rating", value: (c) => (c.facts?.rating === null || c.facts?.rating === undefined ? "—" : `${c.facts.rating.toFixed(1)}★`) },
    { label: "Reviews", value: (c) => (c.facts?.user_rating_count ?? "—").toString() },
    { label: "Category", value: (c) => c.facts?.category ?? "—" },
    { label: "Website", value: (c) => (c.facts ? yes(c.facts.website) : "—") },
    { label: "Phone", value: (c) => (c.facts ? yes(c.facts.phone) : "—") },
    { label: "Hours", value: (c) => (c.facts ? yes(c.facts.has_hours) : "—") },
    { label: "Photos", value: (c) => (c.facts?.photo_count === null || c.facts?.photo_count === undefined ? "—" : c.facts.photo_count >= 10 ? "10+" : String(c.facts.photo_count)) },
  ];
  return (
    <div className="table-scroll">
      <table className="w-full min-w-[520px] text-sm">
        <thead className="text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
          <tr>
            <th className="px-4 py-2" />
            {columns.map((c, i) => (
              <th key={i} className={`px-4 py-2 normal-case tracking-normal ${c.self ? "text-[var(--color-primary)]" : "text-[var(--color-text-primary)]"}`}>
                {c.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-[var(--color-border-light)]">
              <td className="px-4 py-2 text-xs font-medium text-[var(--color-text-muted)]">{row.label}</td>
              {columns.map((c, i) => (
                <td key={i} className={`px-4 py-2 ${c.self ? "font-medium text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]"}`}>
                  {row.value(c)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

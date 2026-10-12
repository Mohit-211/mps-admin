import { ChevronRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type StatCardProps = {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: LucideIcon;
  /** The filtered list behind the number. */
  to?: string;
  tone?: "default" | "warning";
};

/** One overview number; links to the list behind it when `to` is set. */
export function StatCard({ label, value, sub, icon: Icon, to, tone = "default" }: StatCardProps) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">{label}</p>
          <div className="mt-2 text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">{value}</div>
        </div>
        {Icon && (
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
              tone === "warning"
                ? "bg-[#fbf3df] text-[#a66d16]"
                : "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
            }`}
          >
            <Icon size={19} strokeWidth={1.8} />
          </div>
        )}
      </div>
      {(sub || to) && (
        <div className="mt-3 flex items-center justify-between gap-2 text-xs text-[var(--color-text-muted)]">
          <span className="min-w-0">{sub}</span>
          {to && <ChevronRight size={15} className="shrink-0 text-[var(--color-text-muted)]" />}
        </div>
      )}
    </>
  );

  if (!to) return <div className="surface p-5">{body}</div>;
  return (
    <Link to={to} className="surface block p-5 transition hover:border-[var(--color-primary)] hover:shadow-sm">
      {body}
    </Link>
  );
}

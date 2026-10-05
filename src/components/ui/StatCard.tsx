import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down";
  icon: LucideIcon;
};

export function StatCard({
  label,
  value,
  change,
  trend,
  icon: Icon,
}: StatCardProps) {
  return (
    <div className="surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
            {value}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)]">
          <Icon size={19} strokeWidth={1.8} />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs">
        <span
          className={
            trend === "up"
              ? "font-semibold text-[var(--color-success)]"
              : "font-semibold text-[var(--color-danger)]"
          }
        >
          {change}
        </span>
        <span className="text-[var(--color-text-muted)]">vs. last month</span>
      </div>
    </div>
  );
}

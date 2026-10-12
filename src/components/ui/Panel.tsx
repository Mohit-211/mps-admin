import type { ReactNode } from "react";

/** A titled card on a detail page. */
export function Panel({
  title,
  children,
  action,
  description,
  className = "",
}: {
  title: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  description?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`surface overflow-hidden ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-light)] px-5 py-3.5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** A label / value list inside a Panel. */
export function DetailList({ children }: { children: ReactNode }) {
  return <dl className="divide-y divide-[var(--color-border-light)] px-5 py-1">{children}</dl>;
}

export function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:gap-4">
      <dt className="w-44 shrink-0 text-xs font-medium text-[var(--color-text-muted)] sm:pt-0.5">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-[var(--color-text-primary)]">{children}</dd>
    </div>
  );
}

/** Muted text for an empty panel. */
export function PanelEmpty({ children }: { children: ReactNode }) {
  return <p className="px-5 py-6 text-sm text-[var(--color-text-muted)]">{children}</p>;
}

/** A yellow or blue note box. */
export function Notice({ tone = "amber", children }: { tone?: "amber" | "blue" | "red"; children: ReactNode }) {
  const styles = {
    amber: "bg-[#fbf3df] text-[#8a5a12]",
    blue: "bg-[#edf3f7] text-[#2c6890]",
    red: "bg-[var(--color-secondary-light)] text-[var(--color-danger)]",
  };
  return <div className={`rounded-md px-3 py-2.5 text-xs leading-5 ${styles[tone]}`}>{children}</div>;
}

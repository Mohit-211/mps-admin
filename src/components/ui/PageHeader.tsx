import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div className="min-w-0">
        <h1 className="page-header__title">{title}</h1>
        {description && <p className="page-header__description">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** "← Organizations": back in history when there is one, else to `to`. */
export function BackLink({ to, label }: { to: string; label: string }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(to))}
      className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
    >
      <ArrowLeft size={16} />
      {label}
    </button>
  );
}

/** Placeholder while a detail page loads. */
export function DetailSkeleton() {
  return (
    <div className="surface space-y-3 p-6">
      <div className="h-6 w-56 animate-pulse rounded bg-[var(--color-surface-muted)]" />
      <div className="h-4 w-72 animate-pulse rounded bg-[var(--color-surface-muted)]" />
      <div className="h-4 w-48 animate-pulse rounded bg-[var(--color-surface-muted)]" />
    </div>
  );
}

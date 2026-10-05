import { Plus, Search } from "lucide-react";
import type { ReactNode } from "react";

type TableToolbarProps = {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  actionLabel?: string;
  onAction?: () => void;
  filters?: ReactNode;
};

export function TableToolbar({
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  actionLabel,
  onAction,
  filters,
}: TableToolbarProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-[var(--color-border-light)] p-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex flex-1 flex-col gap-2 sm:flex-row">
        <label className="relative block min-w-0 sm:max-w-sm sm:flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
          />
          <input
            type="search"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(event) => onSearchChange?.(event.target.value)}
            className="h-9 w-full rounded-md border border-[var(--color-border)] bg-white pl-9 pr-3 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)]"
          />
        </label>

        {filters}
      </div>

      <div className="flex items-center gap-2">
        {actionLabel && (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--color-primary)] px-3.5 text-xs font-semibold text-white hover:bg-[var(--color-primary-hover)]"
          >
            <Plus size={15} />
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

import { X } from "lucide-react";

/** A removable chip for a filter set from a link (e.g. ?organization_id=…). */
export function OrgChip({ onClear, label = "One organization" }: { onClear: () => void; label?: string }) {
  return (
    <span className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[var(--color-primary-light)] pl-3 pr-1.5 text-xs font-medium text-[var(--color-primary)]">
      {label}
      <button
        type="button"
        onClick={onClear}
        className="flex h-6 w-6 items-center justify-center rounded hover:bg-white"
        aria-label="Clear filter"
      >
        <X size={13} />
      </button>
    </span>
  );
}

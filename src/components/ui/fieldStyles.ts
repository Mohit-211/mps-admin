export const inputClass =
  "h-10 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm text-[var(--color-text-primary)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)] disabled:bg-[var(--color-surface-muted)] disabled:text-[var(--color-text-muted)] aria-[invalid=true]:border-[var(--color-danger)]";

export const textareaClass = inputClass.replace("h-10", "min-h-[84px] py-2");

/** A 36px-high input without a width: add one (w-auto, w-32, …). Appending a width to inputClass would clash with its w-full. */
export const compactInputClass = inputClass.replace("h-10 w-full", "h-9");

/** A compact select / input for a table toolbar's filters. */
export const filterClass = `${compactInputClass} w-auto pr-8 text-xs sm:text-sm`;

export const checkboxClass = "h-4 w-4 accent-[var(--color-primary)]";

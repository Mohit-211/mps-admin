export const inputClass =
  "h-10 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-sm text-[var(--color-text-primary)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)] disabled:bg-[var(--color-surface-muted)] disabled:text-[var(--color-text-muted)] aria-[invalid=true]:border-[var(--color-danger)]";

export const textareaClass = inputClass.replace("h-10", "min-h-[84px] py-2");

import { format, formatDistanceToNowStrict } from "date-fns";

/** "Mohit Bhagat" → "MB"; "nia@bakery.com" → "N". */
export function initialsOf(nameOrEmail: string | null | undefined): string {
  if (!nameOrEmail) return "?";
  const base = nameOrEmail.includes("@") ? nameOrEmail.split("@")[0] : nameOrEmail;
  const parts = base.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

/** "Oct 5, 2026"; "—" for empty. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : format(date, "MMM d, yyyy");
}

/** "Oct 5, 2026, 4:12 PM"; "—" for empty. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : format(date, "MMM d, yyyy, h:mm a");
}

/** "Oct 5, 2026, 4:12 PM EDT": with the admin's timezone, for trials and renewals. */
export function formatDateTimeZone(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

/** "$1,234.50 USD". One currency at a time: never add USD and CAD together. */
export function formatMoney(amount: number | null | undefined, currency: string | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "—";
  const value = amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency ? `$${value} ${currency}` : `$${value}`;
}

/** 0.42 → "42%"; "—" for null. */
export function formatPercent(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

/** "in_progress" → "In progress". */
export function humanize(value: string | null | undefined): string {
  if (!value) return "—";
  const text = value.replace(/[_.]+/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** A date input value (YYYY-MM-DD, local) from an ISO string. */
export function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** An ISO string at local midnight from a date input value (YYYY-MM-DD); null for empty. */
export function fromDateInput(value: string, endOfDay = false): string | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  const date = endOfDay ? new Date(y, m - 1, d, 23, 59, 59, 999) : new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** "3 days ago"; `fallback` for empty. */
export function formatRelative(value: string | null | undefined, fallback = "Never"): string {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : `${formatDistanceToNowStrict(date)} ago`;
}

/** "in 3 days" or "3 days ago"; `fallback` for empty. */
export function formatFromNow(value: string | null | undefined, fallback = "—"): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  const distance = formatDistanceToNowStrict(date);
  return date.getTime() > Date.now() ? `in ${distance}` : `${distance} ago`;
}

/** True when the ISO date is still ahead (e.g. a comp or trial end). */
export function isFuture(value: string | null | undefined): boolean {
  if (!value) return false;
  const time = new Date(value).getTime();
  return !Number.isNaN(time) && time > Date.now();
}

/** Today as YYYY-MM-DD (UTC), for file names. */
export function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

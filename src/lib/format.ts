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

/** "3 days ago"; `fallback` for empty. */
export function formatRelative(value: string | null | undefined, fallback = "Never"): string {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : `${formatDistanceToNowStrict(date)} ago`;
}

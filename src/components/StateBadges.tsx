import type { SubscriptionStatus, InvoiceStatus } from "../api/billing";
import { CITATION_STATUS_LABELS, type CitationStatus } from "../api/citations";
import { ORG_STATE_LABELS, type OrgState } from "../api/organizations";
import type { ReportStatus } from "../api/reports";
import { TICKET_STATUS_LABELS, type TicketPriority, type TicketStatus } from "../api/support";
import { humanize } from "../lib/format";
import { Badge, type Tone } from "./ui/Badge";

const ORG_TONES: Record<OrgState, Tone> = {
  trialing: "blue",
  active: "green",
  past_due: "amber",
  inactive: "gray",
  suspended_by_admin: "red",
};

export function OrgStateBadge({ state }: { state: OrgState | string }) {
  return (
    <Badge tone={ORG_TONES[state as OrgState] ?? "gray"}>{ORG_STATE_LABELS[state as OrgState] ?? humanize(state)}</Badge>
  );
}

const SUBSCRIPTION_TONES: Record<SubscriptionStatus, Tone> = {
  approval_pending: "blue",
  active: "green",
  past_due: "amber",
  suspended: "red",
  cancelled: "gray",
  expired: "gray",
};

export function SubscriptionBadge({ status }: { status: SubscriptionStatus | string }) {
  return <Badge tone={SUBSCRIPTION_TONES[status as SubscriptionStatus] ?? "gray"}>{humanize(status)}</Badge>;
}

const INVOICE_TONES: Record<InvoiceStatus, Tone> = { open: "amber", paid: "green", refunded: "purple", void: "gray" };

export function InvoiceBadge({ status }: { status: InvoiceStatus | string }) {
  return <Badge tone={INVOICE_TONES[status as InvoiceStatus] ?? "gray"}>{humanize(status)}</Badge>;
}

const TICKET_TONES: Record<TicketStatus, Tone> = {
  open: "red",
  in_progress: "blue",
  waiting_on_customer: "amber",
  resolved: "green",
  closed: "gray",
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return <Badge tone={TICKET_TONES[status] ?? "gray"}>{TICKET_STATUS_LABELS[status] ?? humanize(status)}</Badge>;
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  if (priority === "normal") return <span className="text-xs text-[var(--color-text-muted)]">Normal</span>;
  return <Badge tone={priority === "high" ? "red" : "gray"}>{humanize(priority)}</Badge>;
}

const REPORT_TONES: Record<ReportStatus, Tone> = {
  queued: "blue",
  generating: "blue",
  ready: "green",
  failed: "red",
  expired: "gray",
  archived: "gray",
};

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  return <Badge tone={REPORT_TONES[status] ?? "gray"}>{humanize(status)}</Badge>;
}

const CITATION_TONES: Record<CitationStatus, Tone> = {
  not_checked: "gray",
  live_correct: "green",
  nap_wrong: "red",
  not_found: "amber",
  duplicate: "purple",
  submitted: "blue",
  pending: "blue",
  removed: "gray",
};

export function CitationStatusBadge({ status }: { status: CitationStatus }) {
  return <Badge tone={CITATION_TONES[status] ?? "gray"}>{CITATION_STATUS_LABELS[status] ?? humanize(status)}</Badge>;
}

const gradeTone = (grade: string): Tone => (grade === "A" || grade === "B" ? "green" : grade === "C" ? "amber" : "red");

/** A grade A–F on its own. */
export function GradeLetter({ grade }: { grade: string }) {
  return <Badge tone={gradeTone(grade)}>{grade}</Badge>;
}

/** A score (Citation Health or quick score) with its grade A–F. */
export function GradeBadge({ score, grade }: { score: number | null | undefined; grade: string | null | undefined }) {
  if (score === null || score === undefined) return <span className="text-[var(--color-text-muted)]">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-semibold text-[var(--color-text-primary)]">{score}</span>
      {grade && <GradeLetter grade={grade} />}
    </span>
  );
}

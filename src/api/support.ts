import { api } from "../lib/api";
import type { OrgType } from "./users";

// Support tickets — docs/ADMIN_PANEL.md §9 (support.read / support.manage).

export type TicketStatus = "open" | "in_progress" | "waiting_on_customer" | "resolved" | "closed";
export type TicketPriority = "low" | "normal" | "high";
export const TICKET_STATUSES: TicketStatus[] = ["open", "in_progress", "waiting_on_customer", "resolved", "closed"];
export const TICKET_PRIORITIES: TicketPriority[] = ["low", "normal", "high"];

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  waiting_on_customer: "Waiting on customer",
  resolved: "Resolved",
  closed: "Closed",
};

export type Ticket = {
  id: string;
  number: string;
  subject: string;
  category: "billing" | "technical" | "account" | "data" | "other" | null;
  status: TicketStatus;
  priority: TicketPriority;
  location_id: string | null;
  messages: number;
  last_message_at: string | null;
  last_message_by: "user" | "team" | null;
  created_at: string;
  closed_at: string | null;
  organization: { id: string; name: string | null; type: OrgType | null };
  created_by: { id: string; email: string | null };
  assigned_to: { id: string; name: string | null; email: string | null } | null;
};

export type TicketMessage = {
  id: string;
  author: { kind: "user" | "admin"; name: string | null; id?: string };
  body: string;
  internal: boolean;
  created_at: string;
};

export type TicketDetail = Ticket & { thread: TicketMessage[] };

export type TicketCounts = Record<TicketStatus, number> & { unassigned_open: number };

export type TicketListQuery = {
  status?: TicketStatus;
  organization_id?: string;
  assigned_to?: string;
  unassigned?: boolean;
  q?: string;
  page?: number;
  limit?: number;
};

export const supportApi = {
  list: (query: TicketListQuery, signal?: AbortSignal) =>
    api<{ tickets: Ticket[]; page: number; limit: number; total: number }>("/admin/support/tickets", { query, signal }),
  counts: (signal?: AbortSignal) => api<TicketCounts>("/admin/support/tickets/counts", { signal }),
  /** Active admins with support.manage, sorted by name: the assignee picker (support.read, so editors can use it). */
  assignees: (signal?: AbortSignal) =>
    api<{ assignees: { id: string; name: string | null; email: string }[] }>("/admin/support/assignees", { signal }),
  get: (ticketId: string, signal?: AbortSignal) => api<TicketDetail>(`/admin/support/tickets/${ticketId}`, { signal }),
  /** A reply emails the customer (shown as "MyPageSEO team"); an internal note doesn't. The first reply assigns you. */
  reply: (ticketId: string, body: { message: string; internal?: boolean }) =>
    api<TicketDetail>(`/admin/support/tickets/${ticketId}/messages`, { method: "POST", body }),
  update: (ticketId: string, body: { status?: TicketStatus; priority?: TicketPriority; assigned_to?: string | null }) =>
    api<Ticket>(`/admin/support/tickets/${ticketId}`, { method: "PATCH", body }),
};

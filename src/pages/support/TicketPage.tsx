import { Lock, Send, StickyNote } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

import {
  supportApi,
  TICKET_PRIORITIES,
  TICKET_STATUS_LABELS,
  TICKET_STATUSES,
  type TicketDetail,
  type TicketMessage,
  type TicketPriority,
  type TicketStatus,
} from "../../api/support";
import { useAuth } from "../../auth/useAuth";
import { OrgLink, UserLink } from "../../components/EntityLinks";
import { PriorityBadge, TicketStatusBadge } from "../../components/StateBadges";
import { Button } from "../../components/ui/Button";
import { Field, FormError } from "../../components/ui/Field";
import { inputClass, textareaClass } from "../../components/ui/fieldStyles";
import { BackLink, DetailSkeleton } from "../../components/ui/PageHeader";
import { Detail, DetailList, Panel } from "../../components/ui/Panel";
import { ErrorState } from "../../components/ui/States";
import { useQuery } from "../../hooks/useQuery";
import { ApiError, errorMessage } from "../../lib/api";
import { formatDateTime, formatRelative, humanize } from "../../lib/format";

export function TicketPage() {
  const { ticketId = "" } = useParams();
  const { admin, can } = useAuth();
  const canManage = can("support.manage");
  const ticket = useQuery(`ticket:${ticketId}`, (signal) => supportApi.get(ticketId, signal));
  // Active admins with support.manage (readable with support.read, so editors can assign colleagues too).
  const team = useQuery("support-assignees", (signal) => supportApi.assignees(signal));

  if (ticket.error) {
    return (
      <div className="page-container">
        <BackLink to="/support" label="Support" />
        <div className="surface">
          <ErrorState error={ticket.error} onRetry={ticket.reload} />
        </div>
      </div>
    );
  }
  const t = ticket.data;
  if (!t) {
    return (
      <div className="page-container">
        <BackLink to="/support" label="Support" />
        <DetailSkeleton />
      </div>
    );
  }

  const update = async (body: { status?: TicketStatus; priority?: TicketPriority; assigned_to?: string | null }, done: string) => {
    try {
      const updated = await supportApi.update(t.id, body);
      ticket.setData({ ...t, ...updated, thread: t.thread });
      toast.success(done);
    } catch (error) {
      if (error instanceof ApiError && error.reason === "not_support_staff") {
        team.reload();
        toast.error("That person can't take support tickets any more. The list was refreshed.");
      } else toast.error(errorMessage(error));
    }
  };

  const supportTeam = team.data?.assignees ?? [];

  return (
    <div className="page-container">
      <BackLink to="/support" label="Support" />

      <div className="mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">{t.subject}</h1>
          <TicketStatusBadge status={t.status} />
          <PriorityBadge priority={t.priority} />
        </div>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          <span className="font-mono">{t.number}</span> · opened {formatDateTime(t.created_at)} by {t.created_by.email ?? "a customer"}
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <section className="surface divide-y divide-[var(--color-border-light)]">
            {t.thread.map((m) => (
              <Message key={m.id} message={m} />
            ))}
          </section>
          {canManage && <ReplyBox ticket={t} onSent={(updated) => ticket.setData(updated)} />}
        </div>

        <div className="space-y-4 self-start">
          <Panel title="Ticket">
            <DetailList>
              <Detail label="Organization">
                <OrgLink id={t.organization.id} className="font-medium">
                  {t.organization.name ?? "Organization"}
                </OrgLink>
                {t.organization.type && <span className="text-xs capitalize text-[var(--color-text-muted)]"> · {t.organization.type}</span>}
              </Detail>
              <Detail label="Customer">
                <UserLink id={t.created_by.id}>{t.created_by.email ?? "User"}</UserLink>
              </Detail>
              <Detail label="Category">{t.category ? humanize(t.category) : "—"}</Detail>
              <Detail label="Last message">
                {formatRelative(t.last_message_at, "—")}
                {t.last_message_by ? ` by ${t.last_message_by === "team" ? "the team" : "the customer"}` : ""}
              </Detail>
              {t.closed_at && <Detail label="Closed">{formatDateTime(t.closed_at)}</Detail>}
            </DetailList>
          </Panel>

          <Panel title="Manage">
            <div className="space-y-4 p-5">
              <Field label="Status" htmlFor="ticket-status">
                <select
                  id="ticket-status"
                  className={inputClass}
                  value={t.status}
                  disabled={!canManage}
                  onChange={(e) => update({ status: e.target.value as TicketStatus }, "Status updated.")}
                >
                  {TICKET_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {TICKET_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Priority" htmlFor="ticket-priority">
                <select
                  id="ticket-priority"
                  className={inputClass}
                  value={t.priority}
                  disabled={!canManage}
                  onChange={(e) => update({ priority: e.target.value as TicketPriority }, "Priority updated.")}
                >
                  {TICKET_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {humanize(p)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Assigned to" htmlFor="ticket-assignee" hint="The first reply assigns the ticket to whoever sends it.">
                {supportTeam.length > 0 ? (
                  <select
                    id="ticket-assignee"
                    className={inputClass}
                    value={t.assigned_to?.id ?? ""}
                    disabled={!canManage}
                    onChange={(e) => update({ assigned_to: e.target.value || null }, "Assignment updated.")}
                  >
                    <option value="">Unassigned</option>
                    {supportTeam.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name || a.email}
                        {a.id === admin?.id ? " (you)" : ""}
                      </option>
                    ))}
                    {t.assigned_to && !supportTeam.some((a) => a.id === t.assigned_to?.id) && (
                      <option value={t.assigned_to.id}>{t.assigned_to.name || t.assigned_to.email}</option>
                    )}
                  </select>
                ) : (
                  <div id="ticket-assignee" className="space-y-2">
                    <p className="text-sm text-[var(--color-text-primary)]">
                      {t.assigned_to ? t.assigned_to.name || t.assigned_to.email : "Unassigned"}
                    </p>
                    {canManage && (
                      <div className="flex flex-wrap gap-2">
                        {t.assigned_to?.id !== admin?.id && (
                          <Button size="sm" variant="secondary" onClick={() => update({ assigned_to: admin?.id ?? null }, "Assigned to you.")}>
                            Assign to me
                          </Button>
                        )}
                        {t.assigned_to && (
                          <Button size="sm" variant="ghost" onClick={() => update({ assigned_to: null }, "Unassigned.")}>
                            Unassign
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </Field>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Message({ message: m }: { message: TicketMessage }) {
  const team = m.author.kind === "admin";
  if (m.internal) {
    return (
      <article className="bg-[#fdf6dc] px-5 py-4">
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 font-semibold text-[#8a5a12]">
            <Lock size={12} /> Internal note, not visible to the customer · {m.author.name ?? "Admin"}
          </span>
          <span className="text-[#a67c2f]">{formatDateTime(m.created_at)}</span>
        </div>
        <p className="whitespace-pre-wrap break-words text-sm text-[#5c4210]">{m.body}</p>
      </article>
    );
  }
  return (
    <article className={`px-5 py-4 ${team ? "bg-[var(--color-primary-light)]/50" : ""}`}>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-[var(--color-text-primary)]">
          {team ? `${m.author.name ?? "Admin"} (shown to the customer as “MyPageSEO team”)` : (m.author.name ?? "Customer")}
        </span>
        <span className="text-[var(--color-text-muted)]">{formatDateTime(m.created_at)}</span>
      </div>
      <p className="whitespace-pre-wrap break-words text-sm text-[var(--color-text-secondary)]">{m.body}</p>
    </article>
  );
}

function ReplyBox({ ticket, onSent }: { ticket: TicketDetail; onSent: (ticket: TicketDetail) => void }) {
  const closed = ticket.status === "closed";
  const [mode, setMode] = useState<"reply" | "note">(closed ? "note" : "reply");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const internal = mode === "note" || closed;

  const send = async () => {
    if (!message.trim()) {
      setError("Write a message first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await supportApi.reply(ticket.id, { message: message.trim(), internal });
      onSent(updated);
      setMessage("");
      toast.success(internal ? "Internal note added." : "Reply sent. The customer was emailed.");
    } catch (e) {
      setError(e instanceof ApiError && e.reason === "ticket_closed" ? "This ticket is closed: reopen it to reply, or add an internal note." : errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`surface overflow-hidden ${internal ? "ring-1 ring-[#e8cf86]" : ""}`}>
      <div className="flex border-b border-[var(--color-border-light)]">
        <button
          type="button"
          disabled={closed}
          onClick={() => setMode("reply")}
          className={`flex-1 px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
            !internal ? "bg-white text-[var(--color-primary)]" : "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]"
          }`}
          title={closed ? "Reopen the ticket to reply to the customer." : undefined}
        >
          Reply to customer
        </button>
        <button
          type="button"
          onClick={() => setMode("note")}
          className={`flex-1 px-4 py-2.5 text-sm font-medium ${
            internal ? "bg-[#fdf6dc] text-[#8a5a12]" : "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]"
          }`}
        >
          Internal note
        </button>
      </div>
      <div className={`space-y-3 p-4 ${internal ? "bg-[#fffbeb]" : ""}`}>
        <FormError message={error} />
        <textarea
          aria-label={internal ? "Internal note" : "Reply"}
          className={`${textareaClass} min-h-[120px]`}
          maxLength={10000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={internal ? "Only the team sees this." : "The customer is emailed this reply."}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[var(--color-text-muted)]">
            {internal
              ? "Internal: never shown to the customer; the status doesn't change."
              : "Sent as “MyPageSEO team”. The status becomes “waiting on customer”."}
          </p>
          <Button onClick={send} loading={busy}>
            {internal ? <StickyNote size={15} /> : <Send size={15} />}
            {internal ? "Add note" : "Send reply"}
          </Button>
        </div>
      </div>
    </section>
  );
}

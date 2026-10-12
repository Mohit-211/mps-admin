import { Building2, Loader2, Play, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { AUDIT_FAILURES, salesAuditApi, type PlaceSuggestion, type SalesAudit } from "../../api/audits";
import { AuditResultView } from "../../components/audit/AuditResultView";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { DownloadButton } from "../../components/ui/DownloadButton";
import { Field, FormError } from "../../components/ui/Field";
import { inputClass } from "../../components/ui/fieldStyles";
import { PageHeader } from "../../components/ui/PageHeader";
import { Notice, Panel } from "../../components/ui/Panel";
import { ErrorState } from "../../components/ui/States";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useQuery } from "../../hooks/useQuery";
import { ApiError, errorMessage } from "../../lib/api";
import { formatDateTime, formatFromNow } from "../../lib/format";

const newSession = () => crypto.randomUUID();
const POLL_MS = 2500;

/**
 * The sales audit: a free audit of any US / CA business during a meeting. Public Google data only; nothing
 * is kept (an audit is deleted on close or after 24 h). 20 audits per rep per 24 h.
 */
export function SalesAuditPage() {
  const [params, setParams] = useSearchParams();
  const auditId = params.get("audit");
  const open = (id: string | null) =>
    setParams((p) => {
      const next = new URLSearchParams(p);
      if (id) next.set("audit", id);
      else next.delete("audit");
      return next;
    });

  return (
    <div className="page-container">
      <PageHeader
        title="Sales audit"
        description="Audit any US or Canadian business in a minute or two, from public Google data. Nothing is saved: an audit is deleted when you close it, or after 24 hours."
      />
      {auditId ? <AuditView auditId={auditId} onClosed={() => open(null)} onBack={() => open(null)} /> : <StartAudit onStarted={(a) => open(a.id)} />}
    </div>
  );
}

// ---- start: business search + keyword ----

function StartAudit({ onStarted }: { onStarted: (audit: SalesAudit) => void }) {
  const [session, setSession] = useState(newSession);
  const [term, setTerm] = useState("");
  const [place, setPlace] = useState<PlaceSuggestion | null>(null);
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useDebouncedValue(term.trim(), 300);
  const suggestions = useQuery(`places:${session}:${input}`, (signal) =>
    !place && input.length >= 2 ? salesAuditApi.autocomplete(input, session, signal) : Promise.resolve(null),
  );
  const openAudits = useQuery("open-audits", (signal) => salesAuditApi.list(signal));

  const start = async () => {
    if (!place) return setError("Choose the business from the suggestions.");
    if (keyword.trim().length < 2) return setError("Enter the keyword a customer would search, e.g. “emergency plumber”.");
    setBusy(true);
    setError(null);
    try {
      const audit = await salesAuditApi.start({ place_id: place.place_id, session, keyword: keyword.trim() });
      setSession(newSession()); // the start ends this autocomplete session
      onStarted(audit);
    } catch (e) {
      const reason = e instanceof ApiError ? e.reason : undefined;
      if (reason === "unsupported_country") setError("Only businesses in the US and Canada can be audited.");
      else if (reason === "no_location") setError("Google has no address for this business, so there's no grid centre.");
      else if (reason === "daily_limit_reached") {
        setError(`Daily limit reached (${String((e as ApiError).data?.limit ?? 20)} audits per 24 hours). ${errorMessage(e)}`);
      } else if (reason === "places_not_configured") setError("Google Places isn't configured on the server.");
      else setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const audits = openAudits.data?.audits ?? [];

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Panel title="New audit">
        <div className="space-y-4 p-5">
          <FormError message={error} />
          <Field label="Business" htmlFor="audit-business" hint="US and Canada only.">
            {place ? (
              <div className="flex items-center justify-between gap-3 rounded-md border border-[var(--color-primary)] bg-[var(--color-primary-light)] px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{place.main_text}</div>
                  <div className="truncate text-xs text-[var(--color-text-secondary)]">{place.secondary_text}</div>
                </div>
                <button
                  type="button"
                  aria-label="Choose another business"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-[var(--color-text-muted)] hover:bg-white"
                  onClick={() => {
                    setPlace(null);
                    setTerm("");
                  }}
                >
                  <X size={15} />
                </button>
              </div>
            ) : (
              <div className="rounded-md border border-[var(--color-border)]">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                  <input
                    id="audit-business"
                    type="search"
                    autoComplete="off"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    placeholder="Business name and city…"
                    className="h-10 w-full rounded-md bg-white pl-9 pr-3 text-sm outline-none"
                    autoFocus
                  />
                </div>
                {input.length >= 2 && (
                  <ul className="max-h-64 overflow-y-auto border-t border-[var(--color-border-light)] py-1">
                    {suggestions.error ? (
                      <li className="px-3 py-2 text-sm text-[var(--color-danger)]">{errorMessage(suggestions.error)}</li>
                    ) : !suggestions.data ? (
                      <li className="px-3 py-2 text-sm text-[var(--color-text-muted)]">Searching…</li>
                    ) : suggestions.data.suggestions.length === 0 ? (
                      <li className="px-3 py-2 text-sm text-[var(--color-text-muted)]">No businesses found.</li>
                    ) : (
                      <>
                        {suggestions.data.suggestions.map((s) => (
                          <li key={s.place_id}>
                            <button
                              type="button"
                              onClick={() => setPlace(s)}
                              className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-[var(--color-surface-muted)]"
                            >
                              <Building2 size={16} className="shrink-0 text-[var(--color-text-muted)]" />
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-medium text-[var(--color-text-primary)]">{s.main_text}</span>
                                <span className="block truncate text-xs text-[var(--color-text-secondary)]">{s.secondary_text}</span>
                              </span>
                            </button>
                          </li>
                        ))}
                        <li className="px-3 pt-1 text-[11px] text-[var(--color-text-muted)]">{suggestions.data.attribution.text}</li>
                      </>
                    )}
                  </ul>
                )}
              </div>
            )}
          </Field>
          <Field label="Keyword" htmlFor="audit-keyword" hint="What a customer types into Google Maps.">
            <input
              id="audit-keyword"
              className={inputClass}
              maxLength={80}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && start()}
              placeholder="e.g. emergency plumber"
            />
          </Field>
          <div className="flex justify-end">
            <Button onClick={start} loading={busy}>
              <Play size={15} /> Run audit
            </Button>
          </div>
        </div>
      </Panel>

      <Panel title="Your open audits" description="Only you can see them. They're deleted after 24 hours.">
        {openAudits.error ? (
          <ErrorState error={openAudits.error} onRetry={openAudits.reload} />
        ) : audits.length === 0 ? (
          <p className="px-5 py-6 text-sm text-[var(--color-text-muted)]">{openAudits.loading ? "Loading…" : "None open."}</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border-light)]">
            {audits.map((a) => (
              <li key={a.id}>
                <button type="button" onClick={() => onStarted(a)} className="w-full px-5 py-3 text-left hover:bg-[var(--color-background)]">
                  <div className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{a.business.name ?? "Business"}</div>
                  <div className="truncate text-xs text-[var(--color-text-secondary)]">
                    “{a.keyword}” · {a.status} · {formatDateTime(a.created_at)}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

// ---- one audit: poll, then the result ----

function AuditView({ auditId, onClosed, onBack }: { auditId: string; onClosed: () => void; onBack: () => void }) {
  const audit = useQuery(`sales-audit:${auditId}`, (signal) => salesAuditApi.get(auditId, signal));
  const [closing, setClosing] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const { reload } = audit;
  const status = audit.data?.status;
  const pending = !status || status === "queued" || status === "running";
  const timer = useRef<number | null>(null);

  // poll every 2–3 s until done / failed; a failed poll (e.g. a network blip) retries more slowly
  const gone = audit.error instanceof ApiError && audit.error.reason === "audit_not_found";
  useEffect(() => {
    if (!pending || gone) return;
    timer.current = window.setTimeout(reload, audit.error ? POLL_MS * 3 : POLL_MS);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [pending, gone, audit.data, audit.error, reload]);

  useEffect(() => {
    if (!pending) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [pending]);

  if ((audit.error && !audit.data) || gone) {
    return (
      <div className="surface">
        {gone ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">This audit is gone</p>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">It was closed, or it expired after 24 hours.</p>
            <Button className="mt-4" variant="secondary" size="sm" onClick={onBack}>
              Start a new audit
            </Button>
          </div>
        ) : (
          <ErrorState error={audit.error} onRetry={reload} />
        )}
      </div>
    );
  }

  const a = audit.data;
  if (!a) {
    return (
      <div className="surface flex items-center justify-center gap-2 px-6 py-14 text-sm text-[var(--color-text-secondary)]">
        <Loader2 size={16} className="animate-spin" /> Loading the audit…
      </div>
    );
  }

  const elapsed = Math.max(0, Math.round((now - new Date(a.created_at).getTime()) / 1000));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold text-[var(--color-text-primary)]">{a.business.name ?? "Business"}</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {a.business.address ?? ""} · “{a.keyword}”
          </p>
          <p className="text-[11px] text-[var(--color-text-muted)]">{a.attribution.text}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={onBack}>
            New audit
          </Button>
          {a.status === "done" && (
            <DownloadButton
              path={salesAuditApi.pdfPath(a.id)}
              filename={`audit-${(a.business.name ?? "business").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`}
              reasons={{ audit_not_ready: "The audit isn't finished yet.", audit_not_found: "This audit was closed or expired." }}
            />
          )}
          <Button variant="secondary" size="sm" className="text-[var(--color-danger)]" onClick={() => setClosing(true)}>
            <X size={15} /> Close audit
          </Button>
        </div>
      </div>

      {pending && (
        <div className="surface p-6">
          <div className="flex items-center gap-3">
            <Loader2 size={20} className="animate-spin text-[var(--color-primary)]" />
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                {a.status === "queued" ? "Queued…" : "Searching Google Maps from 49 points around the business…"}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {elapsed}s so far · it usually takes a minute or two. You can keep talking; this page updates by itself.
              </p>
            </div>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
            <div
              className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-1000"
              style={{ width: `${Math.min(95, a.status === "queued" ? 5 : 10 + (elapsed / 120) * 85)}%` }}
            />
          </div>
          <ol className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-[var(--color-text-secondary)]">
            <li className="font-semibold text-[var(--color-text-primary)]">1. Business details ✓</li>
            <li className={a.status === "running" ? "font-semibold text-[var(--color-text-primary)]" : ""}>2. Ranks at 49 points</li>
            <li>3. Who ranks higher and the quick score</li>
          </ol>
        </div>
      )}

      {a.status === "failed" && (
        <Notice tone="red">
          The audit failed: {AUDIT_FAILURES[a.failure_reason ?? ""] ?? a.failure_reason ?? "unknown reason"}. Close it and start a new one.
        </Notice>
      )}

      {a.status === "done" && a.result && (
        <>
          <AuditResultView business={a.business} result={a.result} actions={a.actions} grid={a.grid} warnings={a.warnings} attribution={a.attribution.text} />
          <p className="text-xs text-[var(--color-text-muted)]">
            Finished {formatDateTime(a.finished_at)} · deleted {formatFromNow(a.expires_at)} unless you close it sooner.
          </p>
        </>
      )}

      <ConfirmDialog
        open={closing}
        onClose={() => setClosing(false)}
        title="Close this audit?"
        description="It's deleted for good: there's no audit history. Download the PDF first if you need it."
        confirmLabel="Close audit"
        danger
        onConfirm={async () => {
          try {
            await salesAuditApi.close(a.id);
          } catch (e) {
            if (!(e instanceof ApiError && e.reason === "audit_not_found")) throw e;
          }
          toast.success("Audit closed.");
          onClosed();
        }}
      />
    </div>
  );
}

import { AlertTriangle, CheckCircle2, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { citationsApi, type DiscoveryRun } from "../../api/citations";
import { useAuth } from "../../auth/useAuth";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { ApiError } from "../../lib/api";
import { DiscoveryRunsContext, errorText, useDiscoveryRuns, type TrackedRun } from "./discoveryRunsContext";

const STORAGE_KEY = "mps_discovery_runs";
const POLL_MS = 4000;
const KEEP_MS = 7 * 86_400_000; // the backend keeps runs 7 days

const pending = (t: TrackedRun) => !t.run || t.run.status === "queued" || t.run.status === "running";

function load(): TrackedRun[] {
  try {
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as TrackedRun[];
    return Array.isArray(list) ? list.filter((t) => Date.now() - new Date(t.started_at).getTime() < KEEP_MS) : [];
  } catch {
    return [];
  }
}

function save(runs: TrackedRun[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
  } catch {
    // storage unavailable: runs are tracked for this page view only
  }
}

/**
 * Directory discovery runs in the background (202 + poll). This keeps polling the admin's own runs, even with
 * the dialog closed, and remembers them across reloads in this browser.
 */
export function DiscoveryRunsProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<TrackedRun[]>(load);
  const [openId, setOpenId] = useState<string | null>(null);
  const [finished, setFinished] = useState(0);
  const runsRef = useRef(runs);

  useEffect(() => {
    runsRef.current = runs;
    save(runs);
  }, [runs]);

  const update = useCallback((runId: string, patch: Partial<TrackedRun>) => {
    setRuns((list) => list.map((t) => (t.run_id === runId ? { ...t, ...patch } : t)));
  }, []);

  const anyPending = runs.some(pending);
  useEffect(() => {
    if (!anyPending) return;
    let cancelled = false;
    const poll = async () => {
      for (const t of runsRef.current.filter(pending)) {
        try {
          const run = await citationsApi.discoveryRun(t.run_id);
          if (cancelled) return;
          update(t.run_id, { run });
          if (run.status === "done" || run.status === "failed") {
            setFinished((n) => n + 1);
            const params = new URLSearchParams(t.filters).toString();
            if (run.status === "done") {
              toast.success(`Directory search done: ${run.created.length} new suggestion${run.created.length === 1 ? "" : "s"}.`, {
                description: t.label,
                action: { label: "Review", onClick: () => navigate(`/citations/suggestions?${params}`) },
              });
            } else {
              toast.error(`Directory search failed: ${errorText(run)}`, { description: t.label });
            }
          }
        } catch (error) {
          // expired or gone: stop tracking it
          if (error instanceof ApiError && error.status === 404) setRuns((list) => list.filter((x) => x.run_id !== t.run_id));
          // other errors (a network blip): try again on the next tick
        }
      }
    };
    const id = window.setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [anyPending, update, navigate]);

  const value = useMemo(
    () => ({
      runs,
      finished,
      track: (run: DiscoveryRun, label: string, filters: Record<string, string>) => {
        setRuns((list) => [{ run_id: run.run_id, label, filters, started_at: run.created_at ?? new Date().toISOString(), run }, ...list]);
        setOpenId(run.run_id);
      },
      open: (runId: string) => setOpenId(runId),
      forget: (runId: string) => setRuns((list) => list.filter((t) => t.run_id !== runId)),
    }),
    [runs, finished],
  );

  const openRun = runs.find((t) => t.run_id === openId) ?? null;

  return (
    <DiscoveryRunsContext.Provider value={value}>
      {children}
      <RunDialog
        tracked={openRun}
        onClose={() => {
          if (openRun && !pending(openRun)) update(openRun.run_id, { seen: true });
          setOpenId(null);
        }}
      />
    </DiscoveryRunsContext.Provider>
  );
}

/** "Search running" / "Search done" chips: reopen a search, even after closing its dialog. */
export function DiscoveryRunChips() {
  const { runs, open, forget } = useDiscoveryRuns();
  const visible = runs.filter((t) => pending(t) || !t.seen);
  if (visible.length === 0) return null;
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {visible.map((t) => {
        const status = t.run?.status;
        const done = status === "done";
        const failed = status === "failed";
        return (
          <span
            key={t.run_id}
            className={`inline-flex h-8 items-center gap-1.5 rounded-full border pl-3 pr-1 text-xs font-medium ${
              failed
                ? "border-[#f0c4c2] bg-[var(--color-secondary-light)] text-[var(--color-danger)]"
                : done
                  ? "border-[#bfe0cd] bg-[#e8f5ee] text-[#27855a]"
                  : "border-[var(--color-border)] bg-white text-[var(--color-text-secondary)]"
            }`}
          >
            <button type="button" onClick={() => open(t.run_id)} className="inline-flex items-center gap-1.5">
              {failed ? <AlertTriangle size={13} /> : done ? <CheckCircle2 size={13} /> : <Loader2 size={13} className="animate-spin" />}
              {failed ? "Search failed" : done ? `Search done: ${t.run?.created.length ?? 0} new` : "Search running"} · {t.label}
            </button>
            {(done || failed) ? (
              <button type="button" aria-label="Dismiss" onClick={() => forget(t.run_id)} className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-white/70">
                <X size={12} />
              </button>
            ) : (
              <span className="w-2" />
            )}
          </span>
        );
      })}
    </div>
  );
}

function RunDialog({ tracked, onClose }: { tracked: TrackedRun | null; onClose: () => void }) {
  const navigate = useNavigate();
  const { can } = useAuth();
  const [now, setNow] = useState(() => Date.now());
  const isPending = !!tracked && pending(tracked);

  useEffect(() => {
    if (!isPending) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [isPending]);

  if (!tracked) return null;
  const run = tracked.run;
  const elapsed = Math.max(0, Math.round((now - new Date(tracked.started_at).getTime()) / 1000));
  const review = () => {
    onClose();
    navigate(`/citations/suggestions?${new URLSearchParams(tracked.filters).toString()}`);
  };

  return (
    <Modal
      open
      size="lg"
      onClose={onClose}
      title="Directory search"
      description={tracked.label}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {isPending ? "Keep searching in the background" : "Close"}
          </Button>
          {run?.status === "done" && <Button onClick={review}>Review suggestions</Button>}
        </>
      }
    >
      {isPending ? (
        <div className="space-y-2 py-2">
          <p className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
            <Loader2 size={16} className="animate-spin text-[var(--color-primary)]" />
            Searching the web… this can take a minute or two.
          </p>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {elapsed}s so far. You can close this: the search keeps running, and a chip on the Citations screens shows when it's done.
          </p>
        </div>
      ) : run?.status === "failed" ? (
        <p className="rounded-md bg-[var(--color-secondary-light)] px-3 py-2.5 text-sm text-[var(--color-danger)]">{errorText(run)}</p>
      ) : run ? (
        <div className="space-y-3">
          <p className="text-sm text-[var(--color-text-primary)]">
            <strong>{run.created.length}</strong> new suggestion{run.created.length === 1 ? "" : "s"}
            {run.skipped_duplicates > 0 && ` (${run.skipped_duplicates} skipped: already on the list or suggested before)`}.
            {can("admins.manage") && <span className="text-xs text-[var(--color-text-muted)]"> Cost ${run.cost_usd.toFixed(4)}.</span>}
          </p>
          {run.created.length > 0 && (
            <ul className="max-h-72 divide-y divide-[var(--color-border-light)] overflow-y-auto rounded-md border border-[var(--color-border)]">
              {run.created.map((s) => (
                <li key={s.id} className="px-3 py-2 text-sm">
                  <span className="font-medium text-[var(--color-text-primary)]">{s.name}</span>{" "}
                  <span className="text-xs text-[var(--color-text-muted)]">{s.domain}</span>
                  {s.why && <div className="text-xs text-[var(--color-text-secondary)]">{s.why}</div>}
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-[var(--color-text-muted)]">Nothing was added yet: accept or dismiss each one in Suggested.</p>
        </div>
      ) : null}
    </Modal>
  );
}

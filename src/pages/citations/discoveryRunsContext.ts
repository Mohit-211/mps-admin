import { createContext, useContext } from "react";

import { DISCOVERY_ERRORS, type DiscoveryRun } from "../../api/citations";

/** A failed run's message: our wording for known codes, else the server's. */
export function errorText(run: DiscoveryRun) {
  return (run.error?.code && DISCOVERY_ERRORS[run.error.code]) || run.error?.message || "The search failed.";
}

/** A discovery search this admin started (the backend has no list of runs, so the panel remembers its own). */
export type TrackedRun = {
  run_id: string;
  /** e.g. "General · CA" or "Danforth Drain Pros". */
  label: string;
  /** The Suggested-list filters that show this search's results. */
  filters: Record<string, string>;
  started_at: string;
  /** The latest poll; missing until the first one answers. */
  run?: DiscoveryRun;
  /** The admin closed the finished chip. */
  seen?: boolean;
};

export type DiscoveryRunsValue = {
  runs: TrackedRun[];
  /** Start tracking (and show) a run that POST …/discover just queued. */
  track: (run: DiscoveryRun, label: string, filters: Record<string, string>) => void;
  open: (runId: string) => void;
  forget: (runId: string) => void;
  /** Goes up whenever a run finishes, so the Suggested list can refresh. */
  finished: number;
};

export const DiscoveryRunsContext = createContext<DiscoveryRunsValue | null>(null);

export function useDiscoveryRuns() {
  const value = useContext(DiscoveryRunsContext);
  if (!value) throw new Error("useDiscoveryRuns must be used inside <DiscoveryRunsProvider>");
  return value;
}

import type { HeatmapBucket } from "../api/reports";

export const BUCKET_STYLES: Record<HeatmapBucket, { bg: string; fg: string; label: string }> = {
  pack: { bg: "#1f8a55", fg: "#ffffff", label: "1–3" },
  visible: { bg: "#7cc49a", fg: "#10351f", label: "4–10" },
  low: { bg: "#f1c75b", fg: "#4a3505", label: "11–20" },
  invisible: { bg: "#ee9a55", fg: "#4a2405", label: "21–60" },
  not_found: { bg: "#d9534f", fg: "#ffffff", label: "60+" },
  error: { bg: "#d5dadb", fg: "#4c5658", label: "Failed" },
};

/** Rank → bucket, as the backend does (ranking/rankCell.ts, salesAudit/compute.ts). */
export function bucketOf(rank: number | null, status: string): HeatmapBucket {
  if (status === "error") return "error";
  if (rank === null) return "not_found";
  if (rank <= 3) return "pack";
  if (rank <= 10) return "visible";
  if (rank <= 20) return "low";
  return "invisible";
}

import type { HeatmapBucket } from "../api/reports";
import { BUCKET_STYLES } from "../lib/rankBuckets";

/** A size × size grid; row 0 is north, col 0 west. */
export function Heatmap({
  size,
  cells,
  maxRank,
  center,
}: {
  size: number;
  cells: { row: number; col: number; text: string; bucket: HeatmapBucket }[];
  maxRank?: number;
  /** Outline the business's own cell. */
  center?: { row: number; col: number };
}) {
  const at = new Map(cells.map((c) => [`${c.row}:${c.col}`, c]));
  const legend: HeatmapBucket[] = ["pack", "visible", "low", "invisible", "not_found"];
  return (
    <div>
      <div className="grid w-full max-w-[420px] gap-1" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
        {Array.from({ length: size * size }, (_, i) => {
          const row = Math.floor(i / size);
          const col = i % size;
          const cell = at.get(`${row}:${col}`);
          const style = cell ? BUCKET_STYLES[cell.bucket] : BUCKET_STYLES.error;
          const isCenter = center && center.row === row && center.col === col;
          return (
            <div
              key={i}
              className={`flex aspect-square items-center justify-center rounded text-[11px] font-bold ${isCenter ? "ring-2 ring-[var(--color-text-primary)] ring-offset-1" : ""}`}
              style={{ background: style.bg, color: style.fg }}
              title={isCenter ? "The business" : undefined}
            >
              {cell?.text ?? "–"}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--color-text-secondary)]">
        {legend.map((bucket) => (
          <span key={bucket} className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: BUCKET_STYLES[bucket].bg }} />
            {bucket === "invisible" && maxRank ? `21–${maxRank}` : bucket === "not_found" && maxRank ? `${maxRank}+` : BUCKET_STYLES[bucket].label}
          </span>
        ))}
      </div>
    </div>
  );
}

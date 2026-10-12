import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { ReportBlock } from "../../api/reports";
import { Heatmap } from "../../components/Heatmap";

/** Renders a report's document blocks: the same blocks the PDF is drawn from. */
export function ReportBlocks({ blocks }: { blocks: ReportBlock[] }) {
  return (
    <div className="space-y-4">
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  );
}

const TONE: Record<string, string> = {
  good: "text-[var(--color-success)]",
  bad: "text-[var(--color-danger)]",
  neutral: "text-[var(--color-text-secondary)]",
};

function Block({ block }: { block: ReportBlock }) {
  switch (block.kind) {
    case "heading":
      return block.level === 1 ? (
        <h2 className="border-b border-[var(--color-border)] pb-2 pt-4 text-lg font-semibold text-[var(--color-text-primary)]">
          {block.text}
        </h2>
      ) : (
        <h3 className="pt-2 text-base font-semibold text-[var(--color-text-primary)]">{block.text}</h3>
      );
    case "paragraph":
      return (
        <p className={`text-sm leading-6 ${block.muted ? "text-[var(--color-text-muted)]" : "text-[var(--color-text-secondary)]"}`}>
          {block.text}
        </p>
      );
    case "kpis":
      return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {block.items.map((item, i) => (
            <div key={i} className="rounded-md border border-[var(--color-border)] px-4 py-3">
              <div className="text-xs font-medium text-[var(--color-text-muted)]">{item.label}</div>
              <div className="mt-1 text-xl font-bold text-[var(--color-text-primary)]">{item.value}</div>
              {item.sub && <div className={`mt-0.5 text-xs ${TONE[item.tone ?? "neutral"]}`}>{item.sub}</div>}
            </div>
          ))}
        </div>
      );
    case "table": {
      const highlight = new Set(block.highlight ?? []);
      return (
        <div className="table-scroll rounded-md border border-[var(--color-border)]">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-[var(--color-surface-muted)] text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
              <tr>
                {block.columns.map((col, i) => (
                  <th key={i} className={`px-3 py-2 ${col.align === "right" ? "text-right" : "text-left"}`}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr
                  key={r}
                  className={`border-t border-[var(--color-border-light)] ${highlight.has(r) ? "bg-[#fbf3df] font-medium" : ""}`}
                >
                  {row.map((cell, c) => (
                    <td
                      key={c}
                      className={`px-3 py-2 text-[var(--color-text-secondary)] ${block.columns[c]?.align === "right" ? "text-right" : ""}`}
                    >
                      {cell ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    case "line_chart":
      return (
        <div className="rounded-md border border-[var(--color-border)] p-4">
          {block.title && <div className="mb-2 text-sm font-medium text-[var(--color-text-primary)]">{block.title}</div>}
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={block.points} margin={{ top: 5, right: 12, bottom: 5, left: 0 }}>
                <CartesianGrid stroke="#e9edee" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#899395" }} tickLine={false} axisLine={false} />
                <YAxis
                  reversed={block.lower_is_better}
                  tick={{ fontSize: 11, fill: "#899395" }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#27424a" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    case "heatmap":
      return (
        <div className="rounded-md border border-[var(--color-border)] p-4">
          {block.title && <div className="mb-3 text-sm font-medium text-[var(--color-text-primary)]">{block.title}</div>}
          <Heatmap size={block.size} cells={block.cells} maxRank={block.max_rank} />
        </div>
      );
    case "list":
      return (
        <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--color-text-secondary)]">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case "quotes":
      return (
        <div className="space-y-2">
          {block.items.map((q, i) => (
            <blockquote key={i} className="border-l-2 border-[var(--color-border)] pl-3 text-sm">
              <p className="text-[var(--color-text-secondary)]">“{q.text}”</p>
              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                {q.link ? (
                  <a href={q.link} target="_blank" rel="noreferrer" className="underline">
                    {q.meta}
                  </a>
                ) : (
                  q.meta
                )}
              </p>
            </blockquote>
          ))}
        </div>
      );
    case "unavailable":
      return (
        <div className="rounded-md border border-dashed border-[var(--color-border)] px-4 py-3">
          {block.title && <div className="text-sm font-medium text-[var(--color-text-primary)]">{block.title}</div>}
          <div className="text-sm text-[var(--color-text-muted)]">{block.message}</div>
        </div>
      );
    case "page_break":
      return <hr className="border-dashed border-[var(--color-border)]" />;
    default:
      return null;
  }
}

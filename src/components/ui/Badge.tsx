import type { ReactNode } from "react";

export type Tone = "green" | "blue" | "red" | "amber" | "gray" | "purple";

const tones: Record<Tone, string> = {
  green: "bg-[#e8f5ee] text-[#27855a]",
  blue: "bg-[#edf3f7] text-[#3478a6]",
  red: "bg-[#f9e9e8] text-[#c9302d]",
  amber: "bg-[#fbf3df] text-[#a66d16]",
  gray: "bg-[#eef0f1] text-[#697477]",
  purple: "bg-[#f1ecf8] text-[#6b4fa3]",
};

/** A small coloured label (states, statuses, kinds). */
export function Badge({ tone = "gray", children, title }: { tone?: Tone; children: ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

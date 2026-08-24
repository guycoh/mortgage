"use client";

// Two small forms that are better as HTML than as canvas.
//
// Under about ten rows, a laid-out bar beats a rendered one: the label is real
// text, it can be selected and read aloud, the value sits beside the bar
// instead of hiding in a tooltip, and it stays sharp at any zoom. Canvas is
// reserved for the three charts that genuinely need it — the activity axis,
// the daily columns and the heat map.

import { motion } from "motion/react";
import { FUNNEL_RAMP, SERIES } from "../lib/tokens";
import { num } from "../lib/labels";
import type { FunnelStage } from "../aggregate";

/* ---------------------------------------------------------------- funnel */

export function Funnel({ stages }: { stages: FunnelStage[] }) {
  const top = stages[0]?.value ?? 0;
  if (!top) {
    return (
      <p className="py-8 text-center text-[12.5px] text-cns-mutedfg">
        אף אחד לא נכנס לבורד בחלון הזה.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-3.5">
      {stages.map((s, i) => {
        const prev = i === 0 ? s.value : stages[i - 1].value;
        // Share of the widest stage drives the bar; share of the PREVIOUS stage
        // is the number that actually means something, so that is the one
        // printed.
        const width = Math.max(2, (s.value / top) * 100);
        const step = prev ? Math.round((s.value / prev) * 100) : 0;
        return (
          <li key={s.key}>
            <div className="mb-1.5 flex items-baseline gap-2">
              <span className="text-[12.5px] text-cns-fg2">{s.label}</span>
              <b className="cns-num ms-auto text-[14px] font-semibold text-cns-fg">
                {num(s.value)}
              </b>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-cns-muted">
              <motion.div
                className="h-full rounded-full"
                style={{ background: FUNNEL_RAMP[Math.min(i, FUNNEL_RAMP.length - 1)] }}
                initial={{ width: 0 }}
                animate={{ width: `${width}%` }}
                transition={{ duration: 0.55, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            {i > 0 ? (
              <div
                className={
                  "mt-1 text-[11.5px] " +
                  (step < 45 ? "font-medium text-cns-warn" : "text-cns-mutedfg")
                }
              >
                <span className="cns-num">{step}%</span> מהשלב הקודם
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/* ----------------------------------------------------------------- ranks */

/**
 * One measure, many named things — so every bar is the SAME colour. Shading
 * them by size would spend the only free channel restating the bar's length.
 */
export function RankBars({
  rows,
  empty,
  color = SERIES.imports,
  unit,
}: {
  rows: { label: string; value: number }[];
  empty: string;
  color?: string;
  unit?: string;
}) {
  if (!rows.length) {
    return <p className="py-8 text-center text-[12.5px] text-cns-mutedfg">{empty}</p>;
  }
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((r, i) => (
        <li key={r.label} className="grid grid-cols-[104px_minmax(0,1fr)_auto] items-center gap-3">
          <span className="truncate text-[12.5px] text-cns-fg2">{r.label}</span>
          <div className="h-2 overflow-hidden rounded-full bg-cns-muted">
            <motion.div
              className="h-full rounded-full"
              style={{ background: color }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(1.5, (r.value / max) * 100)}%` }}
              transition={{ duration: 0.5, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <b className="cns-num min-w-[34px] text-end text-[13px] font-semibold text-cns-fg">
            {num(r.value)}
            {unit ? <em className="ms-0.5 text-[10.5px] not-italic text-cns-mutedfg">{unit}</em> : null}
          </b>
        </li>
      ))}
    </ul>
  );
}

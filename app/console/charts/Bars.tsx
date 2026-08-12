"use client";

// Two small forms that are better as HTML than as canvas.
//
// Under about ten rows, a laid-out bar beats a rendered one: the label is real
// text, it can be selected and read by a screen reader, the value sits beside
// the bar instead of hiding in a tooltip, and it stays sharp at any zoom.
// Canvas is reserved for the three charts that genuinely need it — the
// activity axis, the daily columns and the heat map.

import { motion } from "motion/react";
import { FUNNEL_RAMP, SERIES } from "../lib/tokens";
import { num } from "../lib/labels";
import type { FunnelStage } from "../aggregate";

/* ---------------------------------------------------------------- funnel */

export function Funnel({ stages }: { stages: FunnelStage[] }) {
  const top = stages[0]?.value ?? 0;
  if (!top) {
    return (
      <div className="cns-empty" style={{ padding: "26px 10px" }}>
        <p>אף אחד לא נכנס לבורד בחלון הזה.</p>
      </div>
    );
  }

  return (
    <ol className="cns-funnel">
      {stages.map((s, i) => {
        const prev = i === 0 ? s.value : stages[i - 1].value;
        // Share of the widest stage drives the bar; share of the PREVIOUS
        // stage is the number that actually means something, so that is the
        // one printed.
        const width = Math.max(2, (s.value / top) * 100);
        const step = prev ? Math.round((s.value / prev) * 100) : 0;
        return (
          <li key={s.key}>
            <div className="cns-funnel-head">
              <span>{s.label}</span>
              <b className="num">{num(s.value)}</b>
            </div>
            <div className="cns-funnel-track">
              <motion.div
                className="cns-funnel-fill"
                style={{ background: FUNNEL_RAMP[Math.min(i, FUNNEL_RAMP.length - 1)] }}
                initial={{ width: 0 }}
                animate={{ width: `${width}%` }}
                transition={{ duration: 0.55, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            {i > 0 ? (
              <div className="cns-funnel-step num" data-weak={step < 45 || undefined}>
                {step}% מהשלב הקודם
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
    return (
      <div className="cns-empty" style={{ padding: "26px 10px" }}>
        <p>{empty}</p>
      </div>
    );
  }
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="cns-ranks">
      {rows.map((r, i) => (
        <li key={r.label}>
          <span className="cns-rank-label">{r.label}</span>
          <div className="cns-rank-track">
            <motion.div
              className="cns-rank-fill"
              style={{ background: color }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(1.5, (r.value / max) * 100)}%` }}
              transition={{ duration: 0.5, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <b className="num">
            {num(r.value)}
            {unit ? <em>{unit}</em> : null}
          </b>
        </li>
      ))}
    </ul>
  );
}

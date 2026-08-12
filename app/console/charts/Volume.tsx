"use client";

// Actions per day, split by kind.
//
// The stack is honest here because the four series really are parts of one
// whole — every action the board recorded that day is exactly one of them.
// (Errors are deliberately absent: a failed import is already counted as an
// import, and adding it again would make the columns lie. Failures live on
// their own screen.)
//
// Segments are separated by a 2px gap of the card's own white rather than by
// outlines, so the columns stay light at a glance.

import { useMemo } from "react";
import EChart, { type EChartsCoreOption } from "./EChart";
import type { DayBucket } from "../aggregate";
import { FONT_MONO, FONT_UI, INK, SERIES } from "../lib/tokens";

const DEFS = [
  { key: "entries", label: "כניסות", color: SERIES.entries },
  { key: "imports", label: "ייבואים", color: SERIES.imports },
  { key: "analyses", label: "ניתוחים", color: SERIES.analyses },
  { key: "saves", label: "שמירות", color: SERIES.saves },
] as const;

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

export default function Volume({
  daily,
  hidden,
  height = 232,
}: {
  daily: DayBucket[];
  /** Series the legend has switched off — identity stays with the entity. */
  hidden?: Set<string>;
  height?: number;
}) {
  const option = useMemo<EChartsCoreOption>(() => {
    const shown = DEFS.filter((d) => !hidden?.has(d.key));
    const last = shown.length - 1;

    return {
      animation: true,
      animationDuration: 380,
      grid: { top: 12, right: 8, bottom: 26, left: 8, containLabel: true },
      xAxis: {
        type: "category",
        data: daily.map((d) => d.dm),
        axisLine: { lineStyle: { color: INK.axis } },
        axisTick: { show: false },
        axisLabel: {
          fontFamily: FONT_MONO,
          fontSize: 10,
          color: INK.muted,
          hideOverlap: true,
          margin: 10,
        },
      },
      yAxis: {
        type: "value",
        // Scale on the right, where an RTL reader's eye starts — matching the
        // lane names on the activity axis.
        position: "right",
        minInterval: 1,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: INK.grid } },
        axisLabel: { fontFamily: FONT_MONO, fontSize: 10, color: INK.muted },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow", shadowStyle: { color: "rgba(12,22,34,0.045)" } },
        appendToBody: true,
        backgroundColor: "rgba(255,255,255,0.98)",
        borderColor: "#E3E8F0",
        borderWidth: 1,
        padding: 0,
        extraCssText:
          "box-shadow:0 18px 40px -24px rgba(12,22,34,.45); border-radius:12px; direction:rtl;",
        formatter: (rows: any[]) => {
          if (!rows?.length) return "";
          const total = rows.reduce((s, r) => s + (r.value || 0), 0);
          const lines = rows
            .filter((r) => r.value)
            .map(
              (r) =>
                `<div class="cns-tip-row"><i class="cns-tip-sw" style="background:${r.color}"></i>${esc(r.seriesName)}<b>${r.value}</b></div>`
            )
            .join("");
          return `<div class="cns-tip">
            <div class="cns-tip-h">${esc(rows[0].axisValue)}</div>
            <div class="cns-tip-s">${total} פעולות</div>
            ${lines || '<div class="cns-tip-row">אין פעילות</div>'}
          </div>`;
        },
      },
      series: shown.map((d, i) => ({
        name: d.label,
        type: "bar",
        stack: "all",
        barMaxWidth: 22,
        itemStyle: {
          color: d.color,
          borderColor: "#fff",
          borderWidth: 2,
          // Only the top of the column is rounded — a 4px cap on the data end,
          // square where it meets the baseline.
          borderRadius: i === last ? [4, 4, 0, 0] : 0,
        },
        emphasis: { focus: "series" },
        data: daily.map((row) => (row as any)[d.key] as number),
      })),
    };
  }, [daily, hidden]);

  return <EChart option={option} height={height} />;
}

export const VOLUME_SERIES = DEFS;

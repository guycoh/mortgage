"use client";

// One ECharts canvas, themed once for the whole page.
//
// Every chart on the board draws through this: the same font stack, the same
// axis ink, the same tooltip card, the same easing. A chart module that sets
// its own fonts and greys is how four panels end up looking like four
// libraries. Only what a chart is ABOUT — its series and its axes' meaning —
// is decided by the caller; how it is drawn is decided here.
//
// `group` links panels: charts that share a group share their axis pointer, so
// hovering month 87 on the balance draws the same guide, and the same tooltip
// moment, on the payment and the rate. That is the reason to have four charts
// on one screen rather than one chart with a mode switch — the question is
// always "what does this month look like across all of them".

import { useEffect, useLayoutEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { BarChart, LineChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsCoreOption } from "echarts/core";

echarts.use([LineChart, BarChart, GridComponent, TooltipComponent, CanvasRenderer]);

export const FONT = "'Inter Variable', Assistant, system-ui, sans-serif";
/** Ink for axes and ticks — the page's quietest text step, 4.5:1 on white. */
export const AXIS_INK = "#7c8089";
export const GRID_LINE = "rgba(28, 28, 30, 0.06)";
export const AXIS_LINE = "rgba(28, 28, 30, 0.12)";

/** The page's tooltip card, as ECharts wants it described. */
export const TOOLTIP: Record<string, unknown> = {
  trigger: "axis",
  axisPointer: {
    type: "line",
    lineStyle: { color: "#1c1c1e", width: 1, opacity: 0.35, type: [4, 3] },
    // The label on the axis is the month, restated in the tooltip's head, so
    // it is not drawn twice.
    label: { show: false },
  },
  backgroundColor: "#fff",
  borderColor: "rgba(0,0,0,0.11)",
  borderWidth: 1,
  padding: [8, 11],
  extraCssText:
    "border-radius:10px;box-shadow:0 0.5px 1px rgba(0,0,0,.09),0 2px 6px -2px rgba(0,0,0,.06),0 20px 48px -16px rgba(0,0,0,.28);direction:rtl;",
  textStyle: { color: "#1c1c1e", fontFamily: FONT, fontSize: 12 },
  transitionDuration: 0.12,
  confine: true,
};

export const nis = (n: number) => Math.round(n).toLocaleString("he-IL");
/** Axis-tick money: 1.2M · 850K · 400 — short, because the axis is a ruler. */
export const short = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`
    : n >= 1000
      ? `${Math.round(n / 1000)}K`
      : String(Math.round(n));

/** One row of a tooltip: swatch, name, figure — figures LTR, flush end. */
export const tipRow = (color: string, name: string, value: string, bold = false) =>
  `<div style="display:flex;align-items:center;gap:7px;margin-top:3px">
     <span style="width:8px;height:8px;border-radius:2px;background:${color};flex:none"></span>
     <span style="color:#6e6e73">${name}</span>
     <b dir="ltr" style="margin-inline-start:auto;font-family:${FONT};font-weight:${bold ? 700 : 600}">${value}</b>
   </div>`;
export const tipHead = (title: string, sub?: string) =>
  `<div style="font-weight:700;font-size:12.5px">${title}${sub ? ` <span style="color:#a1a1a6;font-weight:500">· ${sub}</span>` : ""}</div>`;
export const tipFoot = (name: string, value: string) =>
  `<div style="display:flex;gap:10px;margin-top:6px;padding-top:5px;border-top:1px solid rgba(0,0,0,0.06)">
     <span style="color:#6e6e73;font-weight:700">${name}</span>
     <b dir="ltr" style="margin-inline-start:auto;font-family:${FONT}">${value}</b>
   </div>`;

/** The month, said the way an advisor says it: "חודש 87 · שנה 7.3". */
export const monthLabel = (m: number) => ({ title: `חודש ${m}`, sub: `שנה ${(m / 12).toFixed(1)}` });

/** Base axis styling every panel inherits. */
export const axisBase = {
  axisLabel: { color: AXIS_INK, fontSize: 10.5, fontFamily: FONT, margin: 8 },
  axisLine: { show: false },
  axisTick: { show: false },
  splitLine: { lineStyle: { color: GRID_LINE } },
};

/**
 * A month axis with year ticks. Value axis, not category: the ticks then fall
 * on years whatever the term, and every panel in the group shares one scale.
 */
export const yearAxis = (maxMonth: number) => {
  // ~6–8 ticks: every 5 years on a 30-year mix, every 2 on a 12-year one.
  const years = maxMonth / 12;
  const stepYears = years > 24 ? 5 : years > 12 ? 3 : years > 6 ? 2 : 1;
  return {
    type: "value" as const,
    min: 0,
    max: maxMonth,
    interval: stepYears * 12,
    ...axisBase,
    axisLine: { show: true, lineStyle: { color: AXIS_LINE } },
    splitLine: { show: false },
    axisLabel: {
      ...axisBase.axisLabel,
      // The axis ends where the mix does — month 331 — and ECharts labels that
      // end. It is not a year, so it is not said: only the ticks on the step.
      formatter: (v: number) => (v === 0 || v % (stepYears * 12) !== 0 ? "" : `${Math.round(v / 12)}`),
    },
  };
};

export const moneyAxis = () => ({
  type: "value" as const,
  ...axisBase,
  axisLabel: { ...axisBase.axisLabel, formatter: (v: number) => short(v) },
  splitNumber: 4,
});

export default function EChart({
  option,
  group,
  height = 220,
  className = "",
}: {
  option: EChartsCoreOption;
  /** Charts in the same group share their axis pointer. */
  group?: string;
  height?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const c = echarts.init(ref.current, undefined, { renderer: "canvas" });
    chart.current = c;
    if (group) {
      c.group = group;
      echarts.connect(group);
    }
    // The card resizes with the page; the canvas must follow the box, not the
    // window — a 2×2 grid collapsing to one column changes width without any
    // window event.
    const ro = new ResizeObserver(() => c.resize());
    ro.observe(ref.current);
    return () => {
      ro.disconnect();
      c.dispose();
      chart.current = null;
    };
  }, [group]);

  useEffect(() => {
    chart.current?.setOption(
      {
        animationDuration: 600,
        animationDurationUpdate: 360,
        animationEasing: "cubicOut",
        animationEasingUpdate: "cubicOut",
        textStyle: { fontFamily: FONT },
        ...option,
      },
      { notMerge: true, lazyUpdate: true }
    );
  }, [option]);

  return <div ref={ref} dir="ltr" className={className} style={{ height, width: "100%" }} />;
}

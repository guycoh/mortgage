"use client";

// החזר לפי תקופה — the one thing the verdict's single figure cannot show: the
// trade the advisor is actually negotiating.
//
// A monthly payment is one point on a curve, and the conversation with a client
// is a walk along that curve — "at 20 years it's too heavy, at 27 it fits". So
// the curve is drawn: the payment at every term from 5 to 40 years, priced by
// the same שפיצר the hero uses, with the two ceilings laid across it as rules.
// Where the violet line dips under a rule is where the mortgage becomes
// affordable, and that crossing is legible from across the room — no figure has
// to be read to see it.
//
// THE CHART IS A CONTROL. Click anywhere on it and the term snaps there, the
// dot slides, and the hero re-prices — the same idiom as the reverse tool's
// hero being its own input. An advisor answers "so what CAN they afford?" by
// clicking where the curve meets the green line.
//
// Same conventions as ReverseChart, which is the house style for canvases:
// ECharts core-only imports, canvas renderer, he-IL tooltip, quiet axes.

import { useEffect, useMemo, useRef } from "react";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, MarkLineComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { spitzer } from "./ability-math";

echarts.use([LineChart, GridComponent, MarkLineComponent, TooltipComponent, CanvasRenderer]);

const nis = (n: number) => Math.round(n).toLocaleString("he-IL");
const short = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}K` : String(Math.round(n));

const UI = "Inter Variable, Assistant, system-ui";

/** The span the curve is drawn over. Wider than any lender writes on both ends,
 *  so the chosen term is always ON the curve rather than at its edge. */
const MIN_M = 60;
const MAX_M = 480;
const STEP = 12;

export default function AbilityChart({
  principal,
  rate,
  term,
  recommendedCap,
  maxCap,
  onPickTerm,
}: {
  principal: number;
  rate: number;
  /** The chosen term, in months — the dot on the curve. */
  term: number;
  /** The two ceilings; 0 draws the curve with no rules across it. */
  recommendedCap: number;
  maxCap: number;
  /** The click. Snapped to whole years by the chart before it is reported. */
  onPickTerm: (months: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);
  // The click handler closes over stale props unless it reads through a ref.
  const pick = useRef(onPickTerm);
  pick.current = onPickTerm;

  const data = useMemo(() => {
    const months: number[] = [];
    for (let m = MIN_M; m <= MAX_M; m += STEP) months.push(m);
    return {
      months,
      payments: months.map((m) => Math.round(spitzer(principal, rate, m))),
    };
  }, [principal, rate]);

  useEffect(() => {
    if (!ref.current) return;
    const c = (chart.current = echarts.init(ref.current, undefined, { renderer: "canvas" }));
    const onResize = () => c.resize();
    window.addEventListener("resize", onResize);

    // The whole canvas is the control, not just the 4px line. Every click is
    // converted back into a term and snapped to the year grid.
    const zr = c.getZr();
    zr.on("click", (e: { offsetX: number; offsetY: number }) => {
      const xy = c.convertFromPixel({ gridIndex: 0 }, [e.offsetX, e.offsetY]) as number[] | undefined;
      if (!xy) return;
      const idx = Math.round(xy[0]);
      const m = MIN_M + Math.min(Math.max(idx, 0), (MAX_M - MIN_M) / STEP) * STEP;
      pick.current(m);
    });
    zr.setCursorStyle("pointer");

    return () => {
      window.removeEventListener("resize", onResize);
      c.dispose();
      chart.current = null;
    };
  }, []);

  useEffect(() => {
    if (!chart.current) return;
    const { months, payments } = data;
    const idx = Math.max(0, Math.min(months.length - 1, Math.round((term - MIN_M) / STEP)));

    // A rule earns its place only if it lands inside the drawn range — a
    // ceiling at 4× the whole curve would crush it against the x-axis.
    const yMax = Math.max(...payments, maxCap > 0 ? maxCap * 1.15 : 0);
    const rules: object[] = [];
    // The 35% and 40% rules run within 12% of each other, so their labels sit
    // at OPPOSITE ends of the canvas — stacked at one end they print on top of
    // each other whenever the axis is taller than the gap between them.
    if (recommendedCap > 0)
      rules.push({
        yAxis: recommendedCap,
        lineStyle: { color: "#147a45", type: [5, 4], width: 1.4 },
        label: {
          formatter: "תקרה מומלצת",
          position: "insideEndBottom",
          color: "#147a45",
          fontFamily: UI,
          fontSize: 11,
          fontWeight: 600,
        },
      });
    if (maxCap > 0)
      rules.push({
        yAxis: maxCap,
        lineStyle: { color: "#a8511a", type: [5, 4], width: 1.4 },
        label: {
          formatter: "תקרה מקסימלית",
          position: "insideStartTop",
          color: "#a8511a",
          fontFamily: UI,
          fontSize: 11,
          fontWeight: 600,
        },
      });

    chart.current.setOption(
      {
        animationDuration: 500,
        animationEasing: "cubicOut",
        grid: { top: 26, bottom: 4, left: 4, right: 14, containLabel: true },
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "line", lineStyle: { color: "#1c1c1e", width: 1, opacity: 0.35, type: [4, 3] } },
          backgroundColor: "#fff",
          borderColor: "rgba(0,0,0,0.11)",
          borderWidth: 1,
          padding: [8, 11],
          extraCssText:
            "border-radius:10px;box-shadow:0 0.5px 1px rgba(0,0,0,.09),0 2px 6px -2px rgba(0,0,0,.06),0 20px 48px -16px rgba(0,0,0,.28);direction:rtl;",
          textStyle: { color: "#1c1c1e", fontFamily: UI, fontSize: 12 },
          formatter: (p: unknown) => {
            const arr = p as { dataIndex: number; value: number }[];
            if (!arr.length) return "";
            const m = months[arr[0].dataIndex];
            const v = Number(arr[0].value);
            // Which side of the rules this term lands on, said in words — the
            // tooltip is read at pointer speed and a verdict beats a figure.
            const state =
              maxCap > 0 && v > maxCap
                ? `<span style="color:#b42318;font-weight:700">מעל התקרה המקסימלית</span>`
                : recommendedCap > 0 && v > recommendedCap
                  ? `<span style="color:#a8511a;font-weight:700">מעל התקרה המומלצת</span>`
                  : recommendedCap > 0
                    ? `<span style="color:#147a45;font-weight:700">בתוך התקרה המומלצת</span>`
                    : "";
            return (
              `<div style="font-weight:700;font-size:12.5px">${m / 12} שנים <span style="color:#a1a1a6;font-weight:500">· ${m} חודשים</span></div>` +
              `<div style="display:flex;align-items:center;gap:7px;margin-top:3px">
                 <span style="width:8px;height:8px;border-radius:2px;background:#5b54d6;flex:none"></span>
                 <span style="color:#6e6e73">החזר חודשי</span>
                 <b dir="ltr" style="margin-inline-start:auto;font-family:${UI}">₪${nis(v)}</b>
               </div>` +
              (state ? `<div style="margin-top:5px;font-size:11.5px">${state}</div>` : "") +
              `<div style="margin-top:5px;padding-top:5px;border-top:1px solid rgba(0,0,0,0.06);font-size:11px;color:#a1a1a6">לחיצה קובעת את התקופה</div>`
            );
          },
        },
        xAxis: {
          type: "category",
          boundaryGap: false,
          data: months,
          axisLabel: {
            color: "#a1a1a6",
            fontSize: 10,
            fontFamily: UI,
            interval: (i: number) => months[i] % 60 === 0,
            formatter: (v: string) => `${Number(v) / 12} שנ׳`,
          },
          axisLine: { lineStyle: { color: "rgba(0,0,0,0.11)" } },
          axisTick: { show: false },
        },
        yAxis: {
          type: "value",
          max: Math.ceil(yMax / 1000) * 1000,
          axisLabel: { formatter: short, color: "#a1a1a6", fontSize: 10, fontFamily: UI },
          splitLine: { lineStyle: { color: "rgba(0,0,0,0.05)" } },
        },
        series: [
          {
            name: "החזר חודשי",
            type: "line",
            smooth: 0.25,
            showSymbol: false,
            lineStyle: { width: 2.2, color: "#5b54d6" },
            itemStyle: { color: "#5b54d6" },
            emphasis: { disabled: true },
            areaStyle: {
              opacity: 1,
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: "#5b54d62e" },
                { offset: 1, color: "#5b54d605" },
              ]),
            },
            data: payments,
            markLine: { silent: true, symbol: "none", animation: false, data: rules },
          },
          {
            // THE CHOSEN TERM — one dot riding the same curve, drawn as its own
            // series so it can carry a halo without waking symbols on the line.
            name: "התקופה שנבחרה",
            type: "line",
            showSymbol: true,
            symbolSize: 11,
            itemStyle: { color: "#5b54d6", borderColor: "#fff", borderWidth: 2.5 },
            lineStyle: { opacity: 0 },
            emphasis: { disabled: true },
            z: 5,
            data: payments.map((v, i) => (i === idx ? v : null)),
          },
        ],
      },
      true
    );
    chart.current.resize();
  }, [data, term, recommendedCap, maxCap]);

  return <div ref={ref} dir="ltr" className="h-[240px] w-full" />;
}

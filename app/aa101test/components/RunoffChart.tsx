"use client";

// How the mix behaves over its life — balance running off, or the monthly
// payment stepping down as each track finishes. Stacked by track, so the
// colours mean the same thing here as in the grid and the rail.
//
// On ECharts for the axis pointer: the useful question is "what does month 87
// look like across every track at once", and a shared vertical guide with one
// tooltip answers it in a single read.

import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { PATH_LABEL, TRACK_HEX } from "../lib/credit";

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

const nis = (n: number) => Math.round(n).toLocaleString("he-IL");
const short = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}K` : String(Math.round(n));

export type RunoffSeries = { id: number; values: number[] };

export default function RunoffChart({
  months,
  series,
  mode,
}: {
  months: number[];
  series: RunoffSeries[];
  mode: "balance" | "payment";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    chart.current = echarts.init(ref.current, undefined, { renderer: "canvas" });
    const onResize = () => chart.current?.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chart.current?.dispose();
      chart.current = null;
    };
  }, []);

  useEffect(() => {
    if (!chart.current) return;

    chart.current.setOption(
      {
        animationDuration: 700,
        animationEasing: "cubicOut",
        grid: { top: 12, bottom: 4, left: 4, right: 12, containLabel: true },
        tooltip: {
          trigger: "axis",
          axisPointer: {
            type: "line",
            lineStyle: { color: "#1c1c1e", width: 1, opacity: 0.35, type: [4, 3] },
          },
          backgroundColor: "#fff",
          borderColor: "rgba(0,0,0,0.11)",
          borderWidth: 1,
          padding: [8, 11],
          extraCssText:
            "border-radius:10px;box-shadow:0 0.5px 1px rgba(0,0,0,.09),0 2px 6px -2px rgba(0,0,0,.06),0 20px 48px -16px rgba(0,0,0,.28);direction:rtl;",
          textStyle: { color: "#1c1c1e", fontFamily: "Inter Variable, Assistant, system-ui", fontSize: 12 },
          formatter: (p: unknown) => {
            const arr = p as { dataIndex: number; seriesName: string; value: number; color: string }[];
            if (!arr.length) return "";
            const m = months[arr[0].dataIndex];
            const total = arr.reduce((s, x) => s + (Number(x.value) || 0), 0);
            const yrs = (m / 12).toFixed(1);
            const head = `<div style="font-weight:700;font-size:12.5px">חודש ${m} <span style="color:#a1a1a6;font-weight:500">· שנה ${yrs}</span></div>`;
            const lines = arr
              .filter((x) => Number(x.value) > 0)
              .map(
                (x) =>
                  `<div style="display:flex;align-items:center;gap:7px;margin-top:3px">
                     <span style="width:8px;height:8px;border-radius:2px;background:${x.color};flex:none"></span>
                     <span style="color:#6e6e73">${x.seriesName}</span>
                     <b dir="ltr" style="margin-inline-start:auto;font-family:'Inter Variable',Assistant,system-ui">₪${nis(Number(x.value))}</b>
                   </div>`
              )
              .join("");
            const foot = `<div style="display:flex;gap:10px;margin-top:6px;padding-top:5px;border-top:1px solid rgba(0,0,0,0.06)">
                 <span style="color:#6e6e73;font-weight:700">${mode === "balance" ? "יתרה" : "החזר"}</span>
                 <b dir="ltr" style="margin-inline-start:auto;font-family:'Inter Variable',Assistant,system-ui">₪${nis(total)}</b>
               </div>`;
            return head + lines + foot;
          },
        },
        xAxis: {
          type: "category",
          boundaryGap: false,
          data: months,
          axisLabel: {
            color: "#a1a1a6",
            fontSize: 10,
            fontFamily: "Inter Variable, Assistant, system-ui",
            // Roughly eight ticks whatever the term and whatever the sampling
            // step — months are sampled every 1–3, so a modulo on the value
            // itself lands on nothing.
            interval: (i: number) => i % Math.max(1, Math.round(months.length / 8)) === 0,
            formatter: (v: string) => `${Math.round(Number(v) / 12)}שנ׳`,
          },
          axisLine: { lineStyle: { color: "rgba(0,0,0,0.11)" } },
          axisTick: { show: false },
        },
        yAxis: {
          type: "value",
          axisLabel: { formatter: short, color: "#a1a1a6", fontSize: 10, fontFamily: "Inter Variable, Assistant, system-ui" },
          splitLine: { lineStyle: { color: "rgba(0,0,0,0.05)" } },
        },
        series: series.map((s) => ({
          name: PATH_LABEL[s.id],
          type: "line",
          stack: "mix",
          smooth: mode === "balance" ? 0.18 : false,
          step: mode === "payment" ? "end" : undefined,
          showSymbol: false,
          lineStyle: { width: 1.4, color: TRACK_HEX[s.id] },
          itemStyle: { color: TRACK_HEX[s.id] },
          emphasis: { focus: "series", lineStyle: { width: 2.2 } },
          areaStyle: {
            opacity: 1,
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: `${TRACK_HEX[s.id]}96` },
              { offset: 1, color: `${TRACK_HEX[s.id]}12` },
            ]),
          },
          data: s.values,
        })),
      },
      true
    );
    chart.current.resize();
  }, [months, series, mode]);

  return <div ref={ref} dir="ltr" className="h-[244px] w-full" />;
}

"use client";

// מהלך החוב — the one thing a table of 360 rows cannot show: the shape.
//
// Two curves off the same schedules the cards and the modal print, so the
// chart can never disagree with them, and one dashed rule at today's value of
// the property. That rule is the whole point of the picture: a reverse
// mortgage is settled from the house, so where the violet curve passes the
// dashes is where the debt has eaten the asset. No appreciation is assumed
// anywhere — the caption under the chart says so.

import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, MarkLineComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([LineChart, GridComponent, MarkLineComponent, TooltipComponent, CanvasRenderer]);

const nis = (n: number) => Math.round(n).toLocaleString("he-IL");
const short = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}K` : String(Math.round(n));

const UI = "Inter Variable, Assistant, system-ui";

export type ReverseSeries = { name: string; color: string; values: number[] };

export default function ReverseChart({
  months,
  series,
  propertyValue,
}: {
  months: number[];
  series: ReverseSeries[];
  propertyValue: number;
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
        grid: { top: 18, bottom: 4, left: 4, right: 14, containLabel: true },
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
            const arr = p as { dataIndex: number; seriesName: string; value: number; color: string }[];
            if (!arr.length) return "";
            const m = months[arr[0].dataIndex];
            const head = `<div style="font-weight:700;font-size:12.5px">חודש ${m} <span style="color:#a1a1a6;font-weight:500">· שנה ${(m / 12).toFixed(1)}</span></div>`;
            const lines = arr
              .map(
                (x) =>
                  `<div style="display:flex;align-items:center;gap:7px;margin-top:3px">
                     <span style="width:8px;height:8px;border-radius:2px;background:${x.color};flex:none"></span>
                     <span style="color:#6e6e73">${x.seriesName}</span>
                     <b dir="ltr" style="margin-inline-start:auto;font-family:${UI}">₪${nis(Number(x.value))}</b>
                   </div>`
              )
              .join("");
            const gap =
              propertyValue > 0
                ? `<div style="display:flex;gap:10px;margin-top:6px;padding-top:5px;border-top:1px solid rgba(0,0,0,0.06)">
                     <span style="color:#6e6e73;font-weight:700">שווי הנכס</span>
                     <b dir="ltr" style="margin-inline-start:auto;font-family:${UI}">₪${nis(propertyValue)}</b>
                   </div>`
                : "";
            return head + lines + gap;
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
            // Roughly eight ticks whatever the term, and whatever the sampling
            // step — the months array is sampled, so a modulo on the value
            // itself would land on nothing.
            interval: (i: number) => i % Math.max(1, Math.round(months.length / 8)) === 0,
            formatter: (v: string) => `${Math.round(Number(v) / 12)}שנ׳`,
          },
          axisLine: { lineStyle: { color: "rgba(0,0,0,0.11)" } },
          axisTick: { show: false },
        },
        yAxis: {
          type: "value",
          axisLabel: { formatter: short, color: "#a1a1a6", fontSize: 10, fontFamily: UI },
          splitLine: { lineStyle: { color: "rgba(0,0,0,0.05)" } },
        },
        series: series.map((s, i) => ({
          name: s.name,
          type: "line",
          smooth: 0.2,
          showSymbol: false,
          lineStyle: { width: 2, color: s.color },
          itemStyle: { color: s.color },
          emphasis: { focus: "series", lineStyle: { width: 2.8 } },
          areaStyle: {
            opacity: 1,
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: `${s.color}2e` },
              { offset: 1, color: `${s.color}05` },
            ]),
          },
          data: s.values,
          // one rule, carried by the first series so it is drawn once
          markLine:
            i === 0 && propertyValue > 0
              ? {
                  silent: true,
                  symbol: "none",
                  animation: false,
                  label: {
                    formatter: "שווי הנכס",
                    position: "insideEndTop",
                    color: "#5c6068",
                    fontFamily: UI,
                    fontSize: 11,
                    fontWeight: 600,
                  },
                  lineStyle: { type: [5, 4], color: "#7c8089", width: 1.3, opacity: 0.9 },
                  data: [{ yAxis: propertyValue }],
                }
              : undefined,
        })),
      },
      true
    );
    chart.current.resize();
  }, [months, series, propertyValue]);

  return <div ref={ref} dir="ltr" className="h-[286px] w-full" />;
}

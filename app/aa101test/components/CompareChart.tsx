"use client";

// The comparison, drawn.
//
// The table beside this answers "what are the numbers". This answers the
// question people actually have — *which mix is cheaper, on which line, and by
// how much*. So it plots the difference, not the magnitudes: a diverging bar
// per metric, left of the axis when the active mix wins, right when it loses.
// Magnitudes here span 2.8M down to 13k, which no shared axis can show; the
// percentage delta is scale-free and is the thing being decided anyway.
//
// ECharts, tree-shaken to the four modules this needs.

import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { BarChart } from "echarts/charts";
import { GridComponent, TooltipComponent, MarkLineComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([BarChart, GridComponent, TooltipComponent, MarkLineComponent, CanvasRenderer]);

export type DeltaRow = {
  label: string;
  active: number;
  compare: number;
  /** true for עלות לשקל, which is a ratio and not a currency. */
  ratio?: boolean;
};

const nis = (n: number) => Math.round(n).toLocaleString("he-IL");

export default function CompareChart({
  rows,
  activeName,
  compareName,
}: {
  rows: DeltaRow[];
  activeName: string;
  compareName: string;
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

    // Bottom-to-top in ECharts' category axis, so reverse for reading order.
    const data = [...rows].reverse();
    const pct = data.map((r) => (r.compare ? ((r.active - r.compare) / Math.abs(r.compare)) * 100 : 0));

    chart.current.setOption(
      {
        animationDuration: 620,
        animationEasing: "cubicOut",
        grid: { top: 10, bottom: 22, left: 46, right: 46, containLabel: true },
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "shadow", shadowStyle: { color: "rgba(66,56,201,.06)" } },
          backgroundColor: "#fff",
          borderColor: "rgba(0,0,0,0.11)",
          borderWidth: 1,
          padding: [7, 10],
          extraCssText: "border-radius:10px;box-shadow:0 0.5px 1px rgba(0,0,0,.09),0 2px 6px -2px rgba(0,0,0,.06),0 20px 48px -16px rgba(0,0,0,.28);direction:rtl;",
          textStyle: { color: "#1c1c1e", fontFamily: "Inter Variable, Assistant, system-ui", fontSize: 12 },
          formatter: (p: unknown) => {
            const arr = p as { dataIndex: number }[];
            const r = data[arr[0].dataIndex];
            const d = r.active - r.compare;
            const p2 = pct[arr[0].dataIndex];
            const fmt = (v: number) => (r.ratio ? v.toFixed(2) : `₪${nis(v)}`);
            const col = d < 0 ? "#1d7a4c" : d > 0 ? "#b42318" : "#6e6e73";
            const verdict = d < 0 ? "זול יותר" : d > 0 ? "יקר יותר" : "זהה";
            return `<b style="font-size:12.5px">${r.label}</b><br/>
              <span style="color:#6e6e73">${activeName}</span> <b dir="ltr">${fmt(r.active)}</b><br/>
              <span style="color:#6e6e73">${compareName}</span> <b dir="ltr">${fmt(r.compare)}</b><br/>
              <span style="color:${col};font-weight:700">${verdict} ${Math.abs(p2).toFixed(1)}%</span>`;
          },
        },
        xAxis: {
          type: "value",
          axisLabel: {
            formatter: "{value}%",
            color: "#a1a1a6",
            fontSize: 10,
            fontFamily: "Inter Variable, Assistant, system-ui",
          },
          splitLine: { lineStyle: { color: "rgba(0,0,0,0.06)" } },
          axisLine: { show: false },
          axisTick: { show: false },
        },
        yAxis: {
          type: "category",
          data: data.map((r) => r.label),
          axisLabel: { color: "#3a3a3c", fontSize: 11.5, fontFamily: "Inter Variable, Assistant, system-ui", fontWeight: 600 },
          axisLine: { lineStyle: { color: "rgba(0,0,0,0.11)" } },
          axisTick: { show: false },
        },
        series: [
          {
            type: "bar",
            data: pct.map((v) => ({
              value: Number(v.toFixed(2)),
              itemStyle: {
                // cheaper is the win, and cheaper is a negative delta
                color: v < 0 ? "#1d7a4c" : v > 0 ? "#b42318" : "rgba(0,0,0,0.11)",
                borderRadius: v < 0 ? [3, 0, 0, 3] : [0, 3, 3, 0],
              },
              // the label belongs at the bar's OUTER end — at "right" a
              // negative bar's label piles onto the zero line and clips
              label: { position: v < 0 ? "left" : "right" },
            })),
            barWidth: 13,
            label: {
              show: true,
              formatter: (p: { value: number }) => `${p.value > 0 ? "+" : ""}${p.value.toFixed(1)}%`,
              fontSize: 10.5,
              fontFamily: "Inter Variable, Assistant, system-ui",
              fontWeight: 600,
              color: "#6e6e73",
            },
            markLine: {
              silent: true,
              symbol: "none",
              data: [{ xAxis: 0 }],
              lineStyle: { color: "#1c1c1e", width: 1, type: "solid", opacity: 0.55 },
              label: { show: false },
            },
          },
        ],
      },
      true
    );
    chart.current.resize();
  }, [rows, activeName, compareName]);

  return <div ref={ref} dir="ltr" className="h-[268px] w-full" />;
}

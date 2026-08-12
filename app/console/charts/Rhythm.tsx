"use client";

// When the desk is actually busy — the Israeli week across, the clock down.
//
// This is a magnitude question, so it gets one hue running light to dark and a
// legend that shows the scale. Never a rainbow: with a rainbow ramp "more" and
// "less" stop being readable without constantly checking the key.
//
// The grid is trimmed to the hours that ever see traffic, so a panel used
// between 08:00 and 20:00 doesn't spend two thirds of its width on an empty
// night shift.

import { useMemo } from "react";
import EChart, { type EChartsCoreOption } from "./EChart";
import { FONT_MONO, HEAT, INK } from "../lib/tokens";
import { DOW_HE } from "../lib/time";

export default function Rhythm({
  cells,
  height = 210,
}: {
  cells: { dow: number; hour: number; n: number }[];
  height?: number;
}) {
  const option = useMemo<EChartsCoreOption>(() => {
    const live = cells.filter((c) => c.n > 0);
    const loHour = live.length ? Math.max(0, Math.min(...live.map((c) => c.hour)) - 1) : 7;
    const hiHour = live.length ? Math.min(23, Math.max(...live.map((c) => c.hour)) + 1) : 21;
    const hours = Array.from({ length: hiHour - loHour + 1 }, (_, i) => loHour + i);
    const max = Math.max(1, ...cells.map((c) => c.n));

    return {
      animation: false,
      grid: { top: 8, right: 10, bottom: 44, left: 8, containLabel: true },
      xAxis: {
        type: "category",
        data: hours.map((h) => String(h).padStart(2, "0")),
        splitArea: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          fontFamily: FONT_MONO,
          fontSize: 10,
          color: INK.muted,
          interval: hours.length > 14 ? 1 : 0,
        },
      },
      yAxis: {
        type: "category",
        position: "right",
        // Sunday first, reading downward — a category axis starts at the
        // bottom by default, which would print the week upside down.
        inverse: true,
        data: DOW_HE,
        splitArea: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { fontFamily: FONT_MONO, fontSize: 11, color: INK.secondary, margin: 10 },
      },
      visualMap: {
        min: 0,
        max,
        calculable: false,
        orient: "horizontal",
        left: "center",
        bottom: 2,
        itemWidth: 11,
        itemHeight: 88,
        text: [String(max), "0"],
        textStyle: { fontFamily: FONT_MONO, fontSize: 10, color: INK.muted },
        inRange: { color: HEAT as unknown as string[] },
      },
      tooltip: {
        appendToBody: true,
        backgroundColor: "rgba(255,255,255,0.98)",
        borderColor: "#E3E8F0",
        borderWidth: 1,
        padding: 0,
        extraCssText:
          "box-shadow:0 18px 40px -24px rgba(12,22,34,.45); border-radius:12px; direction:rtl;",
        formatter: (p: any) => {
          const [hIdx, dIdx, n] = p.value;
          return `<div class="cns-tip"><div class="cns-tip-h">יום ${DOW_HE[dIdx]} · ${String(hours[hIdx]).padStart(2, "0")}:00</div><div class="cns-tip-row">פעולות<b>${n}</b></div></div>`;
        },
      },
      series: [
        {
          type: "heatmap",
          data: cells
            .filter((c) => c.hour >= loHour && c.hour <= hiHour)
            .map((c) => [c.hour - loHour, c.dow, c.n]),
          itemStyle: {
            borderColor: "#fff",
            borderWidth: 2,
            borderRadius: 3,
          },
          emphasis: {
            itemStyle: { shadowBlur: 8, shadowColor: "rgba(12,22,34,0.25)" },
          },
          progressive: 0,
        },
      ],
    };
  }, [cells]);

  return <EChart option={option} height={height} />;
}

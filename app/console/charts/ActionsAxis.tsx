"use client";

// The main screen's chart: everything anyone DID with the simulator, on a
// clock, one lane per advisor.
//
// Each mark is a single act — a report came in, a mix was saved, a spreadsheet
// went out — and it carries the client's name beside it. That is the whole
// question this panel exists to answer: who is using the tool, on whose file,
// when, and to produce what.
//
// Nothing here is a duration. An import is an instant, so the mark is a tick
// rather than a bar, which also keeps three imports in one afternoon readable
// as three marks instead of one smear. Shape doubles the colour: a tick is a
// report, a diamond is an export, a dot is a saved mix — so the chart still
// reads if it is printed, projected, or seen by someone who does not
// distinguish the hues.
//
// The name only appears when the gap to the same advisor's NEXT act can hold
// it; each point carries that neighbour's timestamp so the renderer can turn
// it into a pixel at whatever zoom the reader has landed on.

import { useMemo } from "react";
import EChart, { type EChartsCoreOption } from "./EChart";
import type { Action, ActionLane } from "../aggregate";
import { ACTION, FONT_MONO, FONT_UI, INK } from "../lib/tokens";
import { bankLabel, KIND_LABEL, ms, nis } from "../lib/labels";
import { stamp, zoned } from "../lib/time";

const LANE_H = 54;
const CHROME = 78;
const LABEL_PX = 5.9;

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

const short = (s: string, n = 18) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

export default function ActionsAxis({
  lanes,
  windowStart,
  windowEnd,
  onPick,
}: {
  lanes: ActionLane[];
  windowStart: number;
  windowEnd: number;
  onPick?: (action: Action) => void;
}) {
  const { option, flat, height } = useMemo(() => {
    const flat: Action[] = [];

    const data = lanes.flatMap((lane, laneIndex) => {
      const asc = [...lane.actions].sort((a, b) => a.ms - b.ms);
      return asc.map((a, i) => {
        const idx = flat.push(a) - 1;
        const skin = ACTION[a.kind];
        return {
          value: [laneIndex, a.ms, idx, asc[i + 1]?.ms ?? null],
          itemStyle: { color: skin.fill },
          shape: skin.shape,
          name: short(a.client || a.lead),
        };
      });
    });

    const height = Math.max(200, lanes.length * LANE_H + CHROME);

    // Open on the last busy stretch, not on the calendar's last week — a
    // quiet weekend would otherwise greet you with an empty chart.
    const latest = flat.length ? Math.max(...flat.map((a) => a.ms)) : windowEnd;
    const focusEnd = Math.min(windowEnd, latest + 6 * 3600_000);
    const focusStart = Math.max(windowStart, focusEnd - 8 * 86_400_000);

    const option: EChartsCoreOption = {
      animation: true,
      animationDuration: 400,
      animationEasing: "cubicOut",
      grid: { top: 10, bottom: 48, left: 16, right: 116, containLabel: false },
      xAxis: {
        type: "time",
        min: windowStart,
        max: windowEnd,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: true, lineStyle: { color: INK.grid } },
        axisLabel: {
          fontFamily: FONT_MONO,
          fontSize: 10.5,
          color: INK.muted,
          hideOverlap: true,
          formatter: (value: number) => {
            const z = zoned(new Date(value).toISOString());
            return z.hm === "00:00" ? z.dm : z.hm;
          },
        },
      },
      yAxis: {
        type: "category",
        position: "right",
        data: lanes.map((l) => l.operator),
        inverse: true,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        splitArea: {
          show: true,
          areaStyle: { color: ["rgba(0,0,0,0)", "rgba(12,22,34,0.022)"] },
        },
        axisLabel: {
          fontFamily: FONT_UI,
          fontSize: 12,
          fontWeight: 500,
          color: INK.secondary,
          margin: 12,
          width: 98,
          overflow: "truncate",
        },
      },
      dataZoom: [
        {
          type: "inside",
          filterMode: "weakFilter",
          startValue: focusStart,
          endValue: focusEnd,
          zoomOnMouseWheel: "shift",
          moveOnMouseWheel: false,
        },
        {
          type: "slider",
          filterMode: "weakFilter",
          startValue: focusStart,
          endValue: focusEnd,
          height: 20,
          bottom: 10,
          left: 16,
          right: 116,
          borderColor: "transparent",
          backgroundColor: "#F3F6FA",
          fillerColor: "rgba(31,99,214,0.09)",
          handleStyle: { color: "#fff", borderColor: "#C3CDDA", borderWidth: 1 },
          moveHandleStyle: { color: "#DCE4EE" },
          dataBackground: { lineStyle: { opacity: 0 }, areaStyle: { opacity: 0 } },
          selectedDataBackground: { lineStyle: { opacity: 0 }, areaStyle: { opacity: 0 } },
          labelFormatter: (value: number) => zoned(new Date(value).toISOString()).dm,
          textStyle: { fontFamily: FONT_MONO, fontSize: 10, color: INK.muted },
          brushSelect: false,
        },
      ],
      tooltip: {
        trigger: "item",
        appendToBody: true,
        backgroundColor: "rgba(255,255,255,0.98)",
        borderColor: "#E3E8F0",
        borderWidth: 1,
        padding: 0,
        extraCssText:
          "box-shadow:0 18px 40px -24px rgba(12,22,34,.45); border-radius:12px; direction:rtl;",
        formatter: (p: any) => {
          const a = flat[p.value?.[2]];
          if (!a) return "";
          const skin = ACTION[a.kind];
          const rows: string[] = [];
          const row = (k: string, v: string) =>
            rows.push(`<div class="cns-tip-row">${esc(k)}<b>${esc(v)}</b></div>`);

          if (a.client) row("לקוח בדוח", a.client);
          if (a.docKind) row("סוג", KIND_LABEL[a.docKind] ?? a.docKind);
          if (a.bank) row("בנק", bankLabel(a.bank));
          if (a.pages) row("עמודים", String(a.pages));
          if (a.rows) row("שורות שנקראו", String(a.rows));
          if (a.balance) row("יתרה", nis(a.balance));
          if (a.parseMs) row("פענוח", ms(a.parseMs));
          if (a.error) row("שגיאה", a.error);

          return `<div class="cns-tip">
            <div class="cns-tip-h">${esc(a.lead)}</div>
            <div class="cns-tip-s">${esc(a.operator)} · ${stamp(a.ts)}</div>
            <div class="cns-tip-row"><i class="cns-tip-sw" style="background:${skin.fill}"></i>${esc(skin.label)}</div>
            ${rows.join("")}
          </div>`;
        },
      },
      series: [
        {
          type: "custom",
          clip: true,
          encode: { x: 1, y: 0, tooltip: [1] },
          data,
          renderItem: (params: any, api: any) => {
            const laneIndex = api.value(0);
            const at = api.coord([api.value(1), laneIndex]);
            const cs = params.coordSys;
            if (at[0] < cs.x - 12 || at[0] > cs.x + cs.width + 12) return null;

            const band = api.size([0, 1])[1];
            const h = Math.min(20, Math.max(13, band * 0.34));
            const item = data[params.dataIndex];
            const color = item.itemStyle.color;
            const cx = at[0];
            const cy = at[1];

            const children: any[] = [
              // A generous invisible target: the visible marks are 5–11px and
              // no pointer should have to be that accurate.
              {
                type: "rect",
                shape: { x: cx - 10, y: cy - h / 2 - 5, width: 20, height: h + 10 },
                style: { fill: "transparent" },
              },
            ];

            if (item.shape === "diamond") {
              const r = h * 0.42;
              children.push({
                type: "polygon",
                shape: {
                  points: [
                    [cx, cy - r],
                    [cx + r, cy],
                    [cx, cy + r],
                    [cx - r, cy],
                  ],
                },
                style: { fill: color, stroke: "#fff", lineWidth: 1.2 },
                emphasis: { style: { shadowBlur: 10, shadowColor: "rgba(12,22,34,0.3)" } },
              });
            } else if (item.shape === "dot") {
              children.push({
                type: "circle",
                shape: { cx, cy, r: h * 0.3 },
                style: { fill: color, stroke: "#fff", lineWidth: 1.2 },
                emphasis: { style: { shadowBlur: 10, shadowColor: "rgba(12,22,34,0.3)" } },
              });
            } else {
              const w = 4.5;
              children.push({
                type: "rect",
                shape: { x: cx - w / 2, y: cy - h / 2, width: w, height: h, r: 2 },
                style: { fill: color, stroke: "#fff", lineWidth: 1 },
                emphasis: { style: { shadowBlur: 10, shadowColor: "rgba(12,22,34,0.3)" } },
              });
            }

            const text = String(item.name ?? "");
            const textW = text.length * LABEL_PX;
            const nextTs = api.value(3);
            const nextX = nextTs == null ? cs.x + cs.width : api.coord([nextTs, laneIndex])[0];
            const room = nextX - cx;
            if (room > textW + 26 && cx + textW + 16 < cs.x + cs.width) {
              children.push({
                type: "text",
                silent: true,
                style: {
                  x: cx + 9,
                  y: cy,
                  text,
                  fill: INK.secondary,
                  font: `400 11px ${FONT_UI}`,
                  align: "left",
                  verticalAlign: "middle",
                },
              });
            }

            return { type: "group", children };
          },
        },
      ],
    };

    return { option, flat, height };
  }, [lanes, windowStart, windowEnd]);

  return (
    <EChart
      option={option}
      height={height}
      onEvents={{
        click: (p: any) => {
          const a = flat[p?.value?.[2]];
          if (a) onPick?.(a);
        },
      }}
    />
  );
}

"use client";

// ציר הפעילות — the console's centrepiece.
//
// One lane per advisor, time running left to right, and every sitting drawn
// between the moment it opened and the moment it ended. The client's name
// travels with the mark, so a single glance answers all three questions at
// once: WHO was working, for WHICH client, and WHEN.
//
// Colour is the fourth answer — how far the sitting got. That is a progression
// (opened → imported a report → saved a mix), so it is drawn as one hue
// getting darker rather than as a set of unrelated colours: the ordering
// survives colour blindness, and the legend still names every step.
//
// THE HARD PART is scale. A sitting lasts minutes; a window is weeks. Drawn
// literally, every visit is a sub-pixel sliver. So the mark has a floor — it
// degrades into a pill rather than vanishing — and the name moves OUTSIDE it
// when it no longer fits inside. Whether there is room for that name depends
// on when the next sitting in the same lane starts, which is why each point
// carries its neighbour's timestamp: the renderer converts it to a pixel at
// the current zoom and only draws the label when the gap can actually hold it.
// Zoom in and the pills grow into real spans with the names inside them.

import { useMemo } from "react";
import EChart, { type EChartsCoreOption } from "./EChart";
import type { Lane, Visit } from "../aggregate";
import { FONT_MONO, FONT_UI, INK, OUTCOME } from "../lib/tokens";
import { duration } from "../lib/labels";
import { stamp, zoned } from "../lib/time";

const LANE_H = 52;
const CHROME = 76; // axis band + zoom slider
const LABEL_PX = 5.9; // rough advance width of one Hebrew glyph at 11px

function clip(
  r: { x: number; y: number; width: number; height: number },
  c: { x: number; y: number; width: number; height: number }
) {
  const x1 = Math.max(r.x, c.x);
  const y1 = Math.max(r.y, c.y);
  const x2 = Math.min(r.x + r.width, c.x + c.width);
  const y2 = Math.min(r.y + r.height, c.y + c.height);
  if (x2 <= x1 || y2 <= y1) return null;
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

const short = (s: string, n = 20) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

export default function ActivityAxis({
  lanes,
  windowStart,
  windowEnd,
  onPick,
}: {
  lanes: Lane[];
  windowStart: number;
  windowEnd: number;
  onPick?: (visit: Visit) => void;
}) {
  const { option, flat, height } = useMemo(() => {
    const flat: Visit[] = [];

    const data = lanes.flatMap((lane, laneIndex) => {
      // Oldest first, so "the next sitting" is the following element.
      const asc = [...lane.visits].sort((a, b) => a.startMs - b.startMs);
      return asc.map((v, i) => {
        const idx = flat.push(v) - 1;
        const skin = OUTCOME[v.outcome];
        return {
          value: [
            laneIndex,
            v.startMs,
            Math.max(v.endMs, v.startMs),
            idx,
            asc[i + 1]?.startMs ?? null,
          ],
          itemStyle: { color: skin.fill },
          textColor: skin.on,
          name: short(v.clients[0] || v.lead),
        };
      });
    });

    const height = Math.max(210, lanes.length * LANE_H + CHROME);

    // Open on the last stretch rather than the whole window. Across a month
    // the marks pile into unreadable clumps; across a working week each one
    // gets room for its client's name, and the slider carries you back.
    //
    // Anchored to the last thing that actually happened, not to the clock —
    // opening on a quiet weekend would show an empty chart on a busy month.
    const latest = flat.length ? Math.max(...flat.map((v) => v.endMs)) : windowEnd;
    const focusEnd = Math.min(windowEnd, latest + 6 * 3600_000);
    const focusStart = Math.max(windowStart, focusEnd - 8 * 86_400_000);

    const option: EChartsCoreOption = {
      animation: true,
      animationDuration: 420,
      animationEasing: "cubicOut",
      grid: { top: 8, bottom: 48, left: 16, right: 116, containLabel: false },
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
          // ECharts would otherwise print "Aug" here; the panel speaks in
          // day/month everywhere else and should not switch languages.
          formatter: (value: number) => {
            const z = zoned(new Date(value).toISOString());
            return z.hm === "00:00" ? z.dm : z.hm;
          },
        },
      },
      yAxis: {
        type: "category",
        // Hebrew reads right to left, so the lane names belong on the right
        // edge where the eye starts.
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
          const v = flat[p.value?.[3]];
          if (!v) return "";
          const skin = OUTCOME[v.outcome];
          const client = v.clients[0];
          const steps = v.trail
            .map(
              (t) =>
                `<span class="cns-tip-step"${t.ok ? "" : ' data-bad=""'}>${esc(t.label)}</span>`
            )
            .join("");
          return `<div class="cns-tip">
            <div class="cns-tip-h">${esc(v.lead)}</div>
            <div class="cns-tip-s">${esc(v.operator)} · ${stamp(v.start)}–${zoned(v.end).hm} · ${esc(duration(v.minutes))}</div>
            ${client ? `<div class="cns-tip-row">לקוח בדוח<b>${esc(client)}</b></div>` : ""}
            <div class="cns-tip-row"><i class="cns-tip-sw" style="background:${skin.fill}"></i>${esc(skin.label)}</div>
            <div class="cns-tip-trail">${steps}</div>
          </div>`;
        },
      },
      series: [
        {
          type: "custom",
          clip: true,
          encode: { x: [1, 2], y: 0, tooltip: [1, 2] },
          data,
          renderItem: (params: any, api: any) => {
            const laneIndex = api.value(0);
            const head = api.coord([api.value(1), laneIndex]);
            const tail = api.coord([api.value(2), laneIndex]);
            const band = api.size([0, 1])[1];
            const h = Math.min(22, Math.max(14, band * 0.4));

            const cs = params.coordSys;
            // A tick, not a bubble. Ten minutes is a sliver at any zoom a
            // month-wide axis allows, so the floor is a narrow bar — wide
            // enough to see and to colour, narrow enough that three sittings
            // on one afternoon stay three marks instead of one blob. Zoom in
            // and the same mark grows into the real span.
            const MIN_W = 5;
            const width = Math.max(tail[0] - head[0], MIN_W);
            const box = clip(
              { x: head[0], y: head[1] - h / 2, width, height: h },
              { x: cs.x, y: cs.y, width: cs.width, height: cs.height }
            );
            if (!box) return null;

            const item = data[params.dataIndex];
            const text = String(item?.name ?? "");
            const textW = text.length * LABEL_PX;

            const children: any[] = [
              // An invisible pad so a 5px tick still has a pointer target a
              // hand can actually land on.
              {
                type: "rect",
                shape: {
                  x: box.x - Math.max(0, (18 - box.width) / 2),
                  y: box.y - 5,
                  width: Math.max(box.width, 18),
                  height: box.height + 10,
                },
                style: { fill: "transparent" },
              },
              {
                type: "rect",
                // Rounding follows the mark: a tick gets a soft corner, a
                // full span becomes a capsule.
                shape: { ...box, r: Math.min(h / 2, box.width / 2) },
                style: api.style(),
                emphasis: {
                  style: { shadowBlur: 12, shadowColor: "rgba(12,22,34,0.3)" },
                },
              },
            ];

            if (box.width > textW + 18) {
              // Zoomed in far enough that the sitting is a real span — the
              // name belongs inside it.
              children.push({
                type: "text",
                silent: true,
                style: {
                  x: box.x + box.width / 2,
                  y: box.y + h / 2,
                  text,
                  fill: item.textColor,
                  font: `500 11px ${FONT_UI}`,
                  align: "center",
                  verticalAlign: "middle",
                },
              });
            } else {
              // Zoomed out: the mark is a pill, so the name trails it — but
              // only while the gap to this lane's next sitting can hold it.
              const nextTs = api.value(4);
              const nextX =
                nextTs == null ? cs.x + cs.width : api.coord([nextTs, laneIndex])[0];
              const room = nextX - (box.x + box.width);
              if (room > textW + 24 && box.x + box.width + textW + 10 < cs.x + cs.width) {
                children.push({
                  type: "text",
                  silent: true,
                  style: {
                    x: box.x + box.width + 5,
                    y: box.y + h / 2,
                    text,
                    fill: INK.secondary,
                    font: `400 11px ${FONT_UI}`,
                    align: "left",
                    verticalAlign: "middle",
                  },
                });
              }
            }

            return { type: "group", children };
          },
          // A hairline of the card's own white, so two marks that touch in
          // time still read as two.
          itemStyle: { borderColor: "#fff", borderWidth: 1 },
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
          const v = flat[p?.value?.[3]];
          if (v) onPick?.(v);
        },
      }}
    />
  );
}

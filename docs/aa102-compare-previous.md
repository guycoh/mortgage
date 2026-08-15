# השוואת תמהילים — the previous design, kept

The comparison card was rebuilt on 2026-08-14. This file holds the version that
came before it, verbatim, because the old one may still be wanted.

**What it was.** A two-pane card split `lg:grid-cols-2`: a four-column table
(שדה / active / compare / הפרש) on one half, and an ECharts diverging bar chart
of the percentage delta per metric on the other, with a one-line verdict above
the chart. The card header carried the caption
`ערך שלילי = התמהיל הנוכחי זול יותר`, and the mix picker that drove the whole
thing lived in the page masthead.

**Why it was replaced.** The same row's shekel difference and percentage
difference sat in two coordinate spaces about 600px apart, so reading one line
meant finding its label twice. The replacement folds the magnitude into each row
(scaled by percentage, capped at 180px), states the verdict as a sentence, drops
the sign-convention legend, marks סכום המשכנתא and סך הקרן as scale rather than
cost so they carry no verdict colour, and moves the picker into this card's own
header.

**How to get it back.**

```bash
git show f9f54fe:app/aa102test/components/Compare.tsx      > app/aa102test/components/Compare.tsx
git show f9f54fe:app/aa102test/components/CompareChart.tsx > app/aa102test/components/CompareChart.tsx
```

`f9f54fe` is the commit before the rebuild. Restoring both files is not enough on
its own — the current `Compare` takes `control` and `onDuplicate` props and
renders its own `lgr-card` shell, while the old one rendered only the card's
BODY and expected `Simulator` to wrap it in a `<section className="lgr-card">`
with a `<header className="lgr-head">`. See `Simulator.tsx` at that same commit
for the wrapper, and drop the `control` / `onDuplicate` props at the call site.
The `.lgr-cmp-*` rules in `theme.css` belong to the new one and can stay; they
match nothing in the old markup.

The two files follow in full, so this document stands on its own if the history
is ever rewritten or the repo is exported.

---

## `app/aa102test/components/Compare.tsx`

```tsx
"use client";

// Head-to-head between the active mix and one other: the numbers on the right,
// the verdict on the left. Every row is a cost, so a NEGATIVE difference (the
// active mix costs less) is the good outcome and reads green; a positive one
// reads red. עלות לשקל is a ratio, not a currency.

import dynamic from "next/dynamic";
import {
  calculateMixFullTotals,
  type MixFullTotals,
} from "@/app/private/crm/leads/simulators/components/calculate/mixScheduleCalculators";
import Money from "./Money";
import type { DeltaRow } from "./CompareChart";
import { owedOnly, type ImportedLoan } from "../lib/credit";

// ECharts is a canvas library with no server render — load it in the browser only.
const CompareChart = dynamic(() => import("./CompareChart"), {
  ssr: false,
  loading: () => <div className="lgr-skel m-3 h-[268px]" />,
});

type Mix = { id: string; mix_name: string; loans?: ImportedLoan[] };

const ROWS = [
  { label: "סכום המשכנתא", field: "originalLoanAmount" },
  { label: "סך הקרן", field: "totalPrincipal" },
  { label: "סך הריבית", field: "totalInterest" },
  { label: "תשלום ראשון", field: "firstPayment" },
  { label: "תשלום השיא", field: "maxPayment" },
  { label: "עלות כוללת", field: "totalPayment" },
  { label: "עלות לשקל", field: "costPerShekel" },
] as const;

const ratio = (v: number) => (isFinite(v) ? v.toFixed(2) : "0.00");

export default function Compare({
  activeMixId,
  compareMixId,
  mixes,
  annualInflation = 0,
}: {
  activeMixId: string | null;
  compareMixId: string | null;
  mixes: Mix[];
  annualInflation?: number;
}) {
  const activeMix = mixes.find((m) => m.id === activeMixId);
  const compareMix = compareMixId ? mixes.find((m) => m.id === compareMixId) : null;

  if (!activeMix) return <div className="lgr-empty">בחרו תמהיל להצגה.</div>;
  if (!owedOnly(activeMix.loans ?? []).length)
    return <div className="lgr-empty">אין נתונים להצגה עבור התמהיל הנוכחי — הזינו סכומים או גררו דוח.</div>;

  // The client's own debts on both sides. A guarantee is somebody else's loan,
  // so counting it here would make one mix look dearer than another purely
  // because a spouse's cousin borrowed money. See isSurety in lib/credit.
  const active: MixFullTotals = calculateMixFullTotals(owedOnly(activeMix.loans ?? []), annualInflation);
  const otherRows = compareMix ? owedOnly(compareMix.loans ?? []) : [];
  const other: MixFullTotals | null = otherRows.length
    ? calculateMixFullTotals(otherRows, annualInflation)
    : null;

  const valueOf = (t: MixFullTotals | null, field: string) => {
    if (!t) return 0;
    if (field === "costPerShekel")
      return t.originalLoanAmount ? t.totalPayment / t.originalLoanAmount : 0;
    return (t[field as keyof MixFullTotals] as number) || 0;
  };

  const deltas: DeltaRow[] = ROWS.map((r) => ({
    label: r.label,
    active: valueOf(active, r.field),
    compare: valueOf(other, r.field),
    ratio: r.field === "costPerShekel",
  }));

  // one-line verdict, on the metric that decides a mortgage: total cost
  const totalDiff = valueOf(active, "totalPayment") - valueOf(other, "totalPayment");

  return (
    <div className="grid lg:grid-cols-2">
      {/* ---------------------------------------------------------- numbers */}
      <div className="lgr-scroll overflow-x-auto">
        <table className="lgr-table w-full table-fixed">
          <colgroup>
            <col style={{ width: "31%" }} />
            <col style={{ width: "23%" }} />
            <col style={{ width: "23%" }} />
            <col style={{ width: "23%" }} />
          </colgroup>
          <thead>
            <tr>
              <th>שדה</th>
              <th className="truncate">{activeMix.mix_name}</th>
              <th className="truncate">{compareMix?.mix_name ?? "—"}</th>
              <th>הפרש</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              const isRatio = row.field === "costPerShekel";
              const a = valueOf(active, row.field);
              const b = valueOf(other, row.field);
              // Round before judging. Two mixes with an identical principal
              // still differ by a float epsilon, which rendered as a red "+₪0".
              const diff = isRatio ? a - b : Math.round(a) - Math.round(b);
              // cheaper is better, so a negative difference is the win
              const color = !other || diff === 0 ? "var(--lgr-4)" : diff < 0 ? "var(--pos)" : "var(--neg)";

              return (
                <tr key={row.field} className="lgr-row">
                  <td className="text-[12.5px] font-bold" style={{ color: "var(--lgr-2)" }}>
                    {row.label}
                  </td>
                  <td>
                    {isRatio ? (
                      <span className="lgr-money lgr-money-block font-bold">{ratio(a)}</span>
                    ) : (
                      <Money value={a} weight={700} />
                    )}
                  </td>
                  <td>
                    {!other ? (
                      <span className="lgr-calc" data-muted="true">
                        —
                      </span>
                    ) : isRatio ? (
                      <span className="lgr-money lgr-money-block" style={{ color: "var(--lgr-3)" }}>
                        {ratio(b)}
                      </span>
                    ) : (
                      <Money value={b} color="var(--lgr-3)" />
                    )}
                  </td>
                  <td>
                    {!other ? (
                      <span className="lgr-calc" data-muted="true">
                        —
                      </span>
                    ) : isRatio ? (
                      <span className="lgr-money lgr-money-block font-bold" style={{ color }}>
                        {diff > 0 ? "+" : diff < 0 ? "−" : ""}
                        {ratio(Math.abs(diff))}
                      </span>
                    ) : (
                      <Money value={diff} sign weight={700} color={color} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ----------------------------------------------------------- verdict */}
      <div className="border-t lg:border-s lg:border-t-0" style={{ borderColor: "var(--line)" }}>
        {other && compareMix ? (
          <>
            <div
              className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b px-3.5 py-2.5"
              style={{ borderColor: "var(--line)" }}
            >
              <span className="lgr-display text-[15px]">
                {totalDiff < 0 ? "התמהיל הנוכחי זול יותר" : totalDiff > 0 ? "התמהיל הנוכחי יקר יותר" : "עלות זהה"}
              </span>
              {totalDiff !== 0 && (
                <Money
                  value={Math.abs(totalDiff)}
                  block={false}
                  weight={700}
                  size={15}
                  color={totalDiff < 0 ? "var(--pos)" : "var(--neg)"}
                />
              )}
              <span className="ms-auto text-[10.5px]" style={{ color: "var(--lgr-4)" }}>
                לאורך כל חיי ההלוואה, מול {compareMix.mix_name}
              </span>
            </div>
            <CompareChart rows={deltas} activeName={activeMix.mix_name} compareName={compareMix.mix_name} />
          </>
        ) : (
          <div className="lgr-empty h-full">
            בחרו תמהיל להשוואה בסרגל העליון —
            <br />
            כאן יופיע ההפרש באחוזים, שורה מול שורה.
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## `app/aa102test/components/CompareChart.tsx`

```tsx
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
```

"use client";

// How the mix behaves over its life — four reads of one timeline.
//
//   · יתרת החוב        the balance running off, stacked by track
//   · החזר חודשי       the payment, stacked by track, stepping as tracks end
//   · ריבית ממוצעת     the balance-weighted rate — what the mix costs per year
//                      as the cheap tracks pay off and the dear ones remain
//   · חלוקת התשלום     each year's payments, split into principal, linkage
//                      and interest — how much of the money is buying equity
//
// Every series comes from calculateLoan's own schedule, so the charts and the
// grid can never disagree about the maths. The master shows only the payment:
// what the client pays today and how it moves is the master's one question;
// the other three describe a proposal, and belong to it.
//
// One card, panels ruled off by hairlines — not four cards. The three
// month-based panels share an axis pointer (see EChart's `group`), so a hover
// on any of them draws the same month on all three.

import { useMemo, type ReactNode } from "react";
import dynamic from "next/dynamic";
import type { EChartsCoreOption } from "echarts/core";
import Money from "./Money";
import { PATH_LABEL, TRACK_HEX, type ImportedLoan } from "../lib/credit";
import { buildMixLine, buildTimeline, type MixLine, type Timeline, type TrackSeries } from "../lib/timeline";
import { asEcon, type Assume } from "../lib/price";
import { HORIZON, inflationAt, nominalAt, type Forecast } from "../lib/forecast";
import {
  TOOLTIP,
  axisBase,
  monthLabel,
  moneyAxis,
  nis,
  tipFoot,
  tipHead,
  tipRow,
  yearAxis,
} from "./EChart";

// ECharts is canvas-only — browser render, no SSR pass.
const EChart = dynamic(() => import("./EChart"), {
  ssr: false,
  loading: () => <div className="lgr-skel h-[220px] w-full" />,
});

/** The three parts of a payment — a violet, its tint, and the warm cost. */
const SPLIT = {
  principal: { key: "principal", label: "תשלום קרן", color: "#5b54d6" },
  indexation: { key: "indexation", label: "תשלום הצמדה", color: "#9d97f0" },
  interest: { key: "interest", label: "תשלום ריבית", color: "#e07b39" },
} as const;

/* ------------------------------------------------------------ the options */

// ECharts 6: the labels are kept inside the grid's own rect (what
// `containLabel: true` used to mean) — the axis figures never spill past the
// panel's padding whatever their width.
const GRID = { top: 14, bottom: 26, left: 8, right: 14, outerBoundsMode: "same" as const, outerBoundsContain: "axisLabel" as const };

/** Stacked-by-track areas — the balance (smooth) or the payment (stepped). */
export function stackedOption(series: TrackSeries[], maxMonth: number, kind: "balance" | "payment"): EChartsCoreOption {
  return {
    grid: GRID,
    tooltip: {
      ...TOOLTIP,
      formatter: (p: unknown) => {
        const arr = p as { seriesName: string; value: [number, number]; color: string }[];
        if (!arr.length) return "";
        const m = arr[0].value[0];
        const { title, sub } = monthLabel(m);
        const live = arr.filter((x) => Number(x.value[1]) > 0);
        const total = live.reduce((s, x) => s + Number(x.value[1]), 0);
        return (
          tipHead(title, sub) +
          live.map((x) => tipRow(x.color, x.seriesName, `₪${nis(Number(x.value[1]))}`)).join("") +
          tipFoot(kind === "balance" ? "יתרה" : "החזר", `₪${nis(total)}`)
        );
      },
    },
    xAxis: yearAxis(maxMonth),
    yAxis: moneyAxis(),
    series: series.map((s) => ({
      name: PATH_LABEL[s.id],
      type: "line",
      stack: "mix",
      smooth: kind === "balance" ? 0.16 : false,
      step: kind === "payment" ? "end" : undefined,
      showSymbol: false,
      // A 1.5px line of the surface between stacked fills — the 2px surface gap
      // of the mark spec, drawn as the series' own edge so adjacent tracks
      // never touch.
      lineStyle: { width: 1.5, color: "#fff" },
      itemStyle: { color: TRACK_HEX[s.id] },
      areaStyle: { color: TRACK_HEX[s.id], opacity: 0.86 },
      data: s.points,
    })),
  };
}

/** The weighted average rate — one line, its own scale in percent. */
export function rateOption(rate: [number, number][], maxMonth: number): EChartsCoreOption {
  const ys = rate.map((r) => r[1]);
  const lo = Math.min(...ys);
  const hi = Math.max(...ys);
  // Breathing room around the line: a rate that moves 6.2→7.6 should read as
  // movement, not as a flat line pinned to the top of a 0–10 axis — but never
  // a fake drama either, so the floor is a round half-point below.
  const pad = Math.max(0.5, (hi - lo) * 0.35);
  // Ticks on a step a reader can add up in their head — a quarter, a half or
  // a whole point — with the floor and ceiling snapped to that step.
  const span = hi - lo + 2 * pad;
  const step = span <= 0.8 ? 0.25 : span <= 3 ? 0.5 : 1;
  const min = Math.max(0, Math.floor((lo - pad) / step) * step);
  const max = Math.ceil((hi + pad) / step) * step;
  return {
    grid: GRID,
    tooltip: {
      ...TOOLTIP,
      formatter: (p: unknown) => {
        const arr = p as { value: [number, number]; color: string }[];
        if (!arr.length) return "";
        const [m, v] = arr[0].value;
        const { title, sub } = monthLabel(m);
        return tipHead(title, sub) + tipRow(arr[0].color, "ריבית ממוצעת משוקללת", `${v.toFixed(2)}%`, true);
      },
    },
    xAxis: yearAxis(maxMonth),
    yAxis: {
      type: "value",
      min,
      max,
      ...axisBase,
      interval: step,
      axisLabel: { ...axisBase.axisLabel, formatter: (v: number) => `${v.toFixed(step < 1 ? 2 : 0).replace(/\.?0+$/, "")}%` },
    },
    series: [
      {
        name: "ריבית ממוצעת",
        type: "line",
        showSymbol: false,
        smooth: 0.1,
        lineStyle: { width: 2, color: "#5b54d6" },
        itemStyle: { color: "#5b54d6" },
        areaStyle: { color: "#5b54d6", opacity: 0.07 },
        data: rate,
      },
    ],
  };
}

/** Each year's payments as one bar, split three ways. */
export function splitOption(years: Timeline["years"]): EChartsCoreOption {
  const cats = years.map((y) => String(y.year));
  const part = (k: keyof typeof SPLIT, i: number) => ({
    name: SPLIT[k].label,
    type: "bar",
    stack: "pay",
    barMaxWidth: 22,
    barCategoryGap: "38%",
    itemStyle: {
      color: SPLIT[k].color,
      // rounded data-end on the top segment only, anchored to the baseline
      borderRadius: i === 2 ? [3, 3, 0, 0] : 0,
      // the surface gap between segments
      borderColor: "#fff",
      borderWidth: 1,
    },
    data: years.map((y) => y[k]),
  });
  return {
    grid: { ...GRID, bottom: 24 },
    tooltip: {
      ...TOOLTIP,
      axisPointer: { type: "shadow", shadowStyle: { color: "rgba(28,28,30,0.045)" } },
      formatter: (p: unknown) => {
        const arr = p as { seriesName: string; value: number; color: string; dataIndex: number }[];
        if (!arr.length) return "";
        const y = years[arr[0].dataIndex];
        const total = y.principal + y.indexation + y.interest;
        return (
          tipHead(`שנה ${y.year}`, `חודשים ${(y.year - 1) * 12 + 1}–${y.year * 12}`) +
          [...arr]
            .reverse()
            .filter((x) => Number(x.value) > 0)
            .map((x) => tipRow(x.color, x.seriesName, `₪${nis(Number(x.value))}`))
            .join("") +
          tipFoot("סה״כ בשנה", `₪${nis(total)}`)
        );
      },
    },
    xAxis: {
      type: "category",
      data: cats,
      ...axisBase,
      axisLine: { show: true, lineStyle: { color: "rgba(28,28,30,0.12)" } },
      splitLine: { show: false },
      axisLabel: {
        ...axisBase.axisLabel,
        interval: (i: number) => years.length <= 12 || (i + 1) % (years.length > 24 ? 5 : 2) === 0,
      },
    },
    yAxis: moneyAxis(),
    series: [part("principal", 0), part("indexation", 1), part("interest", 2)],
  };
}

/* --------------------------------------------------- the comparison set

   Two mixes on one axis. The active mix is the page's violet, solid; the mix it
   is measured against is a warm red, dashed — SmartNPV's blue-against-red, in
   this page's ink, and never colour alone: the dash carries it too. */

export const ACTIVE_HEX = "#5b54d6";
export const OTHER_HEX = "#d4573b";
export const GAIN_HEX = "#1f9d6b";
export const LOSS_HEX = "#d64545";

type Side = { name: string; points: [number, number][] };

/** One line per mix — payment (stepped), balance or effective rate. */
export function overlayOption(
  a: Side,
  b: Side | null,
  maxMonth: number,
  kind: "payment" | "balance" | "rate"
): EChartsCoreOption {
  const isRate = kind === "rate";
  const fmt = (v: number) => (isRate ? `${v.toFixed(2)}%` : `₪${nis(v)}`);
  const line = (s: Side, color: string, dashed: boolean) => ({
    name: s.name,
    type: "line",
    showSymbol: false,
    step: kind === "payment" ? "end" : undefined,
    smooth: kind === "balance" ? 0.12 : false,
    lineStyle: { width: dashed ? 1.75 : 2.25, color, type: dashed ? [5, 4] : "solid" },
    itemStyle: { color },
    areaStyle: dashed || isRate ? undefined : { color, opacity: 0.06 },
    data: s.points,
  });
  // A rate axis that shows movement without inventing drama: padded around
  // both lines, ticks on a step a reader can add up.
  let yAxis: Record<string, unknown> = moneyAxis();
  if (isRate) {
    const ys = [...a.points, ...(b?.points ?? [])].map((p) => p[1]);
    const lo = Math.min(...ys);
    const hi = Math.max(...ys);
    const pad = Math.max(0.4, (hi - lo) * 0.25);
    const span = hi - lo + 2 * pad;
    const step = span <= 0.8 ? 0.25 : span <= 3 ? 0.5 : 1;
    yAxis = {
      type: "value",
      min: Math.max(0, Math.floor((lo - pad) / step) * step),
      max: Math.ceil((hi + pad) / step) * step,
      interval: step,
      ...axisBase,
      axisLabel: { ...axisBase.axisLabel, formatter: (v: number) => `${v.toFixed(step < 1 ? 2 : 0).replace(/\.?0+$/, "")}%` },
    };
  }
  return {
    grid: GRID,
    tooltip: {
      ...TOOLTIP,
      formatter: (p: unknown) => {
        const arr = p as { seriesName: string; value: [number, number]; color: string }[];
        if (!arr.length) return "";
        const m = arr[0].value[0];
        const { title, sub } = monthLabel(m);
        const rows = arr.map((x) => tipRow(x.color, x.seriesName, fmt(Number(x.value[1]))));
        const va = arr.find((x) => x.seriesName === a.name)?.value[1];
        const vb = b ? arr.find((x) => x.seriesName === b.name)?.value[1] : undefined;
        const diff =
          va !== undefined && vb !== undefined
            ? tipFoot("הפרש", isRate ? `${(va - vb).toFixed(2)}%` : `₪${nis(va - vb)}`)
            : "";
        return tipHead(title, sub) + rows.join("") + diff;
      },
    },
    xAxis: yearAxis(maxMonth),
    yAxis,
    // The compared mix draws first, so the active line sits on top of it.
    series: [...(b ? [line(b, OTHER_HEX, true)] : []), line(a, ACTIVE_HEX, false)],
  };
}

/** Year-by-year saving: bars above zero where the active mix costs less. */
export function savingYearOption(saving: number[]): EChartsCoreOption {
  return {
    grid: { ...GRID, bottom: 24 },
    tooltip: {
      ...TOOLTIP,
      axisPointer: { type: "shadow", shadowStyle: { color: "rgba(28,28,30,0.045)" } },
      formatter: (p: unknown) => {
        const arr = p as { value: number; dataIndex: number }[];
        if (!arr.length) return "";
        const i = arr[0].dataIndex;
        const v = Number(arr[0].value);
        return (
          tipHead(`שנה ${i + 1}`, `חודשים ${i * 12 + 1}–${(i + 1) * 12}`) +
          tipRow(v >= 0 ? GAIN_HEX : LOSS_HEX, v >= 0 ? "חיסכון בשנה" : "תוספת עלות בשנה", `₪${nis(Math.abs(v))}`, true)
        );
      },
    },
    xAxis: {
      type: "category",
      data: saving.map((_, i) => String(i + 1)),
      ...axisBase,
      axisLine: { show: true, lineStyle: { color: "rgba(28,28,30,0.12)" } },
      splitLine: { show: false },
      axisLabel: {
        ...axisBase.axisLabel,
        interval: (i: number) => saving.length <= 12 || (i + 1) % (saving.length > 24 ? 5 : 2) === 0,
      },
    },
    yAxis: moneyAxis(),
    series: [
      {
        type: "bar",
        barMaxWidth: 18,
        barCategoryGap: "38%",
        data: saving.map((v) => ({
          value: v,
          itemStyle: { color: v >= 0 ? GAIN_HEX : LOSS_HEX, borderRadius: v >= 0 ? [3, 3, 0, 0] : [0, 0, 3, 3] },
        })),
      },
    ],
  };
}

/** The running total of that saving — where the two mixes stand, year by year. */
export function savingCumOption(saving: number[]): EChartsCoreOption {
  const pts: [number, number][] = [[0, 0]];
  let run = 0;
  saving.forEach((v, i) => {
    run += v;
    pts.push([i + 1, Math.round(run)]);
  });
  const end = pts[pts.length - 1][1];
  const color = end >= 0 ? GAIN_HEX : LOSS_HEX;
  return {
    grid: GRID,
    tooltip: {
      ...TOOLTIP,
      formatter: (p: unknown) => {
        const arr = p as { value: [number, number] }[];
        if (!arr.length) return "";
        const [y, v] = arr[0].value;
        return tipHead(`סוף שנה ${y}`) + tipRow(v >= 0 ? GAIN_HEX : LOSS_HEX, v >= 0 ? "חיסכון מצטבר" : "תוספת מצטברת", `₪${nis(Math.abs(v))}`, true);
      },
    },
    xAxis: {
      type: "value",
      min: 0,
      max: saving.length,
      interval: saving.length > 24 ? 5 : saving.length > 12 ? 3 : 2,
      ...axisBase,
      axisLine: { show: true, lineStyle: { color: "rgba(28,28,30,0.12)" } },
      splitLine: { show: false },
      axisLabel: { ...axisBase.axisLabel, formatter: (v: number) => (v === 0 ? "" : String(v)) },
    },
    yAxis: moneyAxis(),
    series: [
      {
        type: "line",
        showSymbol: false,
        smooth: 0.1,
        lineStyle: { width: 2, color },
        itemStyle: { color },
        areaStyle: { color, opacity: 0.12 },
        data: pts,
      },
    ],
  };
}

/* ------------------------------------------ תחזית ריבית ואינפלציה

   The two curves everything above is priced on, as SmartNPV draws them: the
   BoI rate path and expected CPI, month by month for thirty years. Slate and
   amber — not the mixes' violet and red, because these lines are not a mix. */

const RATE_HEX = "#475569";
const CPI_HEX = "#c98a12";

export function forecastOption(f: Forecast): EChartsCoreOption {
  const pts = (fn: (m: number) => number) => Array.from({ length: HORIZON }, (_, i) => [i + 1, Math.round(fn(i + 1) * 1000) / 1000]);
  const rate = pts((m) => nominalAt(f, m));
  const cpi = pts((m) => inflationAt(f, m));
  const all = [...rate, ...cpi].map((p) => p[1]);
  const lo = Math.max(0, Math.floor(Math.min(...all) - 0.5));
  const hi = Math.ceil(Math.max(...all) + 0.5);
  return {
    grid: GRID,
    tooltip: {
      ...TOOLTIP,
      formatter: (p: unknown) => {
        const arr = p as { seriesName: string; value: [number, number]; color: string }[];
        if (!arr.length) return "";
        const { title, sub } = monthLabel(arr[0].value[0]);
        return tipHead(title, sub) + arr.map((x) => tipRow(x.color, x.seriesName, `${Number(x.value[1]).toFixed(2)}%`)).join("");
      },
    },
    xAxis: yearAxis(HORIZON),
    yAxis: {
      type: "value",
      min: lo,
      max: hi,
      interval: 1,
      ...axisBase,
      axisLabel: { ...axisBase.axisLabel, formatter: (v: number) => `${v}%` },
    },
    series: [
      {
        name: "ריבית בנק ישראל",
        type: "line",
        showSymbol: false,
        smooth: 0.15,
        lineStyle: { width: 2, color: RATE_HEX },
        itemStyle: { color: RATE_HEX },
        areaStyle: { color: RATE_HEX, opacity: 0.05 },
        data: rate,
      },
      {
        name: "אינפלציה צפויה",
        type: "line",
        showSymbol: false,
        smooth: 0.15,
        lineStyle: { width: 2, color: CPI_HEX },
        itemStyle: { color: CPI_HEX },
        data: cpi,
      },
    ],
  };
}

/* -------------------------------------------------------------- the panels */

function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="lgr-chart-legend" aria-label="מקרא">
      {items.map((it) => (
        <span key={it.label}>
          <i style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

function Panel({
  title,
  reading,
  legend,
  children,
}: {
  title: string;
  reading?: ReactNode;
  legend?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="lgr-chart-panel">
      <header className="lgr-chart-head">
        <h3 className="lgr-chart-title">{title}</h3>
        {reading && <div className="lgr-chart-reading">{reading}</div>}
      </header>
      {children}
      {legend}
    </section>
  );
}

const EMPTY = "צריך סכום ומספר חודשים כדי לצייר את מהלך התמהיל";

/* -------------------------------------------------------------------- shell */

/** What the board is pricing on, said in four words. */
export function assumptionLabel(a: Assume): string {
  const e = asEcon(a);
  return e.forecast ? e.forecast.label : `אינפלציה ${e.inflation}%`;
}

export default function Charts({
  loans,
  annualInflation,
  isBase = false,
  name = "התמהיל",
  compare = null,
}: {
  loans: ImportedLoan[];
  /** The board's assumptions — a bare % (flat) or the forecast set. */
  annualInflation: Assume;
  /** The master shows the payment only; a proposal shows all four. */
  isBase?: boolean;
  /** The active mix's name, for the legend and tooltips. */
  name?: string;
  /** The mix this one is measured against. Absent → the per-track view. */
  compare?: { name: string; loans: ImportedLoan[] } | null;
}) {
  const t = useMemo(() => buildTimeline(loans, annualInflation), [loans, annualInflation]);
  const group = "lgr-mix-timeline";

  const tracks = t ? t.payment.map((s) => ({ color: TRACK_HEX[s.id], label: PATH_LABEL[s.id] })) : [];
  const trackLegend = tracks.length > 1 ? <Legend items={tracks} /> : null;

  // The comparison set — a proposal against another mix, when both price.
  const mine = useMemo(
    () => (!isBase && compare ? buildMixLine(loans, annualInflation) : null),
    [isBase, compare, loans, annualInflation]
  );
  const theirs = useMemo(
    () => (!isBase && compare ? buildMixLine(compare.loans, annualInflation) : null),
    [isBase, compare, annualInflation]
  );

  const balanceOpt = useMemo(() => (t ? stackedOption(t.balance, t.maxMonth, "balance") : null), [t]);
  const paymentOpt = useMemo(() => (t ? stackedOption(t.payment, t.maxMonth, "payment") : null), [t]);
  const rateOpt = useMemo(() => (t ? rateOption(t.rate, t.maxMonth) : null), [t]);
  const splitOpt = useMemo(() => (t ? splitOption(t.years) : null), [t]);

  const cmp = useMemo(() => {
    if (!mine || !theirs || !compare) return null;
    const a: MixLine = mine;
    const b: MixLine = theirs;
    const max = Math.max(a.maxMonth, b.maxMonth);
    const other = compare.name;
    const span = Math.max(a.yearCost.length, b.yearCost.length);
    // Positive = the active mix costs less that year. Both sides are accrual
    // cost (interest + linkage), so the running total ends exactly on the
    // difference in total cost the comparison card quotes.
    const saving = Array.from({ length: span }, (_, i) => (b.yearCost[i] ?? 0) - (a.yearCost[i] ?? 0));
    return {
      payment: overlayOption({ name, points: a.payment }, { name: other, points: b.payment }, max, "payment"),
      balance: overlayOption({ name, points: a.balance }, { name: other, points: b.balance }, max, "balance"),
      rate: overlayOption({ name, points: a.rate }, { name: other, points: b.rate }, max, "rate"),
      savingYear: savingYearOption(saving),
      savingCum: savingCumOption(saving),
      total: saving.reduce((s, v) => s + v, 0),
      firstA: a.payment[0]?.[1] ?? 0,
      firstB: b.payment[0]?.[1] ?? 0,
      rateA: a.rate[0]?.[1] ?? 0,
      rateB: b.rate[0]?.[1] ?? 0,
      other,
    };
  }, [mine, theirs, compare, name]);

  const fc = asEcon(annualInflation).forecast;
  const fcOpt = useMemo(() => (cmp && fc ? forecastOption(fc) : null), [cmp, fc]);

  const mixLegend = cmp ? (
    <div className="lgr-chart-legend" aria-label="מקרא">
      <span>
        <i style={{ background: ACTIVE_HEX }} />
        {name}
      </span>
      <span>
        <i className="lgr-chart-dash" style={{ borderColor: OTHER_HEX }} />
        {cmp.other}
      </span>
    </div>
  ) : null;

  const years = t ? Math.round((t.maxMonth / 12) * 10) / 10 : 0;

  return (
    <section className="lgr-card lgr-charts" data-single={isBase || undefined}>
      <header className="lgr-head">
        <h2 className="lgr-title">מהלך התמהיל</h2>
        {t && (
          <span className="lgr-sub">
            לאורך{" "}
            {t.maxMonth < 12 ? (
              <>
                <b className="lgr-fig">{t.maxMonth}</b> חודשים
              </>
            ) : years === 1 ? (
              "שנה"
            ) : (
              <>
                <b className="lgr-fig">{years}</b> שנים
              </>
            )}{" "}
            · {assumptionLabel(annualInflation)}
          </span>
        )}
        {(mixLegend ?? trackLegend) && <div className="ms-auto">{mixLegend ?? trackLegend}</div>}
      </header>

      {!t ? (
        <div className="lgr-empty">{EMPTY}</div>
      ) : isBase ? (
        <Panel
          title="החזר חודשי"
          reading={
            <>
              <Money value={t.first} block={false} weight={700} size={14} />
              {t.peak > t.first + 1 && (
                <>
                  <span className="lgr-chart-arrow">→</span>
                  <Money value={t.peak} block={false} weight={600} size={13} color="var(--lgr-2)" />
                  <span>בשיא</span>
                </>
              )}
            </>
          }
        >
          <EChart option={paymentOpt!} group={group} height={280} />
        </Panel>
      ) : cmp ? (
        <div className="lgr-chart-grid">
          <Panel
            title="החזר חודשי"
            reading={
              <>
                <Money value={cmp.firstA} block={false} weight={700} size={14} />
                <span>מול</span>
                <Money value={cmp.firstB} block={false} weight={600} size={13} color="var(--lgr-2)" />
              </>
            }
          >
            <EChart option={cmp.payment} group={group} />
          </Panel>
          <Panel
            title="יתרת החוב"
            reading={
              <>
                <Money value={t.totalBalance} block={false} weight={700} size={14} />
                <span>היום</span>
              </>
            }
          >
            <EChart option={cmp.balance} group={group} />
          </Panel>
          <Panel
            title="ריבית ממוצעת"
            reading={
              <>
                <b className="lgr-fig lgr-chart-fig">{cmp.rateA.toFixed(2)}%</b>
                <span>מול</span>
                <b className="lgr-fig lgr-chart-fig-2">{cmp.rateB.toFixed(2)}%</b>
              </>
            }
          >
            <EChart option={cmp.rate} group={group} />
          </Panel>
          <Panel
            title="חלוקת התשלום לקרן, הצמדה וריבית"
            reading={<span>לפי שנה</span>}
            legend={<Legend items={Object.values(SPLIT).map((s) => ({ color: s.color, label: s.label }))} />}
          >
            <EChart option={splitOpt!} />
          </Panel>
          <Panel
            title="חיסכון מצטבר"
            reading={
              <>
                <Money
                  value={Math.abs(cmp.total)}
                  block={false}
                  weight={700}
                  size={14}
                  color={cmp.total >= 0 ? GAIN_HEX : LOSS_HEX}
                />
                <span>{cmp.total >= 0 ? "לאורך התקופה" : "תוספת עלות לאורך התקופה"}</span>
              </>
            }
          >
            <EChart option={cmp.savingCum} />
          </Panel>
          <Panel title="חיסכון שנתי" reading={<span>ריבית והצמדה, לפי שנה</span>}>
            <EChart option={cmp.savingYear} />
          </Panel>
          {fcOpt && fc && (
            <div className="lgr-chart-wide">
              <Panel
                title="תחזית ריבית ואינפלציה"
                reading={
                  <>
                    <span>{fc.label}</span>
                  </>
                }
                legend={
                  <Legend
                    items={[
                      { color: RATE_HEX, label: "ריבית בנק ישראל" },
                      { color: CPI_HEX, label: "אינפלציה צפויה" },
                    ]}
                  />
                }
              >
                <EChart option={fcOpt} group={group} height={190} />
              </Panel>
            </div>
          )}
        </div>
      ) : (
        <div className="lgr-chart-grid">
          <Panel
            title="החזר חודשי"
            reading={
              <>
                <Money value={t.first} block={false} weight={700} size={14} />
                {t.peak > t.first + 1 && (
                  <>
                    <span className="lgr-chart-arrow">→</span>
                    <Money value={t.peak} block={false} weight={600} size={13} color="var(--lgr-2)" />
                    <span>בשיא</span>
                  </>
                )}
              </>
            }
          >
            <EChart option={paymentOpt!} group={group} />
          </Panel>
          <Panel
            title="יתרת החוב"
            reading={
              <>
                <Money value={t.totalBalance} block={false} weight={700} size={14} />
                <span>היום</span>
              </>
            }
          >
            <EChart option={balanceOpt!} group={group} />
          </Panel>
          <Panel
            title="חלוקת התשלום לקרן, הצמדה וריבית"
            reading={<span>לפי שנה</span>}
            legend={<Legend items={Object.values(SPLIT).map((s) => ({ color: s.color, label: s.label }))} />}
          >
            <EChart option={splitOpt!} />
          </Panel>
          <Panel
            title="ריבית ממוצעת"
            reading={
              <>
                <b className="lgr-fig lgr-chart-fig">{t.rateNow.toFixed(2)}%</b>
                <span>משוקללת לפי יתרה</span>
              </>
            }
          >
            <EChart option={rateOpt!} group={group} />
          </Panel>
        </div>
      )}
    </section>
  );
}

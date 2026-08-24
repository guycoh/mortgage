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
import { buildTimeline, type Timeline, type TrackSeries } from "../lib/timeline";
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

export default function Charts({
  loans,
  annualInflation,
  isBase = false,
}: {
  loans: ImportedLoan[];
  annualInflation: number;
  /** The master shows the payment only; a proposal shows all four. */
  isBase?: boolean;
}) {
  const t = useMemo(() => buildTimeline(loans, annualInflation), [loans, annualInflation]);
  const group = "lgr-mix-timeline";

  const tracks = t ? t.payment.map((s) => ({ color: TRACK_HEX[s.id], label: PATH_LABEL[s.id] })) : [];
  const trackLegend = tracks.length > 1 ? <Legend items={tracks} /> : null;

  const balanceOpt = useMemo(() => (t ? stackedOption(t.balance, t.maxMonth, "balance") : null), [t]);
  const paymentOpt = useMemo(() => (t ? stackedOption(t.payment, t.maxMonth, "payment") : null), [t]);
  const rateOpt = useMemo(() => (t ? rateOption(t.rate, t.maxMonth) : null), [t]);
  const splitOpt = useMemo(() => (t ? splitOption(t.years) : null), [t]);

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
            · אינפלציה <b className="lgr-fig">{annualInflation}%</b>
          </span>
        )}
        {trackLegend && <div className="ms-auto">{trackLegend}</div>}
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

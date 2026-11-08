"use client";

// מפת עלויות — every mortgage and loan on the credit report, and what each
// will still cost, laid out for the client across the desk.
//
// Each section answers one question a client asks, in its own card, with one
// chart: how much will it all cost (donut), where does it hurt (pain cards),
// which loan costs most (ranked bars), what is it made of (tracks donut), how
// much leaves every year (yearly bars), and the full list.

import { cloneElement, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Bank, CaretDown, HandCoins } from "@phosphor-icons/react";
import { BankIcon } from "@/app/aa102test/components/bankIcons";
import * as echarts from "echarts/core";
import { PieChart } from "echarts/charts";
import type { Analysis } from "@/app/aa102test/lib/analysis";
import EChart, { FONT, AXIS_INK, GRID_LINE, axisBase, short } from "@/app/aa102test/components/EChart";
import Stage, { useStageGo } from "./Stage";
import { buildCostMap, ils, pct, type CostMap as Map_, type CostRow, type Family, type Pain } from "../lib/costmap";
import "../costmap.css";

echarts.use([PieChart]);

const C = {
  principal: "#c4c8dc",
  interest: "#d6336c",
  indexation: "#e8a33d",
  mortgage: "#5b54d6",
  loan: "#e07b39",
};
/** Track hues for the composition donut — calm, distinct, none of them the cost colours. */
const TRACK_HUES = ["#5b54d6", "#0d8b9b", "#7c93c9", "#2f9e6e", "#9b6fd0", "#5c6474", "#b9a27a"];
const FAMILY_NAME: Record<Family, [string, string]> = { mortgage: ["משכנתא", "משכנתאות"], loan: ["הלוואה", "הלוואות"] };

/** The family as the board marks it — the same glyph, in a small tinted disc. */
function FamIcon({ f, size = 24 }: { f: Family; size?: number }) {
  const G = f === "mortgage" ? Bank : HandCoins;
  return (
    <span className="cm-famico" data-f={f} style={{ width: size, height: size }} title={FAMILY_NAME[f][0]} aria-label={FAMILY_NAME[f][0]}>
      <G size={Math.round(size * 0.54)} weight="fill" />
    </span>
  );
}

const TIP: Record<string, unknown> = {
  backgroundColor: "#fff",
  borderColor: "rgba(0,0,0,0.1)",
  padding: [9, 12],
  extraCssText: "border-radius:12px;box-shadow:0 2px 6px -2px rgba(0,0,0,.06),0 20px 48px -16px rgba(0,0,0,.26);direction:rtl;text-align:right;",
  textStyle: { color: "#15171c", fontFamily: FONT, fontSize: 12.5 },
};
const tipLine = (color: string, name: string, v: string) =>
  `<div style="display:flex;gap:10px;align-items:center;margin-top:3px"><span style="width:9px;height:9px;border-radius:3px;background:${color}"></span>${name}<b dir="ltr" style="margin-inline-start:auto;font-family:${FONT}">${v}</b></div>`;

const future = (r: CostRow) => (r.interest ?? 0) + r.indexation;

/** Phone width — the charts re-lay their labels, the sheet becomes cards (CSS). */
function useNarrow() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(max-width: 760px)");
    const on = () => setNarrow(q.matches);
    on();
    q.addEventListener("change", on);
    return () => q.removeEventListener("change", on);
  }, []);
  return narrow;
}

function N({ v, cur = true, approx = false }: { v: number; cur?: boolean; approx?: boolean }) {
  return (
    <>
      {approx && <span className="cm-approx">כ-</span>}
      <span className="cm-num" dir="ltr">
        {cur && <span className="cm-cur">₪</span>}
        {ils(v)}
      </span>
    </>
  );
}

function years(months: number | null) {
  if (!months) return "—";
  const y = months / 12;
  return y >= 2 ? `${pct(y, 1)} שנים` : `${months} חודשים`;
}

function Card({ id, title, aside, className = "", children }: { id?: string; title: string; aside?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <section id={id} className={`cm-card ${className}`}>
      <header className="cm-card-h">
        <h3>{title}</h3>
        {aside}
      </header>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ hero */

function heroDonut(m: Map_) {
  const t = m.totals;
  const data = [
    { name: "יתרת חוב", value: Math.round(t.balance), itemStyle: { color: C.principal } },
    { name: "ריבית צפויה", value: Math.round(t.interest), itemStyle: { color: C.interest } },
    { name: "הצמדה צפויה", value: Math.round(t.indexation), itemStyle: { color: C.indexation } },
  ].filter((d) => d.value > 0);
  return {
    animationDuration: 900,
    animationEasing: "cubicOut" as const,
    tooltip: {
      ...TIP,
      trigger: "item",
      formatter: (p: { name: string; value: number; percent: number; color: string }) =>
        `<b>${p.name}</b>${tipLine(p.color, "סכום", `₪${ils(p.value)}`)}${tipLine(p.color, "מסך התשלומים הצפויים", `${Math.round(p.percent)}%`)}`,
    },
    series: [
      {
        type: "pie",
        radius: ["64%", "92%"],
        padAngle: 1.5,
        itemStyle: { borderRadius: 6, borderColor: "#fff", borderWidth: 2 },
        label: { show: false },
        emphasis: { scale: true, scaleSize: 5 },
        startAngle: 90,
        clockwise: false,
        data,
      },
    ],
  };
}

function Hero({ m }: { m: Map_ }) {
  const t = m.totals;
  const option = useMemo(() => heroDonut(m), [m]);
  const parts = [
    { key: "p", label: "יתרת חוב", note: "נכון להיום", v: t.balance, c: C.principal },
    { key: "i", label: "ריבית צפויה", note: "עד סוף התקופה", v: t.interest, c: C.interest },
    { key: "x", label: "הצמדה צפויה", note: `לפי מדד של ${pct(m.inflation, 1)}% בשנה`, v: t.indexation, c: C.indexation },
  ].filter((p) => p.v > 0);
  return (
    <section id="cm-top" className="cm-card cm-hero">
      <div className="cm-hero-text">
        <h2 className="cm-hero-q">כמה עוד תשלמו עד סוף ההלוואות?</h2>
        <div className="cm-hero-total">
          <N v={t.total} />
        </div>
        <ul className="cm-parts">
          {parts.map((p) => (
            <li key={p.key}>
              <span className="cm-swatch" style={{ background: p.c }} />
              <span className="cm-part-l">
                <b>{p.label}</b>
                <span>{p.note}</span>
              </span>
              <span className="cm-part-v">
                <N v={p.v} approx={p.key !== "p"} />
              </span>
              <span className="cm-part-s">{Math.round((p.v / t.total) * 100)}%</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="cm-hero-chart">
        <EChart option={option} height={260} />
        <div className="cm-donut-c" aria-hidden>
          <span>החזר לשקל חוב</span>
          <b className="cm-num" dir="ltr">
            <span className="cm-cur">₪</span>
            {t.perShekel ? pct(t.perShekel, 2) : "—"}
          </b>
        </div>
      </div>
      <dl className="cm-strip">
        <div>
          <dt>החזר חודשי</dt>
          <dd><N v={t.monthly} /></dd>
        </div>
        <div>
          <dt>ריבית והצמדה</dt>
          <dd className="cm-hot"><N v={t.interest + t.indexation} approx /></dd>
        </div>
        <div>
          <dt>ריבית שנתית ממוצעת</dt>
          <dd>
            <span className="cm-num" dir="ltr">{t.rate !== null ? pct(t.rate, 2) : "—"}<span className="cm-cur">%</span></span>
          </dd>
        </div>
        <div>
          <dt>הלוואות בדוח</dt>
          <dd className="cm-count">
            {(["mortgage", "loan"] as Family[])
              .filter((f) => t.count[f])
              .map((f) => (
                <span key={f}>
                  <span className="cm-num">{t.count[f]}</span>
                  <small>{FAMILY_NAME[f][t.count[f] > 1 ? 1 : 0]}</small>
                </span>
              ))}
          </dd>
        </div>
      </dl>
    </section>
  );
}

/* ----------------------------------------------------------------- pains */

function Pains({ pains, onPick, picked }: { pains: Pain[]; onPick: (p: Pain) => void; picked: string | null }) {
  const reduce = useReducedMotion();
  if (!pains.length) return null;
  return (
    <section id="cm-pains" className="cm-pains" aria-label="מה כדאי לבדוק">
      {pains.map((p, i) => (
        <motion.button
          key={p.id}
          className="cm-pain"
          data-tone={p.tone}
          aria-pressed={picked === p.id}
          onClick={() => onPick(p)}
          initial={{ opacity: 0, y: reduce ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.4, ease: [0.16, 1, 0.3, 1], delay: reduce ? 0 : 0.25 + i * 0.07 }}
        >
          <span className="cm-pain-l">
            <i />
            {p.label}
          </span>
          <span className="cm-pain-fig" dir="ltr">{p.figure}</span>
          <span className="cm-pain-t">{p.title}</span>
          <span className="cm-pain-go">{picked === p.id ? "מסומן ברשימה" : "סימון ברשימה"}</span>
        </motion.button>
      ))}
    </section>
  );
}

/* -------------------------------------------------------- ranked bars */

const TOP = 8;

function rankedOption(m: Map_, narrow = false) {
  const W = narrow ? 118 : 176;
  const sorted = m.rows.filter((r) => future(r) > 0).sort((x, y) => future(y) - future(x));
  const top = sorted.slice(0, TOP);
  const rest = sorted.slice(TOP);
  type Item = { name: string; balance: number; interest: number; indexation: number; rate: number | null };
  const items: Item[] = top.map((r) => ({ name: r.name, balance: r.balance, interest: r.interest ?? 0, indexation: r.indexation, rate: r.rate }));
  if (rest.length)
    items.push({
      name: `עוד ${rest.length} הלוואות`,
      balance: rest.reduce((s, r) => s + r.balance, 0),
      interest: rest.reduce((s, r) => s + (r.interest ?? 0), 0),
      indexation: rest.reduce((s, r) => s + r.indexation, 0),
      rate: null,
    });
  const hasIdx = items.some((it) => it.indexation > 0);
  const endLabel = {
    show: true,
    position: "left",
    formatter: (p: { dataIndex: number }) => `₪${ils(items[p.dataIndex].interest + items[p.dataIndex].indexation)}`,
    fontFamily: FONT,
    fontWeight: 700,
    fontSize: narrow ? 11 : 12.5,
    color: "#15171c",
    distance: 6,
  };
  return {
    option: {
      grid: { top: 6, right: 6, bottom: 6, left: narrow ? 64 : 84, outerBoundsMode: "same" },
      tooltip: {
        ...TIP,
        trigger: "axis",
        axisPointer: { type: "shadow", shadowStyle: { color: "rgba(91,84,214,0.05)" } },
        formatter: (ps: { dataIndex: number }[]) => {
          const it = items[ps[0].dataIndex];
          return `<b>${it.name}</b>${tipLine(C.principal, "יתרת חוב", `₪${ils(it.balance)}`)}${tipLine(C.interest, "ריבית צפויה", `₪${ils(it.interest)}`)}${it.indexation ? tipLine(C.indexation, "הצמדה צפויה", `₪${ils(it.indexation)}`) : ""}`;
        },
      },
      xAxis: { type: "value", inverse: true, show: false },
      yAxis: {
        type: "category",
        data: items.map((it) => it.name),
        inverse: true,
        position: "right",
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          formatter: (_: string, i: number) => {
            const it = items[i];
            return `{n|${it.name}}\n{b|${it.rate !== null ? `${pct(it.rate, 2)}%   ` : ""}₪${ils(it.balance)}}`;
          },
          margin: narrow ? 10 : 18,
          align: "left",
          rich: {
            n: { fontFamily: FONT, fontSize: narrow ? 11.5 : 13, fontWeight: 600, color: "#15171c", lineHeight: 17, align: "right", width: W, overflow: "truncate" },
            b: { fontFamily: FONT, fontSize: narrow ? 10.5 : 11.5, color: "#5c606b", lineHeight: 15, align: "right", width: W },
          },
        },
      },
      series: [
        {
          type: "bar",
          name: "ריבית",
          stack: "c",
          barWidth: narrow ? 14 : 18,
          data: items.map((it) => it.interest),
          itemStyle: { color: C.interest, borderRadius: hasIdx ? 0 : [6, 0, 0, 6] },
          ...(hasIdx ? {} : { label: endLabel }),
        },
        ...(hasIdx
          ? [
              {
                type: "bar",
                name: "הצמדה",
                stack: "c",
                barWidth: narrow ? 14 : 18,
                data: items.map((it) => it.indexation),
                itemStyle: { color: C.indexation, borderRadius: [6, 0, 0, 6] },
                label: endLabel,
              },
            ]
          : []),
      ],
    },
    height: Math.max(150, items.length * 48 + 12),
  };
}

/* ----------------------------------------------------------- tracks */

function tracksOption(m: Map_) {
  return {
    tooltip: {
      ...TIP,
      trigger: "item",
      formatter: (p: { name: string; value: number; percent: number; color: string }) =>
        `<b>${p.name}</b>${tipLine(p.color, "יתרת חוב", `₪${ils(p.value)}`)}${tipLine(p.color, "מהחוב", `${Math.round(p.percent)}%`)}`,
    },
    series: [
      {
        type: "pie",
        radius: ["58%", "88%"],
        padAngle: 1.5,
        itemStyle: { borderRadius: 5, borderColor: "#fff", borderWidth: 2 },
        label: { show: false },
        emphasis: { scale: true, scaleSize: 4 },
        startAngle: 90,
        clockwise: false,
        data: m.tracks.map((t, i) => ({ name: t.label, value: Math.round(t.balance), itemStyle: { color: TRACK_HUES[i % TRACK_HUES.length] } })),
      },
    ],
  };
}

function Tracks({ m }: { m: Map_ }) {
  const option = useMemo(() => tracksOption(m), [m]);
  const maxRate = Math.max(1, ...m.tracks.map((t) => t.rate ?? 0));
  return (
    <div className="cm-tracks">
      <div className="cm-tracks-chart">
        <EChart option={option} height={200} />
      </div>
      <ul className="cm-tracks-list">
        {m.tracks.map((t, i) => (
          <li key={t.label}>
            <span className="cm-swatch" style={{ background: TRACK_HUES[i % TRACK_HUES.length] }} />
            <b className="cm-tr-name">{t.label}</b>
            <span className="cm-tr-share cm-num">{Math.round(t.share * 100)}%</span>
            <span className="cm-tr-rate" data-heat={(t.rate ?? 0) >= 7 ? 2 : undefined}>
              <span className="cm-tr-meter">
                <span style={{ width: `${((t.rate ?? 0) / maxRate) * 100}%` }} />
              </span>
              <span className="cm-num" dir="ltr">{t.rate !== null ? `${pct(t.rate, 2)}%` : "—"}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------- years */

function timeOption(m: Map_, narrow = false) {
  const ys = m.years.map((y) => String(y.year));
  const hasIdx = m.totals.indexation > 0;
  const bar = (name: string, key: "principal" | "interest" | "indexation", color: string, top: boolean) => ({
    type: "bar",
    name,
    stack: "pay",
    barWidth: "58%",
    data: m.years.map((y) => Math.round(y[key])),
    itemStyle: { color, borderRadius: top ? [5, 5, 0, 0] : 0 },
    emphasis: { focus: "series" },
  });
  return {
    grid: narrow ? { top: 20, right: 40, bottom: 28, left: 38 } : { top: 26, right: 58, bottom: 30, left: 52 },
    tooltip: {
      ...TIP,
      trigger: "axis",
      axisPointer: { type: "shadow", shadowStyle: { color: "rgba(91,84,214,0.06)" } },
      formatter: (ps: { seriesName: string; value: number; color: string; axisValue: string }[]) => {
        const pay = ps.filter((p) => p.seriesName !== "יתרת חוב").reduce((s, p) => s + p.value, 0);
        return `<b>${ps[0]?.axisValue}</b>${tipLine("#15171c", "סה״כ בשנה", `₪${ils(pay)}`)}${ps.map((p) => tipLine(p.color, p.seriesName, `₪${ils(p.value)}`)).join("")}`;
      },
    },
    xAxis: { type: "category", data: ys, ...axisBase, axisLabel: { ...axisBase.axisLabel, interval: narrow ? Math.ceil(ys.length / 5) - 1 : ys.length > 16 ? 2 : ys.length > 8 ? 1 : 0 } },
    yAxis: [
      { type: "value", ...axisBase, axisLabel: { ...axisBase.axisLabel, formatter: (v: number) => short(v) }, splitNumber: 4, splitLine: { lineStyle: { color: GRID_LINE } } },
      { type: "value", ...axisBase, axisLabel: { ...axisBase.axisLabel, color: AXIS_INK, formatter: (v: number) => short(v) }, splitLine: { show: false }, splitNumber: 4 },
    ],
    series: [
      bar("החזר קרן", "principal", C.principal, false),
      bar("ריבית", "interest", C.interest, !hasIdx),
      ...(hasIdx ? [bar("הצמדה", "indexation", C.indexation, true)] : []),
      {
        type: "line",
        name: "יתרת חוב",
        yAxisIndex: 1,
        data: m.years.map((y) => Math.round(y.balance)),
        smooth: 0.25,
        symbol: "none",
        lineStyle: { color: "#15171c", width: 1.8, type: [6, 4] },
      },
    ],
  };
}

/* ------------------------------------------------------------- the sheet */

// Every loan and mortgage on the report, as a spreadsheet you would want to
// read: a row-number gutter, hairline grid, families grouped with their own
// subtotal, one double-ruled total. Conditional formatting does the talking —
// rates tint toward raspberry as they climb, the "עוד ישולם" cell carries its
// own cost bar. Hovering a cell lights its row and its column.
// On a phone the same rows become cards: the grid cannot be read at 390px.

type Sort = "future" | "original" | "balance" | "rate" | "monthly" | "left" | "interest" | "indexation" | "ps";
type Filter = "all" | Family;

interface Col {
  key: string;
  label: string;
  sort?: Sort;
  num?: boolean;
  show?: (m: Map_) => boolean;
}
const COLS: Col[] = [
  { key: "name", label: "הלוואה" },
  { key: "bank", label: "גוף מממן" },
  { key: "original", label: "סכום מקורי", sort: "original", num: true },
  { key: "balance", label: "יתרת חוב", sort: "balance", num: true },
  { key: "rate", label: "ריבית שנתית", sort: "rate", num: true },
  { key: "monthly", label: "החזר חודשי", sort: "monthly", num: true },
  { key: "left", label: "נותרו", sort: "left", num: true },
  { key: "interest", label: "ריבית צפויה", sort: "interest", num: true },
  { key: "indexation", label: "הצמדה צפויה", sort: "indexation", num: true, show: (m) => m.totals.indexation > 0 },
  { key: "future", label: "סה״כ ריבית והצמדה", sort: "future", num: true },
  { key: "ps", label: "החזר לשקל חוב", sort: "ps", num: true },
  { key: "notes", label: "שימו לב" },
];

const SORTERS: Record<Sort, (r: CostRow) => number> = {
  future,
  original: (r) => r.original,
  balance: (r) => r.balance,
  rate: (r) => r.rate ?? -1,
  monthly: (r) => r.monthly,
  left: (r) => r.months ?? 0,
  interest: (r) => r.interest ?? 0,
  indexation: (r) => r.indexation,
  ps: (r) => r.perShekel ?? 0,
};

const bankShort = (b: string) => b.replace(/\s*בע"מ\s*$/, "").replace(/^בנק\s+/, "");
const n0 = (v: number) => (v ? ils(v) : "—");

function endOf(r: CostRow) {
  const m = /(\d{2})\/(\d{4})\s*$/.exec(r.endDate || "");
  return m ? `${m[1]}/${m[2]}` : "";
}

function sumUp(rows: CostRow[]) {
  const s = (f: (r: CostRow) => number) => rows.reduce((a, r) => a + (f(r) || 0), 0);
  const rated = rows.filter((r) => r.rate !== null);
  const rb = rated.reduce((a, r) => a + r.balance, 0);
  const balance = s((r) => r.balance);
  const fut = s(future);
  return {
    original: s((r) => r.original),
    balance,
    monthly: s((r) => r.monthly),
    interest: s((r) => r.interest ?? 0),
    indexation: s((r) => r.indexation),
    future: fut,
    rate: rb > 0 ? rated.reduce((a, r) => a + r.balance * (r.rate ?? 0), 0) / rb : null,
    ps: balance > 0 ? (balance + fut) / balance : null,
  };
}

function rateTint(rate: number | null, max: number) {
  if (rate === null || rate <= 0) return undefined;
  const k = Math.min(1, rate / Math.max(max, 1));
  return `rgba(214, 51, 108, ${(0.04 + k * 0.16).toFixed(3)})`;
}

function Sheet({ m, lit }: { m: Map_; lit: Set<string> }) {
  const [sort, setSort] = useState<Sort>("future");
  const [filter, setFilter] = useState<Filter>("all");
  const [hc, setHc] = useState<number | null>(null);
  const cols = COLS.filter((c) => !c.show || c.show(m));
  const fams = (["mortgage", "loan"] as Family[]).filter((f) => m.totals.count[f]);
  const shownFams = fams.filter((f) => filter === "all" || filter === f);
  const maxRate = Math.max(1, ...m.rows.map((r) => r.rate ?? 0));
  const maxFut = Math.max(1, ...m.rows.map(future));
  const groups = shownFams.map((f) => ({
    f,
    rows: m.rows.filter((r) => r.family === f).sort((x, y) => SORTERS[sort](y) - SORTERS[sort](x)),
  }));
  const all = groups.flatMap((g) => g.rows);
  const total = sumUp(all);
  let n = 0;

  const cell = (r: CostRow, c: Col, i: number) => {
    const p = { "data-c": i, className: c.num ? "cm-sh-num" : undefined };
    switch (c.key) {
      case "name":
        return (
          <td {...p} className="cm-sh-name">
            <span className="cm-tick" data-f={r.family} title={FAMILY_NAME[r.family][0]} />
            <span>
              <b>{r.track}</b>
              <small>{[r.purpose, r.startYear && `מ-${r.startYear}`].filter(Boolean).join(", ")}</small>
            </span>
          </td>
        );
      case "bank":
        return (
          <td {...p} className="cm-sh-bank">
            <span className="cm-bank">
              <BankIcon source={r.bank} size={22} />
              {bankShort(r.bank)}
            </span>
          </td>
        );
      case "original":
        return <td {...p}>{n0(r.original)}</td>;
      case "balance":
        return <td {...p} className="cm-sh-num cm-sh-strong">{ils(r.balance)}</td>;
      case "rate":
        return (
          <td {...p} className={`cm-sh-num cm-sh-rate${(r.rate ?? 0) >= 7 ? " cm-hot" : ""}`} style={{ background: rateTint(r.rate, maxRate) }}>
            {r.rate !== null ? `${pct(r.rate, 2)}%` : "—"}
          </td>
        );
      case "monthly":
        return <td {...p}>{n0(r.monthly)}</td>;
      case "left":
        return (
          <td {...p} className="cm-sh-num cm-sh-left">
            {r.months ? pct(r.months / 12, 1) : "—"}
            {endOf(r) && <small>{endOf(r)}</small>}
          </td>
        );
      case "interest":
        return <td {...p} className={`cm-sh-num${(r.interest ?? 0) > 0 ? " cm-hot" : " cm-sh-mute"}`}>{r.interest ? ils(r.interest) : "—"}</td>;
      case "indexation":
        return <td {...p} className={`cm-sh-num${r.indexation > 0 ? " cm-warm" : " cm-sh-mute"}`}>{r.indexation ? ils(r.indexation) : "—"}</td>;
      case "future":
        return (
          <td {...p} className="cm-sh-num cm-sh-fut">
            <span className="cm-sh-fut-v">{future(r) ? ils(future(r)) : "—"}</span>
            {future(r) > 0 && (
              <span className="cm-sh-bar" style={{ width: `${(future(r) / maxFut) * 100}%` }}>
                {(r.interest ?? 0) > 0 && <i style={{ flexGrow: r.interest ?? 0, background: C.interest }} />}
                {r.indexation > 0 && <i style={{ flexGrow: r.indexation, background: C.indexation }} />}
              </span>
            )}
          </td>
        );
      case "ps":
        return <td {...p} className={`cm-sh-num${(r.perShekel ?? 0) >= 1.5 ? " cm-hot" : ""}`}>{r.perShekel ? pct(r.perShekel, 2) : "—"}</td>;
      case "notes":
        return (
          <td {...p} className="cm-sh-notes">
            {r.marks.filter((x) => !x.text.startsWith("ריבית")).map((mk) => (
              <span key={mk.text} data-tone={mk.tone}>{mk.text}</span>
            ))}
          </td>
        );
    }
    return <td {...p} />;
  };

  const sumCells = (s: ReturnType<typeof sumUp>, label: string, count: number) =>
    cols.map((c, i) => <FragmentCell key={c.key} onEnter={() => setHc(i)}>{sumCell(s, label, count, c, i)}</FragmentCell>);
  const sumCell = (s: ReturnType<typeof sumUp>, label: string, count: number, c: Col, i: number) => {
    {
      const p = { "data-c": i, className: c.num ? "cm-sh-num" : undefined };
      switch (c.key) {
        case "name":
          return <td {...p} className="cm-sh-name">{label}<small>{count} {count === 1 ? "הלוואה" : "הלוואות"}</small></td>;
        case "original": return <td {...p}>{ils(s.original)}</td>;
        case "balance": return <td {...p}>{ils(s.balance)}</td>;
        case "rate": return <td {...p}>{s.rate !== null ? `${pct(s.rate, 2)}%` : "—"}</td>;
        case "monthly": return <td {...p}>{ils(s.monthly)}</td>;
        case "interest": return <td {...p} className="cm-sh-num cm-hot">{ils(s.interest)}</td>;
        case "indexation": return <td {...p} className={`cm-sh-num${s.indexation ? " cm-warm" : " cm-sh-mute"}`}>{s.indexation ? ils(s.indexation) : "—"}</td>;
        case "future": return <td {...p} className="cm-sh-num cm-sh-fut"><span className="cm-sh-fut-v">{ils(s.future)}</span></td>;
        case "ps": return <td {...p}>{s.ps ? pct(s.ps, 2) : "—"}</td>;
      }
      return <td {...p} />;
    }
  };

  return (
    <section id="cm-all" className="cm-card cm-sheet">
      <header className="cm-card-h">
        <h3>כל ההלוואות והמשכנתאות</h3>
        <span className="cm-sh-count">{all.length}</span>
        {fams.length > 1 && (
          <div className="cm-seg" role="radiogroup" aria-label="סינון">
            {(["all", ...fams] as Filter[]).map((f) => (
              <button key={f} role="radio" aria-checked={filter === f} onClick={() => setFilter(f)}>
                {f === "all" ? "הכול" : FAMILY_NAME[f][1]}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* desktop and tablet: the grid */}
      <div className="cm-sh-scroll">
        <style>{hc !== null ? `.cm-sh-t [data-c="${hc}"]{background-color:rgba(91,84,214,.045)}.cm-sh-t thead [data-c="${hc}"]{background-color:#ebeaf9;color:#2e2a8f}` : ""}</style>
        <table className="cm-sh-t" onMouseLeave={() => setHc(null)}>
          <thead>
            <tr>
              <th className="cm-sh-gut" aria-hidden />
              {cols.map((c, i) => (
                <th key={c.key} data-c={i} className={c.num ? "cm-sh-num" : undefined} onMouseEnter={() => setHc(i)}>
                  {c.sort ? (
                    <button className="cm-sh-th" data-on={sort === c.sort || undefined} onClick={() => setSort(c.sort!)}>
                      {c.label}
                      <CaretDown size={10} weight="bold" />
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          {groups.map((g) => (
            <tbody key={g.f}>
              {fams.length > 1 && (
                <tr className="cm-sh-group">
                  <td className="cm-sh-gut" />
                  <td colSpan={cols.length}>
                    <FamIcon f={g.f} size={22} />
                    {FAMILY_NAME[g.f][1]}
                  </td>
                </tr>
              )}
              {g.rows.map((r) => (
                <tr key={r.uid} data-lit={lit.has(r.uid) || undefined} data-heat={r.heat || undefined}>
                  <td className="cm-sh-gut">{++n}</td>
                  {cols.map((c, i) => (
                    <FragmentCell key={c.key} onEnter={() => setHc(i)}>{cell(r, c, i)}</FragmentCell>
                  ))}
                </tr>
              ))}
              {fams.length > 1 && filter === "all" && (
                <tr className="cm-sh-sub">
                  <td className="cm-sh-gut" />
                  {sumCells(sumUp(g.rows), `סה״כ ${FAMILY_NAME[g.f][1]}`, g.rows.length)}
                </tr>
              )}
            </tbody>
          ))}
          <tfoot>
            <tr className="cm-sh-total">
              <td className="cm-sh-gut" />
              {sumCells(total, "סה״כ", all.length)}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* phone: one card per loan */}
      <div className="cm-sh-cards">
        {groups.map((g) => (
          <div key={g.f} className="cm-shc-group">
            {fams.length > 1 && (
              <div className="cm-shc-gh">
                <FamIcon f={g.f} size={22} />
                <b>{FAMILY_NAME[g.f][1]}</b>
                <span className="cm-shc-gh-n">{g.rows.length}</span>
                <span className="cm-shc-gh-v">
                  <small>יתרת חוב</small>
                  <span className="cm-num">₪{ils(sumUp(g.rows).balance)}</span>
                </span>
              </div>
            )}
            {g.rows.map((r) => (
              <article key={r.uid} className="cm-shc" data-lit={lit.has(r.uid) || undefined}>
                <header>
                  <span className="cm-shc-mark">
                    <BankIcon source={r.bank} size={30} />
                  </span>
                  <span className="cm-shc-id">
                    <b>{r.track}</b>
                    <small>{[bankShort(r.bank), r.startYear && `מ-${r.startYear}`].filter(Boolean).join(", ")}</small>
                  </span>
                  <span className="cm-shc-bal">
                    <small>יתרת חוב</small>
                    <b className="cm-num">₪{ils(r.balance)}</b>
                  </span>
                </header>
                <dl>
                  <div><dt>ריבית שנתית</dt><dd className={(r.rate ?? 0) >= 7 ? "cm-hot" : undefined}>{r.rate !== null ? `${pct(r.rate, 2)}%` : "—"}</dd></div>
                  <div><dt>החזר חודשי</dt><dd>{r.monthly ? `₪${ils(r.monthly)}` : "—"}</dd></div>
                  <div><dt>נותרו</dt><dd>{r.months ? `${pct(r.months / 12, 1)} שנים` : "—"}{endOf(r) && <small>{endOf(r)}</small>}</dd></div>
                  <div><dt>ריבית והצמדה צפויות</dt><dd className={future(r) ? "cm-hot" : undefined}>{future(r) ? `₪${ils(future(r))}` : "—"}</dd></div>
                </dl>
                {r.marks.some((x) => !x.text.startsWith("ריבית")) && (
                  <p className="cm-sh-notes">
                    {r.marks.filter((x) => !x.text.startsWith("ריבית")).map((mk) => (
                      <span key={mk.text} data-tone={mk.tone}>{mk.text}</span>
                    ))}
                  </p>
                )}
              </article>
            ))}
          </div>
        ))}
        <div className="cm-shc-total">
          <span>סה״כ יתרת חוב</span>
          <b className="cm-num">₪{ils(total.balance)}</b>
          <span>סה״כ ריבית והצמדה</span>
          <b className="cm-num cm-hot">₪{ils(total.future)}</b>
        </div>
      </div>
    </section>
  );
}

/** A cell that reports hover to the sheet's crosshair without wrapping the td. */
function FragmentCell({ children, onEnter }: { children: React.ReactElement<{ onMouseEnter?: () => void }>; onEnter: () => void }) {
  return cloneElement(children, { onMouseEnter: onEnter });
}

/* ------------------------------------------------------------------ page */

function Legend({ idx, line, principal = true }: { idx: boolean; line?: boolean; principal?: boolean }) {
  return (
    <div className="cm-legend">
      {principal && <span><i style={{ background: C.principal }} />{line ? "החזר קרן" : "יתרת חוב"}</span>}
      <span><i style={{ background: C.interest }} />ריבית</span>
      {idx && <span><i style={{ background: C.indexation }} />הצמדה</span>}
      {line && <span><i className="cm-legend-line" />יתרת חוב</span>}
    </div>
  );
}

function Body({ m }: { m: Map_ }) {
  const go = useStageGo();
  const [picked, setPicked] = useState<Pain | null>(null);
  const lit = useMemo(() => new Set(picked?.uids ?? []), [picked]);
  const narrow = useNarrow();
  const ranked = useMemo(() => rankedOption(m, narrow), [m, narrow]);
  const time = useMemo(() => timeOption(m, narrow), [m, narrow]);
  const idx = m.totals.indexation > 0;
  return (
    <div className="cm-page">
      <Sheet m={m} lit={lit} />
      <Hero m={m} />
      <Pains
        pains={m.pains}
        picked={picked?.id ?? null}
        onPick={(p) => {
          const on = picked?.id === p.id ? null : p;
          setPicked(on);
          if (on) go("cm-all");
        }}
      />
      <div id="cm-cost" className="cm-row2">
        <Card title="איזו הלוואה עולה הכי הרבה?" aside={<Legend idx={idx} principal={false} />}>
          <p className="cm-card-sub">ריבית והצמדה צפויות בכל הלוואה</p>
          <EChart option={ranked.option} height={ranked.height} />
        </Card>
        <Card title="באילו מסלולים החוב?">
          <Tracks m={m} />
        </Card>
      </div>
      <Card id="cm-time" title="כמה צפוי שתשלמו בכל שנה?" aside={<Legend idx={idx} line />}>
        <EChart option={time} height={narrow ? 240 : 320} />
      </Card>
    </div>
  );
}

export default function CostMap({ analysis, inflation, onClose }: { analysis: Analysis; inflation: number; onClose: () => void }) {
  const m = useMemo(() => buildCostMap(analysis, inflation), [analysis, inflation]);
  return (
    <Stage
      label="מפת עלויות"
      who={
        <>
          {m.client}
          {m.reportDate && <span className="brf-bar-date">{m.reportDate}</span>}
        </>
      }
      tabs={[
        { id: "cm-all", label: "כל ההלוואות" },
        { id: "cm-top", label: "סך הכול" },
        { id: "cm-pains", label: "מה בולט" },
        { id: "cm-cost", label: "מה עולה הכי הרבה" },
        { id: "cm-time", label: "לאורך השנים" },
      ]}
      onClose={onClose}
    >
      {m.rows.length ? (
        <Body m={m} />
      ) : (
        <div className="cm-page">
          <p className="cm-empty">בדוח אין משכנתאות או הלוואות פעילות על שמכם.</p>
        </div>
      )}
    </Stage>
  );
}

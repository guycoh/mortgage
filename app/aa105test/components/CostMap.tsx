"use client";

// מפת עלויות — every mortgage and loan on the credit report, and what each
// will still cost, laid out for the client across the desk.
//
// Each section answers one question a client asks, in its own card, with one
// chart: how much will it all cost (donut), where does it hurt (pain cards),
// which loan costs most (ranked bars), what is it made of (tracks donut), how
// much leaves every year (yearly bars), and the full list.

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { CaretDown } from "@phosphor-icons/react";
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
    { name: "קרן", value: Math.round(t.balance), itemStyle: { color: C.principal } },
    { name: "ריבית", value: Math.round(t.interest), itemStyle: { color: C.interest } },
    { name: "הצמדה צפויה", value: Math.round(t.indexation), itemStyle: { color: C.indexation } },
  ].filter((d) => d.value > 0);
  return {
    animationDuration: 900,
    animationEasing: "cubicOut",
    tooltip: {
      ...TIP,
      trigger: "item",
      formatter: (p: { name: string; value: number; percent: number; color: string }) =>
        `<b>${p.name}</b>${tipLine(p.color, "סכום", `₪${ils(p.value)}`)}${tipLine(p.color, "מכל מה שישולם", `${Math.round(p.percent)}%`)}`,
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
    { key: "p", label: "קרן", note: "היתרה שנשארה", v: t.balance, c: C.principal },
    { key: "i", label: "ריבית", note: "עד סוף התקופה", v: t.interest, c: C.interest },
    { key: "x", label: "הצמדה צפויה", note: `לפי מדד של ${pct(m.inflation, 1)}% בשנה`, v: t.indexation, c: C.indexation },
  ].filter((p) => p.v > 0);
  return (
    <section id="cm-top" className="cm-card cm-hero">
      <div className="cm-hero-text">
        <h2 className="cm-hero-q">כמה יעלו לכם ההלוואות עד הסוף?</h2>
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
        <EChart option={option} height={300} />
        <div className="cm-donut-c" aria-hidden>
          <span>על כל ₪1 קרן</span>
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
          <dt>מעבר לקרן</dt>
          <dd className="cm-hot"><N v={t.interest + t.indexation} approx /></dd>
        </div>
        <div>
          <dt>ריבית ממוצעת</dt>
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
          <span className="cm-pain-go">{picked === p.id ? "מסומן בטבלה" : "הצגה בטבלה"}</span>
        </motion.button>
      ))}
    </section>
  );
}

/* -------------------------------------------------------- ranked bars */

const TOP = 8;

function rankedOption(m: Map_) {
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
    fontSize: 12.5,
    color: "#15171c",
    distance: 8,
  };
  return {
    option: {
      grid: { top: 6, right: 6, bottom: 6, left: 84, outerBoundsMode: "same" },
      tooltip: {
        ...TIP,
        trigger: "axis",
        axisPointer: { type: "shadow", shadowStyle: { color: "rgba(91,84,214,0.05)" } },
        formatter: (ps: { dataIndex: number }[]) => {
          const it = items[ps[0].dataIndex];
          return `<b>${it.name}</b>${tipLine(C.principal, "יתרה", `₪${ils(it.balance)}`)}${tipLine(C.interest, "ריבית שתשולם", `₪${ils(it.interest)}`)}${it.indexation ? tipLine(C.indexation, "הצמדה צפויה", `₪${ils(it.indexation)}`) : ""}`;
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
          margin: 18,
          align: "left",
          rich: {
            n: { fontFamily: FONT, fontSize: 13, fontWeight: 600, color: "#15171c", lineHeight: 18, align: "right", width: 176 },
            b: { fontFamily: FONT, fontSize: 11.5, color: "#5c606b", lineHeight: 16, align: "right", width: 176 },
          },
        },
      },
      series: [
        {
          type: "bar",
          name: "ריבית",
          stack: "c",
          barWidth: 18,
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
                barWidth: 18,
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
        `<b>${p.name}</b>${tipLine(p.color, "יתרה", `₪${ils(p.value)}`)}${tipLine(p.color, "מהחוב", `${Math.round(p.percent)}%`)}`,
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

function timeOption(m: Map_) {
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
    grid: { top: 26, right: 58, bottom: 30, left: 52 },
    tooltip: {
      ...TIP,
      trigger: "axis",
      axisPointer: { type: "shadow", shadowStyle: { color: "rgba(91,84,214,0.06)" } },
      formatter: (ps: { seriesName: string; value: number; color: string; axisValue: string }[]) => {
        const pay = ps.filter((p) => p.seriesName !== "יתרה").reduce((s, p) => s + p.value, 0);
        return `<b>${ps[0]?.axisValue}</b>${tipLine("#15171c", "סה״כ בשנה", `₪${ils(pay)}`)}${ps.map((p) => tipLine(p.color, p.seriesName, `₪${ils(p.value)}`)).join("")}`;
      },
    },
    xAxis: { type: "category", data: ys, ...axisBase, axisLabel: { ...axisBase.axisLabel, interval: ys.length > 16 ? 2 : ys.length > 8 ? 1 : 0 } },
    yAxis: [
      { type: "value", ...axisBase, axisLabel: { ...axisBase.axisLabel, formatter: (v: number) => short(v) }, splitNumber: 4, splitLine: { lineStyle: { color: GRID_LINE } } },
      { type: "value", ...axisBase, axisLabel: { ...axisBase.axisLabel, color: AXIS_INK, formatter: (v: number) => short(v) }, splitLine: { show: false }, splitNumber: 4 },
    ],
    series: [
      bar("קרן", "principal", C.principal, false),
      bar("ריבית", "interest", C.interest, !hasIdx),
      ...(hasIdx ? [bar("הצמדה", "indexation", C.indexation, true)] : []),
      {
        type: "line",
        name: "יתרה",
        yAxisIndex: 1,
        data: m.years.map((y) => Math.round(y.balance)),
        smooth: 0.25,
        symbol: "none",
        lineStyle: { color: "#15171c", width: 1.8, type: [6, 4] },
      },
    ],
  };
}

/* ------------------------------------------------------------- table */

type Sort = "future" | "balance" | "rate" | "monthly" | "left";
type Filter = "all" | Family;

function Table({ m, lit }: { m: Map_; lit: Set<string> }) {
  const [sort, setSort] = useState<Sort>("future");
  const [filter, setFilter] = useState<Filter>("all");
  const fams = (["mortgage", "loan"] as Family[]).filter((f) => m.totals.count[f]);
  const key: Record<Sort, (r: CostRow) => number> = {
    future,
    balance: (r) => r.balance,
    rate: (r) => r.rate ?? -1,
    monthly: (r) => r.monthly,
    left: (r) => r.months ?? 0,
  };
  const rows = m.rows.filter((r) => filter === "all" || r.family === filter).sort((x, y) => key[sort](y) - key[sort](x));
  const maxFut = Math.max(1, ...m.rows.map(future));
  const hasIdx = m.totals.indexation > 0;
  const th = (k: Sort, label: string) => (
    <th>
      <button className="cm-th" data-on={sort === k || undefined} onClick={() => setSort(k)}>
        {label}
        <CaretDown size={11} weight="bold" />
      </button>
    </th>
  );
  return (
    <Card
      id="cm-all"
      title="כל ההלוואות"
      aside={
        fams.length > 1 ? (
          <div className="cm-seg" role="radiogroup" aria-label="סינון">
            {(["all", ...fams] as Filter[]).map((f) => (
              <button key={f} role="radio" aria-checked={filter === f} onClick={() => setFilter(f)}>
                {f === "all" ? "הכול" : FAMILY_NAME[f][1]}
                <span className="cm-num">{f === "all" ? m.rows.length : m.totals.count[f]}</span>
              </button>
            ))}
          </div>
        ) : undefined
      }
    >
      <table className="cm-table">
        <thead>
          <tr>
            <th>הלוואה</th>
            {th("balance", "יתרה")}
            {th("rate", "ריבית")}
            {th("monthly", "החזר חודשי")}
            {th("left", "נותרו")}
            <th>ריבית שתשולם</th>
            {hasIdx && <th>הצמדה צפויה</th>}
            {th("future", "עוד ישולם מעבר לקרן")}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.uid} data-lit={lit.has(r.uid) || undefined}>
              <td className="cm-t-name">
                <span className="cm-fam" style={{ background: C[r.family] }} title={FAMILY_NAME[r.family][0]} />
                <span className="cm-t-id">
                  <b>{r.name}</b>
                  <small>{r.bank.replace(/\s*בע"מ\s*$/, "")}</small>
                  {r.marks.some((x) => !x.text.startsWith("ריבית")) && (
                    <span className="cm-marks">
                      {r.marks.filter((x) => !x.text.startsWith("ריבית")).map((mk) => (
                        <span key={mk.text} data-tone={mk.tone}>{mk.text}</span>
                      ))}
                    </span>
                  )}
                </span>
              </td>
              <td><N v={r.balance} /></td>
              <td className={r.marks.some((x) => x.text.startsWith("ריבית")) ? "cm-hot" : undefined}>
                <span className="cm-num" dir="ltr">{r.rate !== null ? `${pct(r.rate, 2)}%` : "—"}</span>
              </td>
              <td>{r.monthly > 0 ? <N v={r.monthly} /> : "—"}</td>
              <td className="cm-t-soft">{years(r.months)}</td>
              <td className={(r.interest ?? 0) > 0 ? "cm-hot" : "cm-t-soft"}>{r.interest !== null && r.interest > 0 ? <N v={r.interest} /> : "—"}</td>
              {hasIdx && <td className={r.indexation > 0 ? "cm-warm" : "cm-t-soft"}>{r.indexation > 0 ? <N v={r.indexation} /> : "—"}</td>}
              <td className="cm-t-fut">
                <span className="cm-t-bar">
                  <span style={{ width: `${(future(r) / maxFut) * 100}%` }}>
                    {(r.interest ?? 0) > 0 && <i style={{ flexGrow: r.interest ?? 0, background: C.interest }} />}
                    {r.indexation > 0 && <i style={{ flexGrow: r.indexation, background: C.indexation }} />}
                  </span>
                </span>
                <b><N v={future(r)} /></b>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

/* ------------------------------------------------------------------ page */

function Legend({ idx, line, principal = true }: { idx: boolean; line?: boolean; principal?: boolean }) {
  return (
    <div className="cm-legend">
      {principal && <span><i style={{ background: C.principal }} />קרן</span>}
      <span><i style={{ background: C.interest }} />ריבית</span>
      {idx && <span><i style={{ background: C.indexation }} />הצמדה</span>}
      {line && <span><i className="cm-legend-line" />יתרה</span>}
    </div>
  );
}

function Body({ m }: { m: Map_ }) {
  const go = useStageGo();
  const [picked, setPicked] = useState<Pain | null>(null);
  const lit = useMemo(() => new Set(picked?.uids ?? []), [picked]);
  const ranked = useMemo(() => rankedOption(m), [m]);
  const time = useMemo(() => timeOption(m), [m]);
  const idx = m.totals.indexation > 0;
  return (
    <div className="cm-page">
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
          <p className="cm-card-sub">מה עוד ישולם על כל הלוואה מעבר לקרן</p>
          <EChart option={ranked.option} height={ranked.height} />
        </Card>
        <Card title="באילו מסלולים החוב?">
          <Tracks m={m} />
        </Card>
      </div>
      <Card id="cm-time" title="כמה תשלמו כל שנה?" aside={<Legend idx={idx} line />}>
        <EChart option={time} height={320} />
      </Card>
      <Table m={m} lit={lit} />
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
        { id: "cm-top", label: "סך הכול" },
        { id: "cm-pains", label: "מה בולט" },
        { id: "cm-cost", label: "מה עולה הכי הרבה" },
        { id: "cm-time", label: "לאורך השנים" },
        { id: "cm-all", label: "כל ההלוואות" },
      ]}
      onClose={onClose}
    >
      {m.rows.length ? (
        <Body m={m} />
      ) : (
        <div className="cm-page">
          <p className="cm-empty">בדוח אין משכנתאות או הלוואות פעילות על שם הלקוח.</p>
        </div>
      )}
    </Stage>
  );
}

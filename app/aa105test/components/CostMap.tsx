"use client";

// מפת עלויות — every mortgage and loan on the credit report, and what each
// will still cost: the balance, the interest, the CPI on top. Presented on the
// same full-screen Stage as the brief and the analyses.
//
// One idea carries the page: a debt is a bar whose length is everything that
// will still leave the account, cut into קרן / ריבית / הצמדה. The hero is that
// bar for the whole household; the list is the same bar per debt, on one scale,
// so the dear ones are visibly long.

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CaretDown } from "@phosphor-icons/react";
import type { Analysis } from "@/app/aa102test/lib/analysis";
import EChart, { FONT, AXIS_INK, GRID_LINE, axisBase, short } from "@/app/aa102test/components/EChart";
import Stage, { useStageGo } from "./Stage";
import { buildCostMap, ils, pct, type CostMap as Map_, type CostRow, type Family, type Pain } from "../lib/costmap";
import "../costmap.css";

const C = {
  principal: "#c4c8dc",
  interest: "#d6336c",
  indexation: "#e8a33d",
  mortgage: "#5b54d6",
  loan: "#e07b39",
};
const FAMILY_NAME: Record<Family, [string, string]> = { mortgage: ["משכנתא", "משכנתאות"], loan: ["הלוואה", "הלוואות"] };

type Sort = "cost" | "rate" | "balance" | "monthly";
type Filter = "all" | Family;

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
  return y >= 2 ? `${pct(y, 1)} שנ׳` : `${months} ח׳`;
}

/* ------------------------------------------------------------------ hero */

function Hero({ m }: { m: Map_ }) {
  const reduce = useReducedMotion();
  const t = m.totals;
  const parts = [
    { key: "principal", label: "קרן", v: t.balance, c: C.principal },
    { key: "interest", label: "ריבית", v: t.interest, c: C.interest },
    { key: "indexation", label: `הצמדה צפויה, ${pct(m.inflation, 1)}% לשנה`, v: t.indexation, c: C.indexation },
  ].filter((p) => p.v > 0);
  const extra = t.interest + t.indexation;
  return (
    <section id="cm-top" className="cm-hero">
      <h2 className="cm-head">
        <span className="cm-head-a">
          <N v={t.balance} /> שנותרו לשלם
        </span>
        <span className="cm-head-b">
          יעלו עד הסוף <N v={t.total} />
        </span>
      </h2>

      <div className="cm-bill" role="img" aria-label={`קרן ${ils(t.balance)}, ריבית ${ils(t.interest)}, הצמדה ${ils(t.indexation)}`}>
        {parts.map((p, i) => (
          <motion.span
            key={p.key}
            className="cm-bill-seg"
            data-k={p.key}
            style={{ flexGrow: p.v, background: p.c }}
            initial={{ scaleX: reduce ? 1 : 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: reduce ? 0 : 0.9, ease: [0.16, 1, 0.3, 1], delay: reduce ? 0 : 0.15 + i * 0.12 }}
          />
        ))}
      </div>
      <div className="cm-bill-key">
        {parts.map((p) => (
          <div key={p.key} className="cm-bill-k">
            <span className="cm-dot" style={{ background: p.c }} />
            <span className="cm-bill-l">{p.label}</span>
            <b>
              <N v={p.v} approx={p.key !== "principal"} />
            </b>
            <span className="cm-bill-s">{Math.round((p.v / t.total) * 100)}%</span>
          </div>
        ))}
      </div>

      <dl className="cm-facts">
        <div>
          <dt>על כל שקל קרן</dt>
          <dd className={t.perShekel && t.perShekel >= 1.5 ? "cm-hot" : undefined}>
            <span className="cm-num" dir="ltr">
              <span className="cm-cur">₪</span>
              {t.perShekel ? pct(t.perShekel, 2) : "—"}
            </span>
          </dd>
        </div>
        <div>
          <dt>מעבר לקרן</dt>
          <dd className="cm-hot">
            <N v={extra} approx />
          </dd>
        </div>
        <div>
          <dt>החזר חודשי</dt>
          <dd>
            <N v={t.monthly} />
          </dd>
        </div>
        <div>
          <dt>ריבית ממוצעת</dt>
          <dd>
            <span className="cm-num" dir="ltr">
              {t.rate !== null ? pct(t.rate, 2) : "—"}
              <span className="cm-cur">%</span>
            </span>
          </dd>
        </div>
        <div>
          <dt>חובות</dt>
          <dd className="cm-count">
            {(["mortgage", "loan"] as Family[])
              .filter((f) => t.count[f])
              .map((f) => (
                <span key={f}>
                  <span className="cm-num">{t.count[f]}</span> {FAMILY_NAME[f][t.count[f] > 1 ? 1 : 0]}
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
  if (!pains.length) return null;
  return (
    <section className="cm-pains" aria-label="נקודות כאב">
      {pains.map((p) => (
        <button key={p.id} className="cm-pain" data-tone={p.tone} aria-pressed={picked === p.id} onClick={() => onPick(p)}>
          <span className="cm-pain-fig" dir="ltr">
            {p.figure}
          </span>
          <span className="cm-pain-t">{p.title}</span>
        </button>
      ))}
    </section>
  );
}

/* ------------------------------------------------------------------ rows */

function Row({ r, max, lit, open, onToggle }: { r: CostRow; max: number; lit: boolean; open: boolean; onToggle: () => void }) {
  const reduce = useReducedMotion();
  const w = max > 0 ? (r.total / max) * 100 : 0;
  return (
    <li className="cm-row" data-lit={lit || undefined} data-open={open || undefined} data-heat={r.heat}>
      <button className="cm-row-main" onClick={onToggle} aria-expanded={open}>
        <span className="cm-c-name">
          <span className="cm-fam" style={{ background: C[r.family] }} title={FAMILY_NAME[r.family][0]} />
          <span className="cm-name">
            <b>{r.track}</b>
            <span className="cm-sub">
              <span>{r.bank.replace(/\s*בע"מ\s*$/, "")}</span>
              {r.purpose && <span>{r.purpose}</span>}
              {r.startYear && <span>מ-{r.startYear}</span>}
            </span>
            {r.marks.length > 0 && (
              <span className="cm-marks">
                {r.marks.map((mk) => (
                  <span key={mk.text} data-tone={mk.tone}>
                    {mk.text}
                  </span>
                ))}
              </span>
            )}
          </span>
        </span>
        <span className="cm-c-rate" data-heat={r.marks.some((m) => m.text.startsWith("ריבית")) ? 2 : undefined}>
          <span className="cm-num" dir="ltr">
            {r.rate !== null ? pct(r.rate, 2) : "—"}
            {r.rate !== null && <span className="cm-cur">%</span>}
          </span>
          <span className="cm-ratebar">
            <span style={{ width: `${Math.min(100, ((r.rate ?? 0) / 15) * 100)}%` }} />
          </span>
        </span>
        <span className="cm-c-left">{years(r.months)}</span>
        <span className="cm-c-mo">{r.monthly > 0 ? <N v={r.monthly} /> : "—"}</span>
        <span className="cm-c-bar">
          <motion.span
            className="cm-bar"
            style={{ width: `${w}%` }}
            initial={{ scaleX: reduce ? 1 : 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: reduce ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <span style={{ flexGrow: r.balance, background: C.principal }} />
            {(r.interest ?? 0) > 0 && <span style={{ flexGrow: r.interest ?? 0, background: C.interest }} />}
            {r.indexation > 0 && <span style={{ flexGrow: r.indexation, background: C.indexation }} />}
          </motion.span>
        </span>
        <span className="cm-c-total">
          <N v={r.balance} />
          {future(r) > 0 && (
            <span className="cm-plus" data-k={r.indexation > (r.interest ?? 0) ? "cpi" : "int"}>
              + <N v={future(r)} cur={false} />
            </span>
          )}
        </span>
        <span className="cm-c-ps" data-heat={r.perShekel && r.perShekel >= 1.5 ? 2 : undefined}>
          {r.perShekel ? (
            <span className="cm-num" dir="ltr">
              {pct(r.perShekel, 2)}
            </span>
          ) : (
            "—"
          )}
        </span>
        <CaretDown className="cm-caret" size={14} weight="bold" />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="cm-more"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] }}
          >
            <dl className="cm-more-in">
              <div><dt>נלקח</dt><dd><N v={r.original} /></dd></div>
              <div><dt>יתרה היום</dt><dd><N v={r.balance} /></dd></div>
              {r.owedShare !== null && (
                <div>
                  <dt>{r.owedShare >= 1 ? "גדלה ב" : "נפרע"}</dt>
                  <dd className={r.owedShare >= 0.8 && r.linked ? "cm-warm" : undefined}>
                    {Math.abs(Math.round((1 - r.owedShare) * 100))}%
                  </dd>
                </div>
              )}
              <div><dt>ריבית שעוד תשולם</dt><dd className="cm-hot">{r.interest !== null ? <N v={r.interest} approx /> : "—"}</dd></div>
              {r.linked && <div><dt>הצמדה צפויה</dt><dd className="cm-warm"><N v={r.indexation} approx /></dd></div>}
              <div><dt>סיום</dt><dd className="cm-num">{r.endDate || "—"}</dd></div>
              {r.overdue > 0 && <div><dt>פיגור</dt><dd className="cm-hot"><N v={r.overdue} />{r.arrearsRange ? ` · ${r.arrearsRange}` : ""}</dd></div>}
              {r.shared && <div><dt>משותף</dt><dd>מופיע בשני הדוחות</dd></div>}
            </dl>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function Debts({ m, lit }: { m: Map_; lit: Set<string> }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("cost");
  const [open, setOpen] = useState<string | null>(null);
  const has = (f: Family) => m.totals.count[f] > 0;
  const fams: Family[] = (["mortgage", "loan"] as Family[]).filter(has);
  const shown = fams.filter((f) => filter === "all" || filter === f);
  const key: Record<Sort, (r: CostRow) => number> = {
    cost: (r) => future(r),
    rate: (r) => r.rate ?? -1,
    balance: (r) => r.balance,
    monthly: (r) => r.monthly,
  };
  const max = Math.max(1, ...m.rows.map((r) => r.total));
  const cols: [Sort | null, string][] = [
    [null, ""],
    ["rate", "ריבית"],
    [null, "נותרו"],
    ["monthly", "החזר חודשי"],
    ["cost", "עלות עד הסוף"],
    ["balance", "יתרה + עלות"],
    [null, "לשקל"],
  ];
  return (
    <section id="cm-rows" className="cm-panel">
      <header className="cm-panel-h">
        <h3>כל החובות</h3>
        {fams.length > 1 && (
          <div className="cm-seg" role="radiogroup" aria-label="סינון">
            {(["all", ...fams] as Filter[]).map((f) => (
              <button key={f} role="radio" aria-checked={filter === f} onClick={() => setFilter(f)}>
                {f === "all" ? "הכול" : FAMILY_NAME[f][1]}
                <span className="cm-num">{f === "all" ? m.rows.length : m.totals.count[f]}</span>
              </button>
            ))}
          </div>
        )}
        <div className="cm-legend">
          <span><i style={{ background: C.principal }} />קרן</span>
          <span><i style={{ background: C.interest }} />ריבית</span>
          {m.totals.indexation > 0 && <span><i style={{ background: C.indexation }} />הצמדה</span>}
        </div>
      </header>
      <div className="cm-cols" role="row">
        {cols.map(([k, label], i) =>
          k ? (
            <button key={i} className="cm-col" data-on={sort === k || undefined} onClick={() => setSort(k)}>
              {label}
              <CaretDown size={11} weight="bold" />
            </button>
          ) : (
            <span key={i} className="cm-col">{label}</span>
          )
        )}
      </div>
      {shown.map((f) => {
        const rows = m.rows.filter((r) => r.family === f).sort((x, y) => key[sort](y) - key[sort](x));
        const fut = rows.reduce((s, r) => s + future(r), 0);
        return (
          <div key={f} className="cm-group">
            {fams.length > 1 && (
              <div className="cm-group-h">
                <span className="cm-fam" style={{ background: C[f] }} />
                <b>{FAMILY_NAME[f][1]}</b>
                <span className="cm-group-n">
                  <N v={m.totals.balanceBy[f]} /> יתרה
                </span>
                {fut > 0 && (
                  <span className="cm-group-n cm-hot">
                    + <N v={fut} approx /> ריבית והצמדה
                  </span>
                )}
              </div>
            )}
            <ol className="cm-list">
              {rows.map((r) => (
                <Row key={r.uid} r={r} max={max} lit={lit.has(r.uid)} open={open === r.uid} onToggle={() => setOpen(open === r.uid ? null : r.uid)} />
              ))}
            </ol>
          </div>
        );
      })}
    </section>
  );
}

/* ------------------------------------------------------- tracks + scatter */

function Tracks({ m }: { m: Map_ }) {
  const maxFut = Math.max(1, ...m.tracks.map((t) => t.balance + t.interest + t.indexation));
  return (
    <div className="cm-tracks">
      {m.tracks.map((t) => (
        <div key={t.label} className="cm-track">
          <div className="cm-track-h">
            <b>{t.label}</b>
            <span className="cm-num">{Math.round(t.share * 100)}%</span>
            <span className="cm-track-r" data-heat={(t.rate ?? 0) >= 7 ? 2 : undefined}>
              <span className="cm-num" dir="ltr">{t.rate !== null ? `${pct(t.rate, 2)}%` : "—"}</span>
            </span>
          </div>
          <div className="cm-track-bar" style={{ width: `${((t.balance + t.interest + t.indexation) / maxFut) * 100}%` }}>
            <span style={{ flexGrow: t.balance, background: C.principal }} />
            {t.interest > 0 && <span style={{ flexGrow: t.interest, background: C.interest }} />}
            {t.indexation > 0 && <span style={{ flexGrow: t.indexation, background: C.indexation }} />}
          </div>
          <div className="cm-track-f">
            <span><N v={t.balance} /></span>
            {t.interest > 0 && <span className="cm-hot">+<N v={t.interest} cur={false} /> ריבית</span>}
            {t.indexation > 0 && <span className="cm-warm">+<N v={t.indexation} cur={false} /> הצמדה</span>}
            <span className="cm-track-n">{t.count} {t.count > 1 ? "חובות" : "חוב"}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function scatterOption(m: Map_) {
  const maxBal = Math.max(1, ...m.rows.map((r) => r.balance));
  const series = (["mortgage", "loan"] as Family[])
    .filter((f) => m.totals.count[f])
    .map((f) => ({
      type: "scatter",
      name: FAMILY_NAME[f][1],
      data: m.rows
        .filter((r) => r.family === f && r.rate !== null && r.months)
        .map((r) => ({ value: [(r.months ?? 0) / 12, r.rate ?? 0, r.balance], row: r })),
      symbolSize: (v: number[]) => 8 + Math.sqrt(v[2] / maxBal) * 46,
      itemStyle: { color: C[f], opacity: 0.55, borderColor: "#fff", borderWidth: 1.5 },
      emphasis: { itemStyle: { opacity: 0.95 } },
    }));
  return {
    grid: { top: 18, right: 22, bottom: 34, left: 46 },
    tooltip: {
      trigger: "item",
      backgroundColor: "#fff",
      borderColor: "rgba(0,0,0,0.11)",
      padding: [8, 11],
      extraCssText: "border-radius:10px;box-shadow:0 2px 6px -2px rgba(0,0,0,.06),0 20px 48px -16px rgba(0,0,0,.28);direction:rtl;",
      textStyle: { color: "#15171c", fontFamily: FONT, fontSize: 12 },
      formatter: (p: { data: { row: CostRow } }) => {
        const r = p.data.row;
        return `<b>${r.track}</b><br/>₪${ils(r.balance)} · ${pct(r.rate ?? 0, 2)}% · ${years(r.months)}<br/><span style="color:${C.interest}">ריבית ~₪${ils(r.interest ?? 0)}</span>${r.indexation ? `<br/><span style="color:#a06a12">הצמדה ~₪${ils(r.indexation)}</span>` : ""}`;
      },
    },
    xAxis: {
      type: "value",
      name: "שנים שנותרו",
      nameLocation: "middle",
      nameGap: 24,
      nameTextStyle: { color: AXIS_INK, fontFamily: FONT, fontSize: 11 },
      min: 0,
      ...axisBase,
      axisLine: { show: true, lineStyle: { color: "rgba(28,28,30,.12)" } },
      splitLine: { lineStyle: { color: GRID_LINE } },
    },
    yAxis: {
      type: "value",
      min: 0,
      ...axisBase,
      axisLabel: { ...axisBase.axisLabel, formatter: (v: number) => `${v}%` },
    },
    series,
  };
}

/* ------------------------------------------------------------------ time */

function timeOption(m: Map_) {
  const ys = m.years.map((y) => String(y.year));
  const bar = (name: string, key: "principal" | "interest" | "indexation", color: string) => ({
    type: "bar",
    name,
    stack: "pay",
    barWidth: "62%",
    data: m.years.map((y) => Math.round(y[key])),
    itemStyle: { color },
    emphasis: { focus: "series" },
  });
  return {
    grid: { top: 24, right: 58, bottom: 30, left: 52 },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow", shadowStyle: { color: "rgba(91,84,214,0.06)" } },
      backgroundColor: "#fff",
      borderColor: "rgba(0,0,0,0.11)",
      padding: [8, 11],
      extraCssText: "border-radius:10px;box-shadow:0 2px 6px -2px rgba(0,0,0,.06),0 20px 48px -16px rgba(0,0,0,.28);direction:rtl;",
      textStyle: { color: "#15171c", fontFamily: FONT, fontSize: 12 },
      formatter: (ps: { seriesName: string; value: number; color: string; axisValue: string }[]) => {
        const head = `<b>${ps[0]?.axisValue}</b>`;
        const pay = ps.filter((p) => p.seriesName !== "יתרה").reduce((s, p) => s + p.value, 0);
        const rows = ps
          .map((p) => `<div style="display:flex;gap:10px;align-items:center"><span style="width:8px;height:8px;border-radius:2px;background:${p.color}"></span>${p.seriesName}<b dir="ltr" style="margin-inline-start:auto">₪${ils(p.value)}</b></div>`)
          .join("");
        return `${head}<div style="margin-top:3px">החזר בשנה <b dir="ltr">₪${ils(pay)}</b></div>${rows}`;
      },
    },
    xAxis: { type: "category", data: ys, ...axisBase, axisLabel: { ...axisBase.axisLabel, interval: ys.length > 16 ? 2 : ys.length > 8 ? 1 : 0 } },
    yAxis: [
      { type: "value", ...axisBase, axisLabel: { ...axisBase.axisLabel, formatter: (v: number) => short(v) }, splitNumber: 4 },
      { type: "value", ...axisBase, axisLabel: { ...axisBase.axisLabel, formatter: (v: number) => short(v) }, splitLine: { show: false }, splitNumber: 4 },
    ],
    series: [
      bar("קרן", "principal", C.principal),
      bar("ריבית", "interest", C.interest),
      ...(m.totals.indexation > 0 ? [bar("הצמדה", "indexation", C.indexation)] : []),
      {
        type: "line",
        name: "יתרה",
        yAxisIndex: 1,
        data: m.years.map((y) => Math.round(y.balance)),
        smooth: 0.25,
        symbol: "none",
        lineStyle: { color: "#15171c", width: 1.6 },
        areaStyle: { color: "rgba(21,23,28,0.035)" },
      },
    ],
  };
}

/* ------------------------------------------------------------------ page */

function Body({ m }: { m: Map_ }) {
  const go = useStageGo();
  const [picked, setPicked] = useState<Pain | null>(null);
  const lit = useMemo(() => new Set(picked?.uids ?? []), [picked]);
  const scatter = useMemo(() => scatterOption(m), [m]);
  // The map earns its place only when the debts differ in both rate and term.
  const spread = useMemo(() => {
    const ys = new Set(m.rows.filter((r) => r.months).map((r) => Math.round((r.months ?? 0) / 24)));
    const rs = new Set(m.rows.filter((r) => r.rate !== null).map((r) => Math.round((r.rate ?? 0) * 2)));
    return ys.size >= 2 && rs.size >= 2 && m.rows.length >= 3;
  }, [m]);
  const time = useMemo(() => timeOption(m), [m]);
  return (
    <div className="cm-page">
      <Hero m={m} />
      <Pains
        pains={m.pains}
        picked={picked?.id ?? null}
        onPick={(p) => {
          const on = picked?.id === p.id ? null : p;
          setPicked(on);
          if (on) go("cm-rows");
        }}
      />
      <Debts m={m} lit={lit} />
      <section id="cm-mix" className={spread ? "cm-split" : undefined}>
        <div className="cm-panel">
          <header className="cm-panel-h">
            <h3>לפי מסלול</h3>
          </header>
          <Tracks m={m} />
        </div>
        {spread && (
          <div className="cm-panel">
            <header className="cm-panel-h">
              <h3>ריבית מול זמן</h3>
              <span className="cm-panel-note">גודל העיגול לפי היתרה</span>
            </header>
            <EChart option={scatter} height={300} />
          </div>
        )}
      </section>
      <section id="cm-time" className="cm-panel">
        <header className="cm-panel-h">
          <h3>כמה יוצא כל שנה</h3>
          <div className="cm-legend">
            <span><i style={{ background: C.principal }} />קרן</span>
            <span><i style={{ background: C.interest }} />ריבית</span>
            {m.totals.indexation > 0 && <span><i style={{ background: C.indexation }} />הצמדה</span>}
            <span><i className="cm-line" />יתרה</span>
          </div>
        </header>
        <EChart option={time} height={320} />
      </section>
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
        { id: "cm-top", label: "התמונה" },
        { id: "cm-rows", label: "כל החובות" },
        { id: "cm-mix", label: "מסלולים" },
        { id: "cm-time", label: "לאורך זמן" },
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

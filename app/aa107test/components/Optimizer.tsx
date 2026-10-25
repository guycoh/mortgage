"use client";

// מחולל התמהיל האופטימלי — the sheet. Settings on the start side, the answer
// beside them, recomputed live (the LP solves in ~50ms, so every slider is
// the real optimizer, not a preview). "יצירת התמהיל" lands the result on the
// board as a new mix tab, every row editable like any other.

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import NumberFlow from "@number-flow/react";
import { ArrowLeft, CheckCircle, Lightning, ShieldCheck, Sparkle, WarningCircle, X } from "@phosphor-icons/react";
import Btn from "@/app/aa102test/components/Btn";
import Select from "@/app/aa102test/components/Select";
import { TRACK_HEX, owedOnly, type ImportedLoan } from "@/app/aa102test/lib/credit";
import type { Forecast } from "@/app/aa102test/lib/forecast";
import { nominalAt } from "@/app/aa102test/lib/forecast";
import { priceLoan } from "@/app/aa102test/lib/price";
import { monthOnePay } from "@/app/aa102test/lib/timeline";
import { BANKS, TRACKS, TRACK_LABEL, TRACK_PATH, TRACK_SHORT, type MarketSnapshot, type TrackKey } from "../lib/market";
import {
  DEFAULT_SETTINGS,
  LTV_MAX,
  SCENARIOS,
  outlookEcon,
  run,
  totalsOf,
  type Objective,
  type Outlook,
  type Result,
  type Settings,
} from "../lib/optimize";
import fallback from "../lib/market-snapshot.json";
import "../optimizer.css";

const STORE = "aa107.optSettings";
const nis = (x: number) => `₪${Math.round(x).toLocaleString("he-IL")}`;
const pct = (x: number, d = 2) => `${x.toFixed(d)}%`;
const yrs = (months: number) => {
  const y = Math.round((months / 12) * 10) / 10;
  return `${Number.isInteger(y) ? y : y.toFixed(1)} שנים`;
};

const OBJECTIVES: { id: Objective; label: string; hint: string }[] = [
  { id: "pv", label: "ערך נוכחי", hint: "כל התשלומים העתידיים, מהוונים בשיעור ההיוון — העלות הכלכלית האמיתית" },
  { id: "total", label: "סך התשלומים", hint: "סכום כל התשלומים בשקלים של אותו יום" },
  { id: "payment", label: "החזר נמוך", hint: "ההחזר החודשי הנמוך ביותר האפשרי במסגרת הכללים" },
];
const OUTLOOKS: { id: Outlook; label: string; hint: string }[] = [
  { id: "boi", label: "בנק ישראל", hint: "עקומי השוק לפי הוראה 451 — כמו בכל בנק ובלוח" },
  { id: "blend", label: "ביניים", hint: "באמצע בין עקום השוק לריבית של היום" },
  { id: "flat", label: "ריבית נשארת", hint: "ריבית בנק ישראל נשארת ברמתה היום לאורך כל התקופה" },
];

type Props = {
  master: ImportedLoan[];
  forecast: Forecast | null;
  inflation: number;
  discountRate: number;
  leadId: number | null;
  clientName?: string;
  onApply: (rows: ImportedLoan[], name: string, target: number) => void;
  onClose: () => void;
};

function Num({
  value,
  onChange,
  suffix,
  prefix,
  step = 1,
  width = 96,
  placeholder,
  label,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  suffix?: string;
  prefix?: string;
  step?: number;
  width?: number;
  placeholder?: string;
  label: string;
}) {
  return (
    <span className="opt-num" style={{ width }}>
      {prefix && <i>{prefix}</i>}
      <input
        type="number"
        inputMode="decimal"
        step={step}
        aria-label={label}
        placeholder={placeholder ?? "—"}
        value={value === null || Number.isNaN(value) ? "" : value}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        onFocus={(e) => e.currentTarget.select()}
      />
      {suffix && <i>{suffix}</i>}
    </span>
  );
}

function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string; hint?: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <span className="opt-seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} data-on={value === o.id || undefined} title={o.hint} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </span>
  );
}

function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button type="button" className="opt-toggle" role="switch" aria-checked={on} data-on={on || undefined} onClick={() => onChange(!on)} title={hint}>
      <span className="opt-toggle-track" aria-hidden>
        <span />
      </span>
      {label}
    </button>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="opt-field" title={hint}>
      <span className="opt-field-label">{label}</span>
      {children}
    </label>
  );
}

/* ------------------------------------------------------------ frontier */

function Frontier({ r, metricLabel, onPick }: { r: Result; metricLabel: string; onPick: (pay: number) => void }) {
  const pts = r.frontier;
  const base = { pay: r.baseline.firstPayment, cost: metricLabel === "סך התשלומים" ? r.baseline.total : r.baseline.pv };
  const all = [...pts, base];
  if (pts.length < 2) return null;
  const W = 560;
  const H = 210;
  const P = { l: 70, r: 14, t: 14, b: 30 };
  const xs = all.map((p) => p.pay);
  const ys = all.map((p) => p.cost);
  const x0 = Math.min(...xs) * 0.96;
  const x1 = Math.max(...xs) * 1.02;
  const y0 = Math.min(...ys) * 0.97;
  const y1 = Math.max(...ys) * 1.02;
  const X = (v: number) => P.l + ((v - x0) / (x1 - x0)) * (W - P.l - P.r);
  const Y = (v: number) => H - P.b - ((v - y0) / (y1 - y0)) * (H - P.t - P.b);
  const line = pts
    .filter((p) => !p.chosen)
    .sort((a, b) => a.pay - b.pay)
    .map((p, i) => `${i ? "L" : "M"}${X(p.pay).toFixed(1)},${Y(p.cost).toFixed(1)}`)
    .join(" ");
  const chosen = pts.find((p) => p.chosen);
  const ticks = (a: number, b: number, n: number) => Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));
  const k = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : `${Math.round(v / 1000)}K`);
  return (
    <figure className="opt-frontier">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="גבול היעילות: העלות הנמוכה ביותר לכל רמת החזר">
        {ticks(y0, y1, 4).map((v) => (
          <g key={`y${v}`}>
            <line x1={P.l} x2={W - P.r} y1={Y(v)} y2={Y(v)} className="opt-grid" />
            <text x={P.l - 8} y={Y(v) + 4} className="opt-tick" textAnchor="end">
              {k(v)}
            </text>
          </g>
        ))}
        {ticks(x0, x1, 5).map((v) => (
          <text key={`x${v}`} x={X(v)} y={H - 10} className="opt-tick" textAnchor="middle">
            ₪{Math.round(v).toLocaleString("he-IL")}
          </text>
        ))}
        <path d={line} className="opt-frontier-line" />
        {pts
          .filter((p) => !p.chosen)
          .map((p) => (
            <circle key={`${p.pay}`} cx={X(p.pay)} cy={Y(p.cost)} r={5} className="opt-frontier-pt" onClick={() => onPick(p.pay)}>
              <title>{`החזר ${nis(p.pay)} · ${metricLabel} ${nis(p.cost)} — לחיצה קובעת תקרה זו`}</title>
            </circle>
          ))}
        <g className="opt-frontier-base">
          <rect x={X(base.pay) - 5} y={Y(base.cost) - 5} width={10} height={10} rx={2} />
          <text x={X(base.pay) + 9} y={Y(base.cost) + 4}>היום</text>
        </g>
        {chosen && (
          <g className="opt-frontier-chosen">
            <circle cx={X(chosen.pay)} cy={Y(chosen.cost)} r={9} />
            <circle cx={X(chosen.pay)} cy={Y(chosen.cost)} r={4} />
          </g>
        )}
      </svg>
      <figcaption>
        <span>ציר אופקי: החזר חודשי ראשון</span>
        <span>ציר אנכי: {metricLabel}</span>
        <span>נקודה על הקו קובעת את תקרת ההחזר</span>
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------ the sheet */

export default function Optimizer({ master, forecast, inflation, discountRate, leadId, clientName, onApply, onClose }: Props) {
  const [market, setMarket] = useState<MarketSnapshot>(fallback as unknown as MarketSnapshot);
  const [origin, setOrigin] = useState<string>("bundled");
  const [settings, setSettings] = useState<Settings>(() => {
    let saved: Partial<Settings> = {};
    try {
      saved = JSON.parse(localStorage.getItem(STORE) || "{}");
    } catch {}
    return { ...DEFAULT_SETTINGS, ...saved, paymentCap: null, discountRate, income: null, propertyValue: null, age: null, cashOut: 0 };
  });
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/aa107/market")
      .then((r) => r.json())
      .then((j: { snapshot?: MarketSnapshot; origin?: string }) => {
        if (!alive || !j.snapshot) return;
        setMarket(j.snapshot);
        setOrigin(j.origin ?? "live");
      })
      .catch(() => {});
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      alive = false;
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    const { paymentCap: _c, income: _i, propertyValue: _v, age: _a, cashOut: _o, ...keep } = settings;
    try {
      localStorage.setItem(STORE, JSON.stringify(keep));
    } catch {}
  }, [settings]);

  const econ = useMemo(() => ({ inflation, forecast }), [inflation, forecast]);
  const projEcon = useMemo(() => outlookEcon(econ, settings.outlook), [econ, settings.outlook]);
  const owed = useMemo(() => owedOnly(master).filter((r) => (Number(r.amount) || 0) > 0), [master]);
  // Today's payment — the default ceiling ("don't pay more than you do now").
  const today = useMemo(() => totalsOf(owed, outlookEcon(econ, settings.outlook), settings).firstPayment, [owed, econ, settings]);
  useEffect(() => {
    if (settings.paymentCap === null && today > 0) setSettings((s) => ({ ...s, paymentCap: Math.ceil(today) }));
  }, [today, settings.paymentCap]);

  const live = useDeferredValue(settings);
  const result: Result | null = useMemo(() => {
    if (!forecast || !owed.length) return null;
    return run(master, econ, market, live);
  }, [master, econ, market, live, forecast, owed.length]);

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setSettings((s) => ({ ...s, [k]: v }));
  const r = result;
  const metricLabel = settings.objective === "total" ? "סך התשלומים" : "ערך נוכחי";
  const metric = (t: Result["totals"]) => (settings.objective === "total" ? t.total : t.pv);
  const saving = r?.ok ? metric(r.baseline) - metric(r.totals) : 0;

  // The reasons, in sentences an advisor can say out loud.
  const why = useMemo(() => {
    if (!r?.ok || !forecast) return [];
    const out: string[] = [];
    const proj = outlookEcon(econ, settings.outlook).forecast ?? forecast;
    const horizon = Math.max(12, r.totals.months);
    let avg = 0;
    for (let m = 1; m <= horizon; m++) avg += nominalAt(proj, m) + 1.5;
    avg /= horizon;
    const primeAvg = avg + market.housing.primeMargin;
    const usesPrime = r.plan.tranches.some((t) => t.track === "prime");
    const klz = r.plan.tranches.find((t) => t.track === "klz");
    if (klz && !usesPrime) {
      if (primeAvg >= klz.rate)
        out.push(`בתחזית שנבחרה הפריים צפוי לעמוד בממוצע על ${pct(primeAvg)} לאורך התקופה — קבועה לא צמודה ב-${pct(klz.rate)} זולה ממנו, וגם לא חשופה לשינויי ריבית ומדד.`);
      else
        out.push(
          `הפריים זול יותר בתחזית שנבחרה (ממוצע ${pct(primeAvg)} מול ${pct(klz.rate)} בקבועה), אבל ברתיעת הסיכון שנבחרה הקבועה עדיפה: בתרחיש עליית ריבית הוא מתייקר ב-${SCENARIOS[1].rate}% לשנה. הורדת רתיעת הסיכון תכניס פריים לתמהיל.`
        );
    }
    if (usesPrime) out.push(`פריים ב-${pct(market.boi.prime + market.housing.primeMargin)} (P${market.housing.primeMargin.toFixed(2)}) זול מהקבועה בתחזית שנבחרה; השליש הקבוע נשמר לפי הוראה 329.`);
    // Kept debts, said once: the cheap ones by name, the rest as one sentence.
    const kept = r.debts.filter((d) => (r.plan.refinance[d.id] ?? 0) === 0 && d.group === "mortgage");
    const cheapest = Math.min(...r.plan.tranches.map((t) => t.rate));
    const cheapKept = kept.filter((d) => d.rate < cheapest);
    if (cheapKept.length)
      out.push(
        cheapKept.length === 1
          ? `${cheapKept[0].label} ב-${pct(cheapKept[0].rate)} נשאר — זול מכל ריבית שהשוק נותן היום.`
          : `${cheapKept.length} מסלולים קיימים (${pct(Math.min(...cheapKept.map((d) => d.rate)))}–${pct(Math.max(...cheapKept.map((d) => d.rate)))}) נשארים — זולים מכל ריבית שהשוק נותן היום.`
      );
    const otherKept = kept.filter((d) => d.rate >= cheapest);
    if (otherKept.length)
      out.push(`${otherKept.length === 1 ? otherKept[0].label : `${otherKept.length} מסלולים נוספים`} נשאר${otherKept.length === 1 ? "" : "ים"} — מחזור${otherKept.length === 1 ? "ו" : "ם"} לא משפר את התמהיל בתנאים שנבחרו (תקופה, עמלה או מינימום למסלול).`);
    const fees = r.debts.filter((d) => (r.plan.refinance[d.id] ?? 0) > 0 && d.fee > 0);
    if (fees.length) {
      const total = fees.reduce((a, d) => a + d.fee * (r.plan.refinance[d.id] ?? 0), 0);
      out.push(`המחזור כולל עמלות פירעון${fees.some((d) => d.feeEstimated) ? " (משוערות)" : ""} של ${nis(total)} — והוא משתלם גם אחריהן.`);
    }
    const consolidated = r.debts.filter((d) => d.group === "loan" && (r.plan.refinance[d.id] ?? 0) > 0);
    if (consolidated.length)
      out.push(`${consolidated.length} הלוואות צרכניות (${nis(consolidated.reduce((a, d) => a + d.balance, 0))}) מאוחדות לכל מטרה בריבית ${pct(Math.min(...r.plan.tranches.filter((t) => t.segment === "allPurpose").map((t) => t.rate)))}.`);
    if (r.totals.months < r.baseline.months) out.push(`התקופה מתקצרת מ-${yrs(r.baseline.months)} ל-${yrs(r.totals.months)} בלי להגדיל את ההחזר.`);
    return out.slice(0, 6);
  }, [r, forecast, econ, settings.outlook, market]);

  const apply = () => {
    if (!r?.ok) return;
    const name = settings.objective === "payment" ? "תמהיל אופטימלי · החזר נמוך" : `תמהיל אופטימלי · ${metricLabel}`;
    onApply(r.rows, name, r.rows.reduce((a, x) => a + (Number(x.amount) || 0), 0));
    setApplied(true);
    // Every applied run is kept: settings, what it read, what it proposed.
    void fetch("/api/aa107/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        marketBuiltAt: market.builtAt,
        settings: { ...settings },
        input: { debts: r.debts.map((d) => ({ id: d.id, label: d.label, group: d.group, balance: d.balance, rate: d.rate, months: d.months, fee: d.fee, feeEstimated: d.feeEstimated })) },
        result: {
          tranches: r.plan.tranches.map((t) => ({ track: t.track, segment: t.segment, years: t.years, amount: Math.round(t.amount), rate: t.rate })),
          refinance: r.plan.refinance,
          totals: { ...r.totals, scen: undefined },
          baseline: { ...r.baseline, scen: undefined },
          checks: r.checks,
          pass: r.plan.pass,
        },
        applied: true,
      }),
    }).catch(() => {});
  };

  const capChips = today > 0 ? [
    { label: "כמו היום", v: Math.ceil(today) },
    { label: "−10%", v: Math.ceil(today * 0.9) },
    { label: "+10%", v: Math.ceil(today * 1.1) },
  ] : [];
  const sources = market.sources;

  return createPortal(
    <div className="lgr-vars opt-root" dir="rtl" role="dialog" aria-modal="true" aria-labelledby="opt-title">
      <motion.div className="opt-sheet" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}>
        <header className="opt-head">
          <span className="opt-mark" aria-hidden>
            <Sparkle size={18} weight="fill" />
          </span>
          <div className="opt-head-text">
            <h1 id="opt-title">תמהיל אופטימלי{clientName ? ` · ${clientName}` : ""}</h1>
            <p>
              {sources.map((s) => `${s.label.replace("בנק ישראל · ", "")} ${s.period}`).join("  ·  ")}
              {origin === "bundled" || origin === "db-stale" ? "  ·  נתונים שמורים" : ""}
            </p>
          </div>
          <button className="opt-close" onClick={onClose} aria-label="סגירה">
            <X size={18} weight="bold" />
          </button>
        </header>

        <div className="opt-body">
          {/* ------------------------------------------------ settings */}
          <aside className="opt-settings" aria-label="הגדרות">
            <section>
              <h2>מה למטב</h2>
              <Seg value={settings.objective} options={OBJECTIVES} onChange={(v) => set("objective", v)} label="יעד" />
              <p className="opt-note">{OBJECTIVES.find((o) => o.id === settings.objective)?.hint}</p>
            </section>

            <section>
              <h2>תקרת החזר חודשי</h2>
              <div className="opt-row">
                <Num label="תקרת החזר" value={settings.paymentCap || null} onChange={(v) => set("paymentCap", v ?? 0)} prefix="₪" width={130} step={100} placeholder="ללא" />
                <Seg value={settings.capOn} options={[{ id: "first", label: "ראשון" }, { id: "peak", label: "בשיא" }]} onChange={(v) => set("capOn", v)} label="החזר" />
              </div>
              <div className="opt-chips">
                {capChips.map((c) => (
                  <button key={c.label} type="button" data-on={settings.paymentCap === c.v || undefined} onClick={() => set("paymentCap", c.v)}>
                    {c.label} <b dir="ltr">{nis(c.v)}</b>
                  </button>
                ))}
                <button type="button" data-on={!settings.paymentCap || undefined} onClick={() => set("paymentCap", 0)}>
                  ללא תקרה
                </button>
              </div>
            </section>

            <section>
              <h2>תחזית הריבית</h2>
              <Seg value={settings.outlook} options={OUTLOOKS} onChange={(v) => set("outlook", v)} label="תחזית" />
              <p className="opt-note">{OUTLOOKS.find((o) => o.id === settings.outlook)?.hint}</p>
            </section>

            <section>
              <h2>רתיעה מסיכון</h2>
              <input
                className="opt-range"
                type="range"
                min={0}
                max={100}
                step={5}
                value={Math.round(settings.risk * 100)}
                onChange={(e) => set("risk", Number(e.target.value) / 100)}
                aria-label="רתיעה מסיכון"
                style={{ ["--v" as string]: `${settings.risk * 100}%` }}
              />
              <div className="opt-range-legend">
                <span>תוחלת בלבד</span>
                <b>{Math.round(settings.risk * 100)}</b>
                <span>התרחיש הגרוע</span>
              </div>
            </section>

            <section>
              <h2>בנק ותנאים</h2>
              <div className="opt-grid2">
                <Field label="בנק">
                  <Select variant="input" value={settings.bank} onChange={(v) => set("bank", v as Settings["bank"])} options={BANKS.map((b) => ({ value: b.id, label: b.label }))} ariaLabel="בנק" />
                </Field>
                <Field label="הנחת מו״מ" hint="הנחה על כל המסלולים, בנקודות אחוז">
                  <Num label="הנחת מו״מ" value={settings.negotiated} onChange={(v) => set("negotiated", v ?? 0)} suffix="%" step={0.05} width={92} />
                </Field>
                <Field label="שיעור היוון">
                  <Num label="שיעור היוון" value={settings.discountRate} onChange={(v) => set("discountRate", v ?? 0)} suffix="%" step={0.1} width={92} />
                </Field>
                <Field label="מינימום למסלול">
                  <Num label="מינימום למסלול" value={settings.minTrack} onChange={(v) => set("minTrack", v ?? 0)} prefix="₪" step={10000} width={120} />
                </Field>
              </div>
            </section>

            <section>
              <h2>תקופה ולווים</h2>
              <div className="opt-grid2">
                <Field label="שנים — מ">
                  <Num label="שנים מינימום" value={settings.minYears} onChange={(v) => set("minYears", Math.max(1, v ?? 1))} width={80} />
                </Field>
                <Field label="עד">
                  <Num label="שנים מקסימום" value={settings.maxYears} onChange={(v) => set("maxYears", Math.min(30, v ?? 30))} width={80} />
                </Field>
                <Field label="גיל הלווה הצעיר">
                  <Num label="גיל" value={settings.age} onChange={(v) => set("age", v)} width={80} />
                </Field>
                <Field label="גיל מרבי בסוף">
                  <Num label="גיל מרבי" value={settings.maxAgeAtEnd} onChange={(v) => set("maxAgeAtEnd", v ?? 85)} width={80} />
                </Field>
                <Field label="הכנסה פנויה" hint="לבדיקת שיעור ההחזר מהכנסה (הוראה 329 §5)">
                  <Num label="הכנסה" value={settings.income} onChange={(v) => set("income", v)} prefix="₪" step={500} width={120} />
                </Field>
                <Field label="שווי הנכס" hint="לבדיקת שיעור המימון (הוראה 329 §2)">
                  <Num label="שווי" value={settings.propertyValue} onChange={(v) => set("propertyValue", v)} prefix="₪" step={50000} width={130} />
                </Field>
              </div>
              {settings.propertyValue ? (
                <Seg
                  value={settings.propertyType}
                  options={[
                    { id: "single", label: `דירה יחידה ${Math.round(LTV_MAX.single * 100)}%` },
                    { id: "replacement", label: `חליפית ${Math.round(LTV_MAX.replacement * 100)}%` },
                    { id: "investment", label: `להשקעה ${Math.round(LTV_MAX.investment * 100)}%` },
                  ]}
                  onChange={(v) => set("propertyType", v)}
                  label="סוג נכס"
                />
              ) : null}
            </section>

            <section>
              <h2>מסלולים מותרים</h2>
              <div className="opt-tracks">
                {TRACKS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    data-on={settings.tracks[t] || undefined}
                    style={{ ["--c" as string]: TRACK_HEX[TRACK_PATH[t]] }}
                    onClick={() => set("tracks", { ...settings.tracks, [t]: !settings.tracks[t] })}
                    title={TRACK_LABEL[t]}
                  >
                    <i aria-hidden />
                    {TRACK_SHORT[t]}
                  </button>
                ))}
              </div>
              <div className="opt-toggles">
                <Toggle on={settings.consolidate} onChange={(v) => set("consolidate", v)} label="איחוד הלוואות צרכניות" hint="מחזור הלוואות צרכניות כהלוואה לכל מטרה בשעבוד הנכס" />
                <Toggle on={settings.allowKeep} onChange={(v) => set("allowKeep", v)} label="לשמור חובות זולים" hint="חוב שזול מכל חלופה בשוק נשאר כמו שהוא" />
                <Toggle on={settings.enforce329} onChange={(v) => set("enforce329", v)} label="שליש קבועה (הוראה 329)" />
                <Toggle on={settings.estimateFees} onChange={(v) => set("estimateFees", v)} label="הערכת עמלות פירעון" hint="הפרשי היוון לפי ריבית השוק היום, כשהמסמך לא ציין עמלה" />
                <Toggle on={settings.equalPrincipal} onChange={(v) => set("equalPrincipal", v)} label="לשקול קרן שווה" />
              </div>
            </section>
          </aside>

          {/* ------------------------------------------------ the answer */}
          <main className="opt-result">
            {!forecast ? (
              <div className="opt-empty">
                <WarningCircle size={22} />
                <p>תחזית הריבית של בנק ישראל עדיין נטענת — בלעדיה אי אפשר לתמחר מסלולים חדשים.</p>
              </div>
            ) : !owed.length ? (
              <div className="opt-empty">
                <WarningCircle size={22} />
                <p>אין חובות בתמהיל הנוכחי. גררו דוח אשראי או תדפיס משכנתא ללוח, ואז פתחו את המחולל.</p>
              </div>
            ) : !r?.ok ? (
              <div className="opt-empty" data-tone="warn">
                <WarningCircle size={22} />
                <p>{r?.reason ?? "מחשב…"}</p>
              </div>
            ) : (
              <>
                {/* hero */}
                <section className="opt-hero">
                  <div className="opt-hero-main">
                    <span className="opt-hero-label">{saving >= 0 ? `חיסכון ב${metricLabel}` : `תוספת ב${metricLabel}`}</span>
                    <span className="opt-hero-fig" data-neg={saving < 0 || undefined} dir="ltr">
                      <span className="opt-cur">₪</span>
                      <NumberFlow value={Math.round(Math.abs(saving))} locales="he-IL" />
                    </span>
                    <span className="opt-hero-sub">
                      מול המצב היום · {settings.outlook === "boi" ? "תחזית בנק ישראל" : settings.outlook === "flat" ? "ריבית נשארת" : "תחזית ביניים"}
                    </span>
                  </div>
                  <dl className="opt-kpis">
                    {[
                      ["החזר חודשי", r.baseline.firstPayment, r.totals.firstPayment, nis],
                      ["סך התשלומים", r.baseline.total, r.totals.total, nis],
                      ["תקופה", r.baseline.months, r.totals.months, yrs],
                      ["ריבית ממוצעת", r.baseline.avgRate, r.totals.avgRate, (x: number) => pct(x)],
                    ].map(([label, a, b, f]) => {
                      const fmt = f as (x: number) => string;
                      const down = (b as number) < (a as number) - 0.5;
                      const up = (b as number) > (a as number) + 0.5;
                      return (
                        <div key={label as string}>
                          <dt>{label as string}</dt>
                          <dd>
                            <span className="opt-was" dir="ltr">{fmt(a as number)}</span>
                            <ArrowLeft size={12} weight="bold" aria-hidden />
                            <b dir="ltr" data-dir={down ? "down" : up ? "up" : undefined}>{fmt(b as number)}</b>
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </section>

                {/* the mix */}
                <section className="opt-card">
                  <header>
                    <h2>התמהיל</h2>
                    <span className="opt-meta">
                      {r.plan.tranches.length} מסלולים חדשים · {nis(r.plan.newAmount)}
                      {r.plan.feesFinanced > 0 ? ` · כולל עמלות ${nis(r.plan.feesFinanced)}` : ""}
                    </span>
                  </header>
                  <div className="opt-bar" dir="rtl" aria-hidden>
                    {r.rows.map((row) => (
                      <span
                        key={row.id}
                        data-kept={row.source_type !== "תמהיל אופטימלי" || undefined}
                        style={{ flexGrow: Number(row.amount) || 0, ["--c" as string]: TRACK_HEX[Number(row.path_id)] }}
                      />
                    ))}
                  </div>
                  <table className="opt-table">
                    <thead>
                      <tr>
                        <th>מסלול</th>
                        <th>מקור</th>
                        <th>סכום</th>
                        <th>חלק</th>
                        <th>תקופה</th>
                        <th>ריבית</th>
                        <th>החזר ראשון</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.rows.map((row) => {
                        const isNew = row.source_type === "תמהיל אופטימלי";
                        const key = (["", "prime", "klz", "kz", "mlz", "mz"] as const)[Number(row.path_id)] as TrackKey;
                        const amount = Number(row.amount) || 0;
                        const margin = row.anchor_margin === null || row.anchor_margin === undefined ? null : Number(row.anchor_margin);
                        const first = monthOnePay(row, priceLoan(row, projEcon).schedule[0]?.payment ?? 0);
                        return (
                          <tr key={row.id} data-kept={!isNew || undefined}>
                            <td>
                              <span className="opt-track" style={{ ["--c" as string]: TRACK_HEX[Number(row.path_id)] }}>
                                <i aria-hidden />
                                {TRACK_LABEL[key]}
                              </span>
                            </td>
                            <td>{isNew ? (row.group === "loan" ? "חדש · כל מטרה" : "חדש · מחזור") : `נשאר · ${(row.source_bank || "").replace(/בע"מ|בנק/g, "").trim()}`}</td>
                            <td dir="ltr">{nis(amount)}</td>
                            <td dir="ltr">{Math.round((amount / r.totals.principal) * 100)}%</td>
                            <td>{yrs(Number(row.months))}</td>
                            <td dir="ltr">
                              {pct(Number(row.rate))}
                              {isNew && margin !== null && (key === "prime" || key === "mlz" || key === "mz") ? (
                                <small>{key === "prime" ? ` P${margin >= 0 ? "+" : ""}${margin.toFixed(2)}` : ` עוגן ${Number(row.anchor ?? 0).toFixed(2)}+${margin.toFixed(2)}`}</small>
                              ) : null}
                            </td>
                            <td dir="ltr">{nis(first)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </section>

                {why.length > 0 && (
                  <section className="opt-card opt-why">
                    <header>
                      <h2>למה דווקא כך</h2>
                    </header>
                    <ul>
                      {why.map((w) => (
                        <li key={w}>
                          <Lightning size={14} weight="fill" aria-hidden />
                          {w}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <div className="opt-two">
                  {/* debts */}
                  <section className="opt-card">
                    <header>
                      <h2>החובות היום</h2>
                    </header>
                    <ul className="opt-debts">
                      {r.debts.map((d) => {
                        const y = r.plan.refinance[d.id] ?? 0;
                        return (
                          <li key={d.id} data-state={y === 0 ? "keep" : y === 1 ? "refi" : "part"}>
                            <span className="opt-debt-name">{d.label}</span>
                            <span dir="ltr">{nis(d.balance)}</span>
                            <span dir="ltr">{pct(d.rate)}</span>
                            <span className="opt-debt-chip">{y === 0 ? "נשאר" : y === 1 ? "ממוחזר" : `ממוחזר ${Math.round(y * 100)}%`}</span>
                            {d.fee > 0 && y > 0 ? <small>עמלה {d.feeEstimated ? "משוערת " : ""}{nis(d.fee * y)}</small> : null}
                          </li>
                        );
                      })}
                      {r.skipped.length > 0 && <li className="opt-skipped">{r.skipped.length} חובות ללא תקופה לא נכללו</li>}
                    </ul>
                  </section>

                  {/* the rules */}
                  <section className="opt-card">
                    <header>
                      <h2>עמידה בכללים</h2>
                    </header>
                    <ul className="opt-checks">
                      {r.checks.map((c) => (
                        <li key={c.label} data-ok={c.ok || undefined}>
                          {c.ok ? <CheckCircle size={16} weight="fill" /> : <WarningCircle size={16} weight="fill" />}
                          <span>{c.label}</span>
                          <b dir="ltr">{c.value}</b>
                          <small>{c.rule}</small>
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>

                <div className="opt-two">
                  {/* scenarios */}
                  <section className="opt-card">
                    <header>
                      <h2>
                        <ShieldCheck size={16} weight="fill" aria-hidden /> מבחן תרחישים
                      </h2>
                      <span className="opt-meta">{metricLabel}</span>
                    </header>
                    <table className="opt-scen">
                      <thead>
                        <tr>
                          <th>תרחיש</th>
                          <th>היום</th>
                          <th>אופטימלי</th>
                          <th>החזר בשיא</th>
                        </tr>
                      </thead>
                      <tbody>
                        {SCENARIOS.map((sc, k) => {
                          const a = settings.objective === "total" ? r.baseline.scen[k]?.total : r.baseline.scen[k]?.pv;
                          const b = settings.objective === "total" ? r.totals.scen[k]?.total : r.totals.scen[k]?.pv;
                          return (
                            <tr key={sc.id}>
                              <td>
                                {sc.label}
                                {k > 0 && <small dir="ltr"> {sc.rate >= 0 ? "+" : ""}{sc.rate} · מדד {sc.cpi >= 0 ? "+" : ""}{sc.cpi}</small>}
                              </td>
                              <td dir="ltr">{nis(a ?? 0)}</td>
                              <td dir="ltr" data-better={(b ?? 0) < (a ?? 0) || undefined}>{nis(b ?? 0)}</td>
                              <td dir="ltr">{nis(r.totals.scen[k]?.peak ?? 0)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </section>

                  {/* frontier */}
                  <section className="opt-card">
                    <header>
                      <h2>החזר מול עלות</h2>
                      <span className="opt-meta">כל נקודה היא התמהיל הזול ביותר לאותו החזר</span>
                    </header>
                    <Frontier r={r} metricLabel={metricLabel} onPick={(pay) => set("paymentCap", Math.ceil(pay))} />
                  </section>
                </div>
              </>
            )}
          </main>
        </div>

        <footer className="opt-foot">
          <span className="opt-foot-note">
            {r?.ok
              ? `נבחר מתוך ${r.candidates.toLocaleString("he-IL")} מסלולים אפשריים בפתרון מדויק (${Math.round(r.ms)} מ״ש) · הריביות לפי ממוצעי בנק ישראל ויכולות להשתנות לפי פרופיל הלקוח`
              : "הריביות לפי ממוצעי בנק ישראל"}
          </span>
          <Btn className="lgr-btn lgr-btn-sm" onClick={onClose}>
            סגירה
          </Btn>
          <Btn className="lgr-btn lgr-btn-sm lgr-btn-primary" disabled={!r?.ok || applied} onClick={apply}>
            {applied ? "התמהיל נוצר" : "יצירת התמהיל בלוח"}
          </Btn>
        </footer>
      </motion.div>
    </div>,
    document.body
  );
}

"use client";

// משכנתא הפוכה — the tool.
//
// The arithmetic is the original calculator's, untouched and proven identical
// (see reverse-math.ts). Everything else is new: this is the same instrument
// the mix simulator is, wearing the same materials, and it lives on the same
// surface — the tool switch in the title row swaps this body for the ledger's
// without leaving the page.
//
// It answers the two questions an advisor asks, in this order:
//   1. how much can this client release?   the console: their facts, and the
//                                          rule's answer stated on the rail
//   2. what does it cost them?             two products side by side, with the
//                                          shape of the debt underneath
//
// Three things the original could not do, all of them frontend:
//   · it computes live. The חשב button is gone — every figure follows the
//     keystroke, which is the only reason a slider is worth having.
//   · a borrower under 55 is told so on the field and on the rail. The
//     original raised a window.alert and threw the input away.
//   · the requested amount is a slider as well as a field, clamped to the
//     maximum by the same Math.min the original used.

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "motion/react";
import NumberFlow from "@number-flow/react";
import {
  ArrowCounterClockwise,
  Clock,
  Info,
  ListChecks,
  Percent,
  TrendUp,
  UserCircleCheck,
  WarningCircle,
} from "@phosphor-icons/react";
import Btn from "../components/Btn";
import Money, { fmt } from "../components/Money";
import { rise, type Enter } from "../lib/transitions";
import ReverseMark from "./mark";
import ReverseScheduleModal, { type Tone } from "./ReverseScheduleModal";
import {
  DEFAULTS,
  MAX_MONTHS,
  MIN_AGE,
  eligibility,
  reversePlans,
  type Plan,
  type PlanKind,
} from "./reverse-math";
import "./reverse.css";

// ECharts is canvas-only — browser render, no SSR pass.
const ReverseChart = dynamic(() => import("./ReverseChart"), {
  ssr: false,
  loading: () => <div className="lgr-skel m-3 h-[286px]" />,
});

const COUNT_UP: EffectTiming = { duration: 400, easing: "cubic-bezier(0.2, 0, 0, 1)" };

/** The two products, as the page speaks about them. */
const PRODUCT: Record<
  PlanKind,
  {
    name: string;
    /** The mechanics, in one line. */
    say: string;
    /** The headline behaviour, in three words — the first thing anyone asks. */
    tag: string;
    icon: React.ReactNode;
    monthlyLabel: string;
    totalLabel: string;
    tone: Tone;
  }
> = {
  balloon: {
    name: "בלון מלא",
    say: "הקרן, הריבית וההצמדה נצברות ומסולקות במלואן בתום התקופה.",
    tag: "ללא החזר חודשי",
    icon: <Clock size={17} weight="fill" />,
    monthlyLabel: "החזר חודשי שוטף",
    totalLabel: "החזר כולל בתום תקופה",
    tone: {
      color: "var(--rm-balloon)",
      text: "var(--rm-balloon-deep)",
      tint: "var(--rm-balloon-tint)",
      line: "var(--rm-balloon-line)",
    },
  },
  grace: {
    name: "גרייס — ריבית בלבד",
    say: "הריבית משולמת מדי חודש ואינה מצטרפת לחוב. הקרן נותרת לסוף.",
    tag: "החזר ריבית חודשי",
    icon: <Percent size={17} weight="bold" />,
    monthlyLabel: "החזר חודשי התחלתי",
    totalLabel: "סך תשלומים + יתרת סיום",
    tone: {
      color: "var(--rm-grace)",
      text: "var(--rm-grace-deep)",
      tint: "var(--rm-grace-tint)",
      line: "var(--rm-grace-line)",
    },
  },
};

const digits = (s: string) => s.replace(/[^\d]/g, "");
const grouped = (s: string) => (s ? Number(s).toLocaleString("he-IL") : "");

export default function ReverseMortgage({
  enter = rise,
  profileUrl = null,
}: {
  enter?: Enter;
  /**
   * Where the client's own facts can be read from — שווי הנכס and the two
   * ages, straight off the Fireberry card the board was opened from. Null on
   * a board with no client, and the tool simply opens blank.
   */
  profileUrl?: string | null;
}) {
  /* ------------------------------------------------------------ the facts */
  const [propertyValue, setPropertyValue] = useState("");
  const [age1, setAge1] = useState("");
  const [age2, setAge2] = useState("");
  const [months, setMonths] = useState<string>(DEFAULTS.months);
  const [interestRate, setInterestRate] = useState<string>(DEFAULTS.interestRate);
  const [indexRate, setIndexRate] = useState<string>(DEFAULTS.indexRate);
  /** null means "whatever the maximum is" — the field follows the rule until
   *  someone overrides it, and goes back to following it on נקה טופס. */
  const [ask, setAsk] = useState<number | null>(null);
  const [openPlan, setOpenPlan] = useState<PlanKind | null>(null);
  /** True once a field actually arrived from the card — drives the one chip
   *  that says the numbers were not typed here. */
  const [fromCard, setFromCard] = useState(false);

  /**
   * THE CARD FILLS THE FORM, never the other way round.
   *
   * One GET on open. Each field is filled only if it is still empty — an
   * advisor who started typing before the answer landed keeps every keystroke
   * (functional setState reads the value as it is NOW, not as it was when the
   * fetch left). Read-only against Fireberry, and a failure of any kind just
   * leaves the tool blank, which is what it was before this existed.
   */
  useEffect(() => {
    if (!profileUrl) return;
    let cancelled = false;
    fetch(profileUrl)
      .then((r) => r.json())
      .then((d: { propertyValue?: number | null; age1?: number | null; age2?: number | null }) => {
        if (cancelled || !d) return;
        let landed = false;
        if (d.propertyValue && d.propertyValue > 0) {
          setPropertyValue((v) => (v ? v : ((landed = true), String(Math.round(d.propertyValue!)))));
        }
        if (d.age1 && d.age1 > 0) setAge1((v) => (v ? v : ((landed = true), String(d.age1))));
        if (d.age2 && d.age2 > 0) setAge2((v) => (v ? v : ((landed = true), String(d.age2))));
        // set after the fills so the chip never appears without data behind it
        if (landed) setFromCard(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [profileUrl]);

  const reset = () => {
    setPropertyValue("");
    setAge1("");
    setAge2("");
    setMonths(DEFAULTS.months);
    setInterestRate(DEFAULTS.interestRate);
    setIndexRate(DEFAULTS.indexRate);
    setAsk(null);
    // נקה טופס means blank, including what the card filled — the chip goes
    // with the figures it was vouching for.
    setFromCard(false);
  };

  /* ------------------------------------------------------------- the rule */
  const el = useMemo(() => eligibility(propertyValue, age1, age2), [propertyValue, age1, age2]);
  const maxLoan = el.ok ? el.loan : 0;
  // the original's clamp, kept exactly: you may ask for less, never for more
  const amount = el.ok ? Math.min(ask ?? maxLoan, maxLoan) : 0;

  // `Number(months) || 360` is the original's fallback; the ceiling is this
  // page's, and the field carries it too.
  const term = Math.min(MAX_MONTHS, Number(months) || 360);
  const rate = Number(interestRate) || 0;
  const index = Number(indexRate) || 0;
  const property = Number(propertyValue) || 0;

  const plans = useMemo(() => reversePlans(amount, rate, index, term), [amount, rate, index, term]);

  /* The chart reads the same schedules the cards summarise and the modal
     prints. Sampled, so a 30-year term is ~120 points per curve rather than
     361 — the shape is identical and the canvas is a third of the work. */
  const chart = useMemo(() => {
    const rows = plans.balloon.rows;
    if (rows.length < 2) return null;
    const step = rows.length > 240 ? 3 : rows.length > 96 ? 2 : 1;
    const idx: number[] = [];
    for (let i = 0; i < rows.length; i += step) idx.push(i);
    if (idx[idx.length - 1] !== rows.length - 1) idx.push(rows.length - 1);
    return {
      months: idx.map((i) => rows[i].month),
      series: [
        {
          name: PRODUCT.balloon.name,
          color: "#5b54d6",
          values: idx.map((i) => Math.round(plans.balloon.rows[i].endBalance)),
        },
        {
          name: PRODUCT.grace.name,
          color: "#0d8b9b",
          values: idx.map((i) => Math.round(plans.grace.rows[i].endBalance)),
        },
      ],
    };
  }, [plans]);

  const pctOfMax = maxLoan > 0 ? (amount / maxLoan) * 100 : 0;
  const pctOfProperty = property > 0 ? Math.min(100, (maxLoan / property) * 100) : 0;
  const years = term / 12;

  return (
    <>
      {/* -------------------------------------- 1. the console: facts + rule */}
      <motion.section {...enter(1)} className="lgr-console mb-5">
        <div className="lgr-rm-form">
          {/* — what the client has — */}
          <label className="lgr-rm-field" data-w="lg">
            <span className="lgr-rm-flabel">שווי הנכס</span>
            <span className="lgr-rm-well">
              <span className="lgr-rm-cur">₪</span>
              <input
                className="lgr-rm-in"
                inputMode="numeric"
                placeholder="0"
                value={grouped(propertyValue)}
                onChange={(e) => setPropertyValue(digits(e.target.value))}
                onFocus={(e) => e.currentTarget.select()}
                aria-label="שווי הנכס בשקלים"
              />
            </span>
          </label>

          <label className="lgr-rm-field" data-w="sm">
            <span className="lgr-rm-flabel">גיל לווה 1</span>
            <span className="lgr-rm-well">
              <input
                className="lgr-rm-in"
                inputMode="numeric"
                placeholder="—"
                data-state={!el.ok && el.reason === "age1" ? "err" : undefined}
                value={age1}
                onChange={(e) => setAge1(digits(e.target.value).slice(0, 3))}
                onFocus={(e) => e.currentTarget.select()}
                aria-label="גיל לווה ראשון"
              />
            </span>
          </label>

          <label className="lgr-rm-field" data-w="sm">
            <span className="lgr-rm-flabel">
              גיל לווה 2 <i>רשות</i>
            </span>
            <span className="lgr-rm-well">
              <input
                className="lgr-rm-in"
                inputMode="numeric"
                placeholder="—"
                data-state={!el.ok && el.reason === "age2" ? "err" : undefined}
                value={age2}
                onChange={(e) => setAge2(digits(e.target.value).slice(0, 3))}
                onFocus={(e) => e.currentTarget.select()}
                aria-label="גיל לווה שני, רשות"
              />
            </span>
          </label>

          {/* The one field nobody types — the younger of the two, which is the
              age the whole rule turns on. Stated here, next to the two it is
              drawn from, rather than on the rail: the rail is for the answer. */}
          <div className="lgr-rm-field" data-w="sm">
            <span className="lgr-rm-flabel">גיל קובע</span>
            <div className="lgr-rm-derived" data-empty={!el.ok || undefined}>
              {el.ok ? el.decidingAge : "—"}
            </div>
          </div>

          <span className="lgr-rm-vsep" aria-hidden />

          {/* — and what we are pricing on top of it — */}
          <label className="lgr-rm-field" data-w="md">
            <span className="lgr-rm-flabel">
              תקופה <i>חודשים</i>
            </span>
            {/* The years are a suffix inside the field, not a note under it: a
                note added a line to one field in a row of seven and lifted its
                box off the row's baseline. */}
            <span className="lgr-rm-well">
              <span className="lgr-rm-unit" data-wide="true">
                {years % 1 === 0 ? `${years} שנ׳` : `${years.toFixed(1)} שנ׳`}
              </span>
              <input
                className="lgr-rm-in"
                type="number"
                min={1}
                max={MAX_MONTHS}
                step={12}
                placeholder={DEFAULTS.months}
                value={months}
                onChange={(e) => setMonths(e.target.value)}
                onFocus={(e) => e.currentTarget.select()}
                aria-label="תקופה בחודשים"
              />
            </span>
          </label>

          <label className="lgr-rm-field" data-w="md">
            <span className="lgr-rm-flabel">ריבית שנתית</span>
            <span className="lgr-rm-well">
              <span className="lgr-rm-unit">%</span>
              <input
                className="lgr-rm-in"
                type="number"
                step="0.01"
                min={0}
                placeholder="0"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                onFocus={(e) => e.currentTarget.select()}
                aria-label="ריבית שנתית באחוזים"
              />
            </span>
          </label>

          <label className="lgr-rm-field" data-w="md">
            <span className="lgr-rm-flabel">מדד שנתי משוער</span>
            <span className="lgr-rm-well">
              <span className="lgr-rm-unit">%</span>
              <input
                className="lgr-rm-in"
                type="number"
                step="0.1"
                min={0}
                placeholder="0"
                value={indexRate}
                onChange={(e) => setIndexRate(e.target.value)}
                onFocus={(e) => e.currentTarget.select()}
                aria-label="מדד שנתי משוער באחוזים"
              />
            </span>
          </label>

          <div className="ms-auto flex items-center gap-8">
            {/* Where these numbers came from. Stated once, quietly, because a
                pre-filled figure that looks typed is a figure nobody rechecks. */}
            {fromCard && (
              <span className="lgr-rm-src" title="שווי הנכס וגילאי הלווים נקראו מכרטיס הלקוח ב־Fireberry">
                <UserCircleCheck size={14} weight="fill" />
                נטען מכרטיס הלקוח
              </span>
            )}
            <Btn className="lgr-btn lgr-btn-ghost" onClick={reset} title="חזרה לערכי ברירת המחדל">
              <ArrowCounterClockwise size={14} weight="bold" />
              נקה טופס
            </Btn>
          </div>
        </div>

        {/* --- what the rule says about them --- */}
        <div className="lgr-rail">
          <div className="lgr-rm-rail-cells">
            <div className="lgr-rail-cell">
              <span className="lgr-rail-label">אחוז מימון</span>
              {el.ok ? (
                <span className="lgr-rail-value">
                  <NumberFlow value={el.percent} locales="he-IL" spinTiming={COUNT_UP} transformTiming={COUNT_UP} />
                  <span className="lgr-per">%</span>
                </span>
              ) : (
                <span className="lgr-rail-value" data-empty="true">
                  —
                </span>
              )}
            </div>

            <div className="lgr-rail-cell" data-hero="true">
              <span className="lgr-rail-label">משכנתא מקסימלית</span>
              {el.ok ? (
                <span className="lgr-rail-value">
                  <span className="lgr-cur">₪</span>
                  <NumberFlow
                    value={Math.round(maxLoan)}
                    locales="he-IL"
                    spinTiming={COUNT_UP}
                    transformTiming={COUNT_UP}
                  />
                </span>
              ) : (
                <span className="lgr-rail-value" data-empty="true">
                  —
                </span>
              )}
            </div>

            <div className="lgr-rail-cell">
              <span className="lgr-rail-label">החלק המשוחרר מן הנכס</span>
              <div className="lgr-rm-gauge" role="img" aria-label={`${el.ok ? el.percent : 0} אחוז משווי הנכס`}>
                <span style={{ width: `${pctOfProperty}%` }} />
              </div>
              <div className="lgr-rm-gauge-cap">
                <span className="inline-flex items-baseline gap-1.5">
                  מקסימום
                  <Money value={maxLoan} block={false} size={12} weight={700} color="var(--ink)" />
                </span>
                <span className="inline-flex items-baseline gap-1.5">
                  שווי הנכס
                  <Money value={property} block={false} size={12} weight={600} color="var(--lgr-2)" />
                </span>
              </div>
            </div>

            {/* Only when something is actually WRONG. An empty form explains
                itself by being empty; a sentence there was furniture. */}
            {!el.ok && el.reason !== "empty" && (
              <div className="lgr-rm-notice">
                <WarningCircle size={15} weight="fill" style={{ flex: "none" }} />
                {el.reason === "age1" ? `גיל לווה חייב להיות מעל ${MIN_AGE}` : `גיל לווה 2 חייב להיות מעל ${MIN_AGE}`}
              </div>
            )}
          </div>
        </div>
      </motion.section>

      {el.ok ? (
        <>
          {/* --------------------------------------------- 2. how much of it */}
          <motion.section {...enter(2)} className="lgr-card mb-5 overflow-hidden">
            <header className="lgr-head">
              <h2 className="lgr-title">סכום המשכנתא המבוקשת</h2>
              <span className="lgr-sub ms-auto">
                עד {el.percent}% משווי הנכס · {Math.round(pctOfMax)}% מהמקסימום
              </span>
            </header>

            <div className="lgr-rm-ask">
              <label className="lgr-rm-field lgr-rm-ask-field">
                <span className="lgr-rm-flabel">סכום</span>
                <span className="lgr-rm-well">
                  <span className="lgr-rm-cur">₪</span>
                  <input
                    className="lgr-rm-in"
                    inputMode="numeric"
                    value={grouped(String(Math.round(amount)))}
                    onChange={(e) => setAsk(Math.min(Number(digits(e.target.value)) || 0, maxLoan))}
                    onFocus={(e) => e.currentTarget.select()}
                    aria-label="סכום המשכנתא המבוקשת"
                  />
                </span>
              </label>

              <div className="lgr-rm-ask-slider">
                <input
                  type="range"
                  dir="ltr"
                  className="lgr-rm-slider"
                  min={0}
                  max={Math.round(maxLoan)}
                  step={1000}
                  value={Math.round(amount)}
                  onChange={(e) => setAsk(Number(e.target.value))}
                  style={{ ["--pct" as string]: `${pctOfMax}%` }}
                  aria-label="סכום המשכנתא המבוקשת"
                />
                <div className="lgr-rm-ends" dir="ltr">
                  <span>₪0</span>
                  <span dir="rtl" className="inline-flex items-baseline gap-1.5">
                    מקסימום
                    <Money value={maxLoan} block={false} size={11.5} weight={700} color="var(--lgr-3)" />
                  </span>
                </div>
              </div>

              <div className="lgr-rm-quick">
                {[0.5, 0.75, 1].map((f) => {
                  const v = Math.round(maxLoan * f);
                  return (
                    <Btn
                      key={f}
                      className="lgr-btn lgr-btn-sm"
                      onClick={() => setAsk(v)}
                      data-on={Math.round(amount) === v || undefined}
                    >
                      {f === 1 ? "מקסימום" : `${f * 100}%`}
                    </Btn>
                  );
                })}
              </div>
            </div>
          </motion.section>

          {/* ------------------------------------------------ 3. the two paths */}
          <motion.div {...enter(3)} className="lgr-rm-prods mb-5">
            {(["balloon", "grace"] as const).map((kind) => (
              <ProductCard
                key={kind}
                kind={kind}
                plan={plans[kind]}
                principal={amount}
                indexed={index > 0}
                onOpen={() => setOpenPlan(kind)}
              />
            ))}
          </motion.div>

          {/* ------------------------------------------------ 4. and its shape */}
          <motion.section {...enter(4)} className="lgr-card overflow-hidden">
            <header className="lgr-head">
              <TrendUp size={14} weight="fill" style={{ color: "var(--lgr-3)" }} />
              <h2 className="lgr-title">מהלך החוב</h2>
              <div className="lgr-rm-legend ms-auto">
                <span>
                  <i style={{ background: "#5b54d6" }} />
                  {PRODUCT.balloon.name}
                </span>
                <span>
                  <i style={{ background: "#0d8b9b" }} />
                  {PRODUCT.grace.name}
                </span>
                <span>
                  <i data-dash="true" />
                  שווי הנכס
                </span>
              </div>
            </header>
            <div className="px-1 pb-1 pt-2">
              {chart && <ReverseChart months={chart.months} series={chart.series} propertyValue={property} />}
            </div>
            <p className="px-4 pb-3.5 text-[11.5px]" style={{ color: "var(--lgr-4)" }}>
              יתרת החוב בכל חודש, לפי אותם לוחות הסילוקין. הקו המקווקו הוא שווי הנכס היום — ללא הנחת עליית ערך.
            </p>
          </motion.section>
        </>
      ) : (
        <motion.section {...enter(2)} className="lgr-card">
          <div className="lgr-empty" style={{ padding: "56px 16px" }}>
            <span
              className="grid place-items-center"
              style={{ width: 54, height: 54, borderRadius: 16, background: "var(--primary-tint)", color: "var(--primary)" }}
              aria-hidden
            >
              <ReverseMark size={28} />
            </span>
            <div className="lgr-title">שווי נכס וגיל לווה — וזה כאן</div>
          </div>
        </motion.section>
      )}

      <p className="lgr-rm-note">
        <Info size={13} weight="fill" style={{ flex: "none", marginTop: 2 }} />
        הערכה על בסיס הנתונים שהוזנו בלבד. הריבית והמדד מחושבים חודשית מהשיעור השנתי, וההצמדה נצברת על היתרה. התנאים
        בפועל, לרבות אחוז המימון והריבית, נקבעים על ידי הגוף המלווה.
      </p>

      {openPlan && (
        <ReverseScheduleModal
          plan={plans[openPlan]}
          title={`לוח סילוקין — ${PRODUCT[openPlan].name}`}
          say={PRODUCT[openPlan].say}
          tone={PRODUCT[openPlan].tone}
          principal={amount}
          onClose={() => setOpenPlan(null)}
        />
      )}
    </>
  );
}

/* ============================================================== the product */

/**
 * ONE PATH, PRICED.
 *
 * The four figures are the original card's four, under the original's labels —
 * the monthly, the total, the interest and the index — plus the bar that shows
 * where the total came from. The bar is not a fifth figure: קרן + ריבית + מדד
 * IS the total, so the card states a number and then shows it being made.
 */
function ProductCard({
  kind,
  plan,
  principal,
  indexed,
  onOpen,
}: {
  kind: PlanKind;
  plan: Plan;
  principal: number;
  /** With no index the גרייס payment never moves, and the note says so. */
  indexed: boolean;
  onOpen: () => void;
}) {
  const p = PRODUCT[kind];
  const last = plan.rows[plan.rows.length - 1];
  const parts = [
    { key: "קרן", v: principal, color: "var(--line-2)" },
    { key: "ריבית", v: plan.interest, color: p.tone.color },
    { key: "מדד", v: plan.index, color: `color-mix(in srgb, ${p.tone.color} 42%, #fff)` },
  ];
  const sum = parts.reduce((s, x) => s + x.v, 0) || 1;

  return (
    <section
      className="lgr-card lgr-rm-prod"
      style={
        {
          "--tone": p.tone.color,
          "--tone-text": p.tone.text,
          "--tone-tint": p.tone.tint,
          "--tone-line": p.tone.line,
          "--tone-wash": kind === "balloon" ? "var(--rm-balloon-wash)" : "var(--rm-grace-wash)",
        } as React.CSSProperties
      }
    >
      <header className="lgr-rm-prod-head">
        <span className="lgr-rm-prod-emb" aria-hidden>
          {p.icon}
        </span>
        <div className="min-w-0">
          <div className="lgr-rm-prod-name">{p.name}</div>
          <p className="lgr-rm-prod-say">{p.say}</p>
        </div>
        <span className="lgr-rm-prod-tag">{p.tag}</span>
      </header>

      <div className="lgr-rm-hero">
        <div className="lgr-rm-hero-label">{p.monthlyLabel}</div>
        <Money
          value={plan.monthly}
          className="lgr-rm-hero-fig"
          color={plan.monthly > 0 ? "var(--ink)" : "var(--lgr-4)"}
        />
        <div className="lgr-rm-hero-note">
          {kind === "balloon"
            ? "אין תשלום לאורך כל התקופה"
            : indexed
              ? `עולה עם המדד — בחודש האחרון ₪${fmt(last?.payment ?? 0)}`
              : "קבוע לאורך כל התקופה"}
        </div>
      </div>

      <div className="lgr-rm-lines">
        <div className="lgr-rm-line">
          <span>סה״כ ריבית</span>
          <Money value={plan.interest} block={false} weight={600} color="var(--ink)" />
        </div>
        <div className="lgr-rm-line">
          <span>סה״כ מדד</span>
          <Money value={plan.index} block={false} weight={600} color="var(--ink)" />
        </div>
        <div className="lgr-rm-line" data-strong="true">
          <span>עלות כוללת ריבית + מדד</span>
          <Money value={plan.cost} block={false} weight={700} size={15} color={p.tone.text} />
        </div>
      </div>

      <div className="px-4 pb-3">
        <div className="lgr-rm-costbar" dir="ltr" aria-hidden>
          {parts.map((x) => (
            <span key={x.key} style={{ width: `${(x.v / sum) * 100}%`, background: x.color }} />
          ))}
        </div>
        <div className="lgr-rm-keys">
          {parts.map((x) => (
            <span key={x.key} className="inline-flex items-center gap-1.5">
              <i className="lgr-dot" style={{ background: x.color }} />
              {x.key}
              <b>{Math.round((x.v / sum) * 100)}%</b>
            </span>
          ))}
        </div>
      </div>

      <div className="lgr-rm-foot">
        <div>
          <div className="lgr-rm-foot-cap">{p.totalLabel}</div>
          <Money value={plan.total} className="mt-0.5" size={20} weight={700} style={{ textAlign: "start" }} />
        </div>
        <Btn className="lgr-btn lgr-rm-open ms-auto" onClick={onOpen}>
          <ListChecks size={14} weight="bold" />
          לוח סילוקין
        </Btn>
      </div>
    </section>
  );
}

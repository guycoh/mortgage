"use client";

// משכנתא הפוכה — the tool.
//
// The arithmetic is the original calculator's, untouched and proven identical
// (see reverse-math.ts). Everything else is presentation, and this file has
// now had two passes at it. The second one is the one worth explaining.
//
// WHAT WAS WRONG. The first build gave every value the same 42px bordered box,
// so שווי הנכס — the figure that moves the whole page — looked exactly like
// מדד שנתי משוער, a default nobody touches. It stated the maximum four times
// in three surfaces, drew two progress bars of nearly the same ratio, and put
// three stacked cards between the reader and the answer. The two products were
// six colour applications each, laid out as independent columns that were not
// guaranteed to line up — decorated, but not comparable.
//
// WHAT IT IS NOW, top to bottom:
//   1. AN ASSUMPTIONS BAR, not a form. No card, no borders, chrome only under
//      the pointer. Grouped by what the numbers are: the asset, then the
//      people, then the terms priced on top of them. גיל קובע is a read-out
//      with an arrow from the two ages it comes from — it is never an input,
//      so it never looks like one.
//   2. ONE HERO. The maximum and the requested amount were two figures in two
//      surfaces; they are one 56px number that IS the control — type in it or
//      drag the slider welded underneath. It says "משכנתא מקסימלית" until you
//      take less than the maximum, and then it says what it is.
//   3. ONE COMPARISON TABLE. Shared labels down the start edge, so the two
//      tracks line up by construction rather than by luck. Accent survives on
//      the icon, the name and the monthly figure; the tinted heads, tinted
//      feet, gradient crowns and composition bars are gone.
//   4. The chart, unchanged.
//
// Four type sizes carry the whole hierarchy: 56 hero / 30 track headline /
// 15 row figure / 12.5 label. Everything financial is tabular he-IL.

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "motion/react";
import {
  ArrowCounterClockwise,
  ArrowLeft,
  Clock,
  Info,
  ListChecks,
  Percent,
  PencilSimpleLine,
  TrendUp,
  UserCircleCheck,
  WarningCircle,
} from "@phosphor-icons/react";
import Btn from "../components/Btn";
import { fmt } from "../components/Money";
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

/** The two products, as the page speaks about them. */
const PRODUCT: Record<PlanKind, { name: string; say: string; tag: string; icon: React.ReactNode; tone: Tone }> = {
  balloon: {
    name: "בלון מלא",
    say: "הקרן, הריבית וההצמדה נצברות ומסולקות במלואן בתום התקופה.",
    tag: "ללא החזר חודשי",
    icon: <Clock size={18} weight="fill" />,
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
    icon: <Percent size={18} weight="bold" />,
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

/**
 * A FIGURE THAT CHANGED, acknowledged in 180ms.
 *
 * Not a counter — a number that rolls from 1,805,300 to 1,806,120 while the
 * slider is moving is a toy, and it makes a reader wait to find out what the
 * value is. This is one brief crossfade on the digits that actually differ in
 * value, which says "this updated" and gets out of the way.
 *
 * Deliberately NOT used on the hero: that number is under the reader's own
 * finger, and a figure you are dragging does not need to announce itself.
 */
function Fig({
  value,
  size,
  weight = 600,
  color,
  className = "",
  live = true,
}: {
  value: number;
  size?: number;
  weight?: number;
  color?: string;
  className?: string;
  live?: boolean;
}) {
  const v = Math.round(Number(value) || 0);
  const digitsOut = fmt(v);
  return (
    <span dir="ltr" className={`lgr-money ${className}`} style={{ fontSize: size, fontWeight: weight, color }}>
      <span className="lgr-cur">₪</span>
      {live ? (
        <motion.span
          key={v}
          initial={{ opacity: 0.35, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
          style={{ display: "inline-block" }}
        >
          {digitsOut}
        </motion.span>
      ) : (
        digitsOut
      )}
    </span>
  );
}

/**
 * ONE ASSUMPTION.
 *
 * Borderless by default: the value is the interface and the box only appears
 * under the pointer or the caret. A row of seven of these reads as a sentence
 * of facts rather than as a form standing between you and the result.
 */
function Assume({
  label,
  hint,
  width,
  prefix,
  suffix,
  big,
  state,
  ...input
}: {
  label: string;
  hint?: string;
  /** Only for type=number, which ignores `size`. */
  width?: number;
  prefix?: string;
  suffix?: React.ReactNode;
  /** שווי הנכס is the one assumption that moves everything, and it is sized so. */
  big?: boolean;
  state?: "err";
} & React.InputHTMLAttributes<HTMLInputElement>) {
  // A text field hugs its own value via `size`, so the ₪ stays beside the
  // figure instead of stranded at the far edge of a fixed box — which is
  // exactly how an empty שווי הנכס read: "₪            —".
  // Chrome ignores `size` on type=number, so those keep an explicit width.
  const chars = String(input.value ?? "").length;
  const sized = input.type !== "number";
  return (
    <label className="lgr-rm-a" data-big={big || undefined}>
      <span className="lgr-rm-a-l">
        {label}
        {hint && <i>{hint}</i>}
      </span>
      {/* An answered field is plain text; an unanswered one carries a dashed
          rule, which is what says "this is yours to fill in" on a bar whose
          fields otherwise have no chrome at all. */}
      {/* THREE CELLS, ALWAYS — even when a side is empty. The well is a grid of
          1fr / content / 1fr, so the two flanks are equal by construction and
          the figure lands dead centre under its own label. Rendered as a flex
          row it was the [value + suffix] PAIR that centred, which pushed 360
          left of the word above it by half the width of "30 שנ׳". */}
      <span className="lgr-rm-a-well" data-empty={chars ? undefined : "true"} dir="ltr">
        <span className="lgr-rm-a-fix">{prefix}</span>
        <input
          {...input}
          className="lgr-rm-a-in"
          data-state={state}
          size={sized ? Math.max(2, chars) : undefined}
          style={sized ? undefined : { width }}
          inputMode="numeric"
          onFocus={(e) => e.currentTarget.select()}
        />
        <span className="lgr-rm-a-fix">{suffix}</span>
      </span>
    </label>
  );
}

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

  /* The chart reads the same schedules the table summarises and the modal
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
  const years = term / 12;
  const atMax = el.ok && Math.round(amount) === Math.round(maxLoan);

  return (
    <>
      {/* ------------------------------------------- 1. the assumptions bar */}
      {/* Secondary by construction: it sits on the canvas with no card, no
          field borders and muted labels, so the eye lands on the hero below
          it. Groups are separated by one hairline, in the toolbar's idiom. */}
      <motion.section {...enter(1)} className="lgr-rm-assume" aria-label="נתוני הלקוח">
        {/* WHOSE NUMBERS THESE ARE, and where they came from. On a board opened
            from a client card these arrive filled in, and a pre-filled figure
            that looks typed is a figure nobody rechecks — so the bar says so
            out loud instead of hiding it in a chip at the far end. With
            nothing pulled it says the other true thing: type them. */}
        <div className="lgr-rm-who" data-live={fromCard || undefined}>
          <span className="lgr-rm-who-ico" aria-hidden>
            {fromCard ? <UserCircleCheck size={19} weight="fill" /> : <PencilSimpleLine size={17} weight="bold" />}
          </span>
          <div className="min-w-0">
            <div className="lgr-rm-who-t">נתוני הלקוח</div>
            <div className="lgr-rm-who-s" title={fromCard ? "שווי הנכס וגילאי הלווים נקראו מכרטיס הלקוח ב־Fireberry" : undefined}>
              {fromCard ? "נטענו מכרטיס Fireberry" : "הזינו ידנית"}
            </div>
          </div>
        </div>

        <div className="lgr-rm-params">
        <div className="lgr-rm-grp">
          <Assume
            label="שווי הנכס"
            big
            width={150}
            prefix="₪"
            // "—", not "0": a grey zero in a money field still reads as a
            // stated amount, and this field has not been answered yet.
            placeholder="—"
            value={grouped(propertyValue)}
            onChange={(e) => setPropertyValue(digits(e.target.value))}
            aria-label="שווי הנכס בשקלים"
          />
        </div>

        <div className="lgr-rm-grp">
          <Assume
            label="גיל לווה"
            width={38}
            placeholder="—"
            state={!el.ok && el.reason === "age1" ? "err" : undefined}
            value={age1}
            onChange={(e) => setAge1(digits(e.target.value).slice(0, 3))}
            aria-label="גיל לווה ראשון"
          />
          <Assume
            label="בן/בת זוג"
            hint="רשות"
            width={38}
            placeholder="—"
            state={!el.ok && el.reason === "age2" ? "err" : undefined}
            value={age2}
            onChange={(e) => setAge2(digits(e.target.value).slice(0, 3))}
            aria-label="גיל לווה שני, רשות"
          />
          {/* DERIVED, and it looks it: an arrow out of the two ages it is
              drawn from, and then the same label-over-value stack as every
              other item in the bar — but with no field under it, because
              there is nothing here to type. */}
          <div className="lgr-rm-read">
            <ArrowLeft size={14} weight="bold" aria-hidden />
            <span className="lgr-rm-a">
              <span className="lgr-rm-a-l">גיל קובע</span>
              <b data-empty={!el.ok || undefined}>{el.ok ? el.decidingAge : "—"}</b>
            </span>
          </div>
        </div>

        <div className="lgr-rm-grp">
          <Assume
            label="תקופה"
            hint="חודשים"
            width={44}
            type="number"
            min={1}
            max={MAX_MONTHS}
            step={12}
            placeholder={DEFAULTS.months}
            value={months}
            onChange={(e) => setMonths(e.target.value)}
            aria-label="תקופה בחודשים"
            suffix={
              <span dir="rtl" className="lgr-rm-a-yrs">
                {years % 1 === 0 ? `${years} שנ׳` : `${years.toFixed(1)} שנ׳`}
              </span>
            }
          />
          <Assume
            label="ריבית שנתית"
            width={46}
            type="number"
            step="0.01"
            min={0}
            placeholder="0"
            suffix="%"
            value={interestRate}
            onChange={(e) => setInterestRate(e.target.value)}
            aria-label="ריבית שנתית באחוזים"
          />
          <Assume
            label="מדד משוער"
            width={46}
            type="number"
            step="0.1"
            min={0}
            placeholder="0"
            suffix="%"
            value={indexRate}
            onChange={(e) => setIndexRate(e.target.value)}
            aria-label="מדד שנתי משוער באחוזים"
          />
        </div>
        </div>

        <button className="lgr-rm-reset" onClick={reset} title="חזרה לערכי ברירת המחדל">
          <ArrowCounterClockwise size={13} weight="bold" />
          נקה
        </button>
      </motion.section>

      {/* A rule that failed. It earns its tint — it is the one thing on the
          page that must stop the reader. */}
      {!el.ok && el.reason !== "empty" && (
        <div className="lgr-rm-notice" role="alert">
          <WarningCircle size={15} weight="fill" style={{ flex: "none" }} />
          {el.reason === "age1" ? `גיל לווה חייב להיות מעל ${MIN_AGE}` : `גיל לווה 2 חייב להיות מעל ${MIN_AGE}`}
        </div>
      )}

      {/* -------------------------------------------------------- 2. the hero */}
      {/* The one number this page exists to produce, and the control that sets
          it, are the same object. It opens at the maximum — so on first read
          the hero IS משכנתא מקסימלית — and renames itself the moment you take
          less than all of it. */}
      <motion.section {...enter(2)} className="lgr-rm-hero" data-empty={!el.ok || undefined}>
        {el.ok ? (
          <>
            <div className="lgr-rm-hero-top">
              <div className="min-w-0">
                <div className="lgr-rm-hero-cap">{atMax ? "משכנתא מקסימלית" : "הסכום המבוקש"}</div>
                <div className="lgr-rm-hero-well" dir="ltr">
                  <span className="lgr-rm-hero-cur">₪</span>
                  {/* `size` rather than a fixed width: the field hugs its own
                      digits, so the hover and focus surfaces wrap the number
                      instead of trailing 200px of empty box after it. */}
                  <input
                    className="lgr-rm-hero-in"
                    inputMode="numeric"
                    size={Math.max(1, grouped(String(Math.round(amount))).length)}
                    value={grouped(String(Math.round(amount)))}
                    onChange={(e) => setAsk(Math.min(Number(digits(e.target.value)) || 0, maxLoan))}
                    onFocus={(e) => e.currentTarget.select()}
                    aria-label="סכום המשכנתא המבוקשת"
                  />
                </div>
                {/* ONE SENTENCE, and it never says the same word twice. The
                    property's value is stated in the bar above and the maximum
                    is the hero itself while you are at it — so at the maximum
                    this is only the ratio, and below it, only the distance. */}
                <div className="lgr-rm-hero-sub">
                  {atMax ? (
                    <>
                      <b>{el.percent}%</b> משווי הנכס
                    </>
                  ) : (
                    <>
                      <b>{Math.round(pctOfMax)}%</b> מהמקסימום · עד{" "}
                      <Fig value={maxLoan} size={13} weight={700} color="var(--lgr-2)" />
                    </>
                  )}
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

            {/* THE ONE BAR ON THE PAGE. It used to be two: this, and a gauge of
                the eligible share of the property. They measured almost the
                same thing; the property share is a sentence now. */}
            <div className="lgr-rm-track">
              <input
                type="range"
                className="lgr-rm-slider"
                min={0}
                max={Math.round(maxLoan)}
                step={1000}
                value={Math.round(amount)}
                onChange={(e) => setAsk(Number(e.target.value))}
                style={{ ["--pct" as string]: `${pctOfMax}%` }}
                aria-label="סכום המשכנתא המבוקשת"
                aria-valuetext={`${fmt(amount)} שקלים`}
              />
              <div className="lgr-rm-ends">
                <span>₪0</span>
                <span>₪{fmt(maxLoan)}</span>
              </div>
            </div>
          </>
        ) : (
          /* Nothing entered yet. The hero holds the exact shape it will have
             once it has a figure — same cap, same 56px line — so typing the
             first number fills it in rather than growing the page. No
             instruction: an empty field is its own instruction. */
          <div className="lgr-rm-hero-blank">
            <span className="lgr-rm-hero-mark" aria-hidden>
              <ReverseMark size={26} />
            </span>
            <div>
              <div className="lgr-rm-hero-cap">משכנתא מקסימלית</div>
              <div className="lgr-rm-hero-idle" dir="ltr" aria-label="טרם חושב">
                <span className="lgr-rm-hero-cur">₪</span>
                —
              </div>
            </div>
          </div>
        )}
      </motion.section>

      {el.ok && (
        <>
          {/* ------------------------------------------- 3. the comparison */}
          <motion.section {...enter(3)} className="lgr-rm-cmp-wrap">
            <table className="lgr-rm-cmp">
              <caption className="sr-only">השוואה בין מסלול בלון מלא למסלול גרייס</caption>
              <colgroup>
                <col className="lgr-rm-cmp-lab" />
                <col />
                <col />
              </colgroup>
              <thead>
                <tr>
                  <td />
                  {(["balloon", "grace"] as const).map((kind) => {
                    const p = PRODUCT[kind];
                    return (
                      // The mechanics sentence used to live here in grey under
                      // the name. Two of them, side by side, were the first
                      // thing the eye hit on a block whose job is comparing
                      // figures — and they said what the tag and the rows
                      // below already say. It survives where it is actually
                      // useful: under the title of the schedule modal.
                      <th key={kind} scope="col" style={{ ["--tone" as string]: p.tone.color, ["--tone-text" as string]: p.tone.text }}>
                        <div className="lgr-rm-cmp-name">
                          <span className="lgr-rm-cmp-ico" aria-hidden>
                            {p.icon}
                          </span>
                          {p.name}
                          <span className="lgr-rm-cmp-tag">{p.tag}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {/* THE HEADLINE ROW. One number per track at a size nothing
                    else on the block comes near, in the track's own ink. */}
                <tr className="lgr-rm-cmp-hero">
                  <th scope="row">החזר חודשי</th>
                  {(["balloon", "grace"] as const).map((kind) => {
                    const plan = plans[kind];
                    const last = plan.rows[plan.rows.length - 1];
                    return (
                      <td key={kind} style={{ ["--tone-text" as string]: PRODUCT[kind].tone.text }}>
                        <Fig
                          value={plan.monthly}
                          className="lgr-rm-cmp-fig"
                          color={plan.monthly > 0 ? "var(--tone-text)" : "var(--lgr-4)"}
                          weight={700}
                        />
                        <span className="lgr-rm-cmp-note">
                          {kind === "balloon"
                            ? "אין תשלום לאורך כל התקופה"
                            : index > 0
                              ? `עולה עם המדד — בחודש האחרון ₪${fmt(last?.payment ?? 0)}`
                              : "קבוע לאורך כל התקופה"}
                        </span>
                      </td>
                    );
                  })}
                </tr>

                {/* The cost of the credit, then what settles it. Shared labels
                    down the start edge — the two tracks line up by
                    construction, which is the only way a comparison works. */}
                {(
                  [
                    { label: "סה״כ ריבית", get: (p: Plan) => p.interest },
                    { label: "סה״כ מדד", get: (p: Plan) => p.index },
                    { label: "עלות כוללת ריבית + מדד", get: (p: Plan) => p.cost, strong: true },
                    // What actually leaves the pocket during the term: nothing
                    // on a balloon, every month's interest on a grace. Its sum
                    // with the settlement row below IS the total — which is why
                    // the two tracks can share one label where the old cards
                    // needed two different ones.
                    { label: "סך התשלומים לאורך התקופה", get: (p: Plan) => (p.monthly > 0 ? p.interest : 0), gap: true },
                    { label: "יתרה לסילוק בתום התקופה", get: (p: Plan) => p.endBalance },
                    { label: "סה״כ לאורך התקופה", get: (p: Plan) => p.total, final: true },
                  ] as const
                ).map((row) => (
                  <tr
                    key={row.label}
                    data-strong={"strong" in row && row.strong ? "true" : undefined}
                    data-final={"final" in row && row.final ? "true" : undefined}
                    data-gap={"gap" in row && row.gap ? "true" : undefined}
                  >
                    <th scope="row">{row.label}</th>
                    {(["balloon", "grace"] as const).map((kind) => {
                      const final = "final" in row && row.final;
                      return (
                        <td
                          key={kind}
                          style={
                            {
                              "--tone": PRODUCT[kind].tone.color,
                              "--tone-text": PRODUCT[kind].tone.text,
                            } as React.CSSProperties
                          }
                        >
                          <Fig
                            value={row.get(plans[kind])}
                            size={final ? 20 : undefined}
                            weight={("strong" in row && row.strong) || final ? 700 : 600}
                            color={final ? "var(--tone-text)" : "var(--ink)"}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr>
                  <td />
                  {(["balloon", "grace"] as const).map((kind) => (
                    <td key={kind} style={{ ["--tone" as string]: PRODUCT[kind].tone.color, ["--tone-text" as string]: PRODUCT[kind].tone.text }}>
                      <Btn className="lgr-btn lgr-rm-open" onClick={() => setOpenPlan(kind)}>
                        <ListChecks size={14} weight="bold" />
                        לוח סילוקין
                      </Btn>
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </motion.section>

          {/* -------------------------------------------- 4. and its shape */}
          <motion.section {...enter(4)} className="lgr-card mt-5 overflow-hidden">
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

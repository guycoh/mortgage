"use client";

// יכולת החזר — the tool.
//
// The arithmetic is /aa1's, kept to the digit (see ability-math.ts, which
// states every rule it carries over and the two things it fixes). Everything
// else here is presentation, and it is a rebuild rather than a restyle.
//
// WHAT WAS WRONG WITH /aa1.
//   · The household grid had PEOPLE as columns and unlabelled rows. Which row
//     was גיל and which was הלוואות could only be learned by reading the
//     placeholder inside an empty box — and once a box was filled, that clue
//     was gone.
//   · A guarantor's income was silently halved. The page showed 9,000 typed and
//     4,500 in the total and never said why.
//   · Three summary cards of identical weight, one of which held the only
//     conclusion the tool reaches. The monthly payment sat in the third card
//     and the two ceilings it has to be judged against sat in the second — so
//     the single comparison this calculator exists to make was left to the
//     reader's short-term memory.
//   · The purpose dropdown printed its own rule (אחוז מימון מקסימלי) as a
//     footnote under itself, one option at a time.
//
// WHAT IT IS NOW, top to bottom:
//   1. THE DEAL. A recessed well of assumptions — inputs recede, results
//      elevate. The purpose is five chips, each stating its own מימון מקסימלי,
//      so choosing is a comparison instead of a memory test. Then the asset,
//      the equity and the terms, borderless, with the equity rules read out
//      beside them under an arrow.
//   2. THE HOUSEHOLD. A ledger: people are rows, and what you know about a
//      person are columns with real headers. The guarantor's row says what its
//      income actually contributed. Its foot carries the two sums and הכנסה
//      פנויה — the figure everything below is a fraction of.
//   3. THE VERDICT. One lit surface, one 46px figure, and the only gauge on the
//      page: the payment laid against the 35% and 40% ceilings.
//
// Four type sizes carry the hierarchy — 46 hero / 24-28 sums / 16 field /
// 12.5 label — and everything financial is tabular he-IL.

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "motion/react";
import NumberFlow, { NumberFlowGroup } from "@number-flow/react";
import {
  ArrowCounterClockwise,
  ChartLineDown,
  CheckCircle,
  Info,
  PencilSimpleLine,
  ShieldCheck,
  User,
  UserCircleCheck,
  Users,
  UsersThree,
  Warning,
  WarningCircle,
  XCircle,
} from "@phosphor-icons/react";
import { fmt } from "../components/Money";
import { rise, snap, type Enter } from "../lib/transitions";
import AbilityMark from "./mark";
import {
  DEFAULTS,
  GUARANTOR_SHARE,
  MAX_MONTHS,
  MAX_RATIO,
  PURPOSES,
  RECOMMENDED_RATIO,
  assess,
  type Purpose,
  type Verdict,
} from "./ability-math";
import "./ability.css";

// ECharts is canvas-only — browser render, no SSR pass.
const AbilityChart = dynamic(() => import("./AbilityChart"), {
  ssr: false,
  loading: () => <div className="lgr-skel m-3 h-[240px]" />,
});

/** The purpose chip's fill and the tool switch's fill travel on one spring —
 *  the two controls are the same idea at two scales. */
const TRAVEL = { type: "spring" as const, stiffness: 420, damping: 34, mass: 0.9 };

const digits = (s: string) => s.replace(/[^\d]/g, "");
const grouped = (s: string) => (s ? Number(s).toLocaleString("he-IL") : "");

/** How the page speaks about where the payment landed. */
const VERDICT: Record<Verdict, { say: string; icon: React.ReactNode }> = {
  ok: { say: "בתוך התקרה המומלצת", icon: <CheckCircle size={19} weight="fill" /> },
  warn: { say: "מעל התקרה המומלצת", icon: <Warning size={19} weight="fill" /> },
  over: { say: "חורג מהתקרה המקסימלית", icon: <XCircle size={19} weight="fill" /> },
};

/**
 * ₪ AND THE DIGITS, and only the digits that changed actually move.
 *
 * NumberFlow, not a counter and not a crossfade: when 7,345 becomes 7,388 the
 * thousands stand still and the tens roll — which is exactly the difference a
 * reader is trying to see. Every animated figure on this page goes through
 * here, so they all move with one voice; the typography stays the parent's,
 * because every caller already has a class that sizes its own figures.
 *
 * It respects prefers-reduced-motion on its own, and unsupported browsers get
 * the plain formatted number — nothing to fall back to by hand.
 */
function Amt({
  value,
  cur = "lgr-cur",
}: {
  value: number;
  /** The shekel mark's class, so a 46px hero and a 15px note can share this. */
  cur?: string;
}) {
  return (
    <>
      <span className={cur}>₪</span>
      <NumberFlow
        value={Math.round(Number(value) || 0)}
        locales="he-IL"
        format={{ maximumFractionDigits: 0 }}
        style={{ direction: "ltr" }}
      />
    </>
  );
}

/**
 * ONE ASSUMPTION.
 *
 * Borderless by default: the value is the interface and the box only appears
 * under the pointer or the caret. A row of these reads as a sentence of facts
 * rather than as a form standing between you and the answer.
 */
function Assume({
  label,
  hint,
  width,
  prefix,
  suffix,
  big,
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
} & React.InputHTMLAttributes<HTMLInputElement>) {
  // A text field hugs its own value via `size`, so the ₪ stays beside the
  // figure instead of stranded at the far edge of a fixed box. Chrome ignores
  // `size` on type=number, so those keep an explicit width.
  const chars = String(input.value ?? "").length;
  const sized = input.type !== "number";
  return (
    <label className="lgr-ab-a" data-big={big || undefined}>
      <span className="lgr-ab-a-l">
        {label}
        {hint && <i>{hint}</i>}
      </span>
      <span className="lgr-ab-a-well" data-empty={chars ? undefined : "true"} dir="ltr">
        <span className="lgr-ab-a-fix">{prefix}</span>
        <input
          {...input}
          className="lgr-ab-a-in"
          size={sized ? Math.max(2, chars) : undefined}
          style={sized ? undefined : { width }}
          inputMode="numeric"
          onFocus={(e) => e.currentTarget.select()}
        />
        <span className="lgr-ab-a-fix">{suffix}</span>
      </span>
    </label>
  );
}

/** A money cell on the household sheet. Bordered and placeholdered, because on
 *  a sheet that also prints calculated figures the border IS the difference. */
function Field({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
}) {
  return (
    <span className="lgr-ab-field">
      <span className="lgr-ab-cur" aria-hidden>
        ₪
      </span>
      <input
        className="lgr-ab-in"
        inputMode="numeric"
        placeholder="0"
        value={grouped(value)}
        onChange={(e) => onChange(digits(e.target.value))}
        onFocus={(e) => e.currentTarget.select()}
        aria-label={ariaLabel}
      />
    </span>
  );
}

export default function AbilityCalculator({
  enter = rise,
  profileUrl = null,
}: {
  enter?: Enter;
  /**
   * Where the client's own facts can be read from — the asset, the two ages,
   * both salaries, both additional-income lines and the existing loan
   * repayment, straight off the Fireberry card the board was opened from. Null
   * on a board with no client, and the tool simply opens blank.
   */
  profileUrl?: string | null;
}) {
  /* ------------------------------------------------------------ the facts */
  const [purpose, setPurpose] = useState<Purpose>("single");
  const [assetValue, setAssetValue] = useState("");
  const [equity, setEquity] = useState("");

  const [mainAge, setMainAge] = useState("");
  const [mainIncome, setMainIncome] = useState("");
  const [mainExtra, setMainExtra] = useState("");
  /** The household's existing repayments, carried on the first borrower's row
   *  and nowhere else — one household, one figure. */
  const [loans, setLoans] = useState("");

  const [secondAge, setSecondAge] = useState("");
  const [secondIncome, setSecondIncome] = useState("");
  const [secondExtra, setSecondExtra] = useState("");

  const [guarantorAge, setGuarantorAge] = useState("");
  const [guarantorIncome, setGuarantorIncome] = useState("");

  const [months, setMonths] = useState(DEFAULTS.months);
  const [interest, setInterest] = useState(DEFAULTS.interest);

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
      .then((d: Record<string, number | null | boolean>) => {
        if (cancelled || !d) return;
        let landed = false;
        const put = (v: unknown, set: (f: (prev: string) => string) => void) => {
          const n = typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.round(v) : null;
          if (n === null) return;
          set((prev) => {
            if (prev) return prev;
            landed = true;
            return String(n);
          });
        };
        put(d.propertyValue, setAssetValue);
        put(d.age1, setMainAge);
        put(d.age2, setSecondAge);
        put(d.income1, setMainIncome);
        put(d.income2, setSecondIncome);
        put(d.extraIncome1, setMainExtra);
        put(d.extraIncome2, setSecondExtra);
        put(d.loanRepayment, setLoans);
        // set after the fills, so the chip never appears without data behind it
        if (landed) setFromCard(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [profileUrl]);

  const reset = () => {
    setPurpose("single");
    setAssetValue("");
    setEquity("");
    setMainAge("");
    setMainIncome("");
    setMainExtra("");
    setLoans("");
    setSecondAge("");
    setSecondIncome("");
    setSecondExtra("");
    setGuarantorAge("");
    setGuarantorIncome("");
    setMonths(DEFAULTS.months);
    setInterest(DEFAULTS.interest);
    // נקה טופס means blank, including what the card filled — the chip goes with
    // the figures it was vouching for.
    setFromCard(false);
  };

  /* ------------------------------------------------------------- the rule */
  const a = useMemo(
    () =>
      assess({
        purpose,
        assetValue,
        equity,
        mainAge,
        mainIncome,
        mainExtra,
        loans,
        secondAge,
        secondIncome,
        secondExtra,
        guarantorAge,
        guarantorIncome,
        months,
        interest,
      }),
    [
      purpose,
      assetValue,
      equity,
      mainAge,
      mainIncome,
      mainExtra,
      loans,
      secondAge,
      secondIncome,
      secondExtra,
      guarantorAge,
      guarantorIncome,
      months,
      interest,
    ]
  );

  /* The gauge's whole length is the MAXIMUM ceiling, so the track is the
     capacity and the fill is what this mortgage spends of it. */
  const spent = a.maxCap > 0 ? Math.min(100, (a.monthlyPayment / a.maxCap) * 100) : 0;
  const years = a.months / 12;
  const tone: Verdict = a.verdict ?? "ok";

  /* ------------------------------------------- the purpose, as a radiogroup */
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const movePurpose = (e: React.KeyboardEvent) => {
    const i = PURPOSES.findIndex((p) => p.id === purpose);
    let next = -1;
    // RTL: the row reads right-to-left, so ArrowLeft advances and ArrowRight
    // goes back — the arrow moves the way it points on screen.
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = (i + 1) % PURPOSES.length;
    else if (e.key === "ArrowRight" || e.key === "ArrowUp") next = (i - 1 + PURPOSES.length) % PURPOSES.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = PURPOSES.length - 1;
    if (next < 0 || next === i) return;
    e.preventDefault();
    setPurpose(PURPOSES[next].id);
    chipRefs.current[next]?.focus();
  };

  return (
    <>
      {/* ------------------------------------------------- 1. the deal card */}
      {/* Three rows that read as one sentence. WHO and FOR WHAT on top; then
          THE EQUATION — שווי הנכס minus הון עצמי equals משכנתא מבוקשת, written
          out at full size with real operators between the figures, because that
          subtraction IS this section and the first build hid its result three
          screens down; then the same three numbers as a BAR, with the purpose's
          minimum flagged across it. Figures, then picture, of one fact. */}
      <motion.section {...enter(1)} className="lgr-card lgr-ab-deal" aria-label="נתוני העסקה">
        <div className="lgr-ab-top">
          {/* WHOSE NUMBERS THESE ARE, and where they came from. A pre-filled
              figure that looks typed is a figure nobody rechecks — so the bar
              says so out loud instead of hiding it in a chip at the far end.
              With nothing pulled it says the other true thing: type them. */}
          <div className="lgr-ab-who" data-live={fromCard || undefined}>
            <span className="lgr-ab-who-ico" aria-hidden>
              {fromCard ? <UserCircleCheck size={19} weight="fill" /> : <PencilSimpleLine size={17} weight="bold" />}
            </span>
            <div className="min-w-0">
              <div className="lgr-ab-who-t">נתוני הלקוח</div>
              <div
                className="lgr-ab-who-s"
                title={fromCard ? "הנתונים נקראו מכרטיס הלקוח ב־Fireberry" : undefined}
              >
                {fromCard ? "נטענו מכרטיס Fireberry" : "הזינו ידנית"}
              </div>
            </div>
          </div>

          {/* THE PURPOSE — five chips, not a dropdown. It is the one control
              that sets אחוז המימון המקסימלי, and a select showed one option at
              a time with that rule printed underneath as a footnote. All five
              rules on screen at once turns the choice into a comparison.
              The white face is a SINGLE OBJECT THAT TRAVELS (layoutId). */}
          <div className="lgr-ab-purpose-wrap">
            <span className="lgr-ab-purpose-l" id="lgr-ab-purpose-l">
              מטרת המשכנתא
            </span>
            <div className="lgr-ab-purpose" role="radiogroup" aria-labelledby="lgr-ab-purpose-l" onKeyDown={movePurpose}>
              {PURPOSES.map((p, i) => {
                const on = p.id === purpose;
                return (
                  <motion.button
                    key={p.id}
                    ref={(el) => {
                      chipRefs.current[i] = el;
                    }}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    // one tab stop for the whole group; arrows do the rest
                    tabIndex={on ? 0 : -1}
                    className="lgr-ab-chip"
                    data-on={on}
                    title={p.full}
                    onClick={() => setPurpose(p.id)}
                    whileTap={{ scale: 0.975 }}
                    transition={snap}
                  >
                    {on && (
                      <motion.span layoutId="lgr-ab-chip-fill" className="lgr-ab-chip-fill" transition={TRAVEL} />
                    )}
                    <span className="lgr-ab-chip-in">
                      <span className="lgr-ab-chip-t">{p.label}</span>
                      <span className="lgr-ab-chip-n">מימון עד {p.maxLtv}%</span>
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        {/* THE EQUATION. Two figures you type, one you get, with the arithmetic
            written between them — the largest type in the section belongs to
            the inputs that drive everything, which is the exact opposite of the
            first build, where the two most important fields on the page were
            the smallest things on it. Every member reserves its caption line,
            so answering a field never moves the row. */}
        <div className="lgr-ab-eq" role="group" aria-label="חישוב המשכנתא המבוקשת">
          <label className="lgr-ab-term">
            <span className="lgr-ab-term-l">שווי הנכס</span>
            <span className="lgr-ab-term-well" data-empty={assetValue ? undefined : "true"} dir="ltr">
              <span className="lgr-ab-term-cur">₪</span>
              <input
                className="lgr-ab-term-in"
                inputMode="numeric"
                // "—", not "0": a grey zero in a money field still reads as a
                // stated amount, and this field has not been answered yet.
                placeholder="—"
                size={Math.max(3, grouped(assetValue).length)}
                value={grouped(assetValue)}
                onChange={(e) => setAssetValue(digits(e.target.value))}
                onFocus={(e) => e.currentTarget.select()}
                aria-label="שווי הנכס בשקלים"
              />
            </span>
            <span className="lgr-ab-term-c" />
          </label>

          <span className="lgr-ab-eq-op" aria-hidden>
            −
          </span>

          <label className="lgr-ab-term">
            <span className="lgr-ab-term-l">הון עצמי</span>
            <span className="lgr-ab-term-well" data-empty={equity ? undefined : "true"} dir="ltr">
              <span className="lgr-ab-term-cur">₪</span>
              <input
                className="lgr-ab-term-in"
                inputMode="numeric"
                placeholder="—"
                size={Math.max(3, grouped(equity).length)}
                value={grouped(equity)}
                onChange={(e) => setEquity(digits(e.target.value))}
                onFocus={(e) => e.currentTarget.select()}
                aria-label="הון עצמי בשקלים"
              />
            </span>
            {/* The purpose's rule, under the field it binds — and the shortfall
                in warn when the equity misses it. One line, always reserved. */}
            <span className="lgr-ab-term-c" data-warn={a.asset > 0 && a.equityGap > 0 ? "true" : undefined}>
              {a.asset > 0
                ? a.equityGap > 0
                  ? `מינימום ${a.minEquityPercent}% · חסר ₪${fmt(a.equityGap)}`
                  : `מינימום ${a.minEquityPercent}% · ₪${fmt(a.minEquity)}`
                : ""}
            </span>
          </label>

          <span className="lgr-ab-eq-op" aria-hidden>
            =
          </span>

          {/* THE RESULT, in the mortgage's own ink. Output, not input: no well,
              no border — a stated figure, at the same size as the fields it is
              subtracted from, so the sentence reads at one weight. */}
          <div className="lgr-ab-term" data-out="true">
            <span className="lgr-ab-term-l">משכנתא מבוקשת</span>
            <span className="lgr-ab-term-v" dir="ltr" data-empty={a.requested > 0 ? undefined : "true"}>
              {a.requested > 0 ? <Amt value={a.requested} cur="lgr-ab-term-cur" /> : <><span className="lgr-ab-term-cur">₪</span>—</>}
            </span>
            <span className="lgr-ab-term-c">
              {a.requested > 0 && a.asset > 0 ? `${((a.requested / a.asset) * 100).toFixed(1)}% מימון · עד ${a.maxLtv}%` : ""}
            </span>
          </div>

          <span className="lgr-ab-eq-sep" aria-hidden />

          <Assume
            label="תקופה"
            hint="חודשים"
            width={46}
            type="number"
            min={1}
            max={MAX_MONTHS}
            step={12}
            placeholder={DEFAULTS.months}
            value={months}
            onChange={(e) => setMonths(e.target.value)}
            aria-label="תקופת המשכנתא בחודשים"
            suffix={
              <span dir="rtl" className="lgr-ab-a-yrs">
                {years % 1 === 0 ? `${years} שנ׳` : `${years.toFixed(1)} שנ׳`}
              </span>
            }
          />
          <Assume
            label="ריבית שנתית"
            width={48}
            type="number"
            step="0.01"
            min={0}
            placeholder="0"
            suffix="%"
            value={interest}
            onChange={(e) => setInterest(e.target.value)}
            aria-label="ריבית שנתית באחוזים"
          />

          <button className="lgr-ab-reset ms-auto" onClick={reset} title="חזרה לערכי ברירת המחדל">
            <ArrowCounterClockwise size={13} weight="bold" />
            נקה
          </button>
        </div>

        {/* THE DEAL, AS ONE BAR. שווי הנכס split into what the client brings and
            what the bank is asked for, with the purpose's own rule drawn across
            it — the naked-eye version of the three readouts above: the dark
            part must reach the line. When it falls short, the stretch it should
            have covered is washed in warn, which is the same claim the חסר
            figure makes, made visible. Widths are the data, so the bar redraws
            itself with every keystroke in שווי הנכס or הון עצמי. */}
        {a.asset > 0 && (() => {
          const eqPct = Math.max(0, Math.min(100, a.equityPercent));
          const gapPct = Math.max(0, Math.min(100 - eqPct, a.minEquityPercent - eqPct));
          const loanPct = Math.max(0, 100 - eqPct - gapPct);
          return (
            <div
              className="lgr-ab-fund"
              role="img"
              aria-label={`מבנה המימון: הון עצמי ₪${fmt(a.equity)} שהם ${eqPct.toFixed(0)}% מהנכס, משכנתא מבוקשת ₪${fmt(a.requested)}. הון עצמי מינימלי ${a.minEquityPercent}%`}
            >
              <span className="lgr-ab-fund-l">מבנה המימון</span>
              <div className="lgr-ab-fund-track">
                <span className="lgr-ab-fund-seg" data-k="equity" style={{ width: `${eqPct}%` }}>
                  {eqPct >= 16 && (
                    <span className="lgr-ab-fund-t">
                      הון עצמי · <b dir="ltr">₪{fmt(a.equity)}</b>
                    </span>
                  )}
                </span>
                {gapPct > 0 && <span className="lgr-ab-fund-seg" data-k="gap" style={{ width: `${gapPct}%` }} />}
                <span className="lgr-ab-fund-seg" data-k="loan" style={{ width: `${loanPct}%` }}>
                  {loanPct >= 16 && (
                    <span className="lgr-ab-fund-t">
                      משכנתא · <b dir="ltr">₪{fmt(a.requested)}</b>
                    </span>
                  )}
                </span>
                <i
                  className="lgr-ab-fund-tick"
                  data-short={gapPct > 0 || undefined}
                  style={{ insetInlineStart: `${a.minEquityPercent}%` }}
                >
                  <em>מינימום {a.minEquityPercent}%</em>
                </i>
              </div>
            </div>
          );
        })()}
      </motion.section>

      {/* --------------------------------------------- 2. the household sheet */}
      <motion.section {...enter(2)} className="lgr-card lgr-ab-sheet">
        <header className="lgr-head">
          <UsersThree size={15} weight="fill" style={{ color: "var(--lgr-3)" }} />
          <h2 className="lgr-title">בני הבית</h2>
          <span className="lgr-sub ms-auto">סכומים חודשיים, נטו</span>
        </header>

        <NumberFlowGroup>
        <table className="lgr-ab-tbl">
          <caption className="sr-only">הכנסות והתחייבויות חודשיות של בני משק הבית</caption>
          <colgroup>
            <col className="lgr-ab-c-who" />
            <col className="lgr-ab-c-age" />
            <col />
            <col />
            <col />
          </colgroup>
          <thead>
            <tr>
              {/* A blank corner. The card above is titled בני הבית and each row
                  names itself — a third statement of the same thing is
                  furniture. Present for a screen reader, absent to the eye. */}
              <th scope="col">
                <span className="sr-only">בן משק בית</span>
              </th>
              <th scope="col">גיל</th>
              <th scope="col">הכנסה חודשית</th>
              <th scope="col">הכנסה חודשית נוספת</th>
              <th scope="col">
                החזר הלוואות<i>לא כולל משכנתא</i>
              </th>
            </tr>
          </thead>

          <tbody>
            {/* — בן זוג ראשי. The only row that carries the household's existing
                repayments: they are one figure for one household, and asking
                for them three times invites double counting. — */}
            <tr>
              <th scope="row">
                <span className="lgr-ab-name">
                  <span className="lgr-ab-name-ico" aria-hidden>
                    <User size={17} weight="fill" />
                  </span>
                  <span className="min-w-0">
                    <span className="lgr-ab-name-t">בן זוג ראשי</span>
                  </span>
                </span>
              </th>
              <td>
                <input
                  className="lgr-ab-in"
                  inputMode="numeric"
                  placeholder="—"
                  value={mainAge}
                  onChange={(e) => setMainAge(digits(e.target.value).slice(0, 3))}
                  onFocus={(e) => e.currentTarget.select()}
                  aria-label="גיל בן זוג ראשי"
                />
              </td>
              <td>
                <Field value={mainIncome} onChange={setMainIncome} ariaLabel="הכנסה חודשית, בן זוג ראשי" />
              </td>
              <td>
                <Field value={mainExtra} onChange={setMainExtra} ariaLabel="הכנסה חודשית נוספת, בן זוג ראשי" />
              </td>
              <td>
                <Field value={loans} onChange={setLoans} ariaLabel="החזר חודשי על הלוואות קיימות" />
              </td>
            </tr>

            {/* — בן זוג משני — */}
            <tr>
              <th scope="row">
                <span className="lgr-ab-name">
                  <span className="lgr-ab-name-ico" aria-hidden>
                    <Users size={17} weight="fill" />
                  </span>
                  <span className="min-w-0">
                    <span className="lgr-ab-name-t">בן זוג משני</span>
                  </span>
                </span>
              </th>
              <td>
                <input
                  className="lgr-ab-in"
                  inputMode="numeric"
                  placeholder="—"
                  value={secondAge}
                  onChange={(e) => setSecondAge(digits(e.target.value).slice(0, 3))}
                  onFocus={(e) => e.currentTarget.select()}
                  aria-label="גיל בן זוג משני"
                />
              </td>
              <td>
                <Field value={secondIncome} onChange={setSecondIncome} ariaLabel="הכנסה חודשית, בן זוג משני" />
              </td>
              <td>
                <Field value={secondExtra} onChange={setSecondExtra} ariaLabel="הכנסה חודשית נוספת, בן זוג משני" />
              </td>
              <td>
                <span className="lgr-ab-nil" title="החזרי ההלוואות נרשמים במרוכז בשורת בן הזוג הראשי">
                  —
                </span>
              </td>
            </tr>

            {/* — ערבים. Half of a guarantor's income is what a lender looks at.
                /aa1 halved it in silence; the row states what it contributed. — */}
            <tr data-half="true">
              <th scope="row">
                <span className="lgr-ab-name">
                  <span className="lgr-ab-name-ico" aria-hidden>
                    <ShieldCheck size={17} weight="fill" />
                  </span>
                  <span className="min-w-0">
                    <span className="lgr-ab-name-t">ערבים</span>
                    <span className="lgr-ab-name-s">נספרים {GUARANTOR_SHARE * 100}% מההכנסה</span>
                  </span>
                </span>
              </th>
              <td>
                <input
                  className="lgr-ab-in"
                  inputMode="numeric"
                  placeholder="—"
                  value={guarantorAge}
                  onChange={(e) => setGuarantorAge(digits(e.target.value).slice(0, 3))}
                  onFocus={(e) => e.currentTarget.select()}
                  aria-label="גיל הערב"
                />
              </td>
              <td>
                <Field value={guarantorIncome} onChange={setGuarantorIncome} ariaLabel="הכנסה חודשית של הערב" />
                <span className="lgr-ab-counted" data-on={a.guarantorRaw > 0 || undefined} aria-live="polite">
                  נספרים{" "}
                  <b dir="ltr">
                    ₪
                    <NumberFlow value={Math.round(a.guarantorCounted)} locales="he-IL" format={{ maximumFractionDigits: 0 }} />
                  </b>
                </span>
              </td>
              <td>
                <span className="lgr-ab-nil">—</span>
              </td>
              <td>
                <span className="lgr-ab-nil" title="החזרי ההלוואות נרשמים במרוכז בשורת בן הזוג הראשי">
                  —
                </span>
              </td>
            </tr>
          </tbody>

          {/* THE TOTALS, IN THE COLUMNS THEY SUM. The first build printed them
              in a loose grid under the table, so סה״כ הכנסה floated somewhere
              between the columns it was adding up — a ledger's totals belong
              under its rules. Income spans its two columns; the loans total
              sits under the loans column; nothing is invented for גיל. */}
          <tfoot>
            <tr className="lgr-ab-tf">
              <th scope="row">סה״כ חודשי</th>
              <td />
              <td colSpan={2}>
                <span className="lgr-ab-tf-l">הכנסה מוכרת</span>
                <span className="lgr-ab-tf-v" data-empty={a.totalIncome > 0 ? undefined : "true"}>
                  {a.totalIncome > 0 ? <Amt value={a.totalIncome} /> : "—"}
                </span>
              </td>
              <td>
                <span className="lgr-ab-tf-l">החזרי הלוואות</span>
                <span className="lgr-ab-tf-v" data-empty={a.totalLoans > 0 ? undefined : "true"}>
                  {a.totalLoans > 0 ? <Amt value={a.totalLoans} /> : "—"}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>

        {/* THE RESULT BAND — the one figure everything below divides by, double-
            ruled off the totals the way a ledger closes. Stated as soon as
            EITHER side of the subtraction is answered: a sheet with repayments
            and no income has a free income, and it is negative — which is
            exactly the case worth showing. NumberFlowGroup spans the totals and
            the result, so one edit moves all three figures in one breath. */}
        <div className="lgr-ab-free" data-neg={a.freeIncome < 0 || undefined}>
          <span className="lgr-ab-free-l">הכנסה פנויה</span>
          <span className="lgr-ab-free-f">הכנסה מוכרת פחות החזרי הלוואות — הבסיס לתקרות ההחזר</span>
          <span
            className="lgr-ab-free-v"
            data-empty={a.totalIncome > 0 || a.totalLoans > 0 ? undefined : "true"}
          >
            {a.totalIncome > 0 || a.totalLoans > 0 ? <Amt value={a.freeIncome} /> : "—"}
          </span>
        </div>
        </NumberFlowGroup>
      </motion.section>

      {/* --------------------------------------------------- 3. the verdict */}
      <motion.section {...enter(3)} className="lgr-ab-hero" data-empty={a.monthlyPayment > 0 ? undefined : "true"}>
        {a.monthlyPayment > 0 ? (
          <>
            <div className="lgr-ab-hero-top">
              <div className="min-w-0">
                <div className="lgr-ab-hero-cap">החזר חודשי</div>
                <div className="lgr-ab-hero-fig" dir="ltr">
                  <Amt value={a.monthlyPayment} cur="lgr-ab-hero-cur" />
                </div>
                {/* ONE SENTENCE — the whole deal, restated under its price.
                    The figures live in the equation above too, but a verdict
                    that gets read aloud (or screenshotted) has to stand on its
                    own: the loan, the term, the rate, the schedule. */}
                <div className="lgr-ab-hero-sub">
                  משכנתא של{" "}
                  <b dir="ltr" style={{ unicodeBidi: "isolate" }}>
                    ₪{fmt(a.requested)}
                  </b>
                  <span className="lgr-ab-dot">·</span>
                  {years % 1 === 0 ? years : years.toFixed(1)} שנים
                  <span className="lgr-ab-dot">·</span>
                  ריבית {a.rate}%
                  <span className="lgr-ab-dot">·</span>
                  לוח שפיצר
                </div>
              </div>

              {/* THE VERDICT. The only claim the page makes rather than reports,
                  and the only place a status colour is given a fill.
                  Keyed, but deliberately NOT inside an AnimatePresence: this
                  changes while someone is typing in the sheet above it, and
                  mode="wait" would hold the old chip for its exit and leave the
                  row with no verdict at all for a tenth of a second on every
                  crossing. Replacing the element outright keeps the geometry
                  honest from the first frame — only the ink and the word move. */}
              {a.verdict && (
                <motion.div
                  key={a.verdict}
                  className="lgr-ab-verdict"
                  data-tone={a.verdict}
                  role="status"
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={snap}
                >
                  {VERDICT[a.verdict].icon}
                  {VERDICT[a.verdict].say}
                </motion.div>
              )}
            </div>

            {/* THE ONE GAUGE. Its full length is the maximum ceiling, so the
                track IS the household's capacity and the fill is what this
                mortgage spends of it. The rule across it at 87.5% is the
                recommended ceiling — 35 is seven eighths of 40 — and the wash
                past that rule is the stretch a lender starts asking about. */}
            {a.freeIncome > 0 ? (
              <div className="lgr-ab-gauge">
                <div
                  className="lgr-ab-track"
                  role="meter"
                  aria-valuemin={0}
                  aria-valuemax={Math.round(a.maxCap)}
                  aria-valuenow={Math.round(Math.min(a.monthlyPayment, a.maxCap))}
                  aria-valuetext={`${fmt(a.monthlyPayment)} שקלים מתוך תקרה מקסימלית של ${fmt(a.maxCap)} שקלים`}
                  aria-label="ההחזר החודשי מול תקרות ההחזר"
                >
                  <div className="lgr-ab-fill" data-tone={tone} style={{ width: `${spent}%` }} />
                  <span className="lgr-ab-mark" aria-hidden />
                </div>

                <NumberFlowGroup>
                  <div className="lgr-ab-scale">
                    <span className="lgr-ab-ratio" data-tone={tone}>
                      יחס החזר להכנסה פנויה
                      <b dir="ltr">
                        {a.ratio !== null ? (
                          <NumberFlow
                            value={a.ratio}
                            locales="he-IL"
                            format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
                            suffix="%"
                          />
                        ) : (
                          "—"
                        )}
                      </b>
                    </span>
                    <span className="lgr-ab-scale-i">
                      תקרה מומלצת {RECOMMENDED_RATIO * 100}%
                      <b>
                        <Amt value={a.recommendedCap} />
                      </b>
                    </span>
                    <span className="lgr-ab-scale-i" data-end="true">
                      תקרה מקסימלית {MAX_RATIO * 100}%
                      <b>
                        <Amt value={a.maxCap} />
                      </b>
                    </span>
                  </div>
                </NumberFlowGroup>

                {a.verdict === "over" && (
                  <div className="lgr-ab-notice" role="alert">
                    <WarningCircle size={15} weight="fill" style={{ flex: "none" }} />
                    ההחזר גבוה מהתקרה המקסימלית ב־₪{fmt(a.monthlyPayment - a.maxCap)} לחודש
                  </div>
                )}
              </div>
            ) : a.noCapacity ? (
              <div className="lgr-ab-notice" role="alert">
                <WarningCircle size={15} weight="fill" style={{ flex: "none" }} />
                החזרי ההלוואות מכסים את מלוא ההכנסה המוכרת — אין הכנסה פנויה לחישוב תקרה
              </div>
            ) : null}
          </>
        ) : (
          /* Nothing to price yet. The block holds the exact shape it will have
             once it has a figure, so typing the first number fills it in rather
             than growing the page. No instruction: an empty form is its own. */
          <div className="lgr-ab-hero-blank">
            <span className="lgr-ab-hero-mark" aria-hidden>
              <AbilityMark size={26} />
            </span>
            <div>
              <div className="lgr-ab-hero-cap">החזר חודשי</div>
              <div className="lgr-ab-hero-fig" data-empty="true" dir="ltr" aria-label="טרם חושב">
                <span className="lgr-ab-hero-cur">₪</span>—
              </div>
            </div>
          </div>
        )}
      </motion.section>

      {/* ------------------------------------------ 4. the term, negotiable */}
      {/* The hero is one point; this is the curve it sits on — the payment at
          every term from 5 to 40 years, with the two ceilings ruled across it.
          Where the violet line dips under the green rule is where the mortgage
          becomes affordable, and clicking there ADOPTS that term: the chart is
          the tool's second input, not an illustration of its output. */}
      {a.monthlyPayment > 0 && (
        <motion.section {...enter(4)} className="lgr-card mt-5 overflow-hidden">
          <header className="lgr-head">
            <ChartLineDown size={14} weight="fill" style={{ color: "var(--lgr-3)" }} />
            <h2 className="lgr-title">החזר לפי תקופה</h2>
            <span className="lgr-sub ms-auto">לחיצה על העקומה קובעת את התקופה</span>
          </header>
          <div className="px-1 pb-1 pt-2">
            <AbilityChart
              principal={a.requested}
              rate={a.rate}
              term={a.months}
              recommendedCap={a.freeIncome > 0 ? a.recommendedCap : 0}
              maxCap={a.freeIncome > 0 ? a.maxCap : 0}
              onPickTerm={(m) => setMonths(String(m))}
            />
          </div>
          <p className="px-4 pb-3.5 text-[11.5px]" style={{ color: "var(--lgr-4)" }}>
            ההחזר החודשי על אותה משכנתא ובאותה ריבית, לכל תקופה. הנקודה היא התקופה שנבחרה; מתחת לקו המקווקו הירוק
            ההחזר בתוך התקרה המומלצת.
          </p>
        </motion.section>
      )}

      <p className="lgr-ab-note">
        <Info size={13} weight="fill" style={{ flex: "none", marginTop: 2 }} />
        הערכה על בסיס הנתונים שהוזנו בלבד. ההחזר מחושב בלוח שפיצר על המשכנתא המבוקשת, ותקרות ההחזר נגזרות מההכנסה
        הפנויה. אחוז המימון, הריבית ותנאי האישור נקבעים על ידי הגוף המלווה.
      </p>
    </>
  );
}

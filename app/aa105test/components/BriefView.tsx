"use client";

// סיכום ללקוח — the client's whole debt picture, worst first.
//
// One page, two hosts: the advisor turns the screen around inside the board
// (Stage), and the client opens the same page later from a link (/summary/<id>).
// Both draw a frozen BriefDoc, so the shared page says exactly what was shown.
//
// Three movements, top to bottom:
//   1. The weight: what they owe, and what it costs them — per month, per day,
//      until the end. Then where the money goes, by size and by cost.
//   2. What hurts: the engine's client lines, each led by the one figure that
//      carries it, grouped by how urgently it needs handling.
//   3. Everything: every debt, lender by lender (or track by track), with the
//      totals the hero asserted, arrived at.
//
// The drama is in emphasis, never in the numbers: every figure is the
// document's own or plain arithmetic on it, and the estimates say "כ־".

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import NumberFlow from "@number-flow/react";
import { motion, useInView, useReducedMotion } from "motion/react";
import {
  ArrowBendDownLeft,
  CheckCircle,
  Phone,
  Scales,
  WarningCircle,
  WhatsappLogo,
} from "@phosphor-icons/react";
import { BankIcon } from "@/app/aa102test/components/bankIcons";
import Logo from "@/app/aa102test/components/Logo";
import { WORRY_GROUP_LABEL, WORRY_GROUP_ORDER } from "@/lib/verdicts";
import type { BriefDoc, BriefFigure, BriefPain, DebtGroup, DebtRow, Lens } from "../lib/brief";
import "@fontsource-variable/inter";
import "@fontsource/assistant/hebrew-300.css";
import "@fontsource/assistant/hebrew-400.css";
import "@fontsource/assistant/hebrew-500.css";
import "@fontsource/assistant/hebrew-600.css";
import "@fontsource/assistant/hebrew-700.css";
import "../brief.css";

const EASE = [0.16, 1, 0.3, 1] as const;
const ils = (n: number) => Math.round(n).toLocaleString("he-IL");
const pct = (n: number) => `${Math.round(n * 100)}%`;
/** Estimates are rounded to what they can honestly claim. */
const roundTo = (n: number, step: number) => Math.round(n / step) * step;

export const SECTIONS = [
  { id: "brf-picture", label: "סיכום" },
  { id: "brf-pains", label: "מה דורש תשומת לב" },
  { id: "brf-debts", label: "כל ההתחייבויות" },
] as const;

/* ------------------------------------------------------------ figures */

function Shekel({ value, className }: { value: number; className?: string }) {
  return (
    <span className={`brf-num ${className ?? ""}`} dir="ltr">
      <span className="brf-cur">₪</span>
      {ils(value)}
    </span>
  );
}

/** A figure that rolls up the first time it is seen. */
function Rolling({
  value,
  shown,
  kind,
  duration = 1100,
}: {
  value: number;
  shown: boolean;
  kind: BriefFigure["kind"];
  duration?: number;
}) {
  const reduce = useReducedMotion();
  const timing = {
    spinTiming: { duration: reduce ? 0 : duration, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
    transformTiming: { duration: reduce ? 0 : Math.round(duration * 0.6), easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
  };
  const v = shown || reduce ? value : 0;
  switch (kind) {
    case "money":
      return (
        <span className="brf-num" dir="ltr">
          <span className="brf-cur">₪</span>
          <NumberFlow value={Math.round(v)} locales="he-IL" {...timing} />
        </span>
      );
    case "share":
      return (
        <span className="brf-num" dir="ltr">
          <NumberFlow value={Math.round(v * 100)} suffix="%" {...timing} />
        </span>
      );
    case "rate":
      return (
        <span className="brf-num" dir="ltr">
          <NumberFlow value={Math.round(v * 100) / 100} format={{ maximumFractionDigits: 2 }} suffix="%" {...timing} />
        </span>
      );
    case "years":
      return (
        <span className="brf-num brf-num-words">
          <NumberFlow value={Math.round(v)} {...timing} />
          <span className="brf-unit">שנים</span>
        </span>
      );
    default:
      return (
        <span className="brf-num" dir="ltr">
          <NumberFlow value={Math.round(v)} {...timing} />
        </span>
      );
  }
}

/* ---------------------------------------------------------- the weight */

function useMounted(delay = 140) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOn(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return on;
}

function Hero({ doc }: { doc: BriefDoc }) {
  const on = useMounted();
  const reduce = useReducedMotion();
  const credit = doc.source === "credit";

  // The cost strip: what the debt takes, from this month to the last payment.
  const rungs: { key: string; label: string; fig: ReactNode; foot?: ReactNode; pain?: boolean }[] = [];
  if (doc.monthly !== null) {
    rungs.push({
      key: "monthly",
      label: "החזר חודשי",
      fig: <Rolling kind="money" value={doc.monthly} shown={on} />,
      foot:
        doc.interestShare !== null ? (
          <div className="brf-split" aria-label={`מזה כ-${pct(doc.interestShare)} ריבית`}>
            <div className="brf-split-bar">
              <motion.span
                className="brf-split-int"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: on ? doc.interestShare : 0 }}
                transition={{ duration: reduce ? 0 : 1.1, ease: EASE, delay: reduce ? 0 : 0.55 }}
              />
            </div>
            <span className="brf-split-text">
              <b>כ-{pct(doc.interestShare)}</b> ממנו ריבית
            </span>
          </div>
        ) : null,
    });
  }
  if (doc.yearlyInterest !== null && doc.yearlyInterest > 0) {
    rungs.push({
      key: "day",
      label: "ריבית ליום",
      pain: true,
      fig: (
        <>
          <span className="brf-approx">כ-</span>
          <Rolling kind="money" value={doc.yearlyInterest / 365} shown={on} />
        </>
      ),
      foot: (
        <span className="brf-rung-foot">
          <Shekel value={roundTo(doc.yearlyInterest, 100)} /> בשנה
        </span>
      ),
    });
  }
  if (doc.futureInterest !== null && doc.futureInterest > 0) {
    rungs.push({
      key: "future",
      label: "ריבית עד סוף התקופה",
      pain: true,
      fig: (
        <>
          <span className="brf-approx">כ-</span>
          <Rolling kind="money" value={roundTo(doc.futureInterest, 1000)} shown={on} duration={1500} />
        </>
      ),
      foot: <span className="brf-rung-foot">לפי הריבית כיום, ללא הצמדה למדד</span>,
    });
  }
  if (doc.ends) {
    rungs.push({
      key: "ends",
      label: "עד סיום התשלומים",
      fig: <Rolling kind="years" value={doc.ends.years} shown={on} />,
      foot: <span className="brf-rung-foot">התשלום האחרון ב-{doc.ends.label}</span>,
    });
  }

  return (
    <div className="brf-hero">
      <div className="brf-hero-id">
        {doc.who && <p className="brf-hello">{doc.who}</p>}
        <h1 className="brf-lede">
          {credit ? "סך החובות שלכם" : "יתרת המשכנתא שלכם"}
          {!credit && doc.lender && (
            <span className="brf-lender">
              <BankIcon source={doc.lender} size={24} />
              {doc.lender}
            </span>
          )}
        </h1>
      </div>

      <div className="brf-hero-sum">
        <div className="brf-big" dir="ltr">
          <span className="brf-big-cur">₪</span>
          <NumberFlow
            value={on || reduce ? Math.round(doc.balance) : 0}
            locales="he-IL"
            spinTiming={{ duration: reduce ? 0 : 1700, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}
            transformTiming={{ duration: reduce ? 0 : 900, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}
          />
        </div>
        <div className="brf-count">
          <span>
            {credit
              ? `${doc.count.debts} התחייבויות · ${doc.count.lenders === 1 ? "מלווה אחד" : `${doc.count.lenders} מלווים`}`
              : doc.count.debts === 1
                ? "מסלול אחד"
                : `${doc.count.debts} מסלולים`}
          </span>
          {doc.asOf && <span className="brf-asof">נכון ל-{doc.asOf}</span>}
        </div>
      </div>

      {rungs.length > 0 && (
        <ol className="brf-ladder" style={{ ["--n" as string]: rungs.length }}>
          {rungs.map((r, i) => (
            <motion.li
              key={r.key}
              className="brf-rung"
              data-pain={r.pain || undefined}
              initial={{ opacity: 0, y: reduce ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduce ? 0 : 0.6, ease: EASE, delay: reduce ? 0 : 0.3 + i * 0.08 }}
            >
              <span className="brf-rung-label">{r.label}</span>
              <span className="brf-rung-fig">{r.fig}</span>
              {r.foot}
            </motion.li>
          ))}
        </ol>
      )}
    </div>
  );
}

/* ------------------------------------------------- where the money goes */

const LENSES: { id: Lens; label: string }[] = [
  { id: "balance", label: "יתרה" },
  { id: "monthly", label: "החזר חודשי" },
  { id: "interest", label: "ריבית שנתית" },
];

/** Where the money goes — by size, by repayment, by interest. `bare` drops the heading (a section supplies it). */
export function Flow({ doc, bare }: { doc: BriefDoc; bare?: boolean }) {
  const reduce = useReducedMotion();
  const on = useMounted(260);
  const lenses = LENSES.filter((l) => l.id !== "monthly" || doc.slices.some((s) => s.monthly > 0));
  const [lens, setLens] = useState<Lens>("balance");
  const total = doc.slices.reduce((s, x) => s + x[lens], 0);
  if (doc.slices.length < 2 || total <= 0) return null;
  const of = doc.source === "credit" ? "מהחוב" : "מהמשכנתא";
  const lensOf = (l: Lens) => (l === "monthly" ? "מההחזר החודשי" : l === "interest" ? "מהריבית" : of);
  const skew = doc.skew;

  return (
    <section className="brf-flow" data-bare={bare || undefined} aria-label="לאן הולך הכסף">
      <div className="brf-flow-head">
        {!bare && <h2 className="brf-h2">לאן הולך הכסף</h2>}
        <div className="brf-seg" role="tablist" aria-label="תצוגה">
          {lenses.map((l) => (
            <button
              key={l.id}
              role="tab"
              aria-selected={lens === l.id}
              className="brf-seg-btn"
              data-on={lens === l.id || undefined}
              onClick={() => setLens(l.id)}
            >
              {lens === l.id && (
                <motion.span layoutId={bare ? "brf-seg-pill-dd" : "brf-seg-pill"} className="brf-seg-pill" transition={{ type: "spring", stiffness: 520, damping: 40 }} />
              )}
              <span className="brf-seg-text">{l.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="brf-ribbon" role="img" aria-label={doc.slices.map((s) => `${s.label} ${pct(s[lens] / total)}`).join(", ")}>
        {doc.slices.map((s, i) => {
          const w = s[lens] / total;
          return (
            <motion.span
              key={s.key}
              className="brf-ribbon-seg"
              style={{ background: s.color }}
              initial={{ flexGrow: 0.0001 }}
              animate={{ flexGrow: on ? Math.max(w, 0.0001) : 0.0001, opacity: w > 0 ? 1 : 0 }}
              transition={{ type: "spring", stiffness: 140, damping: 24, mass: 0.9, delay: !on || reduce ? 0 : i * 0.04 }}
            >
              <span className="brf-ribbon-in">{pct(w)}</span>
            </motion.span>
          );
        })}
      </div>

      <ul className="brf-key">
        {doc.slices.map((s) => (
          <li key={s.key} style={{ ["--c" as string]: s.color }}>
            <span className="brf-key-label">{s.label}</span>
            <span className="brf-key-figs">
              <span className="brf-key-pct" dir="ltr">
                <NumberFlow value={Math.round((s[lens] / total) * 100)} suffix="%" />
              </span>
              <Shekel value={s[lens]} className="brf-key-amt" />
            </span>
          </li>
        ))}
      </ul>

      {skew && (
        <button
          className="brf-skew"
          data-on={lens === skew.lens || undefined}
          onClick={() => setLens(skew.lens)}
          style={{ ["--c" as string]: skew.color }}
        >
          <Scales size={22} weight="duotone" aria-hidden />
          <span>
            <b>{skew.label}:</b> {pct(skew.balanceShare)} {of}, אבל <b>{pct(skew.lensShare)}</b> {lensOf(skew.lens)}.
          </span>
        </button>
      )}
    </section>
  );
}

/* ------------------------------------------------------------ the pains */

function PainFigure({ p, shown }: { p: BriefPain; shown: boolean }) {
  if (!p.figure)
    return (
      <span className="brf-pain-glyph" aria-hidden>
        {p.good ? <CheckCircle size={30} weight="fill" /> : <WarningCircle size={30} weight="fill" />}
      </span>
    );
  return <Rolling kind={p.figure.kind} value={p.figure.value} shown={shown} />;
}

function Pain({ p, i, withNext }: { p: BriefPain; i: number; withNext: boolean }) {
  const ref = useRef<HTMLLIElement>(null);
  const seen = useInView(ref, { once: true, margin: "0px 0px -12% 0px" });
  const reduce = useReducedMotion();
  return (
    <motion.li
      ref={ref}
      className="brf-pain"
      data-tone={p.good ? "good" : p.tone}
      initial={{ opacity: 0, y: reduce ? 0 : 16 }}
      animate={seen ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: reduce ? 0 : 0.55, ease: EASE, delay: reduce ? 0 : Math.min(i, 5) * 0.06 }}
    >
      <div className="brf-pain-fig">
        <PainFigure p={p} shown={seen} />
      </div>
      <div className="brf-pain-body">
        <h4 className="brf-pain-title">{p.title}</h4>
        <p className="brf-pain-say">{p.say}</p>
        {withNext && p.next && (
          <p className="brf-pain-next">
            <ArrowBendDownLeft size={16} weight="bold" aria-hidden />
            <span>{p.next}</span>
          </p>
        )}
      </div>
    </motion.li>
  );
}

function Pains({ doc }: { doc: BriefDoc }) {
  const groups = WORRY_GROUP_ORDER.map((g) => ({ g, rows: doc.pains.filter((p) => p.group === g) })).filter(
    (x) => x.rows.length > 0
  );
  const urgent = doc.pains.filter((p) => p.group === "act").length;
  return (
    <section id="brf-pains" className="brf-chapter" aria-labelledby="brf-pains-title">
      <header className="brf-chapter-head">
        <h2 id="brf-pains-title" className="brf-h1">
          מה דורש תשומת לב
        </h2>
        {doc.pains.length > 0 && (
          <p className="brf-chapter-sub">
            {doc.pains.length === 1 ? "נושא אחד" : `${doc.pains.length} נושאים`}
            {urgent > 0 && <b data-urgent>{urgent === 1 ? "אחד בעדיפות גבוהה" : `${urgent} בעדיפות גבוהה`}</b>}
          </p>
        )}
      </header>
      {groups.length === 0 ? (
        <p className="brf-calm">
          <CheckCircle size={22} weight="fill" />
          לא נמצאו בדוח נושאים שדורשים טיפול.
        </p>
      ) : (
        groups.map(({ g, rows }) => (
          <div key={g} className="brf-pgroup" data-group={g}>
            <h3 className="brf-pgroup-title">{WORRY_GROUP_LABEL[g]}</h3>
            <ol className="brf-pains">
              {rows.map((p, i) => (
                <Pain key={p.id} p={p} i={i} withNext={g === "act"} />
              ))}
            </ol>
          </div>
        ))
      )}
    </section>
  );
}

/* ---------------------------------------------------------- everything */

function Row({ r }: { r: DebtRow }) {
  return (
    <li className="brf-row" data-alarm={r.alarm || undefined}>
      <span className="brf-row-mark">
        {r.dot ? <i className="brf-row-dot" style={{ background: r.dot }} /> : <BankIcon source={r.source} size={34} />}
      </span>
      <div className="brf-row-id">
        <div className="brf-row-name">
          {r.name}
          {r.kind && <span className="brf-row-kind">{r.kind}</span>}
        </div>
        {r.facts.length > 0 && (
          <p className="brf-row-facts">
            {r.facts.map((f, i) => (
              <span key={i} data-heat={f.heat}>
                {f.text}
              </span>
            ))}
          </p>
        )}
      </div>
      <div className="brf-row-amt" data-heat={r.balanceHeat}>
        <span className="brf-row-cap">יתרה</span>
        <Shekel value={r.balance} />
      </div>
      <div className="brf-row-amt" data-heat={r.monthlyHeat}>
        <span className="brf-row-cap">לחודש</span>
        {r.monthly !== null ? <Shekel value={r.monthly} /> : <span className="brf-row-none">{r.monthlyLabel}</span>}
        {r.monthlyNotes.map((n) => (
          <span key={n} className="brf-row-note">
            {n}
          </span>
        ))}
      </div>
    </li>
  );
}

function Group({ g, solo }: { g: DebtGroup; solo?: boolean }) {
  const many = g.rows.length + g.lines.length > 1;
  // A letter that prints no instalment at all gets no column of "לא דווח".
  const noMonthly = g.rows.every((r) => r.monthly === null && r.monthlyLabel === "לא דווח" && !r.monthlyNotes.length);
  return (
    <div className="brf-group" style={{ ["--fam" as string]: g.color }} data-nomonthly={noMonthly || undefined}>
      {/* The group's totals sit over the row columns, so they double as the
          columns' headings — a row's two figures are never left unnamed. */}
      <div className="brf-group-head">
        {/* The only group is what the chapter is already called. */}
        <h3 className="brf-group-name" style={solo ? { visibility: "hidden" } : undefined} aria-hidden={solo || undefined}>
          <i />
          {g.title}
        </h3>
        <span className="brf-group-cols">
          <span className="brf-group-col">
            <small>יתרה</small>
            {many && <Shekel value={g.total.balance} />}
          </span>
          <span className="brf-group-col">
            <small>לחודש</small>
            {many && g.total.monthly > 0 && <Shekel value={g.total.monthly} />}
          </span>
        </span>
      </div>
      <ul className="brf-sheet">
        {g.rows.map((r) => (
          <Row key={r.key} r={r} />
        ))}
        {g.lines.map((l) => (
          <li key={l} className="brf-row-line">
            {l}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Payoff({ doc }: { doc: BriefDoc }) {
  const p = doc.payoff;
  if (!p || p.payoff <= 0) return null;
  return (
    <div className="brf-payoff">
      <div className="brf-payoff-main">
        <h3 className="brf-group-title">
          <span className="brf-group-name">{doc.asOf ? `סילוק המשכנתא, נכון ל-${doc.asOf}` : "סילוק המשכנתא לפי המסמך"}</span>
        </h3>
        <Shekel value={p.payoff} className="brf-payoff-fig" />
        <dl className="brf-payoff-parts">
          {p.accrued > 0 && (
            <div>
              <dt>מזה ריבית שנצברה</dt>
              <dd>
                <Shekel value={p.accrued} />
              </dd>
            </div>
          )}
          <div data-heat={p.fee > 0 ? "hot" : undefined}>
            <dt>מזה עמלת פירעון מוקדם</dt>
            <dd>
              <Shekel value={p.fee} />
              {p.feeMissing > 0 && (
                <span className="brf-row-note">
                  {p.feeMissing === 1 ? "לא כולל מסלול אחד שלא דווחה בו עמלה" : `לא כולל עמלות ב-${p.feeMissing} מסלולים שלא דווחה בהם עמלה`}
                </span>
              )}
            </dd>
          </div>
        </dl>
      </div>
      {p.free > 0 && (
        <p className="brf-payoff-free">
          <CheckCircle size={20} weight="fill" />
          <span>
            <Shekel value={p.free} /> מהמשכנתא במסלולים ללא עמלת פירעון מוקדם
            {p.operational > 0 && <>, למעט עמלה תפעולית של {ils(p.operational)} ₪</>}
          </span>
        </p>
      )}
    </div>
  );
}

function Debts({ doc }: { doc: BriefDoc }) {
  const credit = doc.source === "credit";
  return (
    <section id="brf-debts" className="brf-chapter" aria-labelledby="brf-debts-title">
      <header className="brf-chapter-head">
        <h2 id="brf-debts-title" className="brf-h1">
          {credit ? "כל ההתחייבויות" : "המשכנתא לפי מסלולים"}
        </h2>
      </header>
      {doc.groups.map((g) => (
        <Group key={g.key} g={g} solo={doc.groups.length === 1} />
      ))}
      {!doc.groups.length && <p className="brf-calm">לא נמצאו התחייבויות פעילות בדוח.</p>}

      <Payoff doc={doc} />

      <div className="brf-total">
        <div>
          <span className="brf-total-cap">{credit ? "סך החובות" : "יתרת המשכנתא"}</span>
          <Shekel value={doc.balance} className="brf-total-fig" />
        </div>
        {doc.monthly !== null && (
          <div>
            <span className="brf-total-cap">{credit ? "החזר חודשי על הלוואות ומשכנתא" : "החזר חודשי"}</span>
            <Shekel value={doc.monthly} className="brf-total-fig" />
          </div>
        )}
        {doc.cards > 0 && (
          <div>
            <span className="brf-total-cap">חיוב חודשי בכרטיסי אשראי ובמסגרות</span>
            <Shekel value={doc.cards} className="brf-total-fig" />
          </div>
        )}
      </div>
      {doc.notes.length > 0 && (
        <ul className="brf-notes">
          {doc.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* --------------------------------------------------------------- page */

export default function BriefView({
  doc,
  advisor,
  expiresAt,
  mode = "present",
}: {
  doc: BriefDoc;
  advisor?: { name: string; phone: string };
  expiresAt?: string;
  /** "present" — inside the board; "client" — the shared page. */
  mode?: "present" | "client";
}) {
  const phone = (advisor?.phone ?? "").replace(/[^\d+]/g, "");
  const intl = phone.startsWith("0") ? `972${phone.slice(1)}` : phone.replace(/^\+/, "");
  const until = useMemo(() => {
    if (!expiresAt) return "";
    const d = new Date(expiresAt);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  }, [expiresAt]);

  return (
    <div className="brf-page" data-mode={mode}>
      {mode === "client" && (
        <div className="brf-top">
          <span className="brf-mark">
            <Logo size={30} />
            <span>מורגי</span>
          </span>
        </div>
      )}

      <section id="brf-picture" className="brf-chapter brf-chapter-first" aria-label="התמונה">
        <Hero doc={doc} />
        <Flow doc={doc} />
      </section>

      <Pains doc={doc} />
      <Debts doc={doc} />

      {mode === "client" && (advisor?.name || phone) && (
        <section className="brf-contact">
          <div>
            <p className="brf-contact-q">שאלות? נשמח לעבור איתכם על הנתונים.</p>
            {advisor?.name && <p className="brf-contact-name">{advisor.name}</p>}
          </div>
          {phone && (
            <div className="brf-contact-acts">
              <a className="brf-btn" data-primary href={`tel:${phone}`}>
                <Phone size={18} weight="fill" />
                התקשרו
              </a>
              <a className="brf-btn" href={`https://wa.me/${intl}`} target="_blank" rel="noopener noreferrer">
                <WhatsappLogo size={19} weight="fill" />
                וואטסאפ
              </a>
            </div>
          )}
        </section>
      )}

      <footer className="brf-foot">
        <p>
          לפי {doc.source === "credit" ? "דוח נתוני האשראי" : "מכתב הבנק"}
          {doc.asOf ? ` מ-${doc.asOf}` : ""}. אומדן הריבית: לפי הריביות במסמך, ללא הצמדה למדד וללא שינויי ריבית.
          {until && ` זמין עד ${until}.`}
        </p>
        {mode === "client" && (
          <span className="brf-mark brf-mark-sm">
            <Logo size={20} />
            <span>מורגי</span>
          </span>
        )}
      </footer>
    </div>
  );
}

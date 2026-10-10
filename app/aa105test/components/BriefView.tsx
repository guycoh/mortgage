"use client";

// סיכום ללקוח — one page: what the household owes, to whom, and what hurts.
//
// One page, two hosts: the advisor turns the screen around inside the board
// (Stage), and the client opens the same page later from a link (/summary/<id>).
// Both draw a frozen BriefDoc, so the shared page says exactly what was shown.
//
// Three things, nothing else:
//   - the line of figures: total owed, the monthly payment, what the interest
//     costs per day and until the end, how many years are left;
//   - who is owed what: one bar per lender (per track on a bank letter), with
//     each loan or facility under it in a single line;
//   - what needs attention: tiles of figure + title. The sentence behind each
//     opens on tap — the page itself stays short.
// Every figure is the document's own or plain arithmetic on it; estimates say
// "כ-". Colour is the advisor's marker: yellow highlighter, red pen, green.

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import NumberFlow from "@number-flow/react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { Phone, Plus, WhatsappLogo } from "@phosphor-icons/react";
import { BankIcon } from "@/app/aa102test/components/bankIcons";
import Logo from "@/app/aa102test/components/Logo";
import type { BriefDoc, BriefFigure, BriefPain, BriefSlice, Lens, OweBlock } from "../lib/brief";
import "@fontsource/ibm-plex-sans-hebrew/200.css";
import "@fontsource/ibm-plex-sans-hebrew/300.css";
import "@fontsource/ibm-plex-sans-hebrew/400.css";
import "@fontsource/ibm-plex-sans-hebrew/500.css";
import "@fontsource/ibm-plex-sans-hebrew/600.css";
import "@fontsource/ibm-plex-sans-hebrew/700.css";
import "../brief.css";

const EASE = [0.16, 1, 0.3, 1] as const;
const ils = (n: number) => Math.round(n).toLocaleString("he-IL");
const pct = (n: number) => `${Math.round(n * 100)}%`;
/** Estimates are rounded to what they can honestly claim. */
const roundTo = (n: number, step: number) => Math.round(n / step) * step;

/** Kept for hosts that index the page; the one-pager has no chapters. */
export const SECTIONS = [] as { id: string; label: string }[];

/* ------------------------------------------------------------ figures */

export function Shekel({ value, className }: { value: number; className?: string }) {
  return (
    <span className={`brf-num ${className ?? ""}`} dir="ltr">
      <span className="brf-cur">₪</span>
      {ils(value)}
    </span>
  );
}

/** A figure that rolls up the first time it is seen. */
function Rolling({ value, shown, kind, duration = 1100 }: { value: number; shown: boolean; kind: BriefFigure["kind"]; duration?: number }) {
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

/**
 * The advisor's mark. A highlighter swipe for what needs attention, a pen line
 * for what is critical, a green line for relief — drawn in once, from the
 * reading edge, the way a person marks a page.
 */
export function Mark({
  children,
  show,
  tone = "marker",
  delay = 0,
}: {
  children: ReactNode;
  show: boolean;
  tone?: "marker" | "soft" | "pen" | "good";
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <span className="brf-hl" data-tone={tone}>
      <motion.span
        className="brf-hl-ink"
        aria-hidden
        initial={{ scaleX: 0, rotate: tone === "marker" || tone === "soft" ? -1.2 : -0.5 }}
        animate={{ scaleX: show || reduce ? 1 : 0 }}
        transition={{ duration: reduce ? 0 : 0.6, ease: EASE, delay: reduce ? 0 : delay }}
      />
      <span className="brf-hl-text">{children}</span>
    </span>
  );
}

function useMounted(delay = 140) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOn(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return on;
}

/* ---------------------------------------------------- the line of figures */

function Figures({ doc }: { doc: BriefDoc }) {
  const on = useMounted();
  const marks = useMounted(800);
  const reduce = useReducedMotion();
  const credit = doc.source === "credit";
  const cells: { key: string; label: string; fig: ReactNode; foot?: ReactNode }[] = [];
  if (doc.monthly !== null)
    cells.push({
      key: "monthly",
      label: "החזר חודשי",
      fig: <Rolling kind="money" value={doc.monthly} shown />,
      foot: doc.interestShare !== null ? <>כ-{pct(doc.interestShare)} הם ריבית</> : undefined,
    });
  if (doc.yearlyInterest !== null && doc.yearlyInterest > 0)
    cells.push({
      key: "day",
      label: "ריבית ליום",
      fig: (
        <Mark show={marks} delay={0}>
          <span className="brf-approx">כ-</span>
          <Rolling kind="money" value={doc.yearlyInterest / 365} shown />
        </Mark>
      ),
    });
  if (doc.futureInterest !== null && doc.futureInterest > 0)
    cells.push({
      key: "future",
      label: "ריבית עד סוף התקופה",
      fig: (
        <Mark show={marks} delay={0.25}>
          <span className="brf-approx">כ-</span>
          <Rolling kind="money" value={roundTo(doc.futureInterest, 1000)} shown duration={1500} />
        </Mark>
      ),
    });
  if (doc.ends)
    cells.push({
      key: "ends",
      label: "עד סיום התשלומים",
      fig: <Rolling kind="years" value={doc.ends.years} shown />,
      foot: <>עד {doc.ends.label}</>,
    });

  return (
    <div className="brf-op-figs">
      <div className="brf-op-total">
        <span className="brf-op-label">{credit ? "סך החובות" : "יתרת המשכנתא"}</span>
        <span className="brf-op-total-fig" dir="ltr">
          <span className="brf-cur">₪</span>
          <NumberFlow
            value={on || reduce ? Math.round(doc.balance) : 0}
            locales="he-IL"
            spinTiming={{ duration: reduce ? 0 : 1500, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}
            transformTiming={{ duration: reduce ? 0 : 800, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}
          />
        </span>
      </div>
      <dl className="brf-op-cells">
        {cells.map((c) => (
          <div key={c.key} className="brf-op-cell">
            <dt className="brf-op-label">{c.label}</dt>
            <dd className="brf-op-fig">{c.fig}</dd>
            {c.foot && <dd className="brf-op-foot">{c.foot}</dd>}
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ------------------------------------------------------- who is owed what */

function Tags({ tags }: { tags: { text: string; heat?: "hot" | "warm" }[] }) {
  if (!tags.length) return null;
  return (
    <span className="brf-ow-tags">
      {tags.map((t, i) => (
        <span key={i} data-heat={t.heat}>
          {t.text}
        </span>
      ))}
    </span>
  );
}

function Owe({ b, max, i }: { b: OweBlock; max: number; i: number }) {
  const ref = useRef<HTMLLIElement>(null);
  const seen = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  return (
    <li ref={ref} className="brf-ow" data-alarm={b.alarm || undefined}>
      <div className="brf-ow-head">
        <span className="brf-ow-mark">{b.dot ? <i style={{ background: b.dot }} /> : <BankIcon source={b.source} size={26} />}</span>
        <span className="brf-ow-name">{b.name}</span>
        <Shekel value={b.balance} className="brf-ow-bal" />
        <span className="brf-ow-mon">{b.monthly > 0 ? <><Shekel value={b.monthly} /> לחודש</> : null}</span>
      </div>
      {/* The bar: this lender's share of the largest debt, by family. */}
      <div className="brf-ow-bar" aria-hidden>
        <motion.div
          className="brf-ow-fill"
          style={{ width: `${Math.max(1.2, (b.balance / (max || 1)) * 100)}%` }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: seen ? 1 : 0 }}
          transition={{ duration: reduce ? 0 : 0.8, ease: EASE, delay: reduce ? 0 : 0.15 + i * 0.07 }}
        >
          {b.parts.map((p) => (
            <span key={p.key} style={{ flexGrow: p.balance, background: p.color }} />
          ))}
        </motion.div>
      </div>
      {b.tags.length > 0 && <Tags tags={b.tags} />}
      {b.items.length > 0 && (
        <ul className="brf-ow-items">
          {b.items.map((it, k) => (
            <li key={k}>
              <span className="brf-ow-item-name">
                {it.label}
                <Tags tags={it.tags} />
              </span>
              <Shekel value={it.balance} />
              <span className="brf-ow-item-mon">
                {it.monthly !== null ? <Shekel value={it.monthly} /> : <span>{it.monthlyLabel}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function Owed({ doc }: { doc: BriefDoc }) {
  const credit = doc.source === "credit";
  // A link frozen before the list existed has none; it still opens.
  const owed = doc.owed ?? [];
  const max = Math.max(...owed.map((b) => b.balance), 1);
  const p = doc.payoff;
  return (
    <section className="brf-op-col" aria-label={credit ? "למי אתם חייבים" : "המשכנתא לפי מסלולים"}>
      <h2 className="brf-op-h">{credit ? "למי אתם חייבים" : "המשכנתא לפי מסלולים"}</h2>
      <ol className="brf-ow-list">
        {owed.map((b, i) => (
          <Owe key={b.key} b={b} max={max} i={i} />
        ))}
      </ol>
      <div className="brf-ow-total">
        <span>{credit ? "סך הכול" : "יתרת המשכנתא"}</span>
        <Shekel value={doc.balance} className="brf-ow-bal" />
        <span className="brf-ow-mon">{doc.monthly !== null ? <><Shekel value={doc.monthly} /> לחודש</> : null}</span>
      </div>
      {doc.cards > 0 && (
        <p className="brf-ow-aside">
          חיוב חודשי בכרטיסים ובמסגרות אשראי, לא כלול בהחזר: <Shekel value={doc.cards} />
        </p>
      )}
      {p && p.payoff > 0 && (
        <p className="brf-ow-aside">
          {doc.asOf ? `לסילוק ב-${doc.asOf}: ` : "לסילוק לפי המסמך: "}
          <Shekel value={p.payoff} />
          {p.fee > 0 && (
            <>
              , מזה עמלת פירעון מוקדם <Shekel value={p.fee} />
            </>
          )}
        </p>
      )}
      {doc.notes.map((n) => (
        <p key={n} className="brf-ow-aside">
          {n}
        </p>
      ))}
    </section>
  );
}

/* ------------------------------------------------------------ the marks */

const toneOf = (p: BriefPain): "marker" | "soft" | "pen" | "good" | null =>
  p.good ? "good" : p.tone === "critical" ? "pen" : p.tone === "high" ? "marker" : p.tone === "medium" ? "soft" : null;

function Tile({ p, i }: { p: BriefPain; i: number }) {
  const ref = useRef<HTMLLIElement>(null);
  const seen = useInView(ref, { once: true, margin: "0px 0px -8% 0px" });
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const tone = toneOf(p);
  return (
    <li ref={ref} className="brf-tile" data-tone={p.good ? "good" : p.tone} data-open={open || undefined}>
      <button className="brf-tile-btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="brf-tile-fig">
          {p.figure ? (
            tone ? (
              <Mark show={seen} tone={tone} delay={0.2 + Math.min(i, 6) * 0.06}>
                <Rolling kind={p.figure.kind} value={p.figure.value} shown={seen} />
              </Mark>
            ) : (
              <Rolling kind={p.figure.kind} value={p.figure.value} shown={seen} />
            )
          ) : (
            <span className="brf-tile-dot" aria-hidden />
          )}
        </span>
        <span className="brf-tile-title">{p.title}</span>
        <Plus className="brf-tile-plus" size={13} weight="bold" aria-hidden />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="brf-tile-more"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.28, ease: EASE }}
          >
            <p>{p.say}</p>
            {p.next && <p className="brf-tile-next">{p.next}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function Pains({ doc }: { doc: BriefDoc }) {
  return (
    <section className="brf-op-col" aria-label="מה דורש תשומת לב">
      <h2 className="brf-op-h">
        מה דורש תשומת לב
        {doc.pains.length > 0 && <span className="brf-op-n">{doc.pains.length}</span>}
      </h2>
      {doc.pains.length === 0 ? (
        <p className="brf-calm">לא נמצאו בדוח נושאים שדורשים טיפול.</p>
      ) : (
        <ol className="brf-tiles">
          {doc.pains.map((p, i) => (
            <Tile key={p.id} p={p} i={i} />
          ))}
        </ol>
      )}
    </section>
  );
}

/* ------------------------------------- shares (used by the advisor files) */

/**
 * Each part of the debt as a share of what is owed, what is paid each month,
 * and the interest it costs — a part small in the first column and large in
 * the others is the story.
 */
export function ShareTable({ doc }: { doc: BriefDoc }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const reduce = useReducedMotion();
  const lenses = (["balance", "monthly", "interest"] as Lens[]).filter((l) => doc.slices.some((s) => s[l] > 0));
  const totals = Object.fromEntries(lenses.map((l) => [l, doc.slices.reduce((s, x) => s + x[l], 0)])) as Record<Lens, number>;
  if (doc.slices.length < 2) return null;
  const skew = doc.skew;
  const of = doc.source === "credit" ? "מהחוב" : "מהמשכנתא";
  const head: Record<Lens, string> = { balance: of, monthly: "מההחזר החודשי", interest: "מהריבית השנתית" };
  return (
    <div ref={ref} className="brf-shares">
      <table>
        <thead>
          <tr>
            <th />
            {lenses.map((l) => (
              <th key={l}>{head[l]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {doc.slices.map((s: BriefSlice, i) => (
            <tr key={s.key} style={{ ["--c" as string]: s.color }}>
              <th>
                <i />
                {s.label}
              </th>
              {lenses.map((l) => {
                const share = totals[l] > 0 ? s[l] / totals[l] : 0;
                return (
                  <td key={l}>
                    <span className="brf-share-fig">{pct(share)}</span>
                    <span className="brf-share-bar" aria-hidden>
                      <motion.span
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: seen ? Math.max(share, 0.012) : 0 }}
                        transition={{ duration: reduce ? 0 : 0.9, ease: EASE, delay: reduce ? 0 : 0.1 + i * 0.08 }}
                      />
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {skew && (
        <p className="brf-skew">
          <b>{skew.label}:</b> {pct(skew.balanceShare)} {of}, אבל{" "}
          <Mark show={seen} delay={0.9}>
            {pct(skew.lensShare)} {skew.lens === "monthly" ? "מההחזר החודשי" : "מהריבית"}
          </Mark>
          .
        </p>
      )}
    </div>
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
  const credit = doc.source === "credit";

  return (
    <div className="brf-desk" data-mode={mode}>
      <article className="brf-sheet brf-op">
        <header className="brf-mast">
          <span className="brf-mark">
            <Logo size={mode === "client" ? 28 : 24} />
            <span>מורגי</span>
          </span>
          <span className="brf-mast-doc">
            {credit ? "סיכום חובות" : "סיכום משכנתא"}
            {doc.asOf && <span className="brf-num">{doc.asOf}</span>}
          </span>
        </header>

        <div className="brf-who">
          <h1>{doc.who || (credit ? "סיכום החובות שלכם" : "סיכום המשכנתא שלכם")}</h1>
          {!credit && doc.lender && (
            <span className="brf-who-bank">
              <BankIcon source={doc.lender} size={20} />
              {doc.lender}
            </span>
          )}
        </div>

        <Figures doc={doc} />

        <div className="brf-op-cols">
          <Owed doc={doc} />
          <Pains doc={doc} />
        </div>

        {mode === "client" && (advisor?.name || phone) && (
          <section className="brf-op-contact" aria-label="יצירת קשר">
            <div>
              <p>שאלות? נשמח לעבור איתכם על הנתונים.</p>
              {advisor?.name && <p className="brf-contact-name">{advisor.name}</p>}
            </div>
            {phone && (
              <div className="brf-contact-acts">
                <a className="brf-btn" data-primary href={`tel:${phone}`}>
                  <Phone size={17} weight="fill" />
                  התקשרו
                </a>
                <a className="brf-btn" href={`https://wa.me/${intl}`} target="_blank" rel="noopener noreferrer">
                  <WhatsappLogo size={18} weight="fill" />
                  וואטסאפ
                </a>
              </div>
            )}
          </section>
        )}

        <footer className="brf-fine">
          לפי {credit ? "דוח נתוני האשראי" : "מכתב הבנק"}
          {doc.asOf ? ` מ-${doc.asOf}` : ""}. אומדן הריבית: לפי הריביות במסמך, ללא הצמדה למדד וללא שינויי ריבית.
          {until && ` זמין עד ${until}.`}
        </footer>
      </article>
    </div>
  );
}

"use client";

// סיכום ללקוח — the household's debts as one statement, marked by their advisor.
//
// One page, two hosts: the advisor turns the screen around inside the board
// (Stage), and the client opens the same page later from a link (/summary/<id>).
// Both draw a frozen BriefDoc, so the shared page says exactly what was shown.
//
// It is typeset as a statement, not assembled from cards: a masthead, then rows
// with their name in the margin and the figures beside it, hairlines between,
// a double rule under the totals. The only colour that carries emphasis is the
// advisor's marker — yellow highlighter on what needs attention, red pen on what
// is critical, green on relief. Order is pain first: the total, what it costs,
// what was marked, where the money goes, then every debt.
//
// The drama is in emphasis, never in the numbers: every figure is the
// document's own or plain arithmetic on it, and the estimates say "כ-".

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import NumberFlow from "@number-flow/react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { Phone, WhatsappLogo } from "@phosphor-icons/react";
import { BankIcon } from "@/app/aa102test/components/bankIcons";
import Logo from "@/app/aa102test/components/Logo";
import { WORRY_GROUP_LABEL, WORRY_GROUP_ORDER } from "@/lib/verdicts";
import type { BriefDoc, BriefFigure, BriefPain, BriefSlice, DebtGroup, DebtRow, Lens } from "../lib/brief";
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

export const SECTIONS = [
  { id: "brf-picture", label: "סיכום" },
  { id: "brf-pains", label: "מה סימנו" },
  { id: "brf-debts", label: "כל ההתחייבויות" },
] as const;

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

/** One statement row: its name in the margin, its content beside it. */
function Row({ id, label, note, children, className }: { id?: string; label: string; note?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={`brf-r ${className ?? ""}`} aria-label={label}>
      <h2 className="brf-r-label">
        {label}
        {note && <span className="brf-r-note">{note}</span>}
      </h2>
      <div className="brf-r-body">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------- the total + costs */

function Total({ doc }: { doc: BriefDoc }) {
  const on = useMounted();
  const reduce = useReducedMotion();
  const credit = doc.source === "credit";
  return (
    <Row id="brf-picture" label={credit ? "סך החובות" : "יתרת המשכנתא"} className="brf-r-total">
      <div className="brf-total" dir="ltr">
        <span className="brf-total-cur">₪</span>
        <NumberFlow
          value={on || reduce ? Math.round(doc.balance) : 0}
          locales="he-IL"
          spinTiming={{ duration: reduce ? 0 : 1600, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}
          transformTiming={{ duration: reduce ? 0 : 900, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}
        />
      </div>
      <p className="brf-total-of">
        {credit
          ? `${doc.count.debts} התחייבויות אצל ${doc.count.lenders === 1 ? "מלווה אחד" : `${doc.count.lenders} מלווים`}`
          : `${doc.count.debts === 1 ? "מסלול אחד" : `${doc.count.debts} מסלולים`}`}
      </p>
    </Row>
  );
}

function Costs({ doc }: { doc: BriefDoc }) {
  const on = useMounted(700);
  const reduce = useReducedMotion();
  const cells: { key: string; label: string; fig: ReactNode; foot?: ReactNode }[] = [];
  if (doc.monthly !== null) {
    cells.push({
      key: "monthly",
      label: "החזר חודשי",
      fig: <Rolling kind="money" value={doc.monthly} shown />,
      foot:
        doc.interestShare !== null ? (
          <>
            <span className="brf-split" aria-hidden>
              <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: on ? doc.interestShare : 0 }} transition={{ duration: reduce ? 0 : 1, ease: EASE }} />
            </span>
            <span>
              מזה{" "}
              <Mark show={on} tone="soft" delay={0.5}>
                כ-{pct(doc.interestShare)} ריבית
              </Mark>
            </span>
          </>
        ) : null,
    });
  }
  if (doc.yearlyInterest !== null && doc.yearlyInterest > 0) {
    cells.push({
      key: "day",
      label: "ריבית ליום",
      fig: (
        <Mark show={on} delay={0.1}>
          <span className="brf-approx">כ-</span>
          <Rolling kind="money" value={doc.yearlyInterest / 365} shown />
        </Mark>
      ),
      foot: (
        <span>
          <Shekel value={roundTo(doc.yearlyInterest, 100)} /> בשנה
        </span>
      ),
    });
  }
  if (doc.futureInterest !== null && doc.futureInterest > 0) {
    cells.push({
      key: "future",
      label: "ריבית עד סוף התקופה",
      fig: (
        <Mark show={on} delay={0.3}>
          <span className="brf-approx">כ-</span>
          <Rolling kind="money" value={roundTo(doc.futureInterest, 1000)} shown duration={1500} />
        </Mark>
      ),
      foot: <span>לפי הריבית כיום, ללא הצמדה למדד</span>,
    });
  }
  if (doc.ends) {
    cells.push({
      key: "ends",
      label: "עד סיום התשלומים",
      fig: <Rolling kind="years" value={doc.ends.years} shown />,
      foot: <span>התשלום האחרון ב-{doc.ends.label}</span>,
    });
  }
  if (!cells.length) return null;
  return (
    <Row label="כמה זה עולה לכם">
      <dl className="brf-costs" style={{ ["--n" as string]: cells.length }}>
        {cells.map((c) => (
          <div key={c.key} className="brf-cost">
            <dt>{c.label}</dt>
            <dd className="brf-cost-fig">{c.fig}</dd>
            {c.foot && <dd className="brf-cost-foot">{c.foot}</dd>}
          </div>
        ))}
      </dl>
    </Row>
  );
}

/* ------------------------------------------------- where the money goes */

/**
 * Each part of the debt, as a share of three things: what is owed, what is paid
 * each month, and the interest it costs. A part small in the first column and
 * large in the others is the story — the eye finds it across the row.
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

/* ------------------------------------------------------------ the marks */

const toneOf = (p: BriefPain): "marker" | "soft" | "pen" | "good" | null =>
  p.good ? "good" : p.tone === "critical" ? "pen" : p.tone === "high" ? "marker" : p.tone === "medium" ? "soft" : null;

function Pain({ p, i, withNext }: { p: BriefPain; i: number; withNext: boolean }) {
  const ref = useRef<HTMLLIElement>(null);
  const seen = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });
  const tone = toneOf(p);
  return (
    <li ref={ref} className="brf-pt" data-tone={p.good ? "good" : p.tone}>
      <div className="brf-pt-fig">
        {p.figure &&
          (tone ? (
            <Mark show={seen} tone={tone} delay={0.15 + Math.min(i, 4) * 0.05}>
              <Rolling kind={p.figure.kind} value={p.figure.value} shown={seen} />
            </Mark>
          ) : (
            <Rolling kind={p.figure.kind} value={p.figure.value} shown={seen} />
          ))}
      </div>
      <div className="brf-pt-text">
        <h3>{p.title}</h3>
        <p>{p.say}</p>
        {withNext && p.next && <p className="brf-pt-next">{p.next}</p>}
      </div>
    </li>
  );
}

function Pains({ doc }: { doc: BriefDoc }) {
  const groups = WORRY_GROUP_ORDER.map((g) => ({ g, rows: doc.pains.filter((p) => p.group === g) })).filter((x) => x.rows.length > 0);
  return (
    <Row id="brf-pains" label="מה סימנו לכם" note={doc.pains.length ? (doc.pains.length === 1 ? "נושא אחד" : `${doc.pains.length} נושאים`) : undefined}>
      {groups.length === 0 ? (
        <p className="brf-calm">לא נמצאו בדוח נושאים שדורשים טיפול.</p>
      ) : (
        groups.map(({ g, rows }) => (
          <div key={g} className="brf-pg" data-group={g}>
            <h3 className="brf-pg-title">{WORRY_GROUP_LABEL[g]}</h3>
            <ol className="brf-pts">
              {rows.map((p, i) => (
                <Pain key={p.id} p={p} i={i} withNext={g === "act"} />
              ))}
            </ol>
          </div>
        ))
      )}
    </Row>
  );
}

/* ---------------------------------------------------------- the ledger */

function LedgerRow({ r }: { r: DebtRow }) {
  return (
    <li className="brf-lr" data-alarm={r.alarm || undefined}>
      <span className="brf-lr-mark">{r.dot ? <i style={{ background: r.dot }} /> : <BankIcon source={r.source} size={26} />}</span>
      <div className="brf-lr-id">
        <div className="brf-lr-name">
          {r.name}
          {r.kind && <span className="brf-lr-kind">{r.kind}</span>}
        </div>
        {r.facts.length > 0 && (
          <p className="brf-lr-facts">
            {r.facts.map((f, i) => (
              <span key={i} data-heat={f.heat}>
                {f.text}
              </span>
            ))}
          </p>
        )}
      </div>
      <div className="brf-lr-amt" data-heat={r.balanceHeat}>
        <span className="brf-lr-cap">יתרה</span>
        <Shekel value={r.balance} />
      </div>
      <div className="brf-lr-amt" data-heat={r.monthlyHeat}>
        <span className="brf-lr-cap">לחודש</span>
        {r.monthly !== null ? <Shekel value={r.monthly} /> : <span className="brf-lr-none">{r.monthlyLabel}</span>}
        {r.monthlyNotes.map((n) => (
          <span key={n} className="brf-lr-note">
            {n}
          </span>
        ))}
      </div>
    </li>
  );
}

function Group({ g, solo, noMonthly }: { g: DebtGroup; solo: boolean; noMonthly: boolean }) {
  const many = g.rows.length + g.lines.length > 1;
  return (
    <div className="brf-lg" style={{ ["--fam" as string]: g.color }}>
      {!solo && (
        <h3 className="brf-lg-title">
          <i />
          {g.title}
        </h3>
      )}
      <ul>
        {g.rows.map((r) => (
          <LedgerRow key={r.key} r={r} />
        ))}
        {g.lines.map((l) => (
          <li key={l} className="brf-lr-line">
            {l}
          </li>
        ))}
      </ul>
      {many && !solo && (
        <div className="brf-lsum">
          <span>סה״כ {g.title}</span>
          <Shekel value={g.total.balance} />
          {!noMonthly && (g.total.monthly > 0 ? <Shekel value={g.total.monthly} /> : <span />)}
        </div>
      )}
    </div>
  );
}

function Payoff({ doc }: { doc: BriefDoc }) {
  const p = doc.payoff;
  if (!p || p.payoff <= 0) return null;
  return (
    <div className="brf-payoff">
      <h3 className="brf-lg-title">{doc.asOf ? `סילוק המשכנתא, נכון ל-${doc.asOf}` : "סילוק המשכנתא לפי המסמך"}</h3>
      <dl>
        <div>
          <dt>סכום לסילוק</dt>
          <dd>
            <Shekel value={p.payoff} />
          </dd>
        </div>
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
              <span className="brf-lr-note">
                {p.feeMissing === 1 ? "לא כולל מסלול אחד שלא דווחה בו עמלה" : `לא כולל עמלות ב-${p.feeMissing} מסלולים שלא דווחה בהם עמלה`}
              </span>
            )}
          </dd>
        </div>
        {p.free > 0 && (
          <div data-heat="good">
            <dt>במסלולים ללא עמלת פירעון מוקדם</dt>
            <dd>
              <Shekel value={p.free} />
              {p.operational > 0 && <span className="brf-lr-note">למעט עמלה תפעולית של {ils(p.operational)} ₪</span>}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}

function Debts({ doc }: { doc: BriefDoc }) {
  const credit = doc.source === "credit";
  const solo = doc.groups.length === 1;
  // A letter that prints no instalment anywhere gets no column of "לא דווח".
  const noMonthly = doc.groups.every((g) => g.rows.every((r) => r.monthly === null && r.monthlyLabel === "לא דווח" && !r.monthlyNotes.length));
  return (
    <Row id="brf-debts" label={credit ? "כל ההתחייבויות" : "המסלולים"}>
      <div className="brf-ledger" data-nomonthly={noMonthly || undefined}>
        <div className="brf-lhead" aria-hidden>
          <span />
          <span>יתרה</span>
          {!noMonthly && <span>לחודש</span>}
        </div>
        {doc.groups.map((g) => (
          <Group key={g.key} g={g} solo={solo} noMonthly={noMonthly} />
        ))}
        {!doc.groups.length && <p className="brf-calm">לא נמצאו התחייבויות פעילות בדוח.</p>}

        <div className="brf-grand">
          <span>{credit ? "סך החובות" : "יתרת המשכנתא"}</span>
          <Shekel value={doc.balance} />
          {!noMonthly && (doc.monthly !== null ? <Shekel value={doc.monthly} /> : <span />)}
        </div>
        {doc.cards > 0 && (
          <div className="brf-grand-sub">
            <span>חיוב חודשי בכרטיסים ובמסגרות אשראי, לא כלול בהחזר</span>
            <span />
            <Shekel value={doc.cards} />
          </div>
        )}
      </div>
      <Payoff doc={doc} />
      {doc.notes.length > 0 && (
        <ul className="brf-notes">
          {doc.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
    </Row>
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
      <article className="brf-sheet">
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

        <Total doc={doc} />
        <Costs doc={doc} />
        <Pains doc={doc} />
        {doc.slices.length > 1 && (
          <Row label="איך מתחלק החוב">
            <ShareTable doc={doc} />
          </Row>
        )}
        <Debts doc={doc} />

        {mode === "client" && (advisor?.name || phone) && (
          <Row label="שאלות?" className="brf-r-contact">
            <div className="brf-contact">
              <div>
                <p>נשמח לעבור איתכם על הנתונים.</p>
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
            </div>
          </Row>
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

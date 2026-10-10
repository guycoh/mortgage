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
import type { BookGroup, BriefDoc, BriefFigure, BriefPain, BriefSlice, Lens } from "../lib/brief";
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
      label: "עד התשלום האחרון",
      fig: <Rolling kind="years" value={doc.ends.years} shown />,
    });

  return (
    <div className="brf-op-figs">
      <div className="brf-op-total">
        <span className="brf-op-label">{credit ? "משכנתאות והלוואות" : "יתרת המשכנתא"}</span>
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

/* ------------------------------------------------- mortgages and loans */

function Book({ doc }: { doc: BriefDoc }) {
  const ref = useRef<HTMLElement>(null);
  const seen = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  // A link frozen before the book existed has none; it still opens.
  const book: BookGroup[] = doc.book ?? [];
  const max = Math.max(...book.flatMap((g) => g.rows.map((r) => r.balance)), 1);
  // A letter that prints no instalment at all gets no column of "לא דווח".
  const noMonthly = book.every((g) => g.rows.every((r) => r.monthly === null));
  let n = 0;
  return (
    <section ref={ref} className="brf-op-col brf-bk" data-nomonthly={noMonthly || undefined} aria-label="משכנתאות והלוואות">
      <div className="brf-bk-head" aria-hidden>
        <span />
        <span>יתרה</span>
        <span>לחודש</span>
        <span>ריבית</span>
      </div>
      {book.map((g) => (
        <div key={g.key} className="brf-bk-group" style={{ ["--fam" as string]: g.color }}>
          <div className="brf-bk-title">
            <span>
              <i />
              {g.title}
            </span>
            <Shekel value={g.total.balance} />
            <span>{g.total.monthly > 0 ? <Shekel value={g.total.monthly} /> : null}</span>
            <span />
          </div>
          <ul>
            {g.rows.map((r) => {
              const k = n++;
              return (
                <li key={r.key} className="brf-bk-row" data-late={r.late || undefined}>
                  <span className="brf-bk-who">
                    {r.dot ? <i className="brf-bk-dot" style={{ background: r.dot }} /> : <BankIcon source={r.source} size={22} />}
                    <span className="brf-bk-name">{r.name}</span>
                    <span className="brf-bk-bar" aria-hidden>
                      <motion.span
                        style={{ width: `${Math.max(2, (r.balance / max) * 100)}%`, background: r.dot }}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: seen ? 1 : 0 }}
                        transition={{ duration: reduce ? 0 : 0.8, ease: EASE, delay: reduce ? 0 : 0.1 + k * 0.05 }}
                      />
                    </span>
                  </span>
                  <Shekel value={r.balance} className="brf-bk-bal" />
                  <span className="brf-bk-mon">{r.monthly !== null ? <Shekel value={r.monthly} /> : r.monthlyLabel}</span>
                  <span className="brf-bk-rate" data-hot={r.hot || undefined} dir={r.late ? undefined : "ltr"}>
                    {r.late ? "בפיגור" : r.rate ?? ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
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

/** The tiles: what needs handling or checking — the notes stay with the advisor. */
const MAX_TILES = 8;

function Pains({ doc }: { doc: BriefDoc }) {
  const pains = doc.pains.filter((p) => p.group !== "info").slice(0, MAX_TILES);
  return (
    <section className="brf-op-col" aria-label="מה דורש תשומת לב">
      <h2 className="brf-op-h">
        מה דורש תשומת לב
        {pains.length > 0 && <span className="brf-op-n">{pains.length}</span>}
      </h2>
      {pains.length === 0 ? (
        <p className="brf-calm">לא נמצאו בדוח נושאים שדורשים טיפול.</p>
      ) : (
        <ol className="brf-tiles">
          {pains.map((p, i) => (
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


/* ------------------------------------------------------- the pain sheet */
//
// What the customer is told, debt by debt: each mortgage and loan from the
// report with the one number that hurts — the interest still to come, a dear
// rate, an arrear. Then one line for everything else that needs attention.

const pc = (n: number) => roundTo(n, n >= 100000 ? 1000 : 100);

function Headline({ doc }: { doc: BriefDoc }) {
  const on = useMounted(500);
  const book = doc.book ?? [];
  const future = book.reduce((s, g) => s + g.rows.reduce((t, r) => t + (r.future ?? 0), 0), 0);
  return (
    <div className="brf-ps-head">
      {doc.monthly !== null ? (
        <div className="brf-ps-big">
          <span className="brf-op-label">כל חודש</span>
          <Rolling kind="money" value={doc.monthly} shown />
        </div>
      ) : (
        <div className="brf-ps-big">
          <span className="brf-op-label">יתרת המשכנתא</span>
          <Rolling kind="money" value={doc.balance} shown />
        </div>
      )}
      {future > 0 && (
        <div className="brf-ps-big" data-pain>
          <span className="brf-op-label">ריבית שעוד תשלמו</span>
          <Mark show={on} delay={0.2}>
            <span className="brf-approx">כ-</span>
            <Rolling kind="money" value={pc(future)} shown duration={1500} />
          </Mark>
        </div>
      )}
    </div>
  );
}

function LoanPains({ doc }: { doc: BriefDoc }) {
  const ref = useRef<HTMLOListElement>(null);
  const seen = useInView(ref, { once: true, margin: "0px 0px -8% 0px" });
  const credit = doc.source === "credit";
  const rows = (doc.book ?? []).flatMap((g) => g.rows.map((r) => ({ ...r, group: g.key })));
  let k = 0;
  return (
    <ol ref={ref} className="brf-ps-list">
      {rows.map((r) => {
        const i = k++;
        const loan = r.group === "loan";
        return (
          <li key={r.key} className="brf-ps-row" data-late={r.late || undefined}>
            <div className="brf-ps-top">
              <span className="brf-ps-who">
                {r.dot ? <i className="brf-bk-dot" style={{ background: r.dot }} /> : <BankIcon source={r.source} size={22} />}
                <b>{credit ? `${r.kind} · ${r.name}` : r.kind}</b>
              </span>
              <Shekel value={r.balance} className="brf-ps-bal" />
            </div>
            <p className="brf-ps-pain">
              {r.late ? (
                <Mark show={seen} tone="pen" delay={0.1 + i * 0.06}>
                  {r.overdue ? (
                    <>
                      בפיגור <Shekel value={r.overdue} />
                    </>
                  ) : (
                    "בפיגור"
                  )}
                </Mark>
              ) : (
                <>
                  {r.rate && (loan || r.hot || !credit) && (
                    <span>
                      ריבית{" "}
                      {r.hot ? (
                        <Mark show={seen} delay={0.1 + i * 0.06}>
                          <span dir="ltr">{r.rate}</span>
                        </Mark>
                      ) : (
                        <span dir="ltr">{r.rate}</span>
                      )}
                    </span>
                  )}
                  {r.future !== undefined && (
                    <span>
                      עוד{" "}
                      <Mark show={seen} tone={loan && !r.hot ? "soft" : "marker"} delay={0.2 + i * 0.06}>
                        כ-<Shekel value={pc(r.future)} />
                      </Mark>{" "}
                      ריבית{r.endYear && !loan ? ` עד ${r.endYear}` : ""}
                    </span>
                  )}
                  {loan && r.monthly !== null && (
                    <span>
                      <Shekel value={r.monthly} /> בחודש
                    </span>
                  )}
                </>
              )}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

/** Pains the list does not already say — rates and arrears are on the rows. */
const ON_ROWS = new Set(["expensive", "consumer-weight", "recycle", "arrears", "arrears-now"]);

function figText(f: BriefFigure): string {
  switch (f.kind) {
    case "money":
      return `₪${ils(f.value)}`;
    case "share":
      return pct(f.value);
    case "rate":
      return `${(Math.round(f.value * 100) / 100).toString()}%`;
    case "years":
      return `${Math.round(f.value)} שנים`;
    default:
      return String(Math.round(f.value));
  }
}

function Extras({ doc }: { doc: BriefDoc }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true });
  const items = doc.pains
    .filter((p) => p.group !== "info" && !p.good && !p.id.startsWith("distress:") && !p.id.split("+").some((x) => ON_ROWS.has(x)))
    .slice(0, 6);
  if (!items.length) return null;
  return (
    <div ref={ref} className="brf-ps-extra">
      <span className="brf-op-label">בנוסף</span>
      <p>
        {items.map((p, i) => (
          <span key={p.id} className="brf-ps-chip" data-tone={p.tone}>
            {p.title}
            {p.figure && (
              <>
                {" "}
                <Mark show={seen} tone={p.tone === "critical" ? "pen" : "soft"} delay={0.1 + i * 0.05}>
                  <span dir="ltr">{figText(p.figure)}</span>
                </Mark>
              </>
            )}
          </span>
        ))}
      </p>
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
      <article className="brf-sheet brf-op brf-ps">
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

        <Headline doc={doc} />
        <LoanPains doc={doc} />
        <Extras doc={doc} />

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

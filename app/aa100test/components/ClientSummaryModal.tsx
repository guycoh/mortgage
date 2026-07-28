"use client";

// The page you turn around and show the client.
//
// Not a smaller version of the analysis — a different document for a different
// reader. The analysis is written for someone who will act on it and wants the
// evidence; this is written for someone seeing their own finances laid out for
// the first time, across a desk, in about a minute.
//
// So: no ratios, no weighted averages, no field codes. Who lent it, how much is
// left, what it costs every month. One line at the bottom for the number the
// client actually feels — what leaves their account. And where something is
// genuinely wrong, plain language for it, in red, at the end where it lands
// after the facts rather than before them.
//
// One debt per lender, not one per tranche. A מסלול is an artefact of how the
// bank booked the loan: a household with a fourteen-tranche mortgage has three
// mortgages, at three banks, and listing fourteen near-identical rows — five of
// them reading "משכנתה · נותרו כ-26 שנים" — turns the one page into four and
// tells the client nothing they would recognise as their own.

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { Printer, WarningCircle, X } from "@phosphor-icons/react";
import { BankIcon } from "@/app/aa4test/components/bankIcons";
import { shortBank } from "@/app/aa4test/debtTags";
import Money from "./Money";
import { rateHeat } from "../lib/credit";
import type { Analysis, DebtLine } from "../lib/analysis";

/** Lenders past this fold into one line — the page has to stay a page. */
const MAX_ROWS = 5;

type Family = "mortgage" | "loan" | "card";

/** Everything one lender holds in one family, as the client thinks of it. */
interface Holding {
  key: string;
  bank: string;
  family: Family;
  parts: number;
  balance: number;
  monthly: number;
  /** The longest of the parts — when the last of it is paid off. */
  months: number | null;
  late: boolean;
  overdue: number;
  /** The spread of rates inside this lender's holding, so "ריבית גבוהה" is
   *  something the client can see on the row rather than take on trust. */
  minRate: number | null;
  maxRate: number | null;
}

function group(lines: DebtLine[], family: Family): Holding[] {
  const by = new Map<string, Holding>();
  for (const l of lines) {
    const key = l.bank.replace(/\s+/g, "");
    const cur =
      by.get(key) ??
      { key, bank: l.bank, family, parts: 0, balance: 0, monthly: 0, months: null, late: false, overdue: 0, minRate: null, maxRate: null };
    cur.parts += 1;
    cur.balance += l.balance;
    cur.monthly += l.monthly;
    if (l.months && (cur.months === null || l.months > cur.months)) cur.months = l.months;
    if (l.overdue > 0 || l.arrearsRange) cur.late = true;
    cur.overdue += l.overdue;
    if (l.rate !== null) {
      cur.minRate = cur.minRate === null ? l.rate : Math.min(cur.minRate, l.rate);
      cur.maxRate = cur.maxRate === null ? l.rate : Math.max(cur.maxRate, l.rate);
    }
    by.set(key, cur);
  }
  return Array.from(by.values()).sort((a, b) => b.balance - a.balance || b.monthly - a.monthly);
}

/**
 * How much longer this runs, said properly.
 *
 * Only amortising debts have a remaining term — a revolving facility rolls
 * indefinitely, and the report's "months" for one is an artefact, not a fact to
 * tell a client. And Hebrew does not say "נותרו 1 תשלומים".
 */
function remaining(h: Holding): string {
  if (h.family === "card" || !h.months || h.months <= 0) return "";
  if (h.months === 1) return "נותר תשלום אחד";
  if (h.months < 24) return `נותרו ${h.months} תשלומים`;
  return `עוד כ-${Math.round(h.months / 12)} שנים`;
}

const NOUN: Record<Family, [string, string]> = {
  mortgage: ["מסלול", "מסלולים"],
  loan: ["הלוואה", "הלוואות"],
  card: ["מסגרת", "מסגרות"],
};

/** "ריבית 5.2%" — or the spread, when one lender holds several at once. */
function rateText(h: Holding): string {
  if (h.minRate === null || h.maxRate === null) return "";
  // A reported 0% is almost always "not priced" rather than free — the report
  // leaves the rate empty on revolving facilities. Telling a client their card
  // is at 0% would be worse than telling them nothing.
  if (h.maxRate <= 0) return "";
  const lo = h.minRate.toFixed(1).replace(/\.0$/, "");
  const hi = h.maxRate.toFixed(1).replace(/\.0$/, "");
  return lo === hi ? `ריבית ${lo}%` : `ריבית ${lo}%–${hi}%`;
}

function Row({ h }: { h: Holding }) {
  const [one, many] = NOUN[h.family];
  const rate = rateText(h);
  // A rate is only alarming relative to its own kind: 6.5% is dear for a
  // mortgage and cheap for a consumer loan.
  const dear =
    h.family !== "card" &&
    h.maxRate !== null &&
    rateHeat(h.maxRate, h.family === "mortgage" ? "mortgage" : "loan") === "hot";

  const bits = [h.parts > 1 ? `${h.parts} ${many}` : one, remaining(h)].filter(Boolean);

  return (
    <li className="fin-cs-row">
      <BankIcon source={h.bank} size={30} />

      <div className="min-w-0 flex-1">
        <div className="fin-cs-bank">{shortBank(h.bank) || h.bank}</div>
        <div className="fin-cs-meta">
          {bits.join(" · ")}
          {rate && (
            <>
              {bits.length ? " · " : ""}
              <span className={dear ? "fin-cs-warn" : undefined}>{rate}</span>
            </>
          )}
          {h.late && (
            <span className="fin-cs-warn">
              {" · בפיגור"}
              {h.overdue > 0 ? ` ${Math.round(h.overdue).toLocaleString("en-US")} ₪` : ""}
            </span>
          )}
        </div>
      </div>

      {h.family !== "card" && (
        <div className="fin-cs-amt">
          <Money value={h.balance} size={17} weight={800} />
        </div>
      )}

      <div className="fin-cs-amt">
        <Money value={h.monthly} size={17} weight={800} color={h.late ? "var(--neg)" : undefined} />
      </div>
    </li>
  );
}

export default function ClientSummaryModal({
  analysis,
  onClose,
}: {
  analysis: Analysis;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const a = analysis;
  const own = a.lines.filter((l) => l.role === "debtor");

  const sections: { key: Family; title: string; accent: string; rows: Holding[] }[] = ([
    {
      key: "mortgage" as const,
      title: "משכנתאות",
      accent: "#6b53d8",
      rows: group(own.filter((l) => l.category === "mortgage"), "mortgage"),
    },
    {
      key: "loan" as const,
      title: "הלוואות",
      accent: "#c4681a",
      rows: group(own.filter((l) => l.category === "loan"), "loan"),
    },
    {
      key: "card" as const,
      title: "כרטיסי אשראי ומסגרות",
      accent: "#0d8b9b",
      rows: group(
        own.filter((l) => (l.category === "card" || l.category === "overdraft") && l.monthly > 0),
        "card"
      ),
    },
  ] satisfies { key: Family; title: string; accent: string; rows: Holding[] }[]).filter(
    (s) => s.rows.length > 0
  );

  // Said the way a client would say it, not the way the report does.
  const worries: string[] = [];
  const late = own.filter((l) => l.overdue > 0 || l.arrearsRange);
  if (late.length) {
    const owed = late.reduce((s, l) => s + l.overdue, 0);
    worries.push(
      `יש פיגור בתשלומים${owed > 0 ? ` — ${Math.round(owed).toLocaleString("en-US")} ₪ שלא שולמו` : ""}`
    );
  }
  if (a.cards.rolled > 0)
    worries.push(`חלק מהחיוב בכרטיס לא נפרע והתגלגל לחודש הבא (${Math.round(a.cards.rolled).toLocaleString("en-US")} ₪)`);
  const dear = own.filter((l) => l.category === "loan" && (l.rate ?? 0) >= 10);
  if (dear.length) {
    const rates = dear.map((l) => l.rate ?? 0);
    const lo = Math.min(...rates).toFixed(1).replace(/\.0$/, "");
    const hi = Math.max(...rates).toFixed(1).replace(/\.0$/, "");
    const banks = Array.from(new Set(dear.map((l) => shortBank(l.bank) || l.bank)));
    const sum = dear.reduce((t, l) => t + l.balance, 0);
    worries.push(
      `${dear.length === 1 ? "הלוואה אחת" : `${dear.length} הלוואות`} בריבית ${lo === hi ? `${lo}%` : `${lo}%–${hi}%`} ` +
        `ב${banks.slice(0, 3).join(", ב")} — ${Math.round(sum).toLocaleString("en-US")} ₪ שאפשר למחזר`
    );
  }
  if (a.legal.executionOpen.length) worries.push("קיים תיק פתוח בהוצאה לפועל");
  if (a.legal.insolvency.length) worries.push("קיים הליך חדלות פירעון");
  if (a.legal.nonPayment.some((n) => n.allowsBureauTransfer))
    worries.push("קיים רישום על אי עמידה בתשלומים שמופיע בדירוג האשראי");

  return createPortal(
    <div
      dir="rtl"
      className="fin-vars fin-printable fixed inset-0 z-[130] grid place-items-center p-4 backdrop-blur-[2px]"
      style={{ background: "rgba(14,21,36,.55)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="fin-card flex max-h-[92vh] w-full max-w-[720px] flex-col overflow-hidden"
        style={{ boxShadow: "var(--shadow-lift)" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="סיכום ללקוח"
      >
        <header className="fin-head">
          <div className="min-w-0">
            <h2 className="fin-display text-[19px] leading-tight">
              {a.clients[0]?.name || "סיכום ההתחייבויות"}
            </h2>
            <div className="mt-0.5 text-[12px]" style={{ color: "var(--ink-4)" }}>
              סיכום ההתחייבויות{a.clients[0]?.reportDate ? ` · נכון ל-${a.clients[0].reportDate}` : ""}
            </div>
          </div>
          <div className="fin-noprint ms-auto flex items-center gap-1.5">
            <button className="fin-btn fin-btn-sm" onClick={() => window.print()}>
              <Printer size={13} weight="bold" />
              הדפסה
            </button>
            <button className="fin-act" onClick={onClose} aria-label="סגירה">
              <X size={15} weight="bold" />
            </button>
          </div>
        </header>

        <div className="fin-cs min-h-0 flex-1 overflow-y-auto">
          {sections.map((sec) => {
            const shown = sec.rows.slice(0, MAX_ROWS);
            const rest = sec.rows.slice(MAX_ROWS);
            const restMonthly = rest.reduce((s, h) => s + h.monthly, 0);
            const restBalance = rest.reduce((s, h) => s + h.balance, 0);
            return (
              <section key={sec.key} className="fin-cs-group">
                <h3 className="fin-cs-title" style={{ ["--fam" as string]: sec.accent }}>
                  {sec.title}
                </h3>
                {/* Said once, over the column, rather than whispered under every
                    number — two captions per row was most of the grey. */}
                <div className="fin-cs-cols" aria-hidden>
                  <span className="fin-cs-colspacer" />
                  <span className="flex-1" />
                  {sec.key !== "card" && <span className="fin-cs-amt">יתרה</span>}
                  <span className="fin-cs-amt">לחודש</span>
                </div>
                <ul>
                  {shown.map((h) => (
                    <Row key={h.key} h={h} />
                  ))}
                  {rest.length > 0 && (
                    <li className="fin-cs-more">
                      ועוד {rest.length} {rest.length === 1 ? "מלווה" : "מלווים"}
                      {restBalance > 0 && (
                        <>
                          {" · "}
                          <Money value={restBalance} block={false} weight={700} /> יתרה
                        </>
                      )}
                      {restMonthly > 0 && (
                        <>
                          {" · "}
                          <Money value={restMonthly} block={false} weight={700} /> לחודש
                        </>
                      )}
                    </li>
                  )}
                </ul>
              </section>
            );
          })}

          {!sections.length && (
            <p className="px-1 py-6 text-center text-[14px]" style={{ color: "var(--ink-3)" }}>
              לא נמצאו התחייבויות פעילות בדוח.
            </p>
          )}

          {worries.length > 0 && (
            <section className="fin-cs-worry">
              <div className="fin-cs-worry-head">
                <WarningCircle size={17} weight="fill" />
                מה חשוב לשים לב אליו
              </div>
              <ul>
                {worries.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* The one number a client actually feels. */}
        <footer className="fin-cs-foot">
          <div>
            <div className="fin-cs-foot-cap">סך ההתחייבויות</div>
            <Money value={a.totals.balance} size={19} weight={800} style={{ textAlign: "start" }} block={false} />
          </div>
          <div className="text-end">
            <div className="fin-cs-foot-cap">יוצא מהחשבון כל חודש</div>
            <Money value={a.totals.monthly} size={22} weight={800} style={{ textAlign: "start" }} block={false} />
          </div>
        </footer>
      </motion.div>
    </div>,
    document.body
  );
}

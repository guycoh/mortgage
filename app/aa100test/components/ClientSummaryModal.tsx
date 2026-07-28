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
// It has to stay about half a page. Long tails are folded into a single
// "ועוד N" line rather than allowed to run, because a summary that scrolls is
// not a summary.

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { Printer, WarningCircle, X } from "@phosphor-icons/react";
import { BankIcon } from "@/app/aa4test/components/bankIcons";
import { shortBank } from "@/app/aa4test/debtTags";
import Money from "./Money";
import type { Analysis, DebtLine } from "../lib/analysis";

/** Rows past this fold into one line — the page has to stay a page. */
const MAX_ROWS = 5;

type Group = {
  key: string;
  title: string;
  accent: string;
  lines: DebtLine[];
  /** Cards state a monthly charge but no meaningful "balance" to a client. */
  showBalance: boolean;
};

/**
 * How much longer this runs, said properly.
 *
 * Only amortising debts have a remaining term — a revolving facility rolls
 * indefinitely, and the report's "months" for one is an artefact, not a fact
 * to tell a client. And Hebrew does not say "נותרו 1 תשלומים".
 */
function remaining(line: DebtLine): string {
  if (line.category !== "mortgage" && line.category !== "loan") return "";
  const m = line.months ?? 0;
  if (m <= 0) return "";
  if (m === 1) return " · נותר תשלום אחד";
  if (m < 24) return ` · נותרו ${m} תשלומים`;
  const years = Math.round(m / 12);
  return ` · נותרו כ-${years} שנים`;
}

function Row({ line, showBalance }: { line: DebtLine; showBalance: boolean }) {
  const late = line.overdue > 0 || !!line.arrearsRange;
  const dear = line.category === "loan" && (line.rate ?? 0) >= 10;

  return (
    <li className="fin-cs-row">
      <BankIcon source={line.bank} size={30} />

      <div className="min-w-0 flex-1">
        <div className="fin-cs-bank">{shortBank(line.bank) || line.bank}</div>
        <div className="fin-cs-meta">
          {line.type || "התחייבות"}
          {remaining(line)}
          {dear && <span className="fin-cs-warn"> · ריבית {line.rate?.toFixed(1)}%</span>}
          {late && <span className="fin-cs-warn"> · בפיגור</span>}
        </div>
      </div>

      {showBalance && (
        <div className="fin-cs-amt">
          <Money value={line.balance} size={17} weight={800} style={{ textAlign: "start" }} />
          <span className="fin-cs-cap">יתרה</span>
        </div>
      )}

      <div className="fin-cs-amt">
        <Money
          value={line.monthly}
          size={17}
          weight={800}
          color={late ? "var(--neg)" : undefined}
          style={{ textAlign: "start" }}
        />
        <span className="fin-cs-cap">לחודש</span>
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
  const by = (c: DebtLine["category"]) =>
    own.filter((l) => l.category === c).sort((x, y) => y.balance - x.balance);

  const cards = own
    .filter((l) => (l.category === "card" || l.category === "overdraft") && l.monthly > 0)
    .sort((x, y) => y.monthly - x.monthly);

  const groups: Group[] = [
    { key: "mortgage", title: "משכנתאות", accent: "#6b53d8", lines: by("mortgage"), showBalance: true },
    { key: "loan", title: "הלוואות", accent: "#c4681a", lines: by("loan"), showBalance: true },
    { key: "card", title: "כרטיסי אשראי ומסגרות", accent: "#0d8b9b", lines: cards, showBalance: false },
  ].filter((g) => g.lines.length > 0);

  // Said the way a client would say it, not the way the report does.
  const worries: string[] = [];
  const late = own.filter((l) => l.overdue > 0 || l.arrearsRange);
  if (late.length) worries.push(`יש פיגור בתשלומים ב-${late.length === 1 ? "התחייבות אחת" : `${late.length} התחייבויות`}`);
  if (a.cards.rolled > 0)
    worries.push(`חלק מהחיוב בכרטיס לא נפרע והתגלגל לחודש הבא (${Math.round(a.cards.rolled).toLocaleString("en-US")} ₪)`);
  const dear = own.filter((l) => l.category === "loan" && (l.rate ?? 0) >= 10);
  if (dear.length)
    worries.push(`${dear.length === 1 ? "הלוואה אחת" : `${dear.length} הלוואות`} בריבית גבוהה מאוד — מועמדות ראשונות למיחזור`);
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
          {groups.map((g) => {
            const shown = g.lines.slice(0, MAX_ROWS);
            const rest = g.lines.slice(MAX_ROWS);
            const restMonthly = rest.reduce((s, l) => s + l.monthly, 0);
            return (
              <section key={g.key} className="fin-cs-group">
                <h3 className="fin-cs-title" style={{ ["--fam" as string]: g.accent }}>
                  {g.title}
                </h3>
                <ul>
                  {shown.map((l) => (
                    <Row key={l.uid} line={l} showBalance={g.showBalance} />
                  ))}
                  {rest.length > 0 && (
                    <li className="fin-cs-more">
                      ועוד {rest.length} {g.key === "card" ? "מסגרות" : "התחייבויות"}
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

          {!groups.length && (
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
            <div className="fin-cs-cap">סך ההתחייבויות</div>
            <Money value={a.totals.balance} size={19} weight={800} style={{ textAlign: "start" }} />
          </div>
          <div className="text-end">
            <div className="fin-cs-cap">יוצא מהחשבון כל חודש</div>
            <Money value={a.totals.monthly} size={22} weight={800} style={{ textAlign: "start" }} />
          </div>
        </footer>
      </motion.div>
    </div>,
    document.body
  );
}

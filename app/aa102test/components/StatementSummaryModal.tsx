"use client";

// The mortgage, on one page you can turn around and show the client.
//
// Grouped by track rather than by lender: a mortgage statement is one bank, and
// what a client wants to understand is not who lent it but what kind of money it
// is — how much moves with the prime rate, how much grows with inflation, how
// much is fixed and safe.
//
// Two numbers a client asks for that the credit report can never answer: what it
// would cost to close this mortgage today, and how much of that is a penalty.
// Both are stated here.

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { Printer, WarningCircle, X } from "@phosphor-icons/react";
import { BankIcon } from "@/app/aa4test/components/bankIcons";
import Money, { fmt } from "./Money";
import { noteOf, rateHeat } from "@/lib/verdicts";
import {
  TRACK_COLOR,
  TRACK_LABEL,
  type StatementAnalysis,
} from "@/lib/bank-parser/analysis";

/** Plain words for what a track actually exposes the client to. */
const TRACK_PLAIN: Record<string, string> = {
  prime: "נע עם ריבית בנק ישראל",
  "fixed-unlinked": "קבועה — לא משתנה",
  "fixed-linked": "קבועה, אך צמודה למדד",
  "variable-unlinked": "מתעדכנת מדי כמה שנים",
  "variable-linked": "מתעדכנת וגם צמודה למדד",
  fx: "צמודה למטבע חוץ",
  unknown: "",
};

export default function StatementSummaryModal({
  analysis,
  onClose,
}: {
  analysis: StatementAnalysis;
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
  const st = a.statement;

  // One row per track, biggest first — the client's mortgage as they'd describe
  // it, not as the bank booked it. Every verdict on the row (years, late, dear,
  // fee) is computed once in the engine and read here. It used to be recomputed
  // in this component, and `dear` was tested on the track's BALANCE-WEIGHTED rate
  // while the analysis tested each tranche: a slice averaging 4.01% out of real
  // tranches at 4.98% and 3.25% hid an expensive tranche from the client and named
  // it first to the advisor.
  const rows = a.tracks;

  // Projected from the engine's own findings, severity-ordered, rather than a
  // second list written here with its own thresholds.
  const worries = a.findings
    .map((f) => ({ note: noteOf(f.client), severity: f.severity }))
    .filter((x): x is { note: { say: string }; severity: typeof x.severity } => x.note !== null);

  return createPortal(
    <div
      dir="rtl"
      className="lgr-vars lgr-printable fixed inset-0 z-[130] grid place-items-center p-4 backdrop-blur-[2px]"
      style={{ background: "rgba(14,21,36,.55)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="lgr-card flex max-h-[92vh] w-full max-w-[760px] flex-col overflow-hidden"
        style={{ boxShadow: "var(--shadow-lift)" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="סיכום המשכנתא ללקוח"
      >
        <header className="lgr-head">
          <BankIcon source={st.bankLabel} size={26} />
          <div className="min-w-0">
            <h2 className="lgr-display text-[19px] leading-tight">
              {st.client.name || "סיכום המשכנתא"}
            </h2>
            <div className="mt-0.5 text-[12px]" style={{ color: "var(--lgr-4)" }}>
              {st.bankLabel}
              {st.statementDate ? ` · נכון ל-${st.statementDate}` : ""}
            </div>
          </div>
          <div className="lgr-noprint ms-auto flex items-center gap-1.5">
            <button className="lgr-btn lgr-btn-sm" onClick={() => window.print()}>
              <Printer size={13} weight="bold" />
              הדפסה
            </button>
            <button className="lgr-act" onClick={onClose} aria-label="סגירה">
              <X size={15} weight="bold" />
            </button>
          </div>
        </header>

        <div className="lgr-cs min-h-0 flex-1 overflow-y-auto">
          <section className="lgr-cs-group">
            <h3 className="lgr-cs-title" style={{ ["--fam" as string]: "#4a4691" }}>
              המשכנתא שלכם — {a.live.length} מסלולים
            </h3>
            <div className="lgr-cs-cols" aria-hidden>
              <span className="lgr-cs-colspacer" />
              <span className="flex-1" />
              <span className="lgr-cs-amt">יתרה</span>
              <span className="lgr-cs-amt">לחודש</span>
            </div>
            <ul>
              {rows.map((r) => (
                <li key={r.key} className="lgr-cs-row">
                  <i
                    className="size-3 flex-none rounded-full"
                    style={{ background: TRACK_COLOR[r.key], marginInlineStart: 9, marginInlineEnd: 9 }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="lgr-cs-bank">{TRACK_LABEL[r.key] ?? r.label}</div>
                    <div className="lgr-cs-meta">
                      {[
                        TRACK_PLAIN[r.key],
                        r.years ? `עוד כ-${r.years} שנים` : "",
                        r.count > 1 ? `${r.count} מסלולים` : "",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      {r.rate !== null && (
                        <>
                          {" · "}
                          <span className={r.dear ? "lgr-cs-warn" : undefined}>ריבית {r.rate.toFixed(2)}%</span>
                        </>
                      )}
                      {/* When only some of the slice is expensive, the average rate
                          beside it is not the reason it is red — say which part is.
                          A slice averaging 4.01% out of tranches at 4.98% and 3.25%
                          would otherwise look mispainted. */}
                      {r.dear && r.dearTranches < r.count && (
                        <span className="lgr-cs-warn">
                          {` · ${r.dearTranches === 1 ? "מסלול אחד" : `${r.dearTranches} מסלולים`} בריבית גבוהה`}
                        </span>
                      )}
                      {r.late && <span className="lgr-cs-warn"> · בפיגור</span>}
                    </div>
                  </div>
                  <div className="lgr-cs-amt">
                    <Money value={r.balance} size={17} weight={800} />
                  </div>
                  <div className="lgr-cs-amt">
                    <Money value={r.monthly} size={17} weight={800} color={r.late ? "var(--neg)" : undefined} />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* The two questions a client always asks, and the credit report cannot
              answer: what would it cost to end this today, and how much of that
              is a penalty rather than the debt itself. */}
          <section className="lgr-cs-group">
            <h3 className="lgr-cs-title" style={{ ["--fam" as string]: "#0d8b9b" }}>
              אם תרצו לסלק את המשכנתא היום
            </h3>
            <div className="lgr-facts" style={{ padding: "6px 2px 2px" }}>
              <div>
                <div className="lgr-cs-foot-cap">סכום לסילוק מלא</div>
                <Money value={a.totals.payoff} size={19} weight={800} />
              </div>
              <div>
                <div className="lgr-cs-foot-cap">מזה עמלת פירעון מוקדם</div>
                <Money
                  value={a.totals.breakFee}
                  size={19}
                  weight={800}
                  color={a.totals.breakFee > 0 ? "var(--neg)" : undefined}
                />
              </div>
              {a.freeToBreak.length > 0 && (
                <div>
                  <div className="lgr-cs-foot-cap">ניתן להזיז בלי עמלה</div>
                  <Money
                    value={a.freeToBreak.reduce((s, t) => s + (t.balance ?? 0), 0)}
                    size={19}
                    weight={800}
                    color="var(--pos)"
                  />
                </div>
              )}
            </div>
          </section>

          {worries.length > 0 && (
            <section className="lgr-cs-worry">
              <div className="lgr-cs-worry-head">
                <WarningCircle size={17} weight="fill" />
                מה חשוב לשים לב אליו
              </div>
              <ul>
                {worries.map((w) => (
                  <li key={w.note.say} data-sev={w.severity}>
                    {w.note.say}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <footer className="lgr-cs-foot">
          <div>
            <div className="lgr-cs-foot-cap">יתרת המשכנתא</div>
            <Money value={a.totals.balance} size={19} weight={800} style={{ textAlign: "start" }} block={false} />
          </div>
          <div className="text-end">
            <div className="lgr-cs-foot-cap">יוצא מהחשבון כל חודש</div>
            <Money value={a.totals.monthly} size={22} weight={800} style={{ textAlign: "start" }} block={false} />
          </div>
        </footer>
      </motion.div>
    </div>,
    document.body
  );
}

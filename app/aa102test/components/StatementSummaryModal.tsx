"use client";

// The mortgage, on one page you can turn around and show the client.
//
// Grouped by track rather than by lender: a mortgage statement is one bank, and
// what a client wants to understand is not who lent it but what kind of money it
// is — how much moves with the prime rate, how much grows with inflation, how
// much is fixed and safe.
//
// Two numbers a client asks for that the credit report can never answer: what it
// would cost to close this mortgage, and how much of that is a penalty. Both are
// stated here — as of the document's date, which is the only date they are true on.

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { Printer, X } from "@phosphor-icons/react";
import { Worries } from "./ClientSummaryModal";
import { BankIcon } from "./bankIcons";
import Money, { fmt } from "./Money";
import { rateHeat } from "@/lib/verdicts";
import {
  TRACK_COLOR,
  TRACK_LABEL,
  type StatementAnalysis,
} from "@/lib/bank-parser/analysis";
import { PURPOSE_LABEL } from "@/lib/bank-parser/purpose";

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

  // מטרת ההלוואה, normalised. Several loans in one file usually share it; when
  // they genuinely differ the header says so rather than picking the first.
  const eligibility = st.loans.some((l) => l.funding === "eligibility");
  const purpose = st.loans
    .filter((l) => l.purposeKind !== "unknown")
    .map((l) => PURPOSE_LABEL[l.purposeKind])
    .filter((label, i, all) => all.indexOf(label) === i)
    .concat(eligibility ? ["זכאות"] : [])
    .join(" · ");

  // One row per track, biggest first — the client's mortgage as they'd describe
  // it, not as the bank booked it. Every verdict on the row (years, late, dear,
  // fee) is computed once in the engine and read here. It used to be recomputed
  // in this component, and `dear` was tested on the track's BALANCE-WEIGHTED rate
  // while the analysis tested each tranche: a slice averaging 4.01% out of real
  // tranches at 4.98% and 3.25% hid an expensive tranche from the client and named
  // it first to the advisor.
  const rows = a.tracks;

  // Projected from the engine's own findings — grouped, overlaps folded — rather
  // than a second list written here with its own thresholds.
  const worries = a.clientWorries;
  const asOf = st.statementDate ? `נכון ל-${st.statementDate}` : "נכון לתאריך המסמך";

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
              {/* Purpose in the client's own terms — "רכישת דירה", not the
                  lender's "לווה פרטי-מגורים". Omitted when unstated rather than
                  printed as a gap; this page is read by the borrower. */}
              {[
                st.bankLabel,
                purpose,
                st.statementDate ? `נכון ל-${st.statementDate}` : "",
              ]
                .filter(Boolean)
                .join(" · ")}
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
                      {/* A slice of several tranches carries the LONGEST term and a
                          balance-weighted rate — said as such, not as if every
                          tranche ran that long at that rate. */}
                      {[
                        TRACK_PLAIN[r.key],
                        r.years ? (r.count > 1 ? `המסלול האחרון מסתיים בעוד כ-${r.years} שנים` : `עוד כ-${r.years} שנים`) : "",
                        r.count > 1 ? `${r.count} מסלולים` : "",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      {r.rate !== null && (
                        <>
                          {" · "}
                          <span className={r.dear ? "lgr-cs-warn" : undefined}>
                            {r.count > 1 ? "ריבית ממוצעת משוקללת" : "ריבית"} {r.rate.toFixed(2)}%
                          </span>
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
              answer: what would it cost to end this, and how much of that is a
              penalty rather than the debt itself. Dated to the document — a
              payoff figure moves every day, and "היום" on a letter weeks old
              promised a number nobody had quoted. */}
          <section className="lgr-cs-group">
            <h3 className="lgr-cs-title" style={{ ["--fam" as string]: "#0d8b9b" }}>
              סילוק המשכנתא לפי המסמך
            </h3>
            <div className="lgr-facts" style={{ padding: "6px 2px 2px" }}>
              <div>
                <div className="lgr-cs-foot-cap">
                  {st.statementDate ? `סכום לסילוק נכון ל-${st.statementDate}` : "סכום לסילוק לפי המסמך"}
                </div>
                <Money value={a.totals.payoff} size={19} weight={800} />
              </div>
              {/* The payoff is more than the balance by two things — the fee, and
                  the interest run up since the last instalment. Both are said, so
                  715,460 over a 713,480 balance is arithmetic the client can check
                  rather than a gap they have to take on trust. */}
              {a.totals.accruedInterest > 0 && (
                <div>
                  <div className="lgr-cs-foot-cap">מזה ריבית שנצברה</div>
                  <Money value={a.totals.accruedInterest} size={19} weight={800} color="var(--lgr-2)" />
                </div>
              )}
              <div>
                <div className="lgr-cs-foot-cap">מזה עמלת פירעון מוקדם</div>
                <Money
                  value={a.totals.breakFee}
                  size={19}
                  weight={800}
                  color={a.totals.breakFee > 0 ? "var(--neg)" : undefined}
                />
                {/* A blank fee cell is not a zero fee; the total says it is short. */}
                {a.feeUnreported.length > 0 && (
                  <div className="lgr-cs-note">
                    הסכום חלקי: לא דווחה עמלה עבור{" "}
                    {a.feeUnreported.length === 1 ? "מסלול אחד" : `${a.feeUnreported.length} מסלולים`}
                  </div>
                )}
              </div>
              {/* Only tranches whose fee the letter PRINTS as zero. The breakFee
                  is the tranche's whole early-repayment fee (סה"כ עמלת פרעון
                  מוקדם), not just its היוון part, so the label can say so; the
                  loan-level operational fee is separate and named. */}
              {a.freeToBreak.length > 0 && (
                <div>
                  <div className="lgr-cs-foot-cap">יתרה ללא עמלת פירעון מוקדם לפי המסמך</div>
                  <Money
                    value={a.freeToBreak.reduce((s, t) => s + (t.balance ?? 0), 0)}
                    size={19}
                    weight={800}
                    color="var(--pos)"
                  />
                  {a.totals.operationalFee > 0 && (
                    <div className="lgr-cs-note">לא כולל עמלה תפעולית של {fmt(a.totals.operationalFee)} ₪ להלוואה</div>
                  )}
                </div>
              )}
            </div>
          </section>

          {worries.length > 0 && <Worries items={worries} />}
        </div>

        <footer className="lgr-cs-foot">
          <div>
            <div className="lgr-cs-foot-cap">יתרת המשכנתא</div>
            <Money value={a.totals.balance} size={19} weight={800} style={{ textAlign: "start" }} block={false} />
          </div>
          {/* The scheduled instalment the letter prints, as of its date — not a
              statement about what left the account. */}
          <div className="text-end">
            <div className="lgr-cs-foot-cap">החזר חודשי לפי המסמך</div>
            <Money value={a.totals.monthly} size={22} weight={800} style={{ textAlign: "start" }} block={false} />
            <div className="lgr-cs-none">{asOf}</div>
            {a.monthlyUnreported > 0 && (
              <div className="lgr-cs-none">
                הסכום חלקי: לא דווח החזר עבור{" "}
                {a.monthlyUnreported === 1 ? "מסלול אחד" : `${a.monthlyUnreported} מסלולים`}
              </div>
            )}
          </div>
        </footer>
      </motion.div>
    </div>,
    document.body
  );
}

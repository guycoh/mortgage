"use client";

// שכפול משכנתא נוכחית — the one question a copy of the master has to ask.
//
// The master holds the balance the way the bank prints it: יתרת קרן and
// הצמדת קרן apart, and beside them הפרשי היוון — what leaving each tranche
// costs today. A proposal borrows ONE sum per row. So the copy adds the two
// parts back together (which is the amount every calculation already reads),
// and the advisor decides the only thing that is a decision: does the new
// mortgage fund the עמלות פרעון מוקדם as well, or does the client pay them out
// of pocket?
//
// Two answers, one click each — the same shape SmartNPV's dialog takes, and
// deliberately so: an advisor who knows that dialog knows this one. What is
// added is the arithmetic, shown before it is acted on: each answer states the
// sum it will produce, so the choice is made on figures rather than on a label.

import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { X } from "@phosphor-icons/react";
import Btn from "./Btn";
import Money from "./Money";
import { masterTotals, owedOnly, type ImportedLoan } from "../lib/credit";

export default function DuplicateMasterModal({
  mixName,
  loans,
  onPick,
  onClose,
}: {
  mixName: string;
  loans: ImportedLoan[];
  /** The advisor answered. `withFees` is the whole decision. */
  onPick: (withFees: boolean) => void;
  onClose: () => void;
}) {
  // The client's own rows — the same set the rail and the totals row add up.
  // Guarantees still travel with the copy (they are on the board), but they are
  // nobody's balance to refinance and nobody's fee to fund, so the receipt
  // states the figures the advisor will recognise from the sheet above.
  const owed = useMemo(() => owedOnly(loans), [loans]);
  const t = useMemo(() => masterTotals(owed), [owed]);
  const feeRows = owed.filter((l) => (Number(l.prepayment_fee) || 0) > 0).length;
  const hasFees = t.fee > 0;

  // Focus lands on the answer most advisors give — fund the fees — when there
  // are fees to fund; otherwise on the only answer that does anything.
  const primaryRef = useRef<HTMLButtonElement>(null);
  const plainRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    (hasFees ? primaryRef : plainRef).current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return createPortal(
    <div
      dir="rtl"
      className="lgr-vars fixed inset-0 z-[120] grid place-items-center p-4"
      style={{ background: "rgba(14,21,36,.5)" }}
      onClick={onClose}
      role="presentation"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lgr-dup-title"
        initial={{ opacity: 0, y: 10, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="lgr-card lgr-dup"
        style={{ boxShadow: "var(--shadow-lift)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="lgr-head lgr-dup-head">
          <div className="min-w-0">
            <h2 id="lgr-dup-title" className="lgr-title">
              שכפול משכנתא נוכחית
            </h2>
            <div className="lgr-sub lgr-dup-sub" title={mixName}>
              {mixName}
            </div>
          </div>
          <button className="lgr-act ms-auto" onClick={onClose} aria-label="סגירה">
            <X size={15} weight="bold" />
          </button>
        </header>

        <div className="lgr-dup-body">
          {/* THE QUESTION, in one line — the same one SmartNPV asks. Everything
              the copy does regardless of the answer (the two parts of the
              balance become one amount) is shown as arithmetic below, not
              explained in prose. */}
          <p className="lgr-dup-q">האם להוסיף את הפרשי ההיוון לקרן ההלוואה?</p>

          <dl className="lgr-dup-sheet" aria-label="פירוט הסכומים">
            <div className="lgr-dup-line">
              <dt>יתרת קרן</dt>
              <dd>
                <Money value={t.principal} weight={600} />
              </dd>
            </div>
            <div className="lgr-dup-line" data-quiet={t.indexation === 0 || undefined}>
              <dt>הצמדת קרן</dt>
              <dd>
                <Money value={t.indexation} weight={600} sign />
              </dd>
            </div>
            <div className="lgr-dup-line lgr-dup-line-sum">
              <dt>סכום ההעתק</dt>
              <dd>
                <Money value={t.balance} weight={700} size={15} />
              </dd>
            </div>
            <div className="lgr-dup-line" data-quiet={!hasFees || undefined}>
              <dt>
                הפרשי היוון
                {hasFees && <em>{feeRows} {feeRows === 1 ? "שורה" : "שורות"}</em>}
              </dt>
              <dd>
                <Money value={t.fee} weight={600} sign color={hasFees ? "var(--warn)" : undefined} />
              </dd>
            </div>
          </dl>
        </div>

        {/* THE TWO ANSWERS — ordinary buttons, the page's own two weights, each
            carrying the sum it produces so the choice is made on figures. With
            no fees on the sheet the second answer folds in nothing, and says
            so instead of pretending to be a choice. */}
        <div className="lgr-dup-acts">
          <Btn ref={plainRef} className="lgr-btn lgr-btn-sm" onClick={() => onPick(false)}>
            שכפול ללא עמלות
            <Money value={t.balance} className="lgr-dup-btn-m" block={false} weight={600} size={12} />
          </Btn>
          <Btn
            ref={primaryRef}
            className={`lgr-btn lgr-btn-sm ${hasFees ? "lgr-btn-primary" : ""}`}
            disabled={!hasFees}
            title={hasFees ? undefined : "לא הוזנו הפרשי היוון בתמהיל — אין מה להוסיף לקרן"}
            onClick={() => onPick(true)}
          >
            שכפול עם עמלות
            <Money value={t.withFees} className="lgr-dup-btn-m" block={false} weight={600} size={12} />
          </Btn>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

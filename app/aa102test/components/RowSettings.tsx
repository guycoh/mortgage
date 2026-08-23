"use client";

// גרייס — the two month counts nobody touches on a normal day — and the row's
// two read-outs, שת"פ and ע.נ.נ, which nobody types at all. They
// used to live in an expander tray that pushed every row below it down the page.
// Now they open in a small sheet anchored to the row's own settings icon, so the
// grid never reflows.
//
// עוגן, תוספת and תדירות שינוי used to be here too. All three moved to the grid
// once both document types started filling them on import: a field that arrives
// with data in it is not a field you go hunting for, and one value editable in two
// places is one value too many. The anchor's NAME never made it onto the grid —
// it is words, and the עוגן column is numeric — so it survives in the footer's
// hover text, with the rest of what the document said.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Sliders, X } from "@phosphor-icons/react";
import { FAMILY, PATH_LABEL, type ImportedLoan } from "../lib/credit";
import { calculateLoan } from "@/app/private/crm/leads/simulators/components/calculate/loanCalculators";
import { rowYield } from "../lib/yield";
import { lenderOf } from "../lib/lenders";

const W = 348;
// The TALLEST the sheet gets — grace note showing and the ערב caption with it
// (measured 329; the ordinary sheet is 297). It only decides whether the sheet
// opens above or below the icon, and the two errors are not symmetric: too high
// flips a short sheet upward for nothing, too low lets a tall one open downward
// off the bottom of the screen. So it tracks the maximum, not the common case.
const H = 330;

export default function RowSettings({
  loan,
  anchorRect,
  dirty,
  annualInflation = 2,
  annualDiscount = 4.5,
  onPatch,
  onClose,
}: {
  loan: ImportedLoan;
  /** Where the row's settings icon is, in viewport coordinates. */
  anchorRect: DOMRect;
  dirty: Set<string>;
  /**
   * The two assumptions the read-outs depend on, so the sheet can state them.
   *
   * Optional, and defaulted to the board's own starting values, so only the
   * surface that HAS these controls has to pass them — /aa102test does;
   * /hachamsim renders this sheet from its own Ledger copy and does not.
   */
  annualInflation?: number;
  annualDiscount?: number;
  onPatch: (next: Partial<ImportedLoan>) => void;
  onClose: () => void;
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const fam = FAMILY[loan.group === "loan" ? "loan" : "mortgage"];

  useLayoutEffect(() => {
    const up = anchorRect.bottom + H + 10 > window.innerHeight && anchorRect.top - H - 10 > 0;
    setPos({
      top: up ? Math.max(8, anchorRect.top - H - 6) : anchorRect.bottom + 6,
      left: Math.min(Math.max(8, anchorRect.left - 8), window.innerWidth - W - 8),
    });
  }, [anchorRect]);

  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      if (ref.current?.contains(e.target as Node)) return;
      // a portalled listbox opened from inside this sheet is still inside it
      if ((e.target as HTMLElement)?.closest?.(".lgr-pop")) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onScroll = (e: Event) => {
      const t = e.target as HTMLElement | Document;
      if (t instanceof HTMLElement && t.closest?.(".lgr-pop")) return;
      onClose();
    };
    window.addEventListener("pointerdown", onPointer, true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onClose);
    return () => {
      window.removeEventListener("pointerdown", onPointer, true);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  /**
   * The sequence the two numbers produce — and NOTHING when they produce the
   * ordinary one.
   *
   * A three-phase sequence is the one thing two number boxes cannot show, so it
   * is worth a line; it also surfaces the clamp, when the term is too short to
   * hold the grace that was asked for. But the default — no grace, principal
   * from month one — is what every row does, and a line explaining the default
   * on every row is how a sheet fills with words nobody reads. Two zeros
   * already say it.
   */
  const graceNote = (
    fullRaw?: number | null,
    partialRaw?: number | null,
    monthsRaw?: number | null
  ) => {
    const months = Math.max(Math.floor(Number(monthsRaw) || 0), 0);
    const room = months > 1 ? months - 1 : 0;
    const partial = Math.min(Math.max(Math.floor(Number(partialRaw) || 0), 0), room);
    const full = Math.min(Math.max(Math.floor(Number(fullRaw) || 0), 0), room - partial);
    if (!full && !partial) return "";
    // Months, unlabelled: the fields above are titled (חודשים) and repeating the
    // unit three times in one line is the bloat, not the information.
    const phases: string[] = [];
    if (full) phases.push(`${full} ללא תשלום`);
    if (partial) phases.push(`${partial} ריבית בלבד`);
    phases.push(`${months - full - partial} הפחתת קרן`);
    const asked = Math.max(Math.floor(Number(fullRaw) || 0), 0) + Math.max(Math.floor(Number(partialRaw) || 0), 0);
    return phases.join(" · ") + (asked > full + partial ? " · קוצר לתקופה" : "");
  };
  const grace = graceNote(loan.grace_full_months, loan.grace_partial_months, loan.months);

  /**
   * שת"פ and ע.נ.נ — the row's two read-outs, measured off the schedule the
   * engine produces for it, so grace, a balloon and indexation are all already
   * in them. They live here rather than on the grid because they are not
   * inputs: the grid is where you change a row, this sheet is where you read
   * what changing it did.
   */
  const res = calculateLoan(loan, annualInflation);
  const ry = rowYield(Number(loan.amount) || 0, res, annualDiscount);

  /** Everything the document said about this row — the footer's hover text. */
  const source = [
    loan.source_type,
    loan.source_track,
    loan.source_anchor,
    loan.source_bank ? lenderOf(loan.source_bank).full : "",
  ]
    .filter(Boolean)
    .join(" · ");

  /** A read-out, not a field: flat, unfocusable, and dashed when unmeasurable. */
  const readout = (label: string, value: string | null, note: string, title: string) => (
    <div className="flex flex-col gap-1" title={title}>
      <span className="lgr-label">{label}</span>
      <div className="lgr-readout">
        <span className="lgr-readout-v">{value ?? "—"}</span>
        <span className="lgr-readout-n">{note}</span>
      </div>
    </div>
  );

  const field = (
    label: string,
    key: "grace_months" | "grace_full_months" | "grace_partial_months",
    placeholder?: string
  ) => (
    <label className="flex flex-col gap-1">
      <span className="lgr-label">{label}</span>
      <div className="lgr-well" data-dirty={dirty.has(key) || undefined}>
        <input
          className="lgr-cell lgr-num-in"
          type="number"
          min={0}
          placeholder={placeholder}
          value={loan[key] ?? ""}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => onPatch({ [key]: Number(e.target.value) || 0 } as Partial<ImportedLoan>)}
        />
      </div>
    </label>
  );

  return createPortal(
    <AnimatePresence>
      {pos && (
        <motion.div
          ref={ref}
          dir="rtl"
          className="lgr-pop lgr-sheet lgr-vars"
          style={{ top: pos.top, left: pos.left, width: W }}
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.985 }}
          transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
        >
          <header className="lgr-sheet-head">
            <Sliders size={14} style={{ color: "var(--lgr-3)" }} />
            <h3 className="lgr-title" style={{ fontSize: 12.5 }}>
              שדות נוספים
            </h3>
            <span
              className="lgr-chip !h-[20px] !px-1.5 !text-[10.5px]"
              style={{ borderColor: fam.line, background: fam.tint, color: fam.text }}
            >
              {fam.label}
            </span>
            <span className="text-[10.5px]" style={{ color: "var(--lgr-4)" }}>
              {PATH_LABEL[loan.path_id]}
            </span>
            <button className="lgr-act ms-auto !h-6 !w-6" onClick={onClose} aria-label="סגירה">
              <X size={13} weight="bold" />
            </button>
          </header>

          {/* GRACE IS TWO PERIODS, SO IT IS TWO FIELDS.
              A type plus a count could only ever say "six months of one kind",
              and a construction loan is both kinds in sequence: nothing paid
              while the interest capitalises, then interest-only, then the
              balance amortises on the row's own לוח סילוקין. Two month counts
              say that; a dropdown cannot. Order is fixed (מלא then חלקי) and
              stated under the fields rather than made an input, because the
              reverse — from paying interest back to paying nothing — is not a
              product anyone sells. */}
          <div className="lgr-sheet-body">
            {field("גרייס מלא (חודשים)", "grace_full_months", "0")}
            {field("גרייס חלקי (חודשים)", "grace_partial_months", "0")}
          </div>
          {grace && <p className="lgr-sheet-note">{grace}</p>}

          {/* TWO SEPARATE READ-OUTS, not one stacked cell.
              A rate and a shekel figure answer different questions and share no
              baseline; pairing them saved width on the grid and cost clarity.
              Here there is width, so each gets its own label, its own value and
              its own line of what it means. */}
          <div className="lgr-sheet-body lgr-sheet-body-ro">
            {readout(
              'שת"פ — תשואה פנימית',
              ry.irr === null ? null : `${ry.irr.toFixed(2)}%`,
              "שנתי אפקטיבי",
              ry.irr === null
                ? "אין לוח תשלומים לשורה — חסרים יתרה, ריבית או תקופה"
                : `שיעור התשואה הפנימי של לוח התשלומים: הריבית שבה הערך הנוכחי של כל התשלומים שווה ליתרת הקרן. שנתי אפקטיבי — ${(Number(loan.rate) || 0).toFixed(2)}% נומינלי בשורה`
            )}
            {readout(
              "ע.נ.נ — ערך נוכחי נקי",
              ry.npv === null ? null : `₪${Math.round(ry.npv).toLocaleString("en-US")}`,
              `בהיוון ${annualDiscount}%`,
              ry.npv === null
                ? "אין לוח תשלומים לשורה"
                : `הערך הנוכחי של כל התשלומים, מהוון ב-${annualDiscount}%, פחות יתרת הקרן. ${
                    Math.round(ry.npv) > 0
                      ? "חיובי — השורה יקרה משיעור ההיוון"
                      : Math.round(ry.npv) < 0
                        ? "שלילי — השורה זולה משיעור ההיוון"
                        : "אפס — השורה מתומחרת בדיוק בשיעור ההיוון"
                  }`
            )}
          </div>

          {/* WHOSE DEBT IT IS — correctable, because it now moves money.
              While ערב was only a tag on the row it could stay read-only: it
              described the row and changed nothing. It decides which section the
              row sits in and whether its balance and its repayment enter any
              total, so a report the parser read wrong has to be fixable without
              deleting the row and retyping it. */}
          <div className="lgr-sheet-body lgr-sheet-body-1">
            <label className="lgr-switch" data-dirty={dirty.has("is_guarantor") || undefined}>
              <input
                type="checkbox"
                checked={!!loan.is_guarantor}
                onChange={(e) => onPatch({ is_guarantor: e.target.checked } as Partial<ImportedLoan>)}
              />
              <span className="lgr-switch-track" aria-hidden />
              {/* Only the ON state earns a second line. Off is the default, and
                  "the client is not a guarantor" is the whole of what an
                  unchecked switch labelled הלקוח ערב לחוב הזה already says. */}
              <span className="lgr-switch-text">
                הלקוח ערב לחוב הזה
                {loan.is_guarantor && <em>מחוץ לסיכומי התמהיל</em>}
              </span>
            </label>
          </div>

          {/* PROVENANCE, ONE LINE — the rest on hover.
              Four facts were printed here and three of them are already on the
              grid or in this sheet's own header: the type is the family chip,
              the lender is the גוף מימון column, and the anchor's name is a
              full sentence ("הריבית הממוצעת על משכנתאות צמודות מדד") for a
              value the עוגן column already shows as a number. What is NOT
              anywhere else is the track the DOCUMENT named, which is worth
              seeing precisely when it stops matching the מסלול on the row. So
              that is the line; `title` still carries the document's own wording
              in full, including the lender's legal name, so nothing was lost. */}
          <footer className="lgr-sheet-foot" title={source || undefined}>
            {loan.source_track ? <>מהדוח · {loan.source_track}</> : "נוספה ידנית"}
          </footer>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

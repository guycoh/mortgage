"use client";

// גרייס — the two month counts nobody touches on a normal day. They
// used to live in an expander tray that pushed every row below it down the page.
// Now they open in a small sheet anchored to the row's own settings icon, so the
// grid never reflows.
//
// עוגן, תוספת and תדירות שינוי used to be here too. All three moved to the grid
// once both document types started filling them on import: a field that arrives
// with data in it is not a field you go hunting for, and one value editable in two
// places is one value too many. The anchor's NAME never made it onto the grid —
// it is words, and the עוגן column is numeric — so it stays as provenance in the
// footer below.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Sliders, X } from "@phosphor-icons/react";
import { FAMILY, PATH_LABEL, type ImportedLoan } from "../lib/credit";
import { lenderOf } from "../lib/lenders";

const W = 348;
// Measured, then rounded up for the two-line provenance footer a long lender
// name produces. Only decides whether the sheet opens above or below the icon,
// so erring high just flips it upward a little sooner.
const H = 240;

export default function RowSettings({
  loan,
  anchorRect,
  dirty,
  onPatch,
  onClose,
}: {
  loan: ImportedLoan;
  /** Where the row's settings icon is, in viewport coordinates. */
  anchorRect: DOMRect;
  dirty: Set<string>;
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
   * What the two numbers add up to, in words, under the fields.
   *
   * The sheet asks for months and the row is priced in months, but the thing an
   * advisor is actually deciding is a sequence — and a sequence of three phases
   * is exactly the kind of thing two number boxes fail to show. Saying it back
   * also surfaces the clamp: ask for more grace than the term holds and the
   * sentence reports what was actually used, rather than the row quietly
   * amortising over a month you did not intend.
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
    if (!full && !partial) return "ללא גרייס — הקרן מופחתת מהחודש הראשון.";
    const phases: string[] = [];
    if (full) phases.push(`${full} ח׳ ללא תשלום (הריבית נצברת לקרן)`);
    if (partial) phases.push(`${partial} ח׳ ריבית בלבד`);
    const left = months - full - partial;
    phases.push(`${left} ח׳ הפחתת קרן`);
    const asked = Math.max(Math.floor(Number(fullRaw) || 0), 0) + Math.max(Math.floor(Number(partialRaw) || 0), 0);
    const clamped = asked > full + partial;
    return phases.join(" · ") + (clamped ? " — קוצר לתקופת ההלוואה" : "");
  };

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
          <p className="lgr-sheet-note">
            {graceNote(loan.grace_full_months, loan.grace_partial_months, loan.months)}
          </p>

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
              <span className="lgr-switch-text">
                הלקוח ערב לחוב הזה
                <em>
                  {loan.is_guarantor
                    ? "מוצג בנפרד ואינו נכלל בסיכומי התמהיל"
                    : "החוב נספר כשלו — בסיכומים, בגרפים ובייצוא"}
                </em>
              </span>
            </label>
          </div>

          {/* The grid's גוף מימון column prints the lender SHORT. This is the one
              place with room for the name the document actually used, so it is
              the one place that prints it in full — a provenance footer that
              paraphrases its source is not provenance. */}
          <footer className="lgr-sheet-foot">
            {loan.source_track ? (
              <>
                מהדוח: {loan.source_type} · {loan.source_track}
                {loan.source_anchor ? ` · ${loan.source_anchor}` : ""}
                {loan.source_bank ? ` · ${lenderOf(loan.source_bank).full}` : ""}
              </>
            ) : (
              "שורה שנוספה ידנית — אין לה מקור בדוח."
            )}
          </footer>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

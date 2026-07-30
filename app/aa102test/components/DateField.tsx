"use client";

// The תאריך סיום control, rebuilt from scratch.
//
// react-datepicker was doing three things wrong here: it rendered raw OS
// <select> elements for month and year (the only un-styled controls left on the
// sheet), it laid the week grid out against the page's RTL direction, and its
// year list was a fixed decade window that could not reach a 25-year mortgage.
//
// This one is a real listbox-and-grid: portalled so no table overflow clips it,
// month and year on the project's own Select, a year range that spans every
// realistic term, Hebrew month and weekday names, Sunday-first, and free typing
// of dd/mm/yyyy straight into the well.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { CalendarBlank, CaretLeft, CaretRight, X } from "@phosphor-icons/react";
import Select from "./Select";
import {
  HE_DOW,
  HE_MONTHS,
  fmtDate,
  monthGrid,
  parseDate,
  sameDay,
  startOfToday,
  yearRange,
} from "../lib/dates";

const POP_W = 264;
const POP_H = 336;

export default function DateField({
  value,
  onChange,
  ariaLabel = "תאריך סיום",
  state,
  hint,
}: {
  value?: string | null;
  onChange: (iso: string | null) => void;
  ariaLabel?: string;
  /** Mirrors the well states used across the grid. */
  state?: "warn" | "err";
  /** Quiet line under the calendar, e.g. the derived term. */
  hint?: string;
}) {
  const selected = parseDate(value);
  const today = startOfToday();

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [view, setView] = useState(() => selected ?? today);
  /** What the user is currently typing; null means "show the committed value". */
  const [draft, setDraft] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // follow the row's value when it changes from outside (an import, a term edit)
  useEffect(() => {
    if (selected) setView(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const place = () => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r) return;
    const up = r.bottom + POP_H + 8 > window.innerHeight && r.top - POP_H - 8 > 0;
    const left = Math.min(Math.max(8, r.right - POP_W), window.innerWidth - POP_W - 8);
    setPos({ top: up ? Math.max(8, r.top - POP_H - 4) : r.bottom + 4, left });
  };

  useLayoutEffect(() => {
    if (open) place();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (wrapRef.current?.contains(e.target as Node)) return;
      if (popRef.current?.contains(e.target as Node)) return;
      // the month/year listboxes portal outside the calendar — keep it open
      if ((e.target as HTMLElement)?.closest?.(".lgr-pop")) return;
      setOpen(false);
    };
    const onScroll = (e: Event) => {
      if (popRef.current?.contains(e.target as Node)) return;
      // Opening the month/year listbox scrolls its own popover to the selected
      // option. That scroll used to bubble up here and close the calendar out
      // from under the user before they could pick a year.
      const t = e.target as HTMLElement | Document;
      if (t instanceof HTMLElement && t.closest?.(".lgr-pop")) return;
      setOpen(false);
    };
    const onResize = () => setOpen(false);
    window.addEventListener("pointerdown", onPointer, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("pointerdown", onPointer, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const pick = (d: Date) => {
    onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    setDraft(null);
    setOpen(false);
    inputRef.current?.focus();
  };

  /** Commit whatever was typed, if it parses; otherwise fall back to the value. */
  const commitDraft = () => {
    if (draft === null) return;
    const t = draft.trim();
    if (!t) {
      onChange(null);
    } else {
      const d = parseDate(t);
      if (d) {
        onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
        setView(d);
      }
    }
    setDraft(null);
  };

  const shown = draft !== null ? draft : selected ? fmtDate(selected) : "";
  const years = yearRange(view.getFullYear());
  const cells = monthGrid(view.getFullYear(), view.getMonth());
  const shiftMonth = (by: number) => setView((v) => new Date(v.getFullYear(), v.getMonth() + by, 1));

  return (
    <div ref={wrapRef} className="lgr-well relative" data-dirty={undefined}>
      <input
        ref={inputRef}
        // The `pe-7` that used to be here never did anything: Tailwind v4 puts
        // its utilities in a cascade layer, and theme.css is unlayered, so
        // `.lgr-cell { padding: 0 9px }` beat it outright. The breathing room is
        // a real rule now — see .lgr-date-in.
        className="lgr-cell lgr-date-in"
        data-text={draft === null && !selected ? "true" : undefined}
        data-state={state}
        value={shown}
        placeholder="בחר תאריך"
        aria-label={ariaLabel}
        inputMode="numeric"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitDraft}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitDraft();
            setOpen(false);
          } else if (e.key === "Escape") {
            setDraft(null);
            setOpen(false);
          } else if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
      />
      <button
        type="button"
        className="lgr-date-btn absolute inset-y-0 end-1 my-auto grid place-items-center rounded text-[var(--lgr-4)] transition-colors hover:text-[var(--lgr-2)]"
        aria-label={open ? "סגירת לוח שנה" : "פתיחת לוח שנה"}
        tabIndex={-1}
        onClick={() => {
          setOpen((o) => !o);
          if (!open) inputRef.current?.focus();
        }}
      >
        <CalendarBlank size={13} weight={selected ? "fill" : "regular"} />
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && pos && (
              <motion.div
                ref={popRef}
                dir="rtl"
                className="lgr-pop lgr-cal lgr-vars"
                style={{ top: pos.top, left: pos.left, width: POP_W }}
                initial={{ opacity: 0, y: -5, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.985 }}
                transition={{ duration: 0.13, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="lgr-cal-head">
                  {/* RTL: the "previous month" affordance points right */}
                  <button className="lgr-cal-nav" onClick={() => shiftMonth(-1)} aria-label="חודש קודם" type="button">
                    <CaretRight size={13} weight="bold" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <Select
                      value={view.getMonth()}
                      onChange={(v) => setView(new Date(view.getFullYear(), Number(v), 1))}
                      options={HE_MONTHS.map((m, i) => ({ value: i, label: m }))}
                      ariaLabel="חודש"
                      minWidth={120}
                      style={{ height: 27, fontSize: 12.5 }}
                    />
                  </div>
                  <div style={{ width: 78 }}>
                    <Select
                      value={view.getFullYear()}
                      onChange={(v) => setView(new Date(Number(v), view.getMonth(), 1))}
                      options={years.map((y) => ({ value: y, label: String(y) }))}
                      ariaLabel="שנה"
                      minWidth={94}
                      style={{ height: 27, fontSize: 12.5 }}
                    />
                  </div>
                  <button className="lgr-cal-nav" onClick={() => shiftMonth(1)} aria-label="חודש הבא" type="button">
                    <CaretLeft size={13} weight="bold" />
                  </button>
                </div>

                <div className="lgr-cal-grid">
                  {HE_DOW.map((d) => (
                    <div key={d} className="lgr-cal-dow">
                      {d}
                    </div>
                  ))}
                  {cells.map(({ date, out }) => (
                    <button
                      key={date.toISOString()}
                      type="button"
                      className="lgr-cal-day"
                      data-out={out || undefined}
                      data-today={sameDay(date, today) || undefined}
                      data-on={(selected && sameDay(date, selected)) || undefined}
                      onClick={() => pick(date)}
                    >
                      {date.getDate()}
                    </button>
                  ))}
                </div>

                <div className="lgr-cal-foot">
                  <button className="lgr-btn lgr-btn-sm" type="button" onClick={() => pick(today)}>
                    היום
                  </button>
                  <button
                    className="lgr-btn lgr-btn-sm"
                    type="button"
                    onClick={() => {
                      onChange(null);
                      setDraft(null);
                      setOpen(false);
                    }}
                  >
                    <X size={12} weight="bold" />
                    נקה
                  </button>
                  <span className="lgr-cal-hint">{hint ?? "אפשר גם להקליד dd/mm/yyyy"}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}

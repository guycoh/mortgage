"use client";

// Custom listbox replacing every native <select> on the sheet — the one control
// the OS was still drawing for us. The trigger is an ordinary well, so it reads
// as editable like everything else; the menu is portalled to <body> with fixed
// positioning so table overflow can never clip it.
// Keyboard: Enter/Space/arrows open, arrows move, Home/End jump, Enter picks,
// Esc closes.

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { CaretDown, Check } from "@phosphor-icons/react";
import { settle } from "../lib/transitions";

export type Opt = {
  value: number | string;
  label: string;
  /** Swatch shown before the label (track colours). */
  dot?: string;
  /** Glyph shown before the label, in place of a swatch (debt families). */
  icon?: ReactNode;
  /** Colour the option carries into the list, so the menu looks like the row. */
  tone?: string;
  /** Quiet trailing text, e.g. a code or a count. */
  note?: string;
};

export default function Select({
  value,
  options,
  onChange,
  variant = "cell",
  placeholder = "בחר…",
  ariaLabel,
  className,
  style,
  minWidth = 176,
}: {
  value: number | string | null;
  options: Opt[];
  onChange: (value: number | string) => void;
  /** "cell" matches the grid wells, "input" the toolbar controls, "chip" the
   *  family badge that sits inside a row. */
  variant?: "cell" | "input" | "chip";
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  style?: React.CSSProperties;
  minWidth?: number;
}) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const current = options.find((o) => o.value === value) ?? null;

  const place = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.max(r.width, minWidth);
    const estH = Math.min(276, options.length * 35 + 10);
    // open upward when there is no room below but there is above
    const up = r.bottom + estH + 8 > window.innerHeight && r.top - estH - 8 > 0;
    const left = Math.min(Math.max(8, r.right - width), window.innerWidth - width - 8);
    setPos({ top: up ? Math.max(8, r.top - estH - 4) : r.bottom + 4, left, width });
  };

  const openPop = () => {
    place();
    const idx = options.findIndex((o) => o.value === value);
    setHi(idx >= 0 ? idx : 0);
    setOpen(true);
  };

  useLayoutEffect(() => {
    if (open) place();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Close on outside press, on scroll (except inside the list) and on resize.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (btnRef.current?.contains(e.target as Node)) return;
      if (popRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onScroll = (e: Event) => {
      if (popRef.current?.contains(e.target as Node)) return;
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

  // keep the highlighted option in view when arrowing through a long list
  useEffect(() => {
    if (!open) return;
    popRef.current?.querySelector<HTMLElement>(`[data-idx="${hi}"]`)?.scrollIntoView({ block: "nearest" });
  }, [hi, open]);

  const onKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        openPop();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((h) => Math.min(options.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((h) => Math.max(0, h - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setHi(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setHi(options.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const o = options[hi];
      if (o) onChange(o.value);
      setOpen(false);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={`${
          variant === "input" ? "lgr-input" : variant === "chip" ? "lgr-fam-sel" : "lgr-cell"
        } lgr-sel-btn${className ? ` ${className}` : ""}`}
        style={style}
        data-text="true"
        data-open={open}
        data-empty={!current}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => (open ? setOpen(false) : openPop())}
        onKeyDown={onKey}
      >
        {current?.icon}
        {current?.dot && <span className="lgr-dot" style={{ background: current.dot }} />}
        <span className="truncate">{current ? current.label : placeholder}</span>
        <CaretDown size={12} weight="bold" className="lgr-sel-caret" />
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && pos && (
              <motion.div
                ref={popRef}
                dir="rtl"
                role="listbox"
                aria-label={ariaLabel}
                className="lgr-pop lgr-scroll lgr-vars"
                // grows from the trigger's own top-start corner, so the menu
                // reads as coming out of the control rather than arriving at it
                style={{ top: pos.top, left: pos.left, minWidth: pos.width, maxHeight: 276, transformOrigin: "top right" }}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.1 } }}
                transition={settle}
              >
                {options.map((o, i) => (
                  <button
                    key={String(o.value)}
                    type="button"
                    role="option"
                    data-idx={i}
                    aria-selected={o.value === value}
                    className="lgr-sel-item"
                    style={o.tone ? ({ "--tone": o.tone } as React.CSSProperties) : undefined}
                    data-hi={i === hi || undefined}
                    data-on={o.value === value || undefined}
                    onMouseEnter={() => setHi(i)}
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                      btnRef.current?.focus();
                    }}
                  >
                    {o.icon}
                    {o.dot && <span className="lgr-dot" style={{ background: o.dot }} />}
                    <span className="truncate">{o.label}</span>
                    {o.note && <span className="lgr-sel-note">{o.note}</span>}
                    {o.value === value && (
                      <Check size={13} weight="bold" className={o.note ? "lgr-sel-check !ms-1.5" : "lgr-sel-check"} />
                    )}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}

"use client";

// The five fields nobody touches on a normal day — עוגן, מרווח מהעוגן, תדירות
// שינוי, גרייס and חודשי גרייס. They used to live in an expander tray that
// pushed every row below it down the page. Now they open in a small sheet
// anchored to the row's own settings icon, so the grid never reflows.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Sliders, X } from "@phosphor-icons/react";
import { graceTypes } from "@/app/data/graceTypes";
import Select from "./Select";
import { FAMILY, PATH_LABEL, type ImportedLoan } from "../lib/credit";

const W = 348;
const H = 250;

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
      // the grace listbox portals outside this sheet
      if ((e.target as HTMLElement)?.closest?.(".fin-pop")) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onScroll = (e: Event) => {
      const t = e.target as HTMLElement | Document;
      if (t instanceof HTMLElement && t.closest?.(".fin-pop")) return;
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

  const field = (
    label: string,
    key: "anchor" | "anchor_margin" | "change_frequency" | "grace_months",
    type: "text" | "number",
    placeholder?: string
  ) => (
    <label className="flex flex-col gap-1">
      <span className="fin-label">{label}</span>
      <div className="fin-well" data-dirty={dirty.has(key) || undefined}>
        <input
          className={`fin-cell ${type === "number" ? "fin-num-in" : ""}`}
          data-text={type === "text" ? "true" : undefined}
          type={type}
          min={type === "number" ? 0 : undefined}
          placeholder={placeholder}
          value={(loan[key] as string | number) ?? ""}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) =>
            onPatch({
              [key]: type === "number" ? Number(e.target.value) || 0 : e.target.value,
            } as Partial<ImportedLoan>)
          }
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
          className="fin-pop fin-sheet fin-vars"
          style={{ top: pos.top, left: pos.left, width: W }}
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.985 }}
          transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
        >
          <header className="fin-sheet-head">
            <Sliders size={14} style={{ color: "var(--ink-3)" }} />
            <h3 className="fin-title" style={{ fontSize: 12.5 }}>
              שדות נוספים
            </h3>
            <span
              className="fin-chip !h-[20px] !px-1.5 !text-[10.5px]"
              style={{ borderColor: fam.line, background: fam.tint, color: fam.color }}
            >
              {fam.label}
            </span>
            <span className="text-[10.5px]" style={{ color: "var(--ink-4)" }}>
              {PATH_LABEL[loan.path_id]}
            </span>
            <button className="fin-act ms-auto !h-6 !w-6" onClick={onClose} aria-label="סגירה">
              <X size={13} weight="bold" />
            </button>
          </header>

          <div className="fin-sheet-body">
            {field("עוגן", "anchor", "number", "0")}
            {field("מרווח מהעוגן", "anchor_margin", "number", "0")}
            {field("תדירות שינוי", "change_frequency", "text", "—")}
            <label className="flex flex-col gap-1">
              <span className="fin-label">גרייס</span>
              <div className="fin-well" data-dirty={dirty.has("grace_type_id") || undefined}>
                <Select
                  value={loan.grace_type_id ?? 1}
                  onChange={(v) => onPatch({ grace_type_id: Number(v) })}
                  options={graceTypes.map((gt) => ({ value: gt.id, label: gt.name }))}
                  ariaLabel="סוג גרייס"
                  minWidth={150}
                />
              </div>
            </label>
            {field("חודשי גרייס", "grace_months", "number", "0")}
          </div>

          <footer className="fin-sheet-foot">
            {loan.source_track ? (
              <>
                מהדוח: {loan.source_type} · {loan.source_track}
                {loan.source_bank ? ` · ${loan.source_bank.replace(/בע"?מ|בנק/g, "").trim()}` : ""}
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

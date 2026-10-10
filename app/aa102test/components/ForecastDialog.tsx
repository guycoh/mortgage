"use client";

// תחזית ריבית ואינפלציה — choose the curves the board prices the future on.
//
// The Bank of Israel rebuild is the default and updates itself. Saved curves —
// SmartNPV's own, or any pasted pair of vectors — sit beside it as
// alternatives, each with the four numbers that tell them apart at a glance:
// where the BoI rate goes in a year and in five, and what CPI does in the first
// year and in the long run. Choosing one reprices לוח סילוקין מאוחד, the charts
// and השוואת תמהילים at once; the grid keeps pricing what is typed.
//
// Below the list, the admin paste-in that adds a curve.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { Check, X } from "@phosphor-icons/react";
import Btn from "./Btn";
import { inflationAt, nominalAt, type Forecast } from "../lib/forecast";

export type ForecastState = {
  forecast: Forecast | null;
  boi: Forecast | null;
  saved: Forecast[];
};

const pct = (v: number) => `${v.toFixed(2)}%`;
/** CPI over the coming twelve months — the twelve monthly factors, compounded. */
const firstYearInflation = (f: Forecast) => {
  let g = 1;
  for (let m = 1; m <= 12; m++) g *= Math.pow(1 + inflationAt(f, m) / 100, 1 / 12);
  return (g - 1) * 100;
};

function SourceCard({
  f,
  hint,
  selected,
  onSelect,
}: {
  f: Forecast;
  hint: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button type="button" role="radio" className="lgr-fc-src" aria-checked={selected} onClick={onSelect}>
      <span className="lgr-fc-src-head">
        <span className="lgr-fc-src-dot">{selected && <Check size={10} weight="bold" />}</span>
        <b>{f.label}</b>
        <em>{hint}</em>
      </span>
      <span className="lgr-fc-src-figs">
        <span>
          <i>ריבית ב״י בעוד שנה</i>
          {pct(nominalAt(f, 12))}
        </span>
        <span>
          <i>בעוד 5 שנים</i>
          {pct(nominalAt(f, 60))}
        </span>
        <span>
          <i>אינפלציה בשנה 1</i>
          {pct(firstYearInflation(f))}
        </span>
        <span>
          <i>לטווח ארוך</i>
          {pct(inflationAt(f, 360))}
        </span>
      </span>
    </button>
  );
}

export default function ForecastDialog({
  state,
  selected,
  onSelect,
  onClose,
  onSaved,
}: {
  state: ForecastState;
  /** Label of the chosen saved curve; null = the BoI rebuild. */
  selected: string | null;
  onSelect: (label: string | null) => void;
  onClose: () => void;
  onSaved: (label?: string) => void;
}) {
  const [raw, setRaw] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const chosenSaved = selected !== null && state.saved.some((s) => s.label === selected);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const post = async (body: unknown, then: () => void) => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/simulator/forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error || "השמירה נכשלה");
      then();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "השמירה נכשלה");
    } finally {
      setBusy(false);
    }
  };

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
        aria-labelledby="lgr-fc-title"
        initial={{ opacity: 0, y: 10, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="lgr-card lgr-ask lgr-fc"
        style={{ boxShadow: "var(--shadow-lift)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="lgr-head lgr-ask-head">
          <div className="min-w-0">
            <h2 id="lgr-fc-title" className="lgr-title">
              תחזית ריבית ואינפלציה
            </h2>
            <div className="lgr-sub lgr-ask-sub">לוח סילוקין מאוחד, הגרפים והשוואת התמהילים מחושבים לפיה</div>
          </div>
          <button className="lgr-act ms-auto" onClick={onClose} aria-label="סגירה">
            <X size={15} weight="bold" />
          </button>
        </header>

        <div className="lgr-ask-body">
          <div className="lgr-fc-list" role="radiogroup" aria-label="מקור התחזית">
            {state.boi && (
              <SourceCard f={state.boi} hint="מתעדכנת אוטומטית" selected={!chosenSaved} onSelect={() => onSelect(null)} />
            )}
            {state.saved.map((f) => (
              <SourceCard
                key={f.label}
                f={f}
                hint={`נשמרה ${f.asOf.split("-").reverse().join("/")}`}
                selected={selected === f.label}
                onSelect={() => onSelect(f.label)}
              />
            ))}
            {!state.boi && !state.saved.length && (
              <p className="lgr-ask-q">אין תחזית זמינה — הלוח מחושב באינפלציה קבועה.</p>
            )}
          </div>

          <details className="lgr-fc-admin">
            <summary>הוספת תחזית (מנהל)</summary>
            <textarea
              className="lgr-fc-raw"
              dir="ltr"
              rows={4}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder='{"nominal":[…360], "inflation":[…360]}'
              aria-label="וקטורי התחזית"
            />
            <div className="lgr-fc-row">
              <input
                className="lgr-fc-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="שם המקור, למשל SmartNPV · 15/10/26"
                aria-label="שם המקור"
              />
              <Btn
                className="lgr-btn lgr-btn-sm lgr-btn-primary"
                disabled={busy || !raw.trim() || !label.trim()}
                onClick={() =>
                  post({ raw, label: label.trim(), asOf: new Date().toISOString().slice(0, 10) }, () => onSaved(label.trim()))
                }
              >
                שמירה
              </Btn>
            </div>
            {chosenSaved && (
              <Btn
                className="lgr-btn lgr-btn-sm"
                disabled={busy}
                onClick={() =>
                  post({ clear: true, label: selected }, () => {
                    onSelect(null);
                    onSaved();
                  })
                }
              >
                הסרת {selected}
              </Btn>
            )}
            {err && <p className="lgr-fc-err">{err}</p>}
          </details>
        </div>

        <div className="lgr-ask-acts">
          <Btn className="lgr-btn lgr-btn-sm lgr-btn-primary" onClick={onClose}>
            סיום
          </Btn>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

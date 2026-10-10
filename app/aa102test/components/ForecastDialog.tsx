"use client";

// תחזית ריבית ואינפלציה — what the board is pricing on, and the one way to change it.
//
// A receipt, in the board's small-dialog skin (.lgr-ask): where the curves come
// from, the month they describe, and the four numbers an advisor would quote a
// client — the BoI rate a year and five years out, CPI in the first year and in
// the long run. Everything the forecast moves on the board follows from these.
//
// Below it, the override: an exact pair of vectors pasted by an admin, for when
// a figure has to match another system to the shekel. Saving needs the console
// session; the route says so in Hebrew if it is missing.

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { X } from "@phosphor-icons/react";
import Btn from "./Btn";
import { inflationAt, nominalAt, type Forecast } from "../lib/forecast";

export type ForecastState = {
  forecast: Forecast | null;
  boi: Forecast | null;
  override: Forecast | null;
};

const pct = (v: number) => `${v.toFixed(2)}%`;
/** CPI over the coming twelve months — the twelve monthly factors, compounded. */
const firstYearInflation = (f: Forecast) => {
  let g = 1;
  for (let m = 1; m <= 12; m++) g *= Math.pow(1 + inflationAt(f, m) / 100, 1 / 12);
  return (g - 1) * 100;
};
/** The BoI rate the curve implies at month m — compounded over the year that ends there. */
const boiRateAt = (f: Forecast, m: number) => nominalAt(f, m);

export default function ForecastDialog({
  state,
  onClose,
  onSaved,
}: {
  state: ForecastState;
  onClose: () => void;
  onSaved: () => void;
}) {
  const f = state.forecast;
  const [raw, setRaw] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const rows = useMemo(() => {
    if (!f) return [];
    return [
      { label: "מקור", value: f.source === "override" ? `${f.label} (הוזן ידנית)` : "עקומי האפס של בנק ישראל" },
      { label: "נתונים נכון ל־", value: f.asOf.split("-").slice(0, 2).reverse().join("/") },
      { label: "ריבית בנק ישראל בעוד שנה", value: pct(boiRateAt(f, 12)) },
      { label: "ריבית בנק ישראל בעוד 5 שנים", value: pct(boiRateAt(f, 60)) },
      { label: "אינפלציה צפויה בשנה הראשונה", value: pct(firstYearInflation(f)) },
      { label: "אינפלציה לטווח ארוך", value: pct(inflationAt(f, 360)) },
    ];
  }, [f]);

  const post = async (body: unknown) => {
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
      onSaved();
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
            <div className="lgr-sub lgr-ask-sub">לפי הוראה 451 — עוגנים, פריים ומדד לאורך חיי ההלוואה</div>
          </div>
          <button className="lgr-act ms-auto" onClick={onClose} aria-label="סגירה">
            <X size={15} weight="bold" />
          </button>
        </header>

        <div className="lgr-ask-body">
          {f ? (
            <dl className="lgr-ask-sheet">
              {rows.map((r) => (
                <div className="lgr-ask-line" key={r.label}>
                  <dt>{r.label}</dt>
                  <dd className="lgr-ask-v">{r.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="lgr-ask-q">התחזית לא נטענה — הלוח מחושב באינפלציה קבועה.</p>
          )}

          <details className="lgr-fc-admin">
            <summary>הזנת תחזית ידנית (מנהל)</summary>
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
                placeholder="שם המקור, למשל SmartNPV 01/10/26"
                aria-label="שם המקור"
              />
              <Btn
                className="lgr-btn lgr-btn-sm lgr-btn-primary"
                disabled={busy || !raw.trim() || !label.trim()}
                onClick={() => post({ raw, label: label.trim(), asOf: new Date().toISOString().slice(0, 10) })}
              >
                שמירה
              </Btn>
            </div>
            {state.override && (
              <Btn className="lgr-btn lgr-btn-sm" disabled={busy} onClick={() => post({ clear: true })}>
                חזרה לתחזית בנק ישראל
              </Btn>
            )}
            {err && <p className="lgr-fc-err">{err}</p>}
          </details>
        </div>

        <div className="lgr-ask-acts">
          <Btn className="lgr-btn lgr-btn-sm" onClick={onClose}>
            סגירה
          </Btn>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

"use client";

// The full record of one sitting.
//
// The activity axis answers who/which/when at a glance; this answers "and then
// what exactly happened", as a thread you read top to bottom. It is the only
// place in the console where a single event is shown on its own line.

import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import type { Visit } from "../aggregate";
import { OUTCOME } from "../lib/tokens";
import { duration, num } from "../lib/labels";
import { stamp, zoned } from "../lib/time";
import { Badge } from "./kit";
import { Who } from "./parts";

export default function VisitDrawer({
  visit,
  onClose,
}: {
  visit: Visit | null;
  onClose: () => void;
}) {
  // Escape closes, and the page behind stops scrolling while it is open.
  useEffect(() => {
    if (!visit) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [visit, onClose]);

  return (
    <AnimatePresence>
      {visit ? (
        <>
          <motion.div
            className="cns-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.aside
            className="cns-drawer"
            dir="rtl"
            role="dialog"
            aria-label="פרטי ביקור"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 40 }}
          >
            <header className="cns-drawer-head">
              <button className="cns-drawer-close" onClick={onClose} aria-label="סגירה">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
              <div style={{ fontSize: 11, color: "var(--ink-4)", fontFamily: "var(--mono)", letterSpacing: ".1em" }}>
                {zoned(visit.start).dm}
              </div>
              <h2 style={{ fontSize: 19, margin: "2px 0 8px" }}>{visit.lead}</h2>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <Who name={visit.operator} />
                <Badge
                  variant={
                    visit.outcome === "failed"
                      ? "bad"
                      : visit.outcome === "saved"
                        ? "good"
                        : "secondary"
                  }
                >
                  {OUTCOME[visit.outcome].label}
                </Badge>
              </div>
            </header>

            <div className="cns-drawer-body">
              <dl className="cns-def">
                <dt>מזהה ליד</dt>
                <dd className="num">{visit.leadId ?? "—"}</dd>
                <dt>זמן</dt>
                <dd className="num">
                  {stamp(visit.start)} — {zoned(visit.end).hm}
                </dd>
                <dt>משך</dt>
                <dd>{duration(visit.minutes)}</dd>
                {visit.clients.length ? (
                  <>
                    <dt>לקוח בדוח</dt>
                    <dd>{visit.clients.join(" · ")}</dd>
                  </>
                ) : null}
                {visit.files.length ? (
                  <>
                    <dt>קבצים</dt>
                    <dd style={{ direction: "ltr", textAlign: "right", wordBreak: "break-all", fontSize: 11.5 }}>
                      {visit.files.join(" · ")}
                    </dd>
                  </>
                ) : null}
                <dt>ייבואים</dt>
                <dd className="num">{num(visit.imports)}</dd>
                <dt>שמירות</dt>
                <dd className="num">{num(visit.saves)}</dd>
                {visit.errors ? (
                  <>
                    <dt>כשלים</dt>
                    <dd className="num" style={{ color: "var(--bad)" }}>
                      {num(visit.errors)}
                    </dd>
                  </>
                ) : null}
              </dl>

              <div>
                <div
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 9.5,
                    letterSpacing: ".14em",
                    textTransform: "uppercase",
                    color: "var(--ink-4)",
                    marginBottom: 10,
                  }}
                >
                  מהלך הביקור
                </div>
                <div className="cns-thread">
                  {visit.trail.map((t, i) => (
                    <div className="cns-thread-row" key={i}>
                      <div className="cns-thread-rail" data-bad={!t.ok || undefined}>
                        <i />
                      </div>
                      <div className="cns-thread-body">
                        <b>{t.label}</b>
                        <span>
                          {zoned(t.ts).hm}
                          {t.detail ? ` · ${t.detail}` : ""}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

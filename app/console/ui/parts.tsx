"use client";

// The small pieces every screen is assembled from.

import NumberFlow from "@number-flow/react";
import { motion } from "motion/react";
import { chipColor, initials } from "../lib/labels";

/* ------------------------------------------------------------------ card */

export function Card({
  title,
  hint,
  tools,
  flush,
  children,
}: {
  title?: string;
  hint?: string;
  tools?: React.ReactNode;
  /** Tables run edge to edge; charts and prose keep the padding. */
  flush?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="cns-card" data-flush={flush || undefined}>
      {title ? (
        <header className="cns-card-head">
          <h2>{title}</h2>
          {hint ? <p>{hint}</p> : null}
          {tools ? <div className="cns-card-head-tools">{tools}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ stat */

export function Stat({
  label,
  value,
  hint,
  tone,
  accent,
  suffix,
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: "good" | "bad";
  /** A hairline of series colour along the top edge. */
  accent?: string;
  suffix?: string;
}) {
  return (
    <div className="cns-stat" style={accent ? ({ "--tone": accent } as React.CSSProperties) : undefined}>
      <span className="cns-stat-label">{label}</span>
      <span className="cns-stat-value" data-tone={tone}>
        {/* A unit belongs after its number — "10%", not "%10". The pair is
            isolated as an LTR inline box so the RTL tile around it keeps its
            own alignment while the number keeps its unit. */}
        <span dir="ltr" style={{ display: "inline-block" }}>
          {typeof value === "number" ? (
            // Figures count up on arrival and roll when the range changes, so
            // a number that moved is visibly a number that moved.
            <NumberFlow value={value} locales="he-IL" />
          ) : (
            value
          )}
          {suffix ? (
            <em style={{ fontStyle: "normal", fontSize: "0.6em", color: "var(--ink-3)" }}>
              {suffix}
            </em>
          ) : null}
        </span>
      </span>
      {hint ? <span className="cns-stat-hint">{hint}</span> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ atoms */

export function Pill({
  tone = "mute",
  children,
}: {
  tone?: "good" | "bad" | "warn" | "mute";
  children: React.ReactNode;
}) {
  return (
    <span className="cns-pill" data-tone={tone}>
      {children}
    </span>
  );
}

/** Operator identity: the same monogram and colour everywhere, forever. */
export function Who({ name }: { name: string }) {
  return (
    <span className="cns-who">
      <i className="cns-av" style={{ background: chipColor(name) }} aria-hidden>
        {initials(name)}
      </i>
      <span>{name}</span>
    </span>
  );
}

export function Trail({ steps }: { steps: { label: string; ok: boolean }[] }) {
  return (
    <span className="cns-trail">
      {steps.map((s, i) => (
        <span key={i} className="cns-step" data-bad={!s.ok || undefined}>
          {s.label}
        </span>
      ))}
    </span>
  );
}

/* ----------------------------------------------------------------- empty */

export function Empty({ title, body }: { title?: string; body: string }) {
  return (
    <div className="cns-empty">
      <div className="cns-empty-mark" aria-hidden>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.6-3.6" strokeLinecap="round" />
        </svg>
      </div>
      {title ? <h3>{title}</h3> : null}
      <p>{body}</p>
    </div>
  );
}

/**
 * The first-run screen. The console has just been wired to a table that has
 * never had a row in it, and the honest thing to say is "nothing has happened
 * yet" — not "no data", which reads like a fault.
 */
export function Awaiting({ days }: { days: number }) {
  return (
    <motion.div
      className="cns-await"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="cns-await-scope" aria-hidden>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3" strokeLinecap="round" />
          <circle cx="12" cy="12" r="3.4" />
        </svg>
      </div>
      <h2>המוקד מאזין</h2>
      <p>
        לא נרשמה פעילות ב־{days} הימים האחרונים. מרגע שיועץ ייכנס לבורד דרך
        פיירברי, כל כניסה, ייבוא דוח, ניתוח ושמירה יופיעו כאן תוך שניות — בלי
        לרענן ידנית מעבר לטעינה הבאה.
      </p>
      <div className="cns-await-list">
        {["כניסה מפיירברי", "ייבוא דוח", "ניתוח", "שמירת תמהיל"].map((t) => (
          <span key={t} className="cns-step">
            {t}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

/* ----------------------------------------------------------------- misc */

/** A view's entrance: content rises a few pixels once, and never again. */
export function ViewFade({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <motion.div
      key={k}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      {children}
    </motion.div>
  );
}

export function Legend({
  items,
  hidden,
  onToggle,
}: {
  /** `shape` mirrors the mark on the chart, so the key is a real key. */
  items: { key: string; label: string; color: string; shape?: "tick" | "dot" | "diamond" }[];
  hidden?: Set<string>;
  onToggle?: (key: string) => void;
}) {
  return (
    <div className="cns-legend">
      {items.map((it) =>
        onToggle ? (
          <button
            key={it.key}
            type="button"
            onClick={() => onToggle(it.key)}
            data-off={hidden?.has(it.key) || undefined}
            aria-pressed={!hidden?.has(it.key)}
          >
            <i style={{ background: it.color }} data-shape={it.shape} />
            {it.label}
          </button>
        ) : (
          <span key={it.key}>
            <i style={{ background: it.color }} data-shape={it.shape} />
            {it.label}
          </span>
        )
      )}
    </div>
  );
}

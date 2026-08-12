"use client";

// The small pieces every screen is assembled from, on top of the shadcn kit.

import NumberFlow from "@number-flow/react";
import { motion } from "motion/react";
import { Scope, ScopeLive } from "./marks";
import { chipColor, initials } from "../lib/labels";
import { Badge, Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "./kit";

/* ------------------------------------------------------------------ panel */

/** A titled card. `flush` lets a table run edge to edge inside it. */
export function Panel({
  title,
  hint,
  action,
  flush,
  className,
  children,
}: {
  title?: string;
  hint?: string;
  action?: React.ReactNode;
  flush?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={className}>
      {title ? (
        <CardHeader className={flush ? "border-b border-cns-line" : undefined}>
          <div className="flex min-w-0 items-baseline gap-2.5">
            <CardTitle>{title}</CardTitle>
            {hint ? <CardDescription className="truncate">{hint}</CardDescription> : null}
          </div>
          {action ? <CardAction>{action}</CardAction> : null}
        </CardHeader>
      ) : null}
      {flush ? children : <CardContent className={title ? undefined : "pt-4"}>{children}</CardContent>}
    </Card>
  );
}

/* ---------------------------------------------------------------- readout */

/**
 * The figures at the top of a screen, as ONE instrument band rather than a row
 * of identical rounded cards.
 *
 * This is deliberate: four separate cards is the shape every dashboard on the
 * internet has, and it also lies a little — it presents four unrelated objects
 * when what you have is one readout with four dials. A single band divided by
 * hairlines says "these belong together", costs less vertical space, and reads
 * like the header of a report rather than a widget grid.
 */
export function Readout({ children }: { children: React.ReactNode }) {
  return (
    // One row, always: `divide-x` only draws honest gutters when the cells do
    // not wrap, and this panel is a desktop surface.
    <div className="grid auto-cols-fr grid-flow-col divide-x divide-cns-line overflow-hidden rounded-xl border border-cns-line bg-cns-card shadow-[0_1px_2px_rgba(12,22,34,0.04)] rtl:divide-x-reverse">
      {children}
    </div>
  );
}

export function Dial({
  label,
  value,
  hint,
  tone,
  mark,
  suffix,
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: "good" | "bad";
  /** The chart's own mark, so the figure and the glyph agree. */
  mark?: React.ReactNode;
  suffix?: string;
}) {
  return (
    <div className="group flex flex-col gap-1 px-4 py-3.5 transition-colors hover:bg-cns-muted/50">
      <span className="flex items-center gap-1.5 font-[family-name:var(--cns-mono)] text-[10px] tracking-[0.07em] text-cns-mutedfg uppercase">
        {mark}
        {label}
      </span>
      <span
        className={
          "text-[27px] leading-[1] font-semibold tracking-[-0.035em] " +
          (tone === "bad" ? "text-cns-bad" : tone === "good" ? "text-cns-good" : "text-cns-fg")
        }
      >
        {/* A unit belongs after its number — "10%", not "%10" — so the pair is
            isolated as an LTR inline box inside the RTL band. */}
        <span dir="ltr" className="inline-block">
          {typeof value === "number" ? <NumberFlow value={value} locales="he-IL" /> : value}
          {suffix ? <em className="text-[0.55em] not-italic text-cns-mutedfg">{suffix}</em> : null}
        </span>
      </span>
      <span className="min-h-[14px] text-[11px] text-cns-mutedfg">{hint ?? ""}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ atoms */

/** Operator identity: the same monogram and colour everywhere, forever. */
export function Who({ name, mono = false }: { name: string; mono?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <i
        aria-hidden
        className="grid size-6 flex-none place-items-center rounded-[7px] text-[10.5px] font-semibold text-white"
        style={{ background: chipColor(name) }}
      >
        {initials(name)}
      </i>
      {mono ? null : <span className="text-cns-fg">{name}</span>}
    </span>
  );
}

export function Trail({ steps }: { steps: { label: string; ok: boolean }[] }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1 whitespace-normal">
      {steps.map((s, i) => (
        <span
          key={i}
          className={
            "cns-step rounded-full border px-2 py-px text-[11px] " +
            (s.ok
              ? "border-cns-line bg-cns-muted text-cns-fg2"
              : "border-cns-bad/25 bg-cns-bad/10 text-cns-bad")
          }
          data-bad={!s.ok || undefined}
        >
          {s.label}
        </span>
      ))}
    </span>
  );
}

/* ----------------------------------------------------------------- empty */

export function Empty({ title, body }: { title?: string; body: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-8">
      <Scope size={18} className="flex-none text-cns-mutedfg/70" />
      <div className="min-w-0">
        {title ? (
          <div className="font-[family-name:var(--cns-mono)] text-[10px] tracking-[0.14em] text-cns-mutedfg uppercase">
            {title}
          </div>
        ) : null}
        <p className="text-[12.5px] leading-relaxed text-cns-mutedfg">{body}</p>
      </div>
    </div>
  );
}

/**
 * Standing by.
 *
 * NOT a centred "no data" card — that shape is the same on every product ever
 * shipped and it reads as a fault. What a control room looks like before
 * traffic is the instrument itself: the lanes ruled, the clock running, the
 * sweep going round, and a plain statement of what it is listening for. The
 * furniture around this panel — the readout, the table, its headers — stays on
 * screen showing zeros, so the empty console is the same console.
 */
export function StandingBy({
  days,
  connected,
  lastEventAt,
}: {
  days: number;
  connected: boolean;
  lastEventAt?: string | null;
}) {
  return (
    <div className="cns-standby relative overflow-hidden rounded-lg border border-cns-line bg-cns-muted/35">
      {/* Lane rules and hour rules: the grid is drawn even with nothing on it,
          the way a plotter leaves its paper ruled. */}
      <div className="cns-standby-grid absolute inset-0" aria-hidden />
      <div className="cns-standby-sweep absolute inset-y-0 w-[38%]" aria-hidden />

      <div className="relative flex items-center gap-5 px-6 py-9">
        <div className="flex-none text-cns-accent">
          <ScopeLive size={54} />
        </div>
        <div className="min-w-0">
          <div className="font-[family-name:var(--cns-mono)] text-[10px] tracking-[0.2em] text-cns-accent uppercase">
            standing by
          </div>
          <h2 className="mt-1 text-[17px] font-semibold text-cns-fg">
            המוקד מחובר ומאזין
          </h2>
          <p className="mt-1 max-w-[440px] text-[12.5px] leading-relaxed text-cns-mutedfg">
            לא נרשמה פעילות ב־{days} הימים האחרונים. הרשומה הראשונה תופיע כאן
            ברגע שיועץ ייכנס לבורד דרך פיירברי.
          </p>
        </div>

        <dl className="ms-auto hidden shrink-0 grid-cols-[auto_auto] gap-x-5 gap-y-1.5 self-center rounded-lg border border-cns-line bg-cns-card/80 px-4 py-3 font-[family-name:var(--cns-mono)] text-[10.5px] backdrop-blur-[2px] lg:grid">
          {[
            ["מקור", connected ? "supabase · live" : "—"],
            ["חלון", `${days}d`],
            ["אירוע אחרון", lastEventAt ? "—" : "none"],
            ["מאזין ל", "import · export · save"],
          ].map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="tracking-[0.12em] text-cns-mutedfg/80 uppercase">{k}</dt>
              <dd className="m-0 text-cns-fg2">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
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
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-3.5"
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
  const swatch = (shape?: string, color?: string) => (
    <i
      aria-hidden
      className="flex-none"
      style={{
        background: color,
        ...(shape === "dot"
          ? { width: 9, height: 9, borderRadius: 99 }
          : shape === "diamond"
            ? { width: 8, height: 8, borderRadius: 1.5, transform: "rotate(45deg)" }
            : shape === "tick"
              ? { width: 4, height: 12, borderRadius: 2 }
              : { width: 9, height: 9, borderRadius: 3 }),
      }}
    />
  );

  return (
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1">
      {items.map((it) => {
        const body = (
          <>
            {swatch(it.shape, it.color)}
            {it.label}
          </>
        );
        return onToggle ? (
          <button
            key={it.key}
            type="button"
            onClick={() => onToggle(it.key)}
            aria-pressed={!hidden?.has(it.key)}
            className={
              "inline-flex items-center gap-1.5 text-[11.5px] text-cns-fg2 transition-opacity " +
              (hidden?.has(it.key) ? "opacity-35" : "")
            }
          >
            {body}
          </button>
        ) : (
          <span key={it.key} className="inline-flex items-center gap-1.5 text-[11.5px] text-cns-fg2">
            {body}
          </span>
        );
      })}
    </div>
  );
}

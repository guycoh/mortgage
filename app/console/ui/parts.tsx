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
      {/* The dial's name, in the UI face at reading size. A tracked 10px
          monospace label over a 27px figure named the figure in a whisper. */}
      <span className="flex items-center gap-1.5 text-[12px] font-medium text-cns-fg2">
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

/**
 * Operator identity: the same monogram and colour everywhere, forever.
 *
 * `source="owner"` marks the one case where the name is NOT the person who sat
 * down — the live Fireberry login could not be read and this is the record's
 * מנהל לקוח standing in. It is called out rather than shown plain because a
 * name in a column headed נציג is a claim about who did the work, and this
 * panel spent its first fortnight quietly making that claim wrongly.
 */
export function Who({
  name,
  mono = false,
  source = "",
}: {
  name: string;
  mono?: boolean;
  source?: "user" | "owner" | "";
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <i
        aria-hidden
        className="grid size-6 flex-none place-items-center rounded-[7px] text-[10.5px] font-semibold text-white"
        style={{ background: chipColor(name) }}
      >
        {initials(name)}
      </i>
      {mono ? null : (
        <span className="inline-flex items-baseline gap-1.5">
          <span className="text-cns-fg">{name}</span>
          {source === "owner" ? (
            <span
              className="rounded border border-cns-line bg-cns-muted px-1 py-px text-[10px] whitespace-nowrap text-cns-mutedfg"
              title="שם בעל הרשומה בפיירברי — לא ניתן היה לזהות את המשתמש המחובר, וייתכן שמי שפתח בפועל הוא מישהו אחר"
            >
              בעל הרשומה
            </span>
          ) : null}
        </span>
      )}
    </span>
  );
}

/**
 * The Fireberry record a session came in from — the way back to the CRM.
 *
 * The URL is only present when the button that opened the session sent it, so
 * this degrades in steps rather than disappearing: a link when we have one, the
 * account id when we only have that, and an em dash when the session predates
 * both. The id is shown either way, because it is what you paste into Fireberry
 * search when the link is missing.
 */
export function RecordLink({ id, url }: { id: string | null; url: string | null }) {
  if (!id && !url) return <>—</>;

  const short = id ? id.slice(0, 8).toUpperCase() : "רשומה";
  const body = (
    <span dir="ltr" className="font-[family-name:var(--cns-mono)] text-[11.5px]">
      {short}
    </span>
  );

  if (!url) return <span title={id ?? undefined}>{body}</span>;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      title={id ?? undefined}
      className="inline-flex items-center gap-1.5 text-cns-accent underline decoration-cns-accent/30 underline-offset-2 hover:decoration-cns-accent"
    >
      {body}
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
        <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
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
          <div className="text-[12px] font-semibold text-cns-fg2">{title}</div>
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
          <h2 className="text-[17px] font-semibold text-cns-fg">
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
              <dt className="text-cns-mutedfg">{k}</dt>
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

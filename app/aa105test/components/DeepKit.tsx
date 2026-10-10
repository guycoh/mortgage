"use client";

// The pieces the two advisor deep-dives are built from — the credit report's
// and the bank letter's. Same reading as the board's analysis modals (findings
// first, every finding pointing at the evidence it was drawn from), set in the
// brief's visual language: one sheet per section, ink text, colour for
// severity and identity only.

import { useEffect, useRef, useState, type ReactNode } from "react";
import NumberFlow from "@number-flow/react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { ArrowLeft, CaretDown } from "@phosphor-icons/react";
import { useStageGo } from "./Stage";

export type Sev = "critical" | "high" | "medium" | "info";
export const SEV_LABEL: Record<Sev, string> = { critical: "קריטי", high: "מהותי", medium: "לתשומת לב", info: "הערה" };

export const ils = (n: number) => Math.round(n).toLocaleString("he-IL");
export const pct = (n: number) => `${Math.round(n * 100)}%`;
export const rate2 = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${n.toFixed(2)}%`);

export function Shekel({ value, heat, className }: { value: number; heat?: "hot" | "warm" | "good"; className?: string }) {
  return (
    <span className={`brf-num ${className ?? ""}`} dir="ltr" data-heat={heat}>
      <span className="brf-cur">₪</span>
      {ils(value)}
    </span>
  );
}

/** A cell that may hold nothing: a dash, never a zero dressed as a fact. */
export const Dash = () => <span className="brf-dash">—</span>;

/* ---------------------------------------------------------------- the band */

export interface Kpi {
  label: string;
  value: number | null;
  kind: "money" | "rate";
  sub?: ReactNode;
  tone?: "neg" | "warn" | "primary";
}

export function Kpis({ items }: { items: Kpi[] }) {
  const reduce = useReducedMotion();
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOn(true), 160);
    return () => clearTimeout(t);
  }, []);
  const timing = {
    spinTiming: { duration: reduce ? 0 : 1300, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
    transformTiming: { duration: reduce ? 0 : 800, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
  };
  return (
    <dl className="brf-kpis">
      {items.map((k) => (
        <div key={k.label} className="brf-kpi" data-tone={k.tone}>
          <dt>{k.label}</dt>
          <dd className="brf-kpi-val">
            {k.value === null ? (
              <Dash />
            ) : k.kind === "money" ? (
              <span className="brf-num" dir="ltr">
                <span className="brf-cur">₪</span>
                <NumberFlow value={on || reduce ? Math.round(k.value) : 0} locales="he-IL" {...timing} />
              </span>
            ) : (
              <span className="brf-num" dir="ltr">
                <NumberFlow value={on || reduce ? k.value : 0} format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} suffix="%" {...timing} />
              </span>
            )}
          </dd>
          {k.sub && <dd className="brf-kpi-sub">{k.sub}</dd>}
        </div>
      ))}
    </dl>
  );
}

/* ----------------------------------------------------------------- sections */

export function Sec({
  id,
  icon,
  title,
  aside,
  lit,
  fold,
  forceOpen,
  children,
}: {
  id: string;
  icon?: ReactNode;
  title: string;
  aside?: ReactNode;
  /** A finding just sent the reader here. */
  lit?: boolean;
  /** Reference material: present, folded behind this label. */
  fold?: string;
  forceOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const shown = !fold || open || !!forceOpen;
  return (
    <section id={id} className="brf-sec" data-lit={lit || undefined}>
      <header className="brf-sec-head">
        {icon && <span className="brf-sec-ico">{icon}</span>}
        <h2 className="brf-sec-title">{title}</h2>
        {aside && <span className="brf-sec-aside">{aside}</span>}
        {fold && (
          <button className="brf-fold" onClick={() => setOpen((o) => !o)} aria-expanded={shown}>
            <CaretDown size={13} weight="bold" style={{ transform: shown ? "rotate(180deg)" : undefined, transition: "transform .18s ease" }} />
            {shown ? "הסתרה" : fold}
          </button>
        )}
      </header>
      {shown && <div className="brf-sec-body">{children}</div>}
    </section>
  );
}

/** A label above a block inside a section. */
export const Sub = ({ children }: { children: ReactNode }) => <h3 className="brf-sub">{children}</h3>;

/* ----------------------------------------------------------------- findings */

export interface FindingItem {
  id: string;
  severity: Sev;
  title: string;
  detail: string;
  amount?: number;
  where?: string[];
  section?: string;
  uids?: string[];
}

export function Findings({
  items,
  onGo,
}: {
  items: FindingItem[];
  /** Light the rows behind a finding; the stage scrolls to them. */
  onGo: (f: FindingItem) => void;
}) {
  const go = useStageGo();
  return (
    <ol className="brf-finds">
      {items.map((f, i) => (
        <FindingRow
          key={f.id}
          f={f}
          i={i}
          onGo={
            f.section
              ? () => {
                  onGo(f);
                  window.setTimeout(() => go(f.section!), 0);
                }
              : undefined
          }
        />
      ))}
    </ol>
  );
}

function FindingRow({ f, i, onGo }: { f: FindingItem; i: number; onGo?: () => void }) {
  const ref = useRef<HTMLLIElement>(null);
  const seen = useInView(ref, { once: true, margin: "0px 0px -6% 0px" });
  const reduce = useReducedMotion();
  return (
    <motion.li
      ref={ref}
      className="brf-find"
      data-tone={f.severity}
      initial={{ opacity: 0, y: reduce ? 0 : 10 }}
      animate={seen ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: reduce ? 0 : 0.45, ease: [0.16, 1, 0.3, 1], delay: reduce ? 0 : Math.min(i, 6) * 0.04 }}
    >
      <span className="brf-find-sev">{SEV_LABEL[f.severity]}</span>
      <div className="brf-find-body">
        <div className="brf-find-head">
          <h3>{f.title}</h3>
          {f.amount !== undefined && f.amount > 0 && <Shekel value={f.amount} className="brf-find-amt" />}
        </div>
        <p>{f.detail}</p>
        {f.where?.length ? (
          <div className="brf-chips">
            {Array.from(new Set(f.where))
              .slice(0, 6)
              .map((w) => (
                <span key={w} className="brf-chip">
                  {w}
                </span>
              ))}
          </div>
        ) : null}
      </div>
      {onGo && (
        <button className="brf-find-go" onClick={onGo}>
          לנתונים
          <ArrowLeft size={13} weight="bold" />
        </button>
      )}
    </motion.li>
  );
}

/** "3 מהותי · 4 לתשומת לב" — the findings' weight at a glance. */
export function SevCounts({ items }: { items: { severity: Sev }[] }) {
  return (
    <span className="brf-sevs">
      {(["critical", "high", "medium", "info"] as Sev[]).map((s) => {
        const n = items.filter((x) => x.severity === s).length;
        return n ? (
          <span key={s} className="brf-sev" data-tone={s}>
            {n} {SEV_LABEL[s]}
          </span>
        ) : null;
      })}
    </span>
  );
}

/* ---------------------------------------------------------------- share bar */

export function Bars({
  parts,
}: {
  parts: { key: string; label: string; amount: number; share: number; color: string; note?: string }[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const shown = parts.filter((p) => p.share > 0);
  if (!shown.length) return null;
  return (
    <div ref={ref} className="brf-bars">
      <div className="brf-bars-track" role="img" aria-label={shown.map((p) => `${p.label} ${pct(p.share)}`).join(", ")}>
        {shown.map((p, i) => (
          <motion.span
            key={p.key}
            style={{ background: p.color }}
            initial={{ flexGrow: 0.0001 }}
            animate={{ flexGrow: seen ? Math.max(p.share, 0.012) : 0.0001 }}
            transition={{ type: "spring", stiffness: 130, damping: 22, delay: reduce ? 0 : i * 0.05 }}
          />
        ))}
      </div>
      <ul className="brf-key brf-key-sm">
        {shown.map((p) => (
          <li key={p.key} style={{ ["--c" as string]: p.color }}>
            <span className="brf-key-label">{p.label}</span>
            <span className="brf-key-figs">
              <span className="brf-key-pct" dir="ltr">
                {pct(p.share)}
              </span>
              <Shekel value={p.amount} className="brf-key-amt" />
              {p.note && <span className="brf-key-note">ריבית {p.note}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A small horizontal meter — how full a limit is, how dear a rate is. */
export function Meter({ value, heat }: { value: number; heat?: "hot" | "warm" | null }) {
  return (
    <span className="brf-meter" data-heat={heat ?? undefined} aria-hidden>
      <span style={{ width: `${Math.max(2, Math.min(100, value * 100))}%` }} />
    </span>
  );
}

/** A few facts in a row, each a label over a figure. */
export function Facts({ items }: { items: { label: string; value: ReactNode; tone?: "neg" | "pos" }[] }) {
  return (
    <dl className="brf-facts">
      {items.map((x) => (
        <div key={x.label} data-tone={x.tone}>
          <dt>{x.label}</dt>
          <dd>{x.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Lit rows fade out on their own: a pointer, not another colour on the page. */
export function useLit() {
  const [lit, setLit] = useState<{ section: string; uids: Set<string> } | null>(null);
  useEffect(() => {
    if (!lit) return;
    const t = setTimeout(() => setLit(null), 2800);
    return () => clearTimeout(t);
  }, [lit]);
  return [lit, setLit] as const;
}

/* ---------------------------------------------------------------- row lists */
//
// The evidence as rows a person reads, not a spreadsheet: each column is a
// small picture of its figure (a rate on its scale, a term as time elapsed, a
// limit as how full it is), and the list re-flows into cards when its column is
// narrow instead of scrolling sideways.

export interface RowCol<T> {
  key: string;
  head: string;
  /** A grid track — "minmax(0, 1.6fr)", "120px". */
  w: string;
  cell: (r: T) => ReactNode;
  /** The identity column spans the card's full width when the list re-flows. */
  lead?: boolean;
  align?: "end";
}

export function RowList<T>({
  rows,
  cols,
  rowKey,
  lit,
  bad,
}: {
  rows: T[];
  cols: RowCol<T>[];
  rowKey: (r: T) => string;
  lit?: Set<string>;
  bad?: (r: T) => boolean;
}) {
  const tracks = cols.map((c) => c.w).join(" ");
  return (
    <div className="brf-list">
      <div className="brf-list-head" style={{ gridTemplateColumns: tracks }} aria-hidden>
        {cols.map((c) => (
          <span key={c.key} data-end={c.align === "end" || undefined}>
            {c.lead ? "" : c.head}
          </span>
        ))}
      </div>
      <ul>
        {rows.map((r) => {
          const k = rowKey(r);
          return (
            <li
              key={k}
              className="brf-list-row"
              style={{ gridTemplateColumns: tracks }}
              data-bad={bad?.(r) || undefined}
              data-lit={lit?.has(k) || undefined}
            >
              {cols.map((c) => (
                <div key={c.key} className="brf-list-cell" data-lead={c.lead || undefined} data-end={c.align === "end" || undefined}>
                  {!c.lead && <span className="brf-list-cap">{c.head}</span>}
                  {c.cell(r)}
                </div>
              ))}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** A rate, with where it sits on its family's scale. */
export function RateCell({ rate, heat, max = 10 }: { rate: number | null; heat?: "hot" | "warm" | null; max?: number }) {
  if (rate === null || rate === undefined) return <Dash />;
  return (
    <span className="brf-ratecell" data-heat={heat ?? undefined}>
      <span className="brf-num">{rate.toFixed(2)}%</span>
      <Meter value={rate / max} heat={heat} />
    </span>
  );
}

const toDate = (d: string) => {
  const m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(d || "");
  return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : null;
};

/** How much of a debt's life has run, and how much is left. */
export function TermCell({ start, end, asOf, months }: { start?: string; end?: string; asOf?: string; months: number | null }) {
  const s = toDate(start ?? "");
  const e = toDate(end ?? "");
  const now = toDate(asOf ?? "") ?? new Date();
  const left =
    months && months > 0
      ? months >= 24
        ? `עוד ${Math.round(months / 12)} שנים`
        : months === 1
          ? "תשלום אחרון"
          : `עוד ${months} חודשים`
      : e && e < now
        ? "המועד חלף"
        : "";
  const done = s && e && e > s ? Math.min(1, Math.max(0, (now.getTime() - s.getTime()) / (e.getTime() - s.getTime()))) : null;
  const endLabel = e ? `${String(e.getMonth() + 1).padStart(2, "0")}/${e.getFullYear()}` : "";
  if (!left && !endLabel) return <Dash />;
  return (
    <span className="brf-term">
      <span className="brf-term-text">
        {left && <b>{left}</b>}
        {endLabel && <span className="brf-num">{endLabel}</span>}
      </span>
      {done !== null && (
        <span className="brf-term-bar" aria-hidden>
          <span style={{ width: `${Math.max(3, done * 100)}%` }} />
        </span>
      )}
    </span>
  );
}

/** A limit and how much of it is drawn. */
export function UseCell({ used, limit, heat }: { used: number; limit: number; heat?: "hot" | "warm" | null }) {
  if (!(limit > 0)) return <Dash />;
  const u = used / limit;
  return (
    <span className="brf-usecell" data-heat={heat ?? undefined}>
      <span className="brf-usecell-top">
        <b className="brf-num">{Math.round(u * 100)}%</b>
        <span>
          מתוך <Shekel value={limit} />
        </span>
      </span>
      <Meter value={u} heat={heat} />
    </span>
  );
}

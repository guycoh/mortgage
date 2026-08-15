"use client";

// The credit report as an underwriter would read it.
//
// The import keeps four numbers per debt. This reads the rest: what is in
// arrears and for how long, what is under enforced collection, how much of each
// revolving limit is actually drawn, how the mortgage is split between fixed and
// variable, who has been approached for credit lately, and whether anything is
// sitting in insolvency or execution.
//
// The organising idea is that findings come first and evidence comes after. The
// flags at the top are the reading; every section below them is the material
// that reading is drawn from, so a claim can always be checked. Colour is spent
// only on severity — the tables stay black on white so the exceptions are the
// only things that catch the eye.

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Bank,
  CalendarBlank,
  CaretDown,
  Certificate,
  ChartPieSlice,
  Gavel,
  IdentificationCard,
  MagnifyingGlass,
  Printer,
  Pulse,
  ShieldWarning,
  Warning,
  X,
} from "@phosphor-icons/react";
import { rateHeat, utilisationHeat } from "@/lib/verdicts";
import Money, { fmt } from "./Money";
import {
  CATEGORY_LABEL,
  SEVERITY_LABEL,
  type Analysis,
  type DebtLine,
  type Flag,
  type Severity,
} from "../lib/analysis";

/* ------------------------------------------------------------------ pieces */

const pct = (n: number) => `${Math.round(n * 100)}%`;

function Label({ children }: { children: React.ReactNode }) {
  return <div className="ink-label">{children}</div>;
}

/** A section only exists when it has something to say. */
function Section({
  id,
  icon,
  title,
  note,
  children,
  fold,
  forceOpen,
  lit,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  note?: React.ReactNode;
  children: React.ReactNode;
  /** Reference material: present, but not competing with the findings. */
  fold?: string;
  /** A finding pointed here, so a folded section has to give way. */
  forceOpen?: boolean;
  /** Lit for a moment after a finding sends the reader here. */
  lit?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const shown = open || !!forceOpen;
  return (
    <section id={id} className="ink-sec" data-hl={lit || undefined}>
      <header className="ink-sec-head">
        <span className="ink-sec-ico">{icon}</span>
        <h3 className="ink-display text-[15px]">{title}</h3>
        {note && (
          <span className="text-[11.5px]" style={{ color: "var(--ink-4)" }}>
            {note}
          </span>
        )}
        {fold && (
          <button className="ink-btn ink-btn-sm ms-auto" onClick={() => setOpen((o) => !o)}>
            <CaretDown size={12} weight="bold" style={{ transform: shown ? "rotate(180deg)" : undefined, transition: "transform .15s ease" }} />
            {shown ? "הסתרה" : fold}
          </button>
        )}
      </header>
      {(!fold || shown) && children}
    </section>
  );
}

/**
 * One headline figure.
 *
 * Same shape every time — label, number, one line of context — so the band
 * reads as a row of comparable facts rather than five different cards. Tone is
 * carried by a hairline above the tile, not by a coloured panel: the exception
 * is marked without the whole band turning into a warning.
 */
function Kpi({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "neg" | "warn" | "primary";
}) {
  return (
    <div className="ink-kpi" data-tone={tone}>
      <div className="ink-kpi-rule" aria-hidden />
      <Label>{label}</Label>
      <div className="ink-kpi-val">{value}</div>
      <div className="ink-kpi-sub">{sub ?? " "}</div>
    </div>
  );
}

function FlagRow({ flag, onGo }: { flag: Flag; onGo?: (f: Flag) => void }) {
  const go = flag.target ? () => onGo?.(flag) : undefined;
  return (
    <li
      className="ink-flag"
      data-sev={flag.severity}
      data-go={go ? "" : undefined}
      role={go ? "button" : undefined}
      tabIndex={go ? 0 : undefined}
      onClick={go}
      onKeyDown={go ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } } : undefined}
    >
      <span className="ink-flag-sev">{SEVERITY_LABEL[flag.severity]}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-[13px] font-bold" style={{ color: "var(--ink)" }}>
            {flag.title}
          </span>
          {flag.amount !== undefined && flag.amount > 0 && (
            <Money value={flag.amount} block={false} size={12.5} weight={700} />
          )}
        </div>
        <p className="mt-0.5 text-[12px] leading-[1.55]" style={{ color: "var(--ink-3)" }}>
          {flag.detail}
        </p>
        {go && <span className="ink-flag-go">הצג במסמך<ArrowLeft size={11} weight="bold" /></span>}
        {flag.where?.length ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {Array.from(new Set(flag.where)).slice(0, 6).map((w) => (
              <span key={w} className="ink-chip !h-[19px] !px-1.5 !text-[10.5px]">
                {w}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </li>
  );
}

/** Proportions of a whole, as one bar. Used for family mix and track mix. */
function ShareBar({
  parts,
}: {
  parts: { label: string; amount: number; share: number; color: string; note?: string }[];
}) {
  const shown = parts.filter((p) => p.share > 0);
  if (!shown.length) return null;
  return (
    <div>
      <div className="ink-split" role="img" aria-label="התפלגות">
        {shown.map((p) => (
          <span
            key={p.label}
            style={{ width: `${Math.max(p.share * 100, 1.5)}%`, background: p.color }}
            title={`${p.label} · ${pct(p.share)}`}
          />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
        {shown.map((p) => (
          <li key={p.label} className="flex items-center gap-1.5 text-[11.5px]">
            <i className="size-2 flex-none rounded-full" style={{ background: p.color }} />
            <span style={{ color: "var(--ink-2)" }}>{p.label}</span>
            <span className="ink-fig font-bold">{pct(p.share)}</span>
            <span className="ink-fig" style={{ color: "var(--ink-4)" }}>
              ₪{fmt(p.amount)}
            </span>
            {p.note && (
              <span style={{ color: "var(--ink-4)" }}>· {p.note}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Buckets 1..6 = 30-59 … 180+ days.
 *
 * The page has no amber, so the ramp runs from the copper the rest of the sheet
 * uses for "worth a look" into the red it uses for "act on this" — one
 * continuous scale, and both ends are colours that already mean something here.
 * Bucket 6 is dark enough that its digit is set in white (see .ink-heat).
 */
const BUCKET_BG = ["", "#faf1e9", "#f3ddca", "#ebc3a6", "#e0a184", "#cf7a67", "#b42318"];
const MONTHS_HE = ["ינו", "פבר", "מרץ", "אפר", "מאי", "יונ", "יול", "אוג", "ספט", "אוק", "נוב", "דצמ"];

function ArrearsGrid({ rows }: { rows: { year: string; months: (number | null)[] }[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="ink-heat">
        <thead>
          <tr>
            <th />
            {MONTHS_HE.map((m) => (
              <th key={m}>{m}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.year}>
              <th className="ink-fig">{r.year}</th>
              {r.months.map((v, i) => (
                <td
                  key={i}
                  style={{ background: v ? BUCKET_BG[Math.min(v, 6)] : undefined }}
                  title={v ? `${r.year} · ${MONTHS_HE[i]} · דרגת פיגור ${v}` : `${r.year} · ${MONTHS_HE[i]} · ללא פיגור`}
                >
                  {v ? <span className="ink-fig">{v}</span> : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* A debt table whose columns suit the family being shown. */
type Col = "bank" | "type" | "balance" | "original" | "rate" | "monthly" | "charge" | "paid" | "term" | "end" | "track" | "limit" | "use" | "status";

const COL_HEAD: Record<Col, string> = {
  bank: "מקור",
  type: "סוג",
  balance: "יתרה",
  original: "סכום מקורי",
  rate: "ריבית",
  // Same field, two different things. On an amortising debt it is a repayment;
  // on a card it is what the lender charged that month.
  monthly: "החזר חודשי",
  charge: "חיוב חודשי",
  paid: "שולם בפועל",
  term: "חודשים",
  end: "סיום",
  track: "מסלול",
  limit: "מסגרת",
  use: "ניצול",
  status: "סטטוס",
};

/** Does any row have something to say in this column? */
function hasData(lines: DebtLine[], c: Col): boolean {
  const some = (f: (l: DebtLine) => unknown) => lines.some((l) => { const v = f(l); return v !== null && v !== undefined && v !== "" && v !== 0; });
  switch (c) {
    case "bank": return true;
    case "type": return some((l) => l.type);
    case "balance": return some((l) => l.balance);
    case "original": return some((l) => l.original);
    case "rate": return some((l) => l.rate);
    case "monthly":
    case "charge": return some((l) => l.monthly);
    case "paid": return some((l) => l.paidActually);
    case "term": return some((l) => l.months);
    case "end": return some((l) => l.endDate);
    case "track": return some((l) => l.track);
    case "limit": return some((l) => l.limit);
    case "use": return some((l) => l.utilization);
    case "status": return some((l) => l.status);
  }
}

function DebtTable({ lines, cols: requested, hl }: { lines: DebtLine[]; cols: Col[]; hl?: Set<string> }) {
  // A column of nothing but em-dashes is furniture. Dropping it costs no
  // information and takes a visible bite out of how busy the table looks —
  // revolving facilities in particular rarely price a rate or a term.
  const cols = requested.filter((c) => hasData(lines, c));
  return (
    <div className="overflow-x-auto">
      <table className="ink-table ink-mini">
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c} className={c === "bank" || c === "type" || c === "track" || c === "status" ? "text-start" : undefined}>
                {COL_HEAD[c]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => {
            const bad = l.overdue > 0 || !!l.arrearsRange;
            return (
              <tr key={l.uid} data-bad={bad || undefined} data-hl={hl?.has(l.uid) || undefined}>
                {cols.map((c) => {
                  switch (c) {
                    case "bank":
                      return (
                        <td key={c} className="text-start">
                          <span className="font-semibold">{l.bank}</span>
                          {l.shared && (
                            <span className="ink-chip !ms-1.5 !h-[17px] !px-1 !text-[9.5px]" title="הופיע ביותר מדוח אחד ונספר פעם אחת">
                              משותף
                            </span>
                          )}
                          {bad && (
                            <span className="ink-chip !ms-1.5 !h-[17px] !px-1 !text-[9.5px]" style={{ color: "var(--neg)", borderColor: "var(--neg-line)", background: "var(--neg-tint)" }}>
                              {l.arrearsRange || "בפיגור"}
                            </span>
                          )}
                        </td>
                      );
                    case "type":
                      return (
                        <td key={c} className="text-start" style={{ color: "var(--ink-3)" }}>
                          {l.type || "—"}
                        </td>
                      );
                    case "balance":
                      return <td key={c}><Money value={l.balance} block={false} /></td>;
                    case "original":
                      return <td key={c}>{l.original ? <Money value={l.original} block={false} /> : "—"}</td>;
                    case "rate":
                      return (
                        <td key={c} className="ink-fig" data-heat={rateHeat(l.rate, l.category === "mortgage" ? "mortgage" : "loan") ?? undefined}>
                          {l.rate === null ? "—" : `${l.rate.toFixed(2)}%`}
                        </td>
                      );
                    case "monthly":
                    case "charge":
                      return <td key={c}>{l.monthly ? <Money value={l.monthly} block={false} /> : "—"}</td>;
                    case "paid":
                      // Paying less than the charge is the whole point of the
                      // column, so it is the only state that gets colour.
                      return (
                        <td key={c}>
                          {l.paidActually ? (
                            <Money
                              value={l.paidActually}
                              block={false}
                              color={l.monthly - l.paidActually > 1 ? "var(--neg)" : undefined}
                            />
                          ) : (
                            "—"
                          )}
                        </td>
                      );
                    case "term":
                      return <td key={c} className="ink-fig">{l.months ?? "—"}</td>;
                    case "end":
                      return <td key={c} className="ink-fig">{l.endDate || "—"}</td>;
                    case "track":
                      return (
                        <td key={c} className="text-start" style={{ color: "var(--ink-2)" }}>
                          {l.track || "—"}
                          {l.balloon && (
                            <span className="ink-chip !ms-1.5 !h-[17px] !px-1 !text-[9.5px]" style={{ color: "var(--warn)", borderColor: "var(--warn-line, var(--line-2))" }}>
                              בלון
                            </span>
                          )}
                        </td>
                      );
                    case "limit":
                      return <td key={c}>{l.limit ? <Money value={l.limit} block={false} /> : "—"}</td>;
                    case "use":
                      return (
                        <td key={c} className="ink-fig" data-heat={utilisationHeat(l.utilization === null ? null : l.utilization / 100) ?? undefined}>
                          {l.utilization === null ? "—" : `${l.utilization}%`}
                        </td>
                      );
                    case "status":
                      return (
                        <td key={c} className="text-start text-[11px]" style={{ color: "var(--ink-4)" }}>
                          {l.status || "—"}
                        </td>
                      );
                  }
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Ease a scroll container to an offset.
 *
 * `scrollTo({behavior:"smooth"})` is not dependable — it silently does nothing
 * in some engines and embedded views, and a finding that appears to ignore the
 * click is worse than one that never offered to move. Driving it by frame is a
 * dozen lines and always runs, and the duration can scale with the distance so
 * a short hop does not take as long as a long one.
 */
function easeScroll(el: HTMLElement, to: number) {
  const from = el.scrollTop;
  const dist = to - from;
  if (Math.abs(dist) < 2) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    el.scrollTop = to;
    return;
  }
  const ms = Math.min(700, Math.max(260, Math.abs(dist) * 0.42));
  const t0 = performance.now();
  let framed = false;
  const step = (now: number) => {
    framed = true;
    const p = Math.min(1, (now - t0) / ms);
    // easeOutCubic: quick to leave, gentle to land
    el.scrollTop = from + dist * (1 - Math.pow(1 - p, 3));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  // Frames do not flow in a backgrounded or non-compositing tab, and then the
  // animation never starts at all — the click would look ignored. Arriving
  // without the animation is a far better failure than not arriving.
  window.setTimeout(() => {
    if (!framed) el.scrollTop = to;
  }, 140);
}

/* -------------------------------------------------------------------- main */

/**
 * The five facility kinds, in the page's own two hues and nothing else.
 * משכנתא is the ink and הלוואה is the copper, exactly as on the board; a card
 * is a lighter step of the ink, an overdraft a deeper step of the copper, and
 * anything unclassified is grey. Five distinguishable colours, two families.
 */
const FAMILY_COLOR: Record<string, string> = {
  mortgage: "#4a4691",
  loan: "#c77e4a",
  card: "#0d8b9b",
  overdraft: "#a6642f",
  other: "#a1a1a6",
};

/** The five tracks, then משכנתא and "other". Matches TRACK_HEX. */
const TRACK_COLOR = ["#2563eb", "#0d8b9b", "#14905a", "#ad7804", "#c62370", "#5b54d6", "#a1a1a6"];

export default function AnalysisModal({
  analysis,
  onClose,
}: {
  analysis: Analysis;
  onClose: () => void;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<string>("flags");
  /** The section a finding sent us to, and the exact rows behind its claim. */
  const [lit, setLit] = useState<{ section: string; uids: Set<string> } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const a = analysis;
  const own = a.lines.filter((l) => l.role === "debtor");
  const mortgages = own.filter((l) => l.category === "mortgage");
  const consumer = own.filter((l) => l.category === "loan");
  const revolving = own.filter((l) => l.category === "card" || l.category === "overdraft");
  const otherDebts = own.filter((l) => l.category === "other");
  const guarantees = a.lines.filter((l) => l.role === "guarantor");
  const collateral = mortgages.flatMap((l) => l.collateral.map((c) => ({ ...c, bank: l.bank })));

  const bySeverity = useMemo(() => {
    const counts: Record<Severity, number> = { critical: 0, high: 0, medium: 0, info: 0 };
    for (const f of a.flags) counts[f.severity] += 1;
    return counts;
  }, [a.flags]);

  const familyParts = a.byCategory.map((c) => ({
    label: CATEGORY_LABEL[c.category],
    amount: c.balance,
    share: a.totals.balance > 0 ? c.balance / a.totals.balance : 0,
    color: FAMILY_COLOR[c.category],
    note: c.monthly ? `₪${fmt(c.monthly)}/ח׳` : undefined,
  }));

  const trackParts = a.mortgage.tracks.map((t, i) => ({
    label: t.label,
    amount: t.amount,
    share: t.share,
    color: TRACK_COLOR[i % TRACK_COLOR.length],
    note: t.rate !== null ? `${t.rate.toFixed(2)}%` : undefined,
  }));

  // Section chips only offer what actually rendered.
  const nav: { id: string; label: string }[] = [
    a.flags.length ? { id: "flags", label: "ממצאים" } : null,
    { id: "picture", label: "תמונת החוב" },
    mortgages.length ? { id: "mortgage", label: "משכנתאות" } : null,
    consumer.length ? { id: "consumer", label: "הלוואות" } : null,
    revolving.length ? { id: "revolving", label: 'מסגרות ועו"ש' } : null,
    guarantees.length ? { id: "guarantees", label: "ערבויות" } : null,
    a.behaviour.arrears.length || a.behaviour.checksPresented || a.behaviour.debitsPresented
      ? { id: "behaviour", label: "התנהגות תשלומים" }
      : null,
    a.inquiries.total || a.inquiries.pending.length ? { id: "inquiries", label: "פניות" } : null,
    a.legal.execution.length || a.legal.insolvency.length || a.legal.nonPayment.length
      ? { id: "legal", label: "הליכים" }
      : null,
    a.sources.length ? { id: "sources", label: "תמצית לפי מקור" } : null,
    collateral.length ? { id: "collateral", label: "בטוחות" } : null,
  ].filter(Boolean) as { id: string; label: string }[];

  const goTo = (id: string) => {
    setTab(id);
    const el = bodyRef.current?.querySelector(`#${id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /**
   * Follow a finding to its evidence.
   *
   * The section is opened first if it was folded, because scrolling to a
   * collapsed section lands on a heading and nothing else. The highlight is
   * then cleared on a timer rather than left on: it is a pointer, and a pointer
   * that never goes away just becomes another colour on the page.
   */
  const goToFlag = (f: Flag) => {
    const t = f.target;
    if (!t) return;
    setTab(t.section);
    setLit({ section: t.section, uids: new Set(t.uids ?? []) });
    // Let React commit first, so a section that was folded has rendered its
    // rows before we measure where it starts. A timer rather than a frame:
    // frames can be withheld, timers are not.
    window.setTimeout(() => {
      const body = bodyRef.current;
      const el = body?.querySelector<HTMLElement>(`#${t.section}`);
      if (!body || !el) return;
      const top =
        el.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop - 6;
      easeScroll(body, Math.max(0, top));
    }, 0);
  };

  useEffect(() => {
    if (!lit) return;
    const t = setTimeout(() => setLit(null), 2600);
    return () => clearTimeout(t);
  }, [lit]);

  return createPortal(
    <div
      dir="rtl"
      className="ink-vars ink-printable fixed inset-0 z-[120] grid place-items-center p-4 backdrop-blur-[2px]"
      style={{ background: "rgba(14,21,36,.55)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="ink-card flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden"
        style={{ boxShadow: "var(--shadow-lift)" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="ניתוח חיווי אשראי"
      >
        {/* ------------------------------------------------------------ head */}
        <header className="ink-head">
          <h2 className="ink-title">ניתוח חיווי אשראי</h2>
          {a.clients.map((c, i) => (
            <span key={`${c.idNumber}-${i}`} className="ink-chip" style={{ color: "var(--ink-2)" }}>
              <IdentificationCard size={12} />
              {c.name || "ללא שם"}
              {c.idNumber && <span className="ink-fig" style={{ color: "var(--ink-4)" }}>{c.idNumber}</span>}
            </span>
          ))}
          {a.clients[0]?.reportDate && (
            <span className="text-[11.5px]" style={{ color: "var(--ink-4)" }}>
              דוח מ־{a.clients[0].reportDate}
            </span>
          )}
          <div className="ink-noprint ms-auto flex items-center gap-1.5">
            <button className="ink-btn ink-btn-sm" onClick={() => window.print()}>
              <Printer size={13} weight="bold" />
              הדפסה
            </button>
            <button className="ink-act" onClick={onClose} aria-label="סגירה">
              <X size={15} weight="bold" />
            </button>
          </div>
        </header>

        {/* --------------------------------------------------------- the band */}
        <div className="ink-kpis">
          <Kpi
            label="סך ההתחייבויות"
            tone="primary"
            value={<Money value={a.totals.balance} size={24} weight={800} />}
            sub={`${own.length} התחייבויות פעילות`}
          />
          <Kpi
            label="החזר חודשי"
            value={<Money value={a.totals.monthly} size={24} weight={800} />}
            sub={
              a.consumer.shareOfMonthly > 0
                ? `${pct(a.consumer.shareOfMonthly)} מזה הלוואות צרכניות`
                : "משכנתאות, הלוואות ומסגרות"
            }
          />
          {/* The number an advisor asks for first, and the one the mix cannot
              show: a revolving facility has no term, so it never reaches the
              ledger even though it leaves the account every month. */}
          <Kpi
            label="חיוב חודשי בכרטיסים"
            tone={a.cards.rolled > 0 ? "warn" : undefined}
            value={<Money value={a.cards.monthlyCharge} size={24} weight={800} />}
            sub={
              a.cards.rolled > 0
                ? `₪${fmt(a.cards.rolled)} לא נפרעו וגולגלו`
                : a.cards.count
                  ? `על פני ${a.cards.count} מסגרות · נפרע במלואו`
                  : "אין חיוב מדווח"
            }
          />
          <Kpi
            label="ריבית ממוצעת משוקללת"
            value={
              <span className="ink-fig ink-kpi-num">
                {a.totals.rate === null ? "—" : `${a.totals.rate.toFixed(2)}%`}
              </span>
            }
            sub={
              a.mortgage.rate !== null
                ? `משכנתא ${a.mortgage.rate.toFixed(2)}%${a.consumer.rate !== null ? ` · צרכני ${a.consumer.rate.toFixed(2)}%` : ""}`
                : a.consumer.rate !== null
                  ? `צרכני ${a.consumer.rate.toFixed(2)}%`
                  : undefined
            }
          />
          <Kpi
            label="יתרות בפיגור"
            tone={a.totals.overdue > 0 ? "neg" : undefined}
            value={<Money value={a.totals.overdue} size={24} weight={800} />}
            sub={
              a.behaviour.arrearsMonths
                ? `${a.behaviour.arrearsMonths} חודשי פיגור בהיסטוריה`
                : "אין פיגור פעיל"
            }
          />
        </div>

        {/* --------------------------------------------------------- section nav */}
        <div className="ink-navbar">
          {nav.map((n) => (
            <button key={n.id} className="ink-tab" data-on={tab === n.id || undefined} onClick={() => goTo(n.id)}>
              {n.label}
            </button>
          ))}
        </div>

        {/* --------------------------------------------------------- the body */}
        <div ref={bodyRef} className="ink-analysis min-h-0 flex-1 overflow-y-auto">
          {/* ---------------------------------------------------- findings */}
          {a.flags.length > 0 && (
            <Section
              id="flags" lit={lit?.section === "flags"}
              icon={<ShieldWarning size={15} weight="fill" />}
              title="ממצאים לתשומת לב היועץ"
              note={
                <span className="flex items-center gap-2">
                  {(["critical", "high", "medium", "info"] as Severity[])
                    .filter((s) => bySeverity[s] > 0)
                    .map((s) => (
                      <span key={s} className="ink-flag-sev !static" data-sev={s}>
                        {bySeverity[s]} {SEVERITY_LABEL[s]}
                      </span>
                    ))}
                </span>
              }
            >
              <ul className="grid gap-1.5">
                {a.flags.map((f) => (
                  <FlagRow key={f.id} flag={f} onGo={goToFlag} />
                ))}
              </ul>
            </Section>
          )}

          {/* ------------------------------------------------ debt picture */}
          <Section
            id="picture" lit={lit?.section === "picture"}
            icon={<ChartPieSlice size={15} weight="fill" />}
            title="תמונת החוב"
            note={a.lines.some((l) => l.shared) ? "התחייבויות משותפות נספרו פעם אחת" : undefined}
          >
            <ShareBar parts={familyParts} />
            <div className="mt-3 overflow-x-auto">
              <table className="ink-table ink-mini">
                <thead>
                  <tr>
                    <th className="text-start">משפחה</th>
                    <th>מספר</th>
                    <th>יתרה</th>
                    <th>החזר חודשי</th>
                    <th>ריבית</th>
                    <th>מסגרת</th>
                    <th>בפיגור</th>
                  </tr>
                </thead>
                <tbody>
                  {a.byCategory.map((c) => (
                    <tr key={c.category}>
                      <td className="text-start">
                        <span className="inline-flex items-center gap-1.5 font-semibold">
                          <i className="size-2 rounded-full" style={{ background: FAMILY_COLOR[c.category] }} />
                          {CATEGORY_LABEL[c.category]}
                        </span>
                      </td>
                      <td className="ink-fig">{c.count}</td>
                      <td><Money value={c.balance} block={false} /></td>
                      <td>{c.monthly ? <Money value={c.monthly} block={false} /> : "—"}</td>
                      <td className="ink-fig">{c.rate === null ? "—" : `${c.rate.toFixed(2)}%`}</td>
                      <td>{c.limit ? <Money value={c.limit} block={false} /> : "—"}</td>
                      <td>{c.overdue ? <Money value={c.overdue} block={false} hot /> : "—"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="text-start font-bold">סה״כ</td>
                    <td className="ink-fig font-bold">{own.length}</td>
                    <td><Money value={a.totals.balance} block={false} weight={800} /></td>
                    <td><Money value={a.totals.monthly} block={false} weight={800} /></td>
                    <td className="ink-fig font-bold">{a.totals.rate === null ? "—" : `${a.totals.rate.toFixed(2)}%`}</td>
                    <td><Money value={a.totals.limit} block={false} weight={800} /></td>
                    <td>{a.totals.overdue ? <Money value={a.totals.overdue} block={false} weight={800} hot /> : "—"}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Section>

          {/* --------------------------------------------------- mortgages */}
          {mortgages.length > 0 && (
            <Section
              id="mortgage" lit={lit?.section === "mortgage"}
              icon={<Bank size={15} weight="fill" />}
              title="משכנתאות"
              note={
                <>
                  {pct(a.mortgage.variableShare)} משתנה · {pct(a.mortgage.linkedShare)} צמוד
                  {a.mortgage.ltv !== null && ` · יחס מימון ${pct(a.mortgage.ltv)}`}
                </>
              }
            >
              {trackParts.length > 0 && (
                <div className="mb-3">
                  <Label>פיזור המסלולים</Label>
                  <div className="mt-1.5">
                    <ShareBar parts={trackParts} />
                  </div>
                </div>
              )}
              <DebtTable hl={lit?.uids} lines={mortgages} cols={["bank", "balance", "original", "rate", "monthly", "term", "end", "track", "status"]} />
              {a.mortgage.collateralValue > 0 && (
                <p className="mt-2 text-[11.5px]" style={{ color: "var(--ink-4)" }}>
                  שווי בטוחות מדווח ₪{fmt(a.mortgage.collateralValue)} מול יתרה של ₪{fmt(a.mortgage.balance)}.
                </p>
              )}
            </Section>
          )}

          {/* ---------------------------------------------------- consumer */}
          {consumer.length > 0 && (
            <Section
              id="consumer" lit={lit?.section === "consumer"}
              icon={<Pulse size={15} weight="bold" />}
              title="הלוואות צרכניות"
              note={
                <>
                  ריבית ממוצעת {a.consumer.rate === null ? "—" : `${a.consumer.rate.toFixed(2)}%`}
                  {a.consumer.worstRate !== null && ` · הגבוהה ${a.consumer.worstRate.toFixed(2)}%`}
                </>
              }
            >
              <DebtTable hl={lit?.uids} lines={consumer} cols={["bank", "type", "balance", "original", "rate", "monthly", "term", "end", "status"]} />
            </Section>
          )}

          {/* --------------------------------------------------- revolving */}
          {revolving.length > 0 && (
            <Section
              id="revolving" lit={lit?.section === "revolving"}
              icon={<Certificate size={15} weight="fill" />}
              title='מסגרות אשראי וחשבונות עו"ש'
              note={
                a.revolving.utilization !== null
                  ? `ניצול ${a.revolving.utilization}%${a.revolving.peak > 0 ? ` · שיא בחודש הדיווח ₪${fmt(a.revolving.peak)}` : ""}`
                  : undefined
              }
            >
              {a.cards.monthlyCharge > 0 && (
                <div className="ink-facts mb-3">
                  <div>
                    <Label>חיוב חודשי</Label>
                    <Money value={a.cards.monthlyCharge} size={17} weight={800} style={{ textAlign: "start" }} />
                  </div>
                  <div>
                    <Label>שולם בפועל</Label>
                    <Money value={a.cards.paidActually} size={17} weight={800} style={{ textAlign: "start" }} />
                  </div>
                  <div>
                    <Label>גולגל לחודש הבא</Label>
                    <Money
                      value={a.cards.rolled}
                      size={17}
                      weight={800}
                      color={a.cards.rolled > 0 ? "var(--neg)" : undefined}
                      style={{ textAlign: "start" }}
                    />
                  </div>
                </div>
              )}
              <DebtTable hl={lit?.uids} lines={revolving} cols={["bank", "type", "balance", "limit", "use", "charge", "paid", "rate"]} />
            </Section>
          )}

          {/* ------------------------------------------------------- other */}
          {otherDebts.length > 0 && (
            <Section id="other" lit={lit?.section === "other"} icon={<Warning size={15} weight="fill" />} title="התחייבויות אחרות">
              <DebtTable hl={lit?.uids} lines={otherDebts} cols={["bank", "type", "balance", "monthly", "status"]} />
            </Section>
          )}

          {/* -------------------------------------------------- guarantees */}
          {guarantees.length > 0 && (
            <Section
              id="guarantees" lit={lit?.section === "guarantees"}
              icon={<Certificate size={15} weight="bold" />}
              title="ערבויות"
              note="אינן החזר של הלקוח, אך נספרות כחשיפה בבדיקת בנק"
            >
              <DebtTable hl={lit?.uids} lines={guarantees} cols={["bank", "type", "balance", "monthly", "end", "status"]} />
            </Section>
          )}

          {/* -------------------------------------------------- behaviour */}
          {(a.behaviour.arrears.length > 0 ||
            a.behaviour.checksPresented > 0 ||
            a.behaviour.debitsPresented > 0) && (
            <Section id="behaviour" lit={lit?.section === "behaviour"} icon={<CalendarBlank size={15} weight="fill" />} title="התנהגות תשלומים">
              <div className="mb-3 flex flex-wrap gap-x-6 gap-y-2">
                {[
                  { l: "שיקים שהוצגו", v: a.behaviour.checksPresented, bad: false },
                  { l: 'שיקים שחזרו (אכ"מ)', v: a.behaviour.checksReturned, bad: a.behaviour.checksReturned > 0 },
                  { l: "הוראות קבע שהוצגו", v: a.behaviour.debitsPresented, bad: false },
                  { l: "הוראות קבע שלא כובדו", v: a.behaviour.debitsDishonored, bad: a.behaviour.debitsDishonored > 0 },
                ]
                  .filter((x) => x.v > 0)
                  .map((x) => (
                    <div key={x.l}>
                      <Label>{x.l}</Label>
                      <div
                        className="ink-fig text-[17px] font-extrabold"
                        style={{ color: x.bad ? "var(--neg)" : "var(--ink)" }}
                      >
                        {x.v}
                      </div>
                    </div>
                  ))}
              </div>
              {a.behaviour.arrears.length > 0 && (
                <>
                  <Label>היסטוריית פיגורים — 1 = 30-59 ימים … 6 = 180 ימים ומעלה</Label>
                  <div className="mt-1.5">
                    <ArrearsGrid rows={a.behaviour.arrears} />
                  </div>
                </>
              )}
            </Section>
          )}

          {/* --------------------------------------------------- inquiries */}
          {(a.inquiries.total > 0 || a.inquiries.pending.length > 0) && (
            <Section
              id="inquiries" lit={lit?.section === "inquiries"}
              icon={<MagnifyingGlass size={15} weight="bold" />}
              title="פניות ובקשות אשראי"
              note={`${a.inquiries.last3} ב-3 החודשים האחרונים · ${a.inquiries.last12} בשנה`}
            >
              {a.inquiries.pending.length > 0 && (
                <div className="mb-3">
                  <Label>בקשות אשראי חדשות שטרם הבשילו לעסקה</Label>
                  <div className="mt-1.5 overflow-x-auto">
                    <table className="ink-table ink-mini">
                      <thead>
                        <tr>
                          <th className="text-start">גורם</th>
                          <th className="text-start">סוג</th>
                          <th className="text-start">מטרה</th>
                          <th>סכום</th>
                          <th>תאריך</th>
                        </tr>
                      </thead>
                      <tbody>
                        {a.inquiries.pending.map((q, i) => (
                          <tr key={`${q.user}-${i}`}>
                            <td className="text-start font-semibold">{q.user || "—"}</td>
                            <td className="text-start" style={{ color: "var(--ink-3)" }}>{q.transactionType || "—"}</td>
                            <td className="text-start" style={{ color: "var(--ink-3)" }}>{q.purpose || "—"}</td>
                            <td className="ink-fig">{q.amount || "—"}</td>
                            <td className="ink-fig">{q.date || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {a.inquiries.byPurpose.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {a.inquiries.byPurpose.map((p) => (
                    <span key={p.purpose} className="ink-chip">
                      {p.purpose}
                      <span className="ink-fig font-bold">{p.count}</span>
                    </span>
                  ))}
                </div>
              )}
            </Section>
          )}

          {/* ------------------------------------------------------- legal */}
          {(a.legal.execution.length > 0 ||
            a.legal.insolvency.length > 0 ||
            a.legal.nonPayment.length > 0) && (
            <Section id="legal" lit={lit?.section === "legal"} icon={<Gavel size={15} weight="fill" />} title="הליכים ואי עמידה בפירעון">
              {a.legal.nonPayment.length > 0 && (
                <div className="mb-3 overflow-x-auto">
                  <Label>נתונים המעידים על אי עמידה בפירעון</Label>
                  <table className="ink-table ink-mini mt-1.5">
                    <thead>
                      <tr>
                        <th className="text-start">מקור</th>
                        <th>תאריך</th>
                        <th className="text-start">תיאור</th>
                        <th>מונע/מבטל</th>
                      </tr>
                    </thead>
                    <tbody>
                      {a.legal.nonPayment.map((n, i) => (
                        <tr key={`${n.id}-${i}`} data-bad>
                          <td className="text-start font-semibold">{n.source || "—"}</td>
                          <td className="ink-fig">{n.reportDate || "—"}</td>
                          <td className="text-start" style={{ color: "var(--ink-3)" }}>{n.description || "—"}</td>
                          <td>{n.prevents ? "כן" : "לא"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {a.legal.execution.length > 0 && (
                <div className="mb-3 overflow-x-auto">
                  <Label>תיקי הוצאה לפועל</Label>
                  <table className="ink-table ink-mini mt-1.5">
                    <thead>
                      <tr>
                        <th className="text-start">מספר תיק</th>
                        <th className="text-start">סוג</th>
                        <th>נפתח</th>
                        <th>חוב בפתיחה</th>
                        <th>יתרה אחרונה</th>
                        <th>נסגר</th>
                      </tr>
                    </thead>
                    <tbody>
                      {a.legal.execution.map((c, i) => (
                        // A closed file with nothing owing is history, and is
                        // not tinted as though it were live debt.
                        <tr
                          key={`${c["197-003"]}-${i}`}
                          data-bad={(!c["197-013"] || Number(String(c["197-009"]).replace(/[^\d.]/g, "")) > 0) || undefined}
                        >
                          <td className="text-start ink-fig">{c["197-003"] || "—"}</td>
                          <td className="text-start" style={{ color: "var(--ink-3)" }}>{c["197-004"] || "—"}</td>
                          <td className="ink-fig">{c["197-006"] || "—"}</td>
                          <td className="ink-fig">{c["197-007"] || "—"}</td>
                          <td className="ink-fig">{c["197-009"] || "—"}</td>
                          <td className="ink-fig">{c["197-013"] || "פתוח"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {a.legal.insolvency.length > 0 && (
                <div className="overflow-x-auto">
                  <Label>הליכי חדלות פירעון ושיקום כלכלי</Label>
                  <table className="ink-table ink-mini mt-1.5">
                    <thead>
                      <tr>
                        <th className="text-start">תיק</th>
                        <th className="text-start">סוג הליך</th>
                        <th>נפתח</th>
                        <th>חוב מוצהר</th>
                        <th className="text-start">סטטוס</th>
                      </tr>
                    </thead>
                    <tbody>
                      {a.legal.insolvency.map((c, i) => (
                        <tr key={`${c["151-001"]}-${i}`} data-bad>
                          <td className="text-start ink-fig">{c["151-001"] || "—"}</td>
                          <td className="text-start" style={{ color: "var(--ink-3)" }}>{c["151-003"] || "—"}</td>
                          <td className="ink-fig">{c["151-005"] || "—"}</td>
                          <td className="ink-fig">{c["151-009"] || c["151-007"] || "—"}</td>
                          <td className="text-start">{c["151-015"] || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          )}

          {/* ----------------------------------------------------- sources */}
          {a.sources.length > 0 && (
            <Section
              id="sources" lit={lit?.section === "sources"}
              forceOpen={lit?.section === "sources"}
              icon={<Bank size={15} weight="bold" />}
              title="תמצית הדוח לפי מקור"
              // Reference. It restates the tables above lender by lender, so it
              // stays folded unless it disagrees with them — which is exactly
              // when an advisor needs to look at it.
              fold={
                a.reconcile.balanceDisagrees || a.reconcile.limitDisagrees || a.reconcile.originalDisagrees
                  ? undefined
                  : `${a.sources.length} שורות`
              }
              note={
                a.reconcile.balanceDisagrees || a.reconcile.limitDisagrees || a.reconcile.originalDisagrees ? (
                  <span style={{ color: "var(--neg)" }}>
                    פער מול הפירוט: ₪{fmt(a.reconcile.balanceGap)} יתרה · ₪{fmt(a.reconcile.limitGap)} מסגרת · ₪{fmt(a.reconcile.originalGap)} סכום מקורי
                  </span>
                ) : (
                  "תואם לפירוט העסקאות"
                )
              }
            >
              <div className="overflow-x-auto">
                <table className="ink-table ink-mini">
                  <thead>
                    <tr>
                      <th>מקור</th>
                      <th>סוג עסקה</th>
                      <th>תפקיד</th>
                      <th>מזהה / מספר</th>
                      <th>מסגרת</th>
                      <th>יתרה</th>
                      <th>בפיגור</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.sources.map((s, i) => (
                      <tr key={`${s.source}-${s.transactionType}-${i}`} data-bad={s.overdue > 0 || undefined}>
                        <td className="font-semibold">{s.source || "—"}</td>
                        <td style={{ color: "var(--ink-3)" }}>{s.transactionType}</td>
                        <td style={{ color: "var(--ink-4)" }}>{s.role === "guarantor" ? "ערב" : "חייב"}</td>
                        <td className="ink-fig" style={{ color: "var(--ink-4)" }}>{s.count || "—"}</td>
                        <td>{s.limit ? <Money value={s.limit} block={false} /> : "—"}</td>
                        <td>{s.balance ? <Money value={s.balance} block={false} /> : "—"}</td>
                        <td>{s.overdue ? <Money value={s.overdue} block={false} hot /> : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {a.reconcile.missingCounts.length > 0 && (
                <ul className="mt-2 grid gap-1">
                  {a.reconcile.missingCounts.map((w) => (
                    <li key={w} className="flex items-start gap-1.5 text-[11.5px]" style={{ color: "var(--ink-4)" }}>
                      <Warning size={12} weight="fill" className="mt-0.5 flex-none" />
                      {w}
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          )}

          {/* -------------------------------------------------- collateral */}
          {collateral.length > 0 && (
            <Section id="collateral" lit={lit?.section === "collateral"} icon={<Bank size={15} weight="bold" />} title="בטוחות">
              <div className="overflow-x-auto">
                <table className="ink-table ink-mini">
                  <thead>
                    <tr>
                      <th className="text-start">מקור</th>
                      <th className="text-start">סוג בטוחה</th>
                      <th>שווי</th>
                      <th className="text-start">מזהה תיק</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collateral.map((c, i) => (
                      <tr key={`${c.fileId}-${i}`}>
                        <td className="text-start font-semibold">{c.bank}</td>
                        <td className="text-start" style={{ color: "var(--ink-3)" }}>{c.type || "—"}</td>
                        <td className="ink-fig">{c.value || "—"}</td>
                        <td className="text-start ink-fig" style={{ color: "var(--ink-4)" }}>{c.fileId || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* ------------------------------------------------- report notes */}
          <Section
            id="meta" lit={lit?.section === "meta"}
            forceOpen={lit?.section === "meta"}
            icon={<IdentificationCard size={15} weight="bold" />}
            title="פרטי הדוח"
            fold="הצגה"
          >
            <div className="overflow-x-auto">
              <table className="ink-table ink-mini">
                <thead>
                  <tr>
                    <th className="text-start">לקוח</th>
                    <th className="text-start">ת״ז</th>
                    <th className="text-start">הגדרה</th>
                    <th className="text-start">סטטוס במערכת</th>
                    <th>תחילת איסוף</th>
                    <th>תאריך דוח</th>
                  </tr>
                </thead>
                <tbody>
                  {a.clients.map((c, i) => (
                    <tr key={`${c.idNumber}-${i}`}>
                      <td className="text-start font-semibold">{c.name || "—"}</td>
                      <td className="text-start ink-fig">{c.idNumber || "—"}</td>
                      <td className="text-start" style={{ color: "var(--ink-3)" }}>{c.clientType || "—"}</td>
                      <td
                        className="text-start"
                        style={{ color: c.systemStatus && !/רגיל|תקין/.test(c.systemStatus) ? "var(--neg)" : "var(--ink-3)" }}
                      >
                        {c.systemStatus || "—"}
                      </td>
                      <td className="ink-fig">{c.collectionStart || "—"}</td>
                      <td className="ink-fig">{c.reportDate || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {a.legal.adminActions.length > 0 && (
              <div className="mt-2.5 overflow-x-auto">
                <Label>פניות מול מערכת נתוני אשראי</Label>
                <table className="ink-table ink-mini mt-1.5">
                  <thead>
                    <tr>
                      <th>אסמכתא</th>
                      <th>תאריך</th>
                      <th>סוג</th>
                      <th>סטטוס</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.legal.adminActions.map((x, i) => (
                      <tr key={`${x.ref}-${i}`}>
                        <td className="ink-fig" style={{ color: "var(--ink-4)" }}>{x.ref || "—"}</td>
                        <td className="ink-fig">{x.date || "—"}</td>
                        <td style={{ color: "var(--ink-3)" }}>{x.type || "—"}</td>
                        <td style={{ color: /הסתיים|טופל/.test(x.status || "") ? "var(--ink-3)" : "var(--warn)" }}>
                          {x.status || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {a.warnings.length > 0 && (
              <ul className="mt-2.5 grid gap-1">
                {a.warnings.map((w, i) => (
                  <li key={`${i}:${w}`} className="flex items-start gap-1.5 text-[11.5px]" style={{ color: "var(--ink-4)" }}>
                    <Warning size={12} weight="fill" className="mt-0.5 flex-none" />
                    {w}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2.5 text-[11px] leading-relaxed" style={{ color: "var(--ink-4)" }}>
              הניתוח נגזר אוטומטית מדוח ריכוז הנתונים ואינו תחליף לקריאת המסמך המקורי. סכומים
              המופיעים בכמה דוחות של אותו משק בית נספרים פעם אחת בלבד.
            </p>
          </Section>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

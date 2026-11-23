"use client";

// תמהיל אופטימלי — the sheet.
//
// One question, asked of the document on the board: what is the best mix this
// client can actually get today? The answer depends on what "best" means, so
// the sheet is a comparison first: today's mix on the top line and one line per
// goal under it, in the same three figures the board's read-out carries
// (החזר חודשי, תקופה, ריבית והצמדה) plus the mix's colour signature. Picking a
// line opens that mix underneath — what moves, what stays, the new money, why,
// and what must be checked before it is filed. "יצירת התמהיל" lands it on the
// board as an ordinary proposal tab.
//
// The sheet computes nothing itself: every figure is the engine's
// (lib/automix), which prices through the board's own priceLoan.

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import { CaretDown, Plus, Warning, X } from "@phosphor-icons/react";
import Btn from "@/app/aa102test/components/Btn";
import Select from "@/app/aa102test/components/Select";
import { TRACK_HEX, type ImportedLoan } from "@/app/aa102test/lib/credit";
import type { Analysis } from "@/app/aa102test/lib/analysis";
import type { Forecast } from "@/app/aa102test/lib/forecast";
import { readProfile } from "@/app/aa102test/lib/profile-cache";
import type { AbilityProfile } from "@/app/api/simulator/ability-profile/route";
import { BANKS, TRACK_PATH, TRACK_SHORT, type BankId, type MarketSnapshot, type TrackKey } from "@/app/aa107test/lib/market";
import fallback from "@/app/aa107test/lib/market-snapshot.json";
import type { SolveReply, SolveRequest } from "./automix.worker";
import { DEFAULT_PROFILE, type AutoMixInput, type AutoMixResult, type ClientProfile, type DebtMove, type GoalId, type MixMetrics, type PricingTier, type Proposal } from "../lib/automix/types";
import "../automix.css";

type Props = {
  master: ImportedLoan[];
  forecast: Forecast | null;
  forecastOn: boolean;
  inflation: number;
  discountRate: number;
  clientName?: string;
  /** The board's reading of the credit report(s) — arrears, enforcement, the reported collateral. null for a bank letter. */
  analysis: Analysis | null;
  /** The client's Fireberry card (read-only) — where income, property value and age come from. null = no client. */
  profileUrl?: string | null;
  onApply: (made: { rows: ImportedLoan[]; name: string; target: number }[]) => void;
  onClose: () => void;
};

/* ---------------------------------------------------------------- figures */

const int = (x: number) => Math.round(Math.abs(x)).toLocaleString("he-IL");

/** ₪ leads the digits, pinned by a bidi isolate (see Money.tsx for why). */
function Nis({ v, signed = false, className = "" }: { v: number; signed?: boolean; className?: string }) {
  const r = Math.round(v);
  const sign = r < 0 ? "−" : signed && r > 0 ? "+" : "";
  return (
    <span className={`am-num ${className}`} dir="ltr">
      {sign}
      <i>₪</i>
      {int(r)}
    </span>
  );
}

/**
 * A sentence from the engine, with every money figure and percentage pinned
 * left-to-right. Inside Hebrew a bare "−₪1,878" is reordered by the bidi
 * algorithm (the minus is a neutral and jumps to the far side of the digits);
 * an isolate per figure keeps sign, ₪ and digits in reading order. A plain
 * hyphen is NOT a sign here — "מ-₪11,420" is a Hebrew prefix and must stay
 * attached to its letter — so only a true minus (U+2212) or a plus is taken in.
 */
const FIGURE = /([−+]?₪\s?\d[\d,]*(?:\.\d+)?|[−+]?\d[\d,]*(?:\.\d+)?%)/g;
function Rich({ text }: { text: string }) {
  const parts = text.split(FIGURE);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 ? (
          <span key={i} className="am-num" dir="ltr">
            {p}
          </span>
        ) : (
          p
        )
      )}
    </>
  );
}

/** 266 → "22.2 שנים"; under a year → "8 חודשים". */
function span(months: number): string {
  const m = Math.round(Math.abs(months));
  if (m < 12) return m === 1 ? "חודש" : `${m} חודשים`;
  const y = Math.round((m / 12) * 10) / 10;
  if (y === 1) return "שנה";
  if (y === 2) return "שנתיים";
  return `${Number.isInteger(y) ? y : y.toFixed(1)} שנים`;
}

const pct = (x: number, d = 2) => `${x.toFixed(d)}%`;
/** "2026-10" → "10/2026": the month the published rates describe. */
const asOfLabel = (s: string) => {
  const m = /^(\d{4})-(\d{2})/.exec(s);
  return m ? `${m[2]}/${m[1]}` : s;
};
const share = (x: number) => `${Math.round(x * 100)}%`;

/**
 * A change against today. Less is better for all three headline figures, so a
 * negative delta reads as the gain (green) and a positive one as the price
 * (red); zero is said as a word rather than as a coloured "₪0".
 */
function Delta({ v, kind }: { v: number; kind: "money" | "months" }) {
  const r = Math.round(v);
  if (r === 0) return <span className="am-delta" data-tone="flat">ללא שינוי</span>;
  const tone = r < 0 ? "good" : "bad";
  return (
    <span className="am-delta" data-tone={tone}>
      {kind === "money" ? (
        <Nis v={r} signed />
      ) : (
        <>
          {r < 0 ? "פחות" : "עוד"} {span(r)}
        </>
      )}
    </span>
  );
}

/**
 * One line of "מה משתנה": a debt, or the small debts of one lender, track and
 * decision that the engine folded together (Proposal.moveGroups). The sums and
 * the sentence are the engine's; the members are the debts themselves.
 */
type Line = { key: string; label: string; members: DebtMove[]; balance: number; fee: number; why: string };
function linesOf(p: Pick<Proposal, "moves" | "moveGroups"> | null, keep: boolean): Line[] {
  if (!p) return [];
  const mine = (a: DebtMove["action"]) => (a === "keep") === keep;
  if (!p.moveGroups) return p.moves.filter((m) => mine(m.action)).map((m) => ({ key: m.id, label: m.label, members: [m], balance: m.balance, fee: m.fee, why: m.why }));
  const byId = new Map(p.moves.map((m) => [m.id, m]));
  return p.moveGroups
    .filter((g) => mine(g.action))
    .map((g) => ({ key: g.ids.join("+"), label: g.label, members: g.ids.map((id) => byId.get(id)).filter((m): m is DebtMove => !!m), balance: g.balance, fee: g.fee, why: g.why }))
    .filter((l) => l.members.length > 0);
}
/** The rate of a line: one figure, or the span between its debts. */
function Rates({ of, none = "—" }: { of: DebtMove[]; none?: string }) {
  const rs = of.map((m) => m.rate).filter((r) => r > 0);
  if (!rs.length) return <>{none}</>;
  const lo = Math.min(...rs);
  const hi = Math.max(...rs);
  return <span dir="ltr">{lo === hi ? pct(lo) : `${lo.toFixed(2)}–${pct(hi)}`}</span>;
}
/** What is left on a line: one term, or the longest of its debts. */
function left(of: DebtMove[]): string {
  const ms = of.map((m) => m.months);
  const hi = Math.max(...ms);
  return Math.min(...ms) === hi ? span(hi) : `עד ${span(hi)}`;
}

/** Which mix opens when the engine recommends none: the order its own recommendation walks, the lowest payment last. */
const OPEN_ORDER: GoalId[] = ["balanced", "savings", "stable", "years", "consolidate", "payment"];

/** The mix's colour signature — share of balance per track. */
function MixBar({ m }: { m: MixMetrics }) {
  const label = m.shares.map((s) => `${TRACK_SHORT[s.track]} ${share(s.share)}`).join(", ");
  return (
    <span className="am-bar" role="img" aria-label={`הרכב: ${label}`} title={label}>
      {m.shares.map((s) => (
        <i key={s.track} style={{ flexGrow: Math.max(s.share, 0.012), background: TRACK_HEX[TRACK_PATH[s.track]] }} />
      ))}
    </span>
  );
}

function TrackName({ track, pathId }: { track?: TrackKey; pathId?: number }) {
  const id = pathId ?? (track ? TRACK_PATH[track] : 0);
  const key = track ?? (Object.keys(TRACK_PATH) as TrackKey[]).find((k) => TRACK_PATH[k] === id);
  return (
    <span className="am-track">
      <i style={{ background: TRACK_HEX[id] ?? "#9a9da6" }} />
      {key ? TRACK_SHORT[key] : "—"}
    </span>
  );
}

/* ------------------------------------------------------------ small parts */

function NumField({
  label,
  value,
  onChange,
  placeholder,
  unit,
  width,
  max,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  unit?: string;
  width: number;
  max?: number;
}) {
  // Typed as text so thousands separators can be shown; parsed on every key.
  const shown = value === null ? "" : unit === "₪" ? Math.round(value).toLocaleString("en-US") : String(value);
  return (
    <label className="am-field">
      <span>{label}</span>
      <span className="am-input" style={{ width }}>
        {unit === "₪" && <i>₪</i>}
        <input
          inputMode="numeric"
          dir="ltr"
          value={shown}
          placeholder={placeholder ?? ""}
          onChange={(e) => {
            const digits = e.target.value.replace(/[^\d]/g, "");
            if (!digits) return onChange(null);
            const n = Number(digits);
            onChange(max ? Math.min(n, max) : n);
          }}
          onFocus={(e) => e.currentTarget.select()}
        />
      </span>
    </label>
  );
}

const SEV_LABEL = { high: "יקר", medium: "לטיפול", info: "לידיעה" } as const;

/** Who would lend the new money — decides the price of every new shekel. */
const TIER_LABEL: Record<PricingTier, string> = {
  bank: "בנק, תנאי שוק",
  bankPremium: "בנק, בתוספת סיכון",
  nonbank: "חוץ־בנקאי",
};
const TIER_OPTIONS = [{ value: "auto", label: "לפי הדוח" }, ...(Object.keys(TIER_LABEL) as PricingTier[]).map((t) => ({ value: t, label: TIER_LABEL[t] }))];

/* ------------------------------------------------------------------ sheet */

const PROFILE_KEY = "aa107.automix.bank";
/** A 26-tranche mortgage closes a long list; the first few name the move, the rest fold. */
const CLOSED_SHOWN = 6;
const FINDINGS_SHOWN = 3;

export default function AutoMix({ master, forecast, forecastOn, inflation, discountRate, clientName, analysis, profileUrl, onApply, onClose }: Props) {
  const reduce = useReducedMotion();
  const [market, setMarket] = useState<MarketSnapshot>(fallback as unknown as MarketSnapshot);
  const [marketReady, setMarketReady] = useState(false);
  const [profile, setProfile] = useState<ClientProfile>(() => {
    let bank: BankId = "system";
    try {
      const saved = localStorage.getItem(PROFILE_KEY);
      if (saved && BANKS.some((b) => b.id === saved)) bank = saved as BankId;
    } catch {}
    return { ...DEFAULT_PROFILE, bank };
  });
  const [result, setResult] = useState<AutoMixResult | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [picked, setPicked] = useState<GoalId | null>(null);
  const [keptOpen, setKeptOpen] = useState(false);
  const [allOpen, setAllOpen] = useState(false);
  /** The folded line whose debts are listed under it. */
  const [openLine, setOpenLine] = useState<string | null>(null);
  const [findOpen, setFindOpen] = useState(false);
  const sheet = useRef<HTMLElement>(null);

  // The market the new money is priced on. The bundled snapshot is always an
  // answer; the stored/live one replaces it when it arrives.
  useEffect(() => {
    let alive = true;
    fetch("/api/aa107/market")
      .then((r) => r.json())
      .then((j: { snapshot?: MarketSnapshot }) => {
        if (alive && j.snapshot) setMarket(j.snapshot);
      })
      .catch(() => {})
      .finally(() => alive && setMarketReady(true));
    // A stale stored snapshot makes the route rebuild from the Bank of Israel,
    // which can take many seconds. The bundled snapshot answers meanwhile.
    const t = window.setTimeout(() => alive && setMarketReady(true), 2500);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, []);

  // What the card already knows fills the fields nobody has typed in yet. The
  // youngest borrower sets the term; the household's whole net income sets PTI.
  useEffect(() => {
    if (!profileUrl) return;
    let alive = true;
    readProfile<AbilityProfile>(profileUrl)
      .then((c) => {
        if (!alive || !c?.linked) return;
        const ages = [c.age1, c.age2].filter((a): a is number => !!a && a > 0);
        const income = [c.income1, c.income2, c.extraIncome1, c.extraIncome2].reduce<number>((a, x) => a + (x && x > 0 ? x : 0), 0);
        setProfile((p) => ({
          ...p,
          propertyValue: p.propertyValue ?? (c.propertyValue && c.propertyValue > 0 ? c.propertyValue : null),
          age: p.age ?? (ages.length ? Math.min(...ages) : null),
          income: p.income ?? (income > 0 ? income : null),
        }));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [profileUrl]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // A listbox of ours that is open owns Esc.
      if (e.key === "Escape" && !document.querySelector('[role="listbox"]')) onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sheet.current?.focus({ preventScroll: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  useEffect(() => {
    try {
      localStorage.setItem(PROFILE_KEY, profile.bank);
    } catch {}
  }, [profile.bank]);

  // THE SOLVER RUNS IN A WORKER (automix.worker.ts): a large report takes about
  // a second for all goals, and the sheet must keep painting and typing while
  // it does. One worker for the life of the sheet; every request carries an id
  // and only the newest one's answer is taken. If a worker cannot be had (an
  // old browser, a blocked script, data that will not clone) the same engine
  // runs on the main thread instead — slower to the eye, identical in result.
  const worker = useRef<Worker | null>(null);
  const noWorker = useRef(false);
  const seq = useRef(0);
  useEffect(() => {
    try {
      worker.current = new Worker(new URL("./automix.worker.ts", import.meta.url), { type: "module" });
    } catch {
      noWorker.current = true;
    }
    return () => {
      worker.current?.terminate();
      worker.current = null;
    };
  }, []);

  // Solve after the frame that shows the sheet, and after a pause in typing.
  useEffect(() => {
    if (!marketReady) return;
    setBusy(true);
    const id = ++seq.current;
    const input: AutoMixInput = { master, market, forecast, forecastOn, inflation, discountRate, profile, analysis };
    const settle = (reply: SolveReply) => {
      if (reply.id !== seq.current) return; // answered an older question
      if (reply.result) {
        setResult(reply.result);
        setFailed(reply.result.ok ? null : reply.result.reason ?? "לא ניתן לבנות תמהיל מהנתונים שבדוח");
      } else {
        setResult(null);
        setFailed(reply.error || "החישוב נכשל");
      }
      setBusy(false);
    };
    const onMain = () =>
      import("../lib/automix")
        .then((m) => settle({ id, result: m.buildAutoMix(input) }))
        .catch((e) => settle({ id, error: e instanceof Error ? e.message : "החישוב נכשל" }));
    const t = window.setTimeout(
      () => {
        const w = worker.current;
        if (!w || noWorker.current) return void onMain();
        w.onmessage = (e: MessageEvent<SolveReply>) => settle(e.data);
        w.onerror = () => {
          noWorker.current = true;
          if (id === seq.current) void onMain();
        };
        try {
          const request: SolveRequest = { id, input };
          w.postMessage(request);
        } catch {
          noWorker.current = true;
          void onMain();
        }
      },
      result ? 320 : 40
    );
    return () => window.clearTimeout(t);
    // `result` only chooses the delay; it must not re-run the solve.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [master, market, marketReady, forecast, forecastOn, inflation, discountRate, profile, analysis]);

  const set = <K extends keyof ClientProfile>(k: K, v: ClientProfile[K]) => setProfile((p) => ({ ...p, [k]: v }));

  const offered = useMemo(() => (result?.proposals ?? []).filter((p) => !p.sameAs), [result]);
  const usable = useMemo(() => offered.filter((p) => p.status === "ok"), [offered]);
  // The open line: the advisor's pick while it still exists, else the recommendation.
  const current: Proposal | null = useMemo(() => {
    const byId = (id: GoalId | null) => usable.find((p) => p.goal === id) ?? null;
    return byId(picked) ?? byId(result?.recommended ?? null) ?? OPEN_ORDER.map(byId).find(Boolean) ?? usable[0] ?? null;
  }, [usable, picked, result]);
  /**
   * Mixes are offered and the engine recommends none of them: each buys its goal
   * at a price in the forecast, and the lowest payment is recommended only for a
   * budget typed under today's. Said in one line, so a missing badge is not read
   * as an oversight.
   */
  const unadvised = useMemo(() => {
    if (!result?.ok || result.recommended || usable.length === 0) return null;
    const dearer = (p: Proposal) => (p.stress[0] ? p.stress[0].totalPaid - p.stress[0].todayTotalPaid : 0) > 0;
    return usable.every(dearer) ? "dearer" : "payment";
  }, [result, usable]);
  /** Goals that reached the same mix as the line shown — named on that line. */
  const twins = (p: Proposal) => (result?.proposals ?? []).filter((q) => q.sameAs === p.goal).map((q) => q.label);

  // Every goal refused for the same reason (insolvency, nothing to refinance):
  // one sentence says it better than six identical lines.
  const blocked = useMemo(() => {
    if (!result?.ok || usable.length > 0 || !offered.length) return null;
    const notes = Array.from(new Set(offered.map((p) => p.note).filter(Boolean)));
    return notes.length === 1 ? (notes[0] as string) : null;
  }, [result, usable, offered]);

  // What stands in the way, and what the advisor chose to build past.
  const blocks = result?.blocks ?? [];
  const openBlocks = blocks.filter((b) => !b.overridden);
  const lifted = blocks.filter((b) => b.overridden);
  /** Some standing block is the lender's own law: no override lifts that one. */
  const canLift = openBlocks.some((b) => !b.law);
  /**
   * Nothing can be offered as things stand: the sheet shows why, and the way
   * past it. Only a real obstacle stops the sheet: a block in the document, or
   * every goal refused. "Nothing improves it" is not one: a mortgage already at
   * or under the market has nothing to build past, and offering "בנייה בכל זאת"
   * there led to "no lender may write such a mix" for a client in good standing.
   */
  const refused = offered.length > 0 && offered.every((p) => p.status === "unavailable");
  const stopped = !failed && !!result?.ok && usable.length === 0 && (openBlocks.length > 0 || (!!blocked && refused));
  /** No goal improves it and nothing moves: every debt with the engine's reason for leaving it. */
  const keptAll = useMemo(() => {
    if (usable.length > 0) return [];
    const p = offered.find((q) => q.status === "no-gain" && q.moves.length > 0 && q.moves.every((m) => m.action === "keep"));
    return linesOf(p ?? null, true);
  }, [usable, offered]);

  // DEBT DUE NOW. Today's החזר חודשי does not carry it, so a plain "versus
  // today" would show every honest mix as a rise. The engine measures each goal
  // against today's mix PLUS the cheapest loan that clears the due debt; the
  // sheet shows that reference as its own line and takes its differences from
  // it. The reference's cost is read back from a proposal (same balance, so the
  // difference in total paid IS the difference in interest and indexation).
  const due = result?.dueNow ?? null;
  const reference = useMemo(() => {
    if (!due) return null;
    const p = usable[0];
    return {
      monthly: due.reference.monthly,
      months: due.reference.months,
      totalPaid: due.reference.totalPaid,
      totalCost: p ? p.metrics.totalCost - (p.metrics.totalPaid - due.reference.totalPaid) : null,
    };
  }, [due, usable]);
  /** A goal's differences: against the reference when debt is due now, else against today. */
  const versus = (p: Proposal) =>
    reference
      ? { monthly: p.metrics.monthly - reference.monthly, months: p.metrics.months - reference.months, cost: p.metrics.totalPaid - reference.totalPaid }
      : { monthly: p.delta.monthly, months: p.delta.months, cost: p.delta.totalCost };

  const hasLoans = master.some((l) => !l.is_guarantor && l.group === "loan" && (Number(l.amount) || 0) > 0);
  const today = result?.today ?? null;

  const moves = current?.moves ?? [];
  const leaving = moves.filter((m) => m.action !== "keep");
  const staying = moves.filter((m) => m.action === "keep");
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  /** The same debts as the sheet lists them: small ones of one lender and track on one line. */
  const closing = useMemo(() => linesOf(current, false), [current]);
  const kept = useMemo(() => linesOf(current, true), [current]);
  const charged = leaving.filter((m) => m.fee > 0);
  const allEstimated = charged.length > 0 && charged.every((m) => m.feeEstimated);

  const create = (ps: Proposal[]) => onApply(ps.map((p) => ({ rows: p.rows, name: p.label, target: p.target })));

  const body = (
    <div className="am-scrim lgr-vars" dir="rtl" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.section
        ref={sheet}
        className="am-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="תמהיל אופטימלי"
        tabIndex={-1}
        data-empty={((failed && !busy) || stopped) || undefined}
        data-ms={result ? Math.round(result.ms) : undefined}
        initial={reduce ? false : { opacity: 0, y: 14, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      >
        <header className="am-head">
          <h2>תמהיל אופטימלי</h2>
          {clientName && <span className="am-who">{clientName}</span>}
          <button type="button" className="am-x" onClick={onClose} aria-label="סגירה">
            <X size={16} weight="bold" />
          </button>
        </header>

        <div className="am-body">
          {/* WHAT THE DOCUMENT CANNOT SAY. Everything here is optional; a field
              left empty is a rule not checked, never a number invented. */}
          {!stopped && (
          <section className="am-profile" aria-label="נתוני הלקוח">
            <h3>נתוני הלקוח</h3>
            <div className="am-fields">
              <NumField
                label="החזר חודשי רצוי"
                unit="₪"
                width={132}
                value={profile.budget}
                placeholder={today ? Math.round(today.monthly).toLocaleString("en-US") : ""}
                onChange={(v) => set("budget", v)}
              />
              <NumField label="הכנסה נטו" unit="₪" width={116} value={profile.income} onChange={(v) => set("income", v)} />
              <NumField label="שווי הנכס" unit="₪" width={132} value={profile.propertyValue} onChange={(v) => set("propertyValue", v)} />
              <NumField label="גיל הלווה הצעיר" width={64} max={99} value={profile.age} onChange={(v) => set("age", v)} />
              <label className="am-field">
                <span>בנק</span>
                <Select
                  variant="input"
                  ariaLabel="הבנק שלפיו מתומחר הכסף החדש"
                  value={profile.bank}
                  options={BANKS.map((b) => ({ value: b.id, label: b.label }))}
                  onChange={(v) => set("bank", v as BankId)}
                  style={{ width: 150 }}
                  minWidth={170}
                />
              </label>
              <label className="am-field" title={result?.pricing.tierWhy}>
                <span>מי מלווה</span>
                <Select
                  variant="input"
                  ariaLabel="סוג המלווה שלפיו מתומחר הכסף החדש"
                  value={profile.tier}
                  options={TIER_OPTIONS.map((o) =>
                    o.value === "auto" && result?.ok ? { ...o, label: `לפי הדוח: ${TIER_LABEL[result.pricing.tier]}` } : o
                  )}
                  onChange={(v) => set("tier", v as ClientProfile["tier"])}
                  style={{ width: 196 }}
                  minWidth={210}
                />
              </label>
              {hasLoans && (
                <button
                  type="button"
                  className="am-switch"
                  role="switch"
                  aria-checked={profile.consolidate}
                  onClick={() => set("consolidate", !profile.consolidate)}
                  title="מחזור הלוואות צרכניות לכסף בביטחון הנכס (כל מטרה)"
                >
                  <span aria-hidden>
                    <i />
                  </span>
                  איחוד הלוואות
                </button>
              )}
            </div>
          </section>
          )}

          {failed && !busy ? (
            <p className="am-empty" role="status">
              <Warning size={18} weight="fill" />
              <span>
                <Rich text={failed} />
              </span>
            </p>
          ) : stopped && result ? (
            /* NOTHING CAN BE OFFERED AS THINGS STAND. The sheet says what is in
               the way, in the document's own facts, and then offers the one
               thing an advisor can still do: build the best case past it. */
            <section className="am-stop" role="status" aria-label="מה עומד בדרך">
              <h3>מה עומד בדרך</h3>
              {openBlocks.length > 0 ? (
                <ul className="am-blocks">
                  {openBlocks.map((b) => (
                    <li key={b.id}>
                      <Warning size={16} weight="fill" />
                      <span>
                        <b>{b.title}</b>
                        <span>
                          <Rich text={b.detail} />
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="am-stop-note">
                  <Rich text={blocked ?? ""} />
                </p>
              )}
              {profile.override ? (
                <div className="am-stop-act">
                  <p>גם אחרי העקיפה אין תמהיל שמלווה כזה רשאי לתת. אפשר לנסות סוג מלווה אחר.</p>
                  <label className="am-field">
                    <span>מי מלווה</span>
                    <Select
                      variant="input"
                      ariaLabel="סוג המלווה שלפיו מתומחר הכסף החדש"
                      value={profile.tier}
                      options={TIER_OPTIONS.map((o) =>
                        o.value === "auto" && result?.ok ? { ...o, label: `לפי הדוח: ${TIER_LABEL[result.pricing.tier]}` } : o
                      )}
                      onChange={(v) => set("tier", v as ClientProfile["tier"])}
                      style={{ width: 196 }}
                      minWidth={210}
                    />
                  </label>
                  <Btn className="lgr-btn" onClick={() => set("override", false)} disabled={busy}>
                    ביטול העקיפה
                  </Btn>
                </div>
              ) : (
                <div className="am-stop-act">
                  <p>אפשר לבנות בכל זאת את התרחיש המיטבי: התמהיל שמלווה מהסוג הנבחר עדיין נותן במצב הזה, עם התנאים להגשתו.</p>
                  <label className="am-field">
                    <span>מי מלווה</span>
                    <Select
                      variant="input"
                      ariaLabel="סוג המלווה שלפיו מתומחר הכסף החדש"
                      value={profile.tier}
                      options={TIER_OPTIONS.map((o) =>
                        o.value === "auto" && result?.ok ? { ...o, label: `לפי הדוח: ${TIER_LABEL[result.pricing.tier]}` } : o
                      )}
                      onChange={(v) => set("tier", v as ClientProfile["tier"])}
                      style={{ width: 196 }}
                      minWidth={210}
                    />
                  </label>
                  <Btn className="lgr-btn lgr-btn-primary" onClick={() => set("override", true)} disabled={busy}>
                    {busy ? "בונה…" : "בנייה בכל זאת"}
                  </Btn>
                </div>
              )}
            </section>
          ) : !result ? (
            <div className="am-skel" role="status" aria-label="בונה תמהילים">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <span key={i} />
              ))}
            </div>
          ) : (
            <div className="am-split">
              <div className="am-side">
              {/* BUILT PAST A BLOCK. Said first and in full: every figure below
                  assumes these were overcome, and each names what that takes. */}
              {lifted.length > 0 && (
                <section className="am-over" aria-label="נבנה למרות חסמים">
                  <header>
                    <b>תרחיש מיטבי, נבנה למרות {lifted.length === 1 ? "חסם אחד" : `${lifted.length} חסמים`} בדוח</b>
                    <button type="button" className="am-more" onClick={() => set("override", false)}>
                      ביטול
                    </button>
                  </header>
                  <ul>
                    {lifted.map((b) => (
                      <li key={b.id}>
                        <b>{b.title}.</b> <Rich text={b.condition} />
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {lifted.length === 0 && canLift && (
                <section className="am-over" data-open aria-label="חסמים בדוח">
                  <header>
                    <b>{openBlocks.filter((b) => !b.law).map((b) => b.title).join(", ")}</b>
                    <button type="button" className="am-more" onClick={() => set("override", true)}>
                      בנייה בכל זאת
                    </button>
                  </header>
                </section>
              )}
              {/* Said only when the blocks above do not already say it. */}
              {lifted.length === 0 && result.pricing.tier !== "bank" && result.pricing.tierWhy && (
                <p className="am-tier">
                  <b>הכסף החדש מתומחר כ{TIER_LABEL[result.pricing.tier]}.</b> <Rich text={result.pricing.tierWhy} />
                </p>
              )}

              {/* THE COMPARISON. Today on top, one line per goal, same columns. */}
              <section className="am-goals" data-busy={busy || undefined} aria-label="בחירת מטרה">
                <div className="am-grid am-grid-h" aria-hidden>
                  <span />
                  <span>מטרה</span>
                  <span>החזר חודשי</span>
                  <span>תקופה</span>
                  <span title="כל מה שישולם מעבר לקרן: ריבית והצמדה למדד, לפי האינפלציה שבלוח">ריבית והצמדה</span>
                  <span>הרכב</span>
                </div>
                {today && (
                  <div className="am-grid am-today" data-monthly={Math.round(today.monthly)} data-interest={Math.round(today.totalInterest)}>
                    <span />
                    <span className="am-goal-name">
                      <b>המצב היום</b>
                    </span>
                    <span className="am-cell">
                      <Nis v={today.monthly} className="am-fig" />
                    </span>
                    <span className="am-cell">
                      <span className="am-fig">{span(today.months)}</span>
                    </span>
                    <span className="am-cell">
                      <Nis v={today.totalCost} className="am-fig" />
                    </span>
                    <MixBar m={today} />
                  </div>
                )}
                {due && reference && (
                  <div className="am-grid am-today am-ref" title="התמהיל של היום ועוד ההלוואה בהחזר הנמוך ביותר שמסלקת את החוב שעומד לפירעון. מולו נמדדת כל מטרה.">
                    <span />
                    <span className="am-goal-name">
                      <b>
                        היום, אחרי סילוק <Nis v={due.total} /> שעומדים לפירעון מיידי
                      </b>
                    </span>
                    <span className="am-cell">
                      <Nis v={reference.monthly} className="am-fig" />
                    </span>
                    <span className="am-cell">
                      <span className="am-fig">{span(reference.months)}</span>
                    </span>
                    <span className="am-cell">{reference.totalCost !== null && <Nis v={reference.totalCost} className="am-fig" />}</span>
                    <span />
                  </div>
                )}
                <div role="radiogroup" aria-label="מטרת התמהיל">
                  {offered.map((p) => {
                    const on = current?.goal === p.goal;
                    const ok = p.status === "ok";
                    const also = twins(p);
                    return (
                      <button
                        key={p.goal}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        disabled={!ok}
                        className="am-grid am-goal"
                        data-on={on || undefined}
                        data-status={p.status}
                        data-monthly={Math.round(p.metrics.monthly)}
                        data-interest={Math.round(p.metrics.totalInterest)}
                        onClick={() => {
                          setPicked(p.goal);
                          setKeptOpen(false);
                          setAllOpen(false);
                          setOpenLine(null);
                        }}
                      >
                        <span className="am-radio" aria-hidden />
                        <span className="am-goal-name">
                          <b>
                            {p.label}
                            {result.recommended === p.goal && ok && <em>מומלץ</em>}
                          </b>
                          {ok && <span>{also.length ? `${p.tagline} (זהה גם ל${also.join(" ול")})` : p.tagline}</span>}
                        </span>
                        {ok ? (
                          <>
                            <span className="am-cell">
                              <Nis v={p.metrics.monthly} className="am-fig" />
                              <Delta v={versus(p).monthly} kind="money" />
                            </span>
                            <span className="am-cell">
                              <span className="am-fig">{span(p.metrics.months)}</span>
                              <Delta v={versus(p).months} kind="months" />
                            </span>
                            <span className="am-cell">
                              <Nis v={p.metrics.totalCost} className="am-fig" />
                              <Delta v={versus(p).cost} kind="money" />
                            </span>
                            <MixBar m={p.metrics} />
                          </>
                        ) : (
                          <span className="am-none">
                            <Rich text={p.note ?? (p.status === "no-gain" ? "אין שיפור ממשי מול המצב היום" : "לא זמין ללקוח הזה")} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {unadvised && (
                  <p className="am-unadvised">
                    {unadvised === "dearer"
                      ? `אין כאן תמהיל מומלץ: ${usable.length === 1 ? "התמהיל שמוצע עולה" : "כל תמהיל שמוצע עולה"} יותר ${reference ? "מקו ההשוואה" : "מהיום"} בסך התשלומים, לפי תחזית בנק ישראל.`
                      : "אין כאן תמהיל מומלץ: ההחזר הנמוך מומלץ רק כשמסגרת ההחזר שהוקלדה נמוכה מההחזר של היום."}
                  </p>
                )}
              </section>

              {result.findings.length > 0 && (
                <section className="am-findings" aria-label="מה הדוח מראה">
                  <h3>מה הדוח מראה</h3>
                  <ul>
                    {(findOpen ? result.findings : result.findings.slice(0, FINDINGS_SHOWN)).map((f) => (
                      <li key={f.id} data-sev={f.severity}>
                        <span className="am-sev">{SEV_LABEL[f.severity]}</span>
                        <span className="am-finding">
                          <b>
                            <Rich text={f.title} />
                          </b>
                          <span>
                            <Rich text={f.detail} />
                          </span>
                        </span>
                        {f.annualCost ? (
                          <span className="am-finding-cost">
                            <Nis v={f.annualCost} /> בשנה
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  {result.findings.length > FINDINGS_SHOWN && (
                    <button type="button" className="am-more" onClick={() => setFindOpen((v) => !v)}>
                      {findOpen ? "הצגת פחות" : `עוד ${result.findings.length - FINDINGS_SHOWN} ממצאים`}
                    </button>
                  )}
                </section>
              )}
              </div>

              {current && (
                <section className="am-detail" data-busy={busy || undefined} aria-label={`פירוט: ${current.label}`} key={current.goal}>
                  <div className="am-col">
                    <h2 className="am-detail-h">
                      {current.label}
                      {current.structure === "bank" && current.refinance && current.priceBank && (
                        <span className="am-tag" data-tone="bank">
                          {current.refinance === "internal" ? "מחזור פנימי" : "מעבר בנק"}
                          {current.priceBank !== "system" ? `, ${BANKS.find((b) => b.id === current.priceBank)?.label ?? ""}` : ""}
                        </span>
                      )}
                      {current.structure && current.structure !== "bank" && (
                        <span className="am-tag" title={current.structureWhy}>
                          {current.structure === "secondLien" ? "שעבוד שני, מאחורי המשכנתא בבנק" : "שעבוד ראשון, במקום המשכנתא בבנק"}
                        </span>
                      )}
                    </h2>
                    <h3>הכסף החדש</h3>
                    {current.tranches.length > 0 ? (
                      <table className="am-table">
                        <thead>
                          <tr>
                            <th>מסלול</th>
                            <th>סכום</th>
                            <th>תקופה</th>
                            <th>ריבית</th>
                            <th>החזר חודשי</th>
                          </tr>
                        </thead>
                        <tbody>
                          {current.tranches.map((t, i) => (
                            <tr key={`${t.track}-${t.segment}-${i}`}>
                              <td>
                                <TrackName track={t.track} />
                                {t.segment === "allPurpose" && <span className="am-tag">כל מטרה</span>}
                              </td>
                              <td>
                                <Nis v={t.amount} />
                              </td>
                              <td className="am-n">{span(t.years * 12)}</td>
                              <td className="am-n">{pct(t.rate)}</td>
                              <td>
                                <Nis v={t.monthly} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td>סה״כ</td>
                            <td>
                              <Nis v={sum(current.tranches.map((t) => t.amount))} />
                            </td>
                            <td />
                            <td />
                            <td>
                              <Nis v={sum(current.tranches.map((t) => t.monthly))} />
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    ) : (
                      <p className="am-quiet">אין כסף חדש בתמהיל הזה.</p>
                    )}

                    {(current.costs.prepaymentFees > 0 || current.costs.setup > 0) && (
                      <dl className="am-costs">
                        {current.costs.prepaymentFees > 0 && (
                          <div>
                            <dt>עמלות פירעון מוקדם{current.costs.feesEstimated ? " (הערכה)" : ""}</dt>
                            <dd>
                              <Nis v={current.costs.prepaymentFees} />
                            </dd>
                          </div>
                        )}
                        {current.costs.setup > 0 && (
                          <div>
                            <dt>עלויות פתיחה (טיפוסי)</dt>
                            <dd>
                              <Nis v={current.costs.setup} />
                            </dd>
                          </div>
                        )}
                        <div>
                          <dt>{current.costs.financed ? "העלויות כלולות בסכום ההלוואה החדשה" : "העלויות משולמות מהכיס, מחוץ לתמהיל"}</dt>
                          <dd>{current.costs.breakEvenMonths !== null ? `מוחזרות תוך ${span(current.costs.breakEvenMonths)}` : ""}</dd>
                        </div>
                      </dl>
                    )}

                    <h3>למה התמהיל הזה</h3>
                    <ul className="am-reasons">
                      {current.reasons.map((r, i) => (
                        <li key={i}>
                          <Rich text={r} />
                        </li>
                      ))}
                    </ul>


                    <h3>מה משתנה</h3>
                    {leaving.length > 0 && (
                      <table className="am-table">
                        <thead>
                          <tr>
                            <th>נסגר במחזור</th>
                            <th>יתרה</th>
                            <th>ריבית</th>
                            <th>נותרו</th>
                            <th>עמלת פירעון{allEstimated ? " (הערכה)" : ""}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(allOpen ? closing : closing.slice(0, CLOSED_SHOWN)).map((l) => {
                            const m = l.members[0];
                            const many = l.members.length > 1;
                            const open = many && openLine === l.key;
                            const estimated = l.members.some((x) => x.fee > 0 && x.feeEstimated);
                            return (
                              <Fragment key={l.key}>
                                <tr title={l.why}>
                                  <td>
                                    <span className="am-fam" data-f={m.group} />
                                    {many ? (
                                      <button type="button" className="am-fold" aria-expanded={open} onClick={() => setOpenLine(open ? null : l.key)}>
                                        {l.label}
                                        <span className="am-fold-n">{l.members.length} מסלולים</span>
                                        <CaretDown size={11} weight="bold" />
                                      </button>
                                    ) : (
                                      l.label
                                    )}
                                    {l.members.some((x) => x.due) && <span className="am-tag" data-tone="neg">לפירעון מיידי</span>}
                                  </td>
                                  <td>
                                    <Nis v={l.balance} />
                                  </td>
                                  <td className="am-n">
                                    <Rates of={l.members} />
                                  </td>
                                  <td className="am-n">{left(l.members)}</td>
                                  <td>{l.fee > 0 ? <Nis v={l.fee} /> : "—"}{l.fee > 0 && estimated && !allEstimated ? <sup>הערכה</sup> : null}</td>
                                </tr>
                                {open &&
                                  l.members.map((x) => (
                                    <tr key={x.id} className="am-sub" title={x.why}>
                                      <td>{x.label}</td>
                                      <td>
                                        <Nis v={x.balance} />
                                      </td>
                                      <td className="am-n">{x.rate > 0 ? pct(x.rate) : "—"}</td>
                                      <td className="am-n">{span(x.months)}</td>
                                      <td>{x.fee > 0 ? <Nis v={x.fee} /> : "—"}</td>
                                    </tr>
                                  ))}
                              </Fragment>
                            );
                          })}
                        </tbody>
                        {closing.length > CLOSED_SHOWN && (
                          <tfoot>
                            <tr>
                              <td>
                                <button type="button" className="am-more" onClick={() => setAllOpen((v) => !v)}>
                                  {allOpen ? "הצגת פחות" : `עוד ${closing.length - CLOSED_SHOWN}`}
                                </button>
                              </td>
                              <td>
                                <Nis v={sum(leaving.map((m) => m.balance))} />
                              </td>
                              <td />
                              <td />
                              <td>{sum(leaving.map((m) => m.fee)) > 0 ? <Nis v={sum(leaving.map((m) => m.fee))} /> : null}</td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    )}
                    {staying.length > 0 && (
                      <div className="am-kept">
                        <button type="button" className="am-kept-h" aria-expanded={keptOpen} onClick={() => setKeptOpen((v) => !v)}>
                          <CaretDown size={12} weight="bold" />
                          <b>
                            {staying.length === 1 ? "מסלול אחד נשאר כמו שהוא" : `${staying.length} מסלולים נשארים כמו שהם`}
                          </b>
                          <Nis v={sum(staying.map((m) => m.balance))} />
                        </button>
                        {keptOpen && (
                          <ul>
                            {kept.map((l) => {
                              const cure = sum(l.members.map((x) => x.cure ?? 0));
                              return (
                                <li key={l.key}>
                                  <span>
                                    <span className="am-fam" data-f={l.members[0].group} />
                                    {l.label}
                                    {l.members.length > 1 && <span className="am-fold-n">{l.members.length} מסלולים</span>}
                                  </span>
                                  <span className="am-n">
                                    <Rates of={l.members} none="" />
                                  </span>
                                  <Nis v={l.balance} />
                                  <p>
                                    {cure > 0 ? (
                                      <>
                                        פיגור של <Nis v={cure} /> מוסדר מהכסף החדש.{" "}
                                      </>
                                    ) : null}
                                    <Rich text={l.why} />
                                  </p>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    )}

                    {current.caveats.length > 0 && (
                      <>
                        <h3>לבדוק לפני הגשה</h3>
                        <ul className="am-caveats">
                          {current.caveats.map((c, i) => (
                            <li key={i}>
                              <Rich text={c} />
                            </li>
                          ))}
                        </ul>
                      </>
                    )}

                    {current.checks.length > 0 && (
                      <>
                        <h3>כללי בנק ישראל</h3>
                        <ul className="am-checks">
                          {current.checks.map((c) => (
                            <li key={c.label} data-ok={c.ok} title={c.rule}>
                              <span>{c.label}</span>
                              <b>{c.value}</b>
                              <em>{c.ok ? "עומד" : "חורג"}</em>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}

                    {current.stress.length > 0 && (
                      <>
                        <h3>אם הכלכלה תשתנה</h3>
                        <table className="am-table am-stress">
                          <thead>
                            <tr>
                              <th>תרחיש</th>
                              <th>החזר בשיא</th>
                              <th>היום</th>
                              <th>סך התשלומים</th>
                              <th>היום</th>
                            </tr>
                          </thead>
                          <tbody>
                            {current.stress.map((s) => (
                              <tr key={s.id}>
                                <td>{s.label}</td>
                                <td data-tone={s.peakMonthly <= s.todayPeakMonthly ? "good" : "bad"}>
                                  <Nis v={s.peakMonthly} />
                                </td>
                                <td className="am-was">
                                  <Nis v={s.todayPeakMonthly} />
                                </td>
                                <td data-tone={s.totalPaid <= s.todayTotalPaid ? "good" : "bad"}>
                                  <Nis v={s.totalPaid} />
                                </td>
                                <td className="am-was">
                                  <Nis v={s.todayTotalPaid} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </>
                    )}
                  </div>
                </section>
              )}
              {!current && (
                <section className="am-detail" data-busy={busy || undefined} aria-label="אין מחזור שמשתלם היום">
                  <div className="am-col">
                    <h2 className="am-detail-h">אין מחזור שמשתלם היום</h2>
                    <p className="am-quiet am-quiet-lead">אף מטרה לא מביאה שיפור ממשי בתנאים האלה. שינוי בנתוני הלקוח או בסוג המלווה יכול לשנות את התמונה.</p>
                    {keptAll.length > 0 && (
                      <>
                        <h3>למה כל חוב נשאר</h3>
                        <div className="am-kept am-kept-open">
                          <ul>
                            {keptAll.map((l) => (
                              <li key={l.key}>
                                <span>
                                  <span className="am-fam" data-f={l.members[0].group} />
                                  {l.label}
                                  {l.members.length > 1 && <span className="am-fold-n">{l.members.length} מסלולים</span>}
                                </span>
                                <span className="am-n">
                                  <Rates of={l.members} none="" />
                                </span>
                                <Nis v={l.balance} />
                                <p>
                                  <Rich text={l.why} />
                                </p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>

        <footer className="am-foot">
          {result?.ok && !stopped && (
            <details className="am-rates">
              <summary>
                <CaretDown size={11} weight="bold" />
                ריביות לכסף חדש: {TIER_LABEL[result.pricing.tier]}, {BANKS.find((b) => b.id === result.pricing.bank)?.label}, נכון ל-{asOfLabel(result.pricing.asOf)}
              </summary>
              <div className="am-rates-pop">
                <table className="am-table">
                  <thead>
                    <tr>
                      <th>מסלול</th>
                      <th>10 שנים</th>
                      <th>20 שנים</th>
                      <th>30 שנים</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.pricing.rows.map((r) => (
                      <tr key={r.track}>
                        <td>
                          <TrackName track={r.track} />
                        </td>
                        <td className="am-n">{pct(r.rate10)}</td>
                        <td className="am-n">{pct(r.rate20)}</td>
                        <td className="am-n">{pct(r.rate30)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.pricing.tierWhy && <p>{result.pricing.tierWhy}</p>}
                {result.pricing.notes.map((n, i) => (
                  <p key={i}>{n}</p>
                ))}
              </div>
            </details>
          )}
          <span className="am-foot-acts">
            {stopped && (
              <Btn className="lgr-btn" onClick={onClose}>
                סגירה
              </Btn>
            )}
            {usable.length > 1 && (
              <Btn className="lgr-btn" onClick={() => create(usable)} disabled={busy}>
                יצירת כל {usable.length} התמהילים
              </Btn>
            )}
            {!stopped && (
              <Btn className="lgr-btn lgr-btn-primary" onClick={() => current && create([current])} disabled={busy || !current}>
                <Plus size={14} weight="bold" />
                {current ? `יצירת התמהיל: ${current.label}` : "יצירת התמהיל"}
              </Btn>
            )}
          </span>
        </footer>
      </motion.section>
    </div>
  );

  return typeof document === "undefined" ? null : createPortal(body, document.body);
}

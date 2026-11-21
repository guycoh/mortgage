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

import { useEffect, useMemo, useRef, useState } from "react";
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
import { buildAutoMix } from "../lib/automix";
import { DEFAULT_PROFILE, type AutoMixResult, type ClientProfile, type GoalId, type MixMetrics, type PricingTier, type Proposal } from "../lib/automix/types";
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

  // Solve after the frame that shows the sheet (and after a pause in typing):
  // the solver is synchronous and the first paint must not wait for it.
  useEffect(() => {
    if (!marketReady) return;
    setBusy(true);
    const t = window.setTimeout(
      () => {
        try {
          const r = buildAutoMix({ master, market, forecast, forecastOn, inflation, discountRate, profile, analysis });
          setResult(r);
          setFailed(r.ok ? null : r.reason ?? "לא ניתן לבנות תמהיל מהנתונים שבדוח");
        } catch (e) {
          setResult(null);
          setFailed(e instanceof Error ? e.message : "החישוב נכשל");
        }
        setBusy(false);
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
    return byId(picked) ?? byId(result?.recommended ?? null) ?? usable[0] ?? null;
  }, [usable, picked, result]);
  /** Goals that reached the same mix as the line shown — named on that line. */
  const twins = (p: Proposal) => (result?.proposals ?? []).filter((q) => q.sameAs === p.goal).map((q) => q.label);

  // Every goal refused for the same reason (insolvency, nothing to refinance):
  // one sentence says it better than six identical lines.
  const blocked = useMemo(() => {
    if (!result?.ok || usable.length > 0 || !offered.length) return null;
    const notes = Array.from(new Set(offered.map((p) => p.note).filter(Boolean)));
    return notes.length === 1 ? (notes[0] as string) : null;
  }, [result, usable, offered]);

  const hasLoans = master.some((l) => !l.is_guarantor && l.group === "loan" && (Number(l.amount) || 0) > 0);
  const today = result?.today ?? null;

  const moves = current?.moves ?? [];
  const leaving = moves.filter((m) => m.action !== "keep");
  const staying = moves.filter((m) => m.action === "keep");
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
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
        data-empty={((failed || blocked) && !busy) || undefined}
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
          {!(blocked && !busy) && (
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

          {(failed || blocked) && !busy ? (
            <p className="am-empty" role="status">
              <Warning size={18} weight="fill" />
              <span>
                <Rich text={failed ?? blocked ?? ""} />
              </span>
            </p>
          ) : !result ? (
            <div className="am-skel" role="status" aria-label="בונה תמהילים">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <span key={i} />
              ))}
            </div>
          ) : (
            <div className="am-split">
              <div className="am-side">
              {result.pricing.tier !== "bank" && result.pricing.tierWhy && (
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
                              <Delta v={p.delta.monthly} kind="money" />
                            </span>
                            <span className="am-cell">
                              <span className="am-fig">{span(p.metrics.months)}</span>
                              <Delta v={p.delta.months} kind="months" />
                            </span>
                            <span className="am-cell">
                              <Nis v={p.metrics.totalCost} className="am-fig" />
                              <Delta v={p.delta.totalCost} kind="money" />
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
                    <h2 className="am-detail-h">{current.label}</h2>
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
                          {(allOpen ? leaving : leaving.slice(0, CLOSED_SHOWN)).map((m) => (
                            <tr key={m.id} title={m.why}>
                              <td>
                                <span className="am-fam" data-f={m.group} />
                                {m.label}
                              </td>
                              <td>
                                <Nis v={m.balance} />
                              </td>
                              <td className="am-n">{m.rate > 0 ? pct(m.rate) : "—"}</td>
                              <td className="am-n">{span(m.months)}</td>
                              <td>{m.fee > 0 ? <Nis v={m.fee} /> : "—"}{m.fee > 0 && m.feeEstimated && !allEstimated ? <sup>הערכה</sup> : null}</td>
                            </tr>
                          ))}
                        </tbody>
                        {leaving.length > CLOSED_SHOWN && (
                          <tfoot>
                            <tr>
                              <td>
                                <button type="button" className="am-more" onClick={() => setAllOpen((v) => !v)}>
                                  {allOpen ? "הצגת פחות" : `עוד ${leaving.length - CLOSED_SHOWN}`}
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
                            {staying.map((m) => (
                              <li key={m.id}>
                                <span>
                                  <span className="am-fam" data-f={m.group} />
                                  {m.label}
                                </span>
                                <span className="am-n">{m.rate > 0 ? pct(m.rate) : ""}</span>
                                <Nis v={m.balance} />
                                <p>
                                  <Rich text={m.why} />
                                </p>
                              </li>
                            ))}
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
              {!current && <p className="am-detail am-quiet">אף מטרה לא מביאה שיפור ממשי בתנאים האלה. שינוי בנתוני הלקוח או בסוג המלווה יכול לשנות את התמונה.</p>}
            </div>
          )}
        </div>

        <footer className="am-foot">
          {result?.ok && !blocked && (
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
            {blocked && !busy && (
              <Btn className="lgr-btn" onClick={onClose}>
                סגירה
              </Btn>
            )}
            {usable.length > 1 && (
              <Btn className="lgr-btn" onClick={() => create(usable)} disabled={busy}>
                יצירת כל {usable.length} התמהילים
              </Btn>
            )}
            {!(blocked && !busy) && (
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

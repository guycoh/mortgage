"use client";

// The decision moment. A "saving" is only claimed once BOTH a current payment
// and a proposed mix exist — until the advisor has built a mix there is nothing
// to compare, so we show the current outlay plainly and prompt for the mix.
// Motion here is motivated: count-ups and bar growth are state-transition
// feedback as the mix is edited.

import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, CaretLeft, TrendDown, TrendUp, Sparkle, ShieldCheck, ShieldWarning, Path, PresentationChart } from "@phosphor-icons/react";
import { shekel } from "../lib/calc";
import { Money } from "./primitives";

/* Grouped digits without the currency mark — the ₪ is set separately, smaller
   and quieter, so the figure reads first. */
const plainNum = (n: number) => Math.round(n || 0).toLocaleString("en-US");

export default function ResultHero({
  currentPayment,
  newPayment,
  income,
  onPresent,
}: {
  currentPayment: number;
  newPayment: number;
  income: number;
  /** Opens the customer-facing one-page summary. Shown once a comparison exists. */
  onPresent?: () => void;
}) {
  const reduce = useReducedMotion();
  const ease = [0.22, 1, 0.36, 1] as const;
  const barTrans = reduce ? { duration: 0 } : { duration: 0.85, ease };

  const hasCurrent = currentPayment > 0;
  const hasNew = newPayment > 0;
  const comparable = hasCurrent && hasNew; // a real before -> after

  const delta = currentPayment - newPayment;
  const saving = delta > 0;
  const pctChange = currentPayment > 0 ? Math.abs(delta) / currentPayment : 0;
  const accent = saving ? "var(--pos)" : "var(--neg)";
  const accentStrong = saving ? "var(--pos-strong)" : "var(--neg-strong)";

  const cap = income * 0.4;
  const newDti = income > 0 ? newPayment / income : null;
  const withinBudget = newDti !== null ? newPayment <= cap : null;

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease }}
      className="aa4-card overflow-hidden"
      style={{
        boxShadow: "var(--shadow-raise)",
        background: "radial-gradient(120% 90% at 50% -30%, var(--brand-tint), transparent 62%), var(--surface)",
      }}
    >
      <div className="aa4-card-pad !py-[1.1rem] md:!px-5">
        <div className="flex items-center justify-between gap-3">
          <span className="aa4-kicker">סיכום האיחוד</span>
          {comparable && withinBudget !== null && (
            <span
              className="flex items-center gap-1.5 rounded-[var(--r-pill)] px-2.5 py-1 text-[12px] font-semibold"
              style={withinBudget ? { color: "var(--pos-strong)", background: "var(--pos-tint)" } : { color: "var(--neg-strong)", background: "var(--neg-tint)" }}
            >
              {withinBudget ? <ShieldCheck className="size-4" /> : <ShieldWarning className="size-4" />}
              {withinBudget ? "בתוך יחס ההחזר" : "חורג מיחס 40%"}
            </span>
          )}
        </div>

        {!hasCurrent && !hasNew ? (
          /* ---- nothing entered yet ---- */
          <div className="mt-4 flex flex-col items-center justify-center rounded-[var(--r-control)] border border-dashed py-10 text-center" style={{ borderColor: "var(--line-2)" }}>
            <Sparkle className="size-6 text-[var(--ink-4)]" />
            <p className="mt-2.5 text-[14px] font-semibold text-[var(--ink-2)]">כאן יופיע החיסכון החודשי</p>
            <p className="mt-1 text-[12.5px] text-[var(--ink-3)]">מלאו הלוואות קיימות ותמהיל חדש כדי להשוות</p>
          </div>
        ) : !comparable ? (
          /* ---- one side only: no comparison yet ---- */
          <PartialState
            hasCurrent={hasCurrent}
            currentPayment={currentPayment}
            newPayment={newPayment}
            income={income}
            reduce={reduce}
            barTrans={barTrans}
          />
        ) : (
          /* ---- real before -> after ---- */
          <>
            {/* One segmented strip instead of three floating cards: equal cells,
                hairline seams, and flow connectors so it reads was -> saved -> is. */}
            <div className="relative mt-4">
              <div
                className="grid grid-cols-1 overflow-hidden rounded-[14px] border md:grid-cols-3"
                style={{
                  borderColor: "var(--line)",
                  background: "var(--surface)",
                  boxShadow: "0 1px 2px rgba(15,32,40,0.03), 0 16px 32px -28px rgba(15,32,40,0.3)",
                }}
              >
                <KpiCell label="החזר חודשי נוכחי" value={currentPayment} color="var(--ink)" sub="לחודש" />
                <KpiCell
                  divider
                  label={saving ? "חיסכון חודשי" : "תוספת חודשית"}
                  labelIcon={saving ? <TrendDown className="size-3.5" weight="bold" /> : <TrendUp className="size-3.5" weight="bold" />}
                  labelColor={accentStrong}
                  value={Math.abs(delta)}
                  color={accentStrong}
                  wash={
                    saving
                      ? "linear-gradient(180deg, rgba(13,138,98,0.045), rgba(13,138,98,0.1))"
                      : "linear-gradient(180deg, rgba(194,59,46,0.04), rgba(194,59,46,0.09))"
                  }
                  sub={
                    <span
                      className="flex items-center gap-1 rounded-[var(--r-pill)] px-2 py-[3px] text-[11px] font-semibold"
                      style={{ background: saving ? "rgba(13,138,98,0.12)" : "rgba(194,59,46,0.11)", color: accentStrong }}
                    >
                      {Math.round(pctChange * 100)}%
                      <span className="opacity-40">·</span>
                      <span className="aa4-fig">{shekel(Math.abs(delta) * 12)}</span> בשנה
                    </span>
                  }
                />
                <KpiCell divider label="החזר לאחר איחוד" value={newPayment} color={accent} sub="לחודש" />
              </div>
              {/* connectors on the seams, pointing along the RTL flow */}
              {["33.333%", "66.666%"].map((pos) => (
                <span
                  key={pos}
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 z-10 hidden size-6 -translate-y-1/2 translate-x-1/2 place-items-center rounded-full border md:grid"
                  style={{
                    insetInlineStart: pos,
                    borderColor: "var(--line)",
                    background: "var(--surface)",
                    color: accentStrong,
                    boxShadow: "0 1px 3px rgba(15,32,40,0.08)",
                  }}
                >
                  <CaretLeft className="size-3" weight="bold" />
                </span>
              ))}
            </div>

            <ComparisonBar current={currentPayment} next={newPayment} income={income} saving={saving} trans={barTrans} reduce={reduce} />

            {onPresent && (
              <div className="mt-4 flex flex-col items-center gap-1.5 border-t pt-3.5" style={{ borderColor: "var(--line)" }}>
                <button onClick={onPresent} className="aa4-btn aa4-btn-primary !px-6 !py-2.5 !text-[13.5px]">
                  <PresentationChart className="size-[18px]" weight="duotone" />
                  הצגת סיכום ללקוח
                </button>
              </div>
            )}

            {newDti !== null && (
              <div className="mt-3 flex items-center gap-3 rounded-[var(--r-control)] border p-3" style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}>
                <span className="flex items-center gap-2 text-[12.5px] font-semibold text-[var(--ink-2)]">
                  <ArrowLeft className="size-4 text-[var(--ink-3)]" />
                  יחס החזר לאחר איחוד
                </span>
                <div className="relative flex-1">
                  <div className="aa4-bar-track" style={{ height: 8 }}>
                    <motion.span
                      className="aa4-bar-fill"
                      initial={reduce ? false : { width: "0%" }}
                      animate={{ width: `${Math.min(newDti / 0.4, 1) * 100}%` }}
                      transition={barTrans}
                      style={{ background: withinBudget ? "var(--pos)" : "var(--neg)" }}
                    />
                  </div>
                </div>
                <div dir="ltr" className="aa4-fig text-[13px] font-semibold" style={{ color: withinBudget ? "var(--pos-strong)" : "var(--neg-strong)" }}>
                  {Math.round(newDti * 100)}%
                  <span className="text-[10px] font-medium text-[var(--ink-3)]"> / 40%</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </motion.section>
  );
}

/* One side only — show the figure we have, prompt for the missing one. */
function PartialState({
  hasCurrent,
  currentPayment,
  newPayment,
  income,
  reduce,
  barTrans,
}: {
  hasCurrent: boolean;
  currentPayment: number;
  newPayment: number;
  income: number;
  reduce: boolean | null;
  barTrans: object;
}) {
  const value = hasCurrent ? currentPayment : newPayment;
  const label = hasCurrent ? "החזר חודשי נוכחי" : "החזר התמהיל החדש";
  const dti = income > 0 ? value / income : null;
  const within = dti !== null ? value <= income * 0.4 : null;
  return (
    <div className="mt-5 grid grid-cols-1 items-center gap-4 md:grid-cols-[minmax(0,1fr)_1.1fr]">
      <div className="rounded-[var(--r-control)] border p-4" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
        <div className="text-[12px] font-semibold text-[var(--ink-3)]">{label}</div>
        <div className="mt-1.5 aa4-fig text-[clamp(1.9rem,4.6vw,2.6rem)] font-semibold leading-none text-[var(--ink)]">
          <Money value={value} />
        </div>
        {dti !== null && (
          <div className="mt-2.5 border-t pt-2 text-[12px]" style={{ borderColor: "var(--line)" }}>
            <span className="text-[var(--ink-3)]">יחס החזר להכנסה </span>
            <span dir="ltr" className="aa4-fig font-semibold" style={{ color: within ? "var(--pos-strong)" : "var(--neg-strong)" }}>
              {Math.round(dti * 100)}% / 40%
            </span>
          </div>
        )}
      </div>

      <div className="flex items-start gap-3 rounded-[var(--r-control)] border border-dashed p-4" style={{ borderColor: "var(--line-2)", background: "var(--surface-2)" }}>
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-[var(--r-pill)] text-[var(--brand-deep)]" style={{ background: "var(--brand-tint)" }}>
          <Path className="size-4" weight="bold" />
        </span>
        <div>
          <p className="text-[13px] font-bold text-[var(--ink)]">
            {hasCurrent ? "בנו תמהיל איחוד כדי לראות את החיסכון" : "אין הלוואות קיימות להשוואה"}
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-[var(--ink-2)]">
            {hasCurrent
              ? "הזינו את מסלולי התמהיל המוצע בטבלת «תמהיל איחוד חדש» וההשוואה תופיע כאן."
              : "הזינו הלוואות בטבלת «הלוואות קיימות» כדי להשוות מול התמהיל."}
          </p>
        </div>
      </div>
    </div>
  );
}

/* One cell of the comparison strip. All three share the same row skeleton
   (fixed-height label, figure, fixed-height sub) so the number baselines land
   on one line across the strip. */
function KpiCell({
  label,
  labelIcon,
  labelColor,
  value,
  color,
  sub,
  wash,
  divider,
}: {
  label: string;
  labelIcon?: React.ReactNode;
  labelColor?: string;
  value: number;
  color: string;
  sub: React.ReactNode;
  wash?: string;
  divider?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center px-4 py-4 text-center ${divider ? "border-t md:border-t-0 md:border-s" : ""}`}
      style={{ background: wash, borderColor: "var(--line)" }}
    >
      <span className="flex h-[18px] items-center gap-1.5 text-[11.5px] font-semibold" style={{ color: labelColor ?? "var(--ink-3)" }}>
        {labelIcon}
        {label}
      </span>
      <div dir="ltr" className="mt-1.5 flex items-baseline justify-center gap-1 aa4-fig text-[clamp(1.85rem,3.3vw,2.4rem)] font-semibold leading-none" style={{ color }}>
        <span className="text-[0.55em] font-medium opacity-55">₪</span>
        <Money value={value} format={plainNum} />
      </div>
      <div className="mt-1.5 flex min-h-[22px] items-center text-[11px] text-[var(--ink-4)]">{sub}</div>
    </div>
  );
}

/* A single bar: the current total, split into the part still paid after the
   consolidation (solid petrol) and the part saved / added (tinted). More
   legible than two side-by-side bars. */
function ComparisonBar({
  current,
  next,
  income,
  saving,
  trans,
  reduce,
}: {
  current: number;
  next: number;
  income: number;
  saving: boolean;
  trans: object;
  reduce: boolean | null;
}) {
  const max = Math.max(current, next, 1);
  const base = Math.min(current, next); // paid under both scenarios
  const diff = Math.abs(current - next);
  const basePct = (base / max) * 100;
  const diffPct = (diff / max) * 100;
  const diffColor = saving ? "var(--pos)" : "var(--neg)";
  const cap = income * 0.4;
  const capPct = income > 0 ? Math.min((cap / max) * 100, 100) : null;

  return (
    <div className="mt-4">
      <div className="relative">
        <div className="aa4-bar-track" style={{ height: 10 }}>
          <motion.span
            className="absolute inset-y-0"
            style={{ insetInlineStart: 0, background: "var(--brand)" }}
            initial={reduce ? false : { width: "0%" }}
            animate={{ width: `${basePct}%` }}
            transition={trans}
          />
          <motion.span
            className="absolute inset-y-0"
            style={{ insetInlineStart: `${basePct}%`, background: diffColor, opacity: 0.32 }}
            initial={reduce ? false : { width: "0%" }}
            animate={{ width: `${diffPct}%` }}
            transition={reduce ? { duration: 0 } : { ...trans, delay: 0.1 }}
          />
        </div>
        {capPct !== null && (
          <span className="absolute top-1/2 h-4 -translate-y-1/2 border-l border-dashed" style={{ insetInlineStart: `${capPct}%`, borderColor: "var(--ink-3)" }} />
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px]">
        <span className="flex items-center gap-1.5 text-[var(--ink-2)]">
          <span className="size-2.5 rounded-[var(--r-pill)]" style={{ background: "var(--brand)" }} />
          החזר לאחר איחוד
          <span className="aa4-fig font-semibold text-[var(--ink)]">{shekel(next)}</span>
        </span>
        <span className="flex items-center gap-1.5" style={{ color: saving ? "var(--pos-strong)" : "var(--neg-strong)" }}>
          <span className="size-2.5 rounded-[var(--r-pill)]" style={{ background: diffColor, opacity: 0.4 }} />
          {saving ? "נחסך" : "תוספת"}
          <span className="aa4-fig font-semibold">{shekel(diff)}</span>
        </span>
        {capPct !== null && (
          <span className="flex items-center gap-1.5 text-[var(--ink-3)]">
            <span className="inline-block h-3 w-px border-l border-dashed" style={{ borderColor: "var(--ink-3)" }} />
            קו 40% מההכנסה
            <span className="aa4-fig font-medium text-[var(--ink-2)]">{shekel(cap)}</span>
          </span>
        )}
      </div>
    </div>
  );
}

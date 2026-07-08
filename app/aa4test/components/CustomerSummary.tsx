"use client";

// The customer-facing deliverable: a one-page consolidation summary the
// advisor presents (or prints to PDF) at the end of the session. Styled as a
// modern bank statement: editorial masthead with a double rule, one cohesive
// savings band, numbered statement tables whose totals close with the classic
// accounting double-rule, and a sealed closing statement.

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  X,
  Printer,
  TrendDown,
  TrendUp,
  ArrowDown,
  Wallet,
  WarningCircle,
  SealCheck,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { parseNum as liabNum, type LiabilityRow, type ReportSlot } from "@/components/credit-import";
import { monthlyPayment, parseNum, shekel } from "../lib/calc";
import { shortBank } from "../debtTags";
import { BankBadge, TypeTag } from "./badges";
import { Money } from "./primitives";
import type { LoanRow, MixRow } from "./Ledger";
import { mixTypeMeta } from "./mixTypes";
import type { Persona } from "./LiabilitiesBoard";

const ease = [0.22, 1, 0.36, 1] as const;

/** A figure with a quiet, smaller ₪ mark — reads like a statement, not a label. */
function Fig({ v, className }: { v: number; className?: string }) {
  return (
    <span className={cn("aa4-fig font-semibold", className)}>
      <span className="me-0.5 text-[0.6em] font-medium opacity-60">₪</span>
      {Math.round(v).toLocaleString("en-US")}
    </span>
  );
}

/** Plain grouped number for table cells — the ₪ lives in the column head. */
const num = (n: number) => (n > 0 ? Math.round(n).toLocaleString("en-US") : "—");

interface Props {
  open: boolean;
  onClose: () => void;
  loans: LoanRow[];
  mixLoans: MixRow[];
  liabRows: LiabilityRow[];
  slots: ReportSlot[];
  personas: Persona[];
  currentPayment: number;
  newPayment: number;
  income: number;
}

export default function CustomerSummary({
  open,
  onClose,
  loans,
  mixLoans,
  liabRows,
  slots,
  personas,
  currentPayment,
  newPayment,
  income,
}: Props) {
  const reduce = useReducedMotion();

  // Esc closes; page scroll locks while the sheet is up.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const realLoans = loans.filter((l) => parseNum(l.balance) > 0);
  const realMix = mixLoans.filter((m) => parseNum(m.balance) > 0);
  const totalBalance = realLoans.reduce((s, l) => s + parseNum(l.balance), 0);
  const totalMix = realMix.reduce((s, m) => s + parseNum(m.balance), 0);

  const delta = currentPayment - newPayment;
  const saving = delta > 0;
  const pct = currentPayment > 0 ? Math.round((Math.abs(delta) / currentPayment) * 100) : 0;
  const newDti = income > 0 ? Math.round((newPayment / income) * 100) : null;

  const otherDebts = liabRows.filter(
    (r) => r.category === "card" || r.category === "overdraft" || r.category === "other"
  );
  const otherTotal = otherDebts.reduce((s, r) => s + liabNum(r.balance), 0);
  const overdueTotal = liabRows.reduce((s, r) => s + r.overdue, 0);

  const today = new Date().toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });

  const accentStrong = saving ? "var(--pos-strong)" : "var(--neg-strong)";

  // Staggered section reveal — one orchestrated entrance, then everything rests.
  const seg = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.45, ease, delay: 0.12 + i * 0.09 },
        };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
          className="aa4-summary-overlay fixed inset-0 z-[90] flex overflow-y-auto p-4 md:p-8"
          style={{ background: "rgba(15, 32, 40, 0.45)", backdropFilter: "blur(4px)" }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="סיכום איחוד הלוואות ללקוח"
            onClick={(e) => e.stopPropagation()}
            initial={reduce ? false : { opacity: 0, y: 22, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 14, scale: 0.99 }}
            transition={{ duration: 0.4, ease }}
            className="aa4-summary-sheet relative m-auto w-full max-w-[880px] overflow-hidden rounded-[var(--r-card)] bg-[var(--surface)]"
            style={{ boxShadow: "0 40px 90px -30px rgba(15,32,40,0.55)" }}
          >
            {/* letterhead accent */}
            <div className="h-[6px]" style={{ background: "linear-gradient(90deg, var(--brand-deep), var(--brand-bright) 55%, var(--pos))" }} />

            {/* masthead */}
            <header className="px-6 pt-5 md:px-9">
              <div
                className="flex items-center justify-between border-b pb-2 text-[10.5px] font-semibold tracking-[0.08em] text-[var(--ink-3)]"
                style={{ borderColor: "var(--line)" }}
              >
                <span>מסמך סיכום ללקוח</span>
                <span className="aa4-fig tracking-normal">{today}</span>
              </div>

              <div className="flex items-start justify-between gap-4 pt-4">
                <div className="min-w-0">
                  <h2 className="aa4-display text-[clamp(1.6rem,3.4vw,2rem)] font-bold leading-tight text-[var(--ink)]">
                    סיכום איחוד הלוואות
                  </h2>
                  {slots.length > 0 ? (
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      {slots.map((s, i) => (
                        <span
                          key={s.id}
                          className="flex items-center gap-1.5 rounded-[var(--r-pill)] border py-1 pe-2.5 ps-1 text-[12px] font-semibold text-[var(--ink-2)]"
                          style={{ borderColor: "var(--line-2)", background: "var(--surface-2)" }}
                        >
                          <span
                            className="grid size-5 place-items-center rounded-full text-[10px] font-bold text-white"
                            style={{ background: personas[i]?.color ?? "var(--brand)" }}
                          >
                            {(s.report.client.name || "?").charAt(0)}
                          </span>
                          {s.report.client.name}
                          {s.report.client.idNumber && (
                            <span className="aa4-fig text-[10.5px] font-medium text-[var(--ink-3)]" dir="ltr">
                              · {s.report.client.idNumber}
                            </span>
                          )}
                        </span>
                      ))}
                      <span className="text-[11px] text-[var(--ink-3)]">
                        על בסיס דוח ריכוז נתונים {slots[0].report.meta.reportDate && `מ-${slots[0].report.meta.reportDate}`}
                      </span>
                    </div>
                  ) : (
                    <div className="mt-1.5 text-[12px] text-[var(--ink-3)]">על בסיס נתונים שהוזנו ידנית</div>
                  )}
                </div>
                <div className="aa4-no-print flex shrink-0 items-center gap-1.5 pt-0.5">
                  <button onClick={() => window.print()} className="aa4-btn aa4-btn-ghost !px-3 !py-2 !text-[12.5px]">
                    <Printer className="size-4" />
                    הדפסה / PDF
                  </button>
                  <button onClick={onClose} className="aa4-iconbtn" aria-label="סגירת הסיכום" autoFocus>
                    <X className="size-4.5" />
                  </button>
                </div>
              </div>

              {/* financial-print double rule */}
              <div className="mt-4 border-b-[3px]" style={{ borderBottomStyle: "double", borderColor: "var(--line-2)" }} />
            </header>

            <div className="px-6 py-5 md:px-9">
              {/* ---- the savings band: one composition — hero, ladder, bar ---- */}
              <motion.div
                {...seg(0)}
                className="overflow-hidden rounded-[16px] border"
                style={{
                  borderColor: saving ? "rgba(13,138,98,0.24)" : "rgba(194,59,46,0.22)",
                  background: saving
                    ? "radial-gradient(130% 140% at 14% -20%, rgba(255,255,255,0.95), transparent 52%), linear-gradient(160deg, #eefaf4 0%, #d8f0e4 100%)"
                    : "radial-gradient(130% 140% at 14% -20%, rgba(255,255,255,0.95), transparent 52%), linear-gradient(160deg, #fbeeeb 0%, #f2ded9 100%)",
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-[1.45fr_1fr]">
                  {/* saving hero */}
                  <div className="flex flex-col items-center justify-center px-6 py-6 text-center">
                    <span className="flex items-center justify-center gap-1.5 text-[12.5px] font-bold" style={{ color: accentStrong }}>
                      {saving ? <TrendDown className="size-4" weight="bold" /> : <TrendUp className="size-4" weight="bold" />}
                      {saving ? "חיסכון חודשי" : "תוספת חודשית"}
                    </span>
                    <div className="mt-1 flex items-baseline justify-center gap-1.5" style={{ color: accentStrong }}>
                      <span className="aa4-fig text-[1.35rem] font-medium opacity-60">₪</span>
                      <Money
                        value={Math.abs(delta)}
                        format={(n) => Math.round(n).toLocaleString("en-US")}
                        className="text-[clamp(2.7rem,6vw,3.4rem)] font-semibold leading-none"
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
                      <span
                        className="rounded-[var(--r-pill)] px-2.5 py-1 text-[11.5px] font-bold"
                        style={{ background: saving ? "rgba(13,138,98,0.14)" : "rgba(194,59,46,0.12)", color: accentStrong }}
                      >
                        {pct}% {saving ? "פחות" : "יותר"}
                      </span>
                      <span
                        className="rounded-[var(--r-pill)] px-2.5 py-1 text-[11.5px] font-semibold"
                        style={{ background: saving ? "rgba(13,138,98,0.14)" : "rgba(194,59,46,0.12)", color: accentStrong }}
                      >
                        <Fig v={Math.abs(delta) * 12} /> בשנה
                      </span>
                    </div>
                  </div>

                  {/* before -> after ladder, floated as an inset card */}
                  <div className="p-3.5 md:ps-0">
                    <div
                      className="flex h-full flex-col justify-center rounded-[12px] border px-5 py-4"
                      style={{ borderColor: "rgba(255,255,255,0.9)", background: "rgba(255,255,255,0.72)", backdropFilter: "blur(2px)" }}
                    >
                      <div className="grid grid-cols-[14px_1fr_auto] items-center gap-x-3">
                        <span className="mx-auto size-2.5 rounded-full" style={{ background: "var(--ink-4)" }} />
                        <span className="text-[12px] font-semibold text-[var(--ink-3)]">החזר חודשי היום</span>
                        <Fig v={currentPayment} className="text-[1.25rem] leading-none text-[var(--ink)]" />
                      </div>
                      <div className="grid grid-cols-[14px_1fr] items-center">
                        <span className="mx-auto flex flex-col items-center py-0.5">
                          <span className="h-2 w-px" style={{ background: "var(--line-2)" }} />
                          <ArrowDown className="my-0.5 size-3 text-[var(--ink-4)]" weight="bold" />
                          <span className="h-2 w-px" style={{ background: "var(--line-2)" }} />
                        </span>
                        <span className="text-[10.5px] text-[var(--ink-4)]">איחוד לתמהיל אחד</span>
                      </div>
                      <div className="grid grid-cols-[14px_1fr_auto] items-center gap-x-3">
                        <span className="mx-auto size-2.5 rounded-full" style={{ background: "var(--brand)", boxShadow: "0 0 0 3px var(--brand-tint)" }} />
                        <span className="text-[12px] font-bold text-[var(--ink-2)]">החזר לאחר איחוד</span>
                        <Fig v={newPayment} className="text-[1.5rem] leading-none text-[var(--brand-deep)]" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* the bar lives inside the band — one story, one block */}
                {(() => {
                  const max = Math.max(currentPayment, newPayment, 1);
                  const basePct = (Math.min(currentPayment, newPayment) / max) * 100;
                  const diffPct = (Math.abs(delta) / max) * 100;
                  return (
                    <div className="px-5 pb-4 pt-1">
                      <div className="aa4-bar-track" style={{ height: 16, background: "rgba(15,32,40,0.08)" }}>
                        <motion.span
                          className="absolute inset-y-0"
                          style={{ insetInlineStart: 0, background: "var(--brand)" }}
                          initial={reduce ? false : { width: "0%" }}
                          animate={{ width: `${basePct}%` }}
                          transition={reduce ? { duration: 0 } : { duration: 0.7, ease, delay: 0.25 }}
                        />
                        <motion.span
                          className="absolute inset-y-0"
                          style={{ insetInlineStart: `${basePct}%`, background: saving ? "var(--pos)" : "var(--neg)", opacity: 0.34 }}
                          initial={reduce ? false : { width: "0%" }}
                          animate={{ width: `${diffPct}%` }}
                          transition={reduce ? { duration: 0 } : { duration: 0.7, ease, delay: 0.4 }}
                        />
                        {diffPct > 14 && (
                          <span className="absolute inset-y-0 grid place-items-center" style={{ insetInlineStart: `${basePct}%`, width: `${diffPct}%` }}>
                            <span className="text-[10px] font-bold" style={{ color: accentStrong }}>
                              {pct}%
                            </span>
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px]">
                        <span className="flex items-center gap-1.5 text-[var(--ink-3)]">
                          <span className="size-2 rounded-full" style={{ background: "var(--brand)" }} />
                          החזר לאחר איחוד
                          <Fig v={newPayment} className="text-[11.5px] text-[var(--ink-2)]" />
                        </span>
                        <span className="flex items-center gap-1.5" style={{ color: accentStrong }}>
                          <span className="size-2 rounded-full" style={{ background: saving ? "var(--pos)" : "var(--neg)", opacity: 0.45 }} />
                          {saving ? "נחסך" : "תוספת"}
                          <Fig v={Math.abs(delta)} className="text-[11.5px]" />
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </motion.div>

              {/* ---- 01 · existing liabilities ---- */}
              <motion.div {...seg(1)}>
                <SheetSection
                  index="01"
                  title="ההתחייבויות הקיימות"
                  sub={`${realLoans.length} הלוואות ומשכנתאות · יתרה כוללת ${shekel(totalBalance)}`}
                >
                  <table className="aa4-sheet-table w-full border-collapse text-[12.5px]">
                    <thead>
                      <tr className="border-b text-[10px] font-semibold text-[var(--ink-3)]" style={{ borderColor: "var(--line-2)" }}>
                        <th className="px-4 py-2.5 text-right font-semibold">גורם מלווה</th>
                        <th className="px-3 py-2.5 text-left font-semibold">
                          יתרת חוב <span className="opacity-60">₪</span>
                        </th>
                        <th className="px-3 py-2.5 text-center font-semibold">ריבית</th>
                        <th className="px-3 py-2.5 text-center font-semibold">חודשים</th>
                        <th className="px-4 py-2.5 text-left font-semibold">
                          החזר חודשי <span className="opacity-60">₪</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {realLoans.map((l, i) => (
                        <tr key={l._id ?? i} className="border-b" style={{ borderColor: "var(--line-soft)" }}>
                          <td className="px-4 py-2.5">
                            <span className="flex items-center gap-2">
                              <BankBadge source={l.source || undefined} size={19} />
                              <span className="font-semibold text-[var(--ink)]">{shortBank(l.source) || l.source || "הלוואה"}</span>
                              <TypeTag kind={l.kind} typeLabel={l.typeLabel} />
                            </span>
                          </td>
                          <td className="aa4-fig px-3 py-2.5 text-left font-medium text-[var(--ink)]">{num(parseNum(l.balance))}</td>
                          <td className="aa4-fig px-3 py-2.5 text-center text-[var(--ink-2)]">{l.interest ? `${l.interest}%` : "—"}</td>
                          <td className="aa4-fig px-3 py-2.5 text-center text-[var(--ink-2)]">{l.months || "—"}</td>
                          <td className="aa4-fig px-4 py-2.5 text-left font-semibold text-[var(--ink)]">
                            {num(monthlyPayment(l.balance, l.interest, l.months))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <TotalsRow label={`סה"כ ${realLoans.length} התחייבויות`} balance={totalBalance} monthly={currentPayment} />
                  </table>
                </SheetSection>

                {(otherDebts.length > 0 || overdueTotal > 0) && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    {otherDebts.length > 0 && (
                      <span
                        className="flex items-center gap-1.5 rounded-[var(--r-pill)] border px-2.5 py-1 text-[11px] font-semibold text-[var(--ink-2)]"
                        style={{ borderColor: "var(--line-2)", background: "var(--surface-2)" }}
                      >
                        <Wallet className="size-3.5 text-[var(--ink-3)]" />
                        {otherDebts.length} חובות נוספים שאינם באיחוד (מסגרות ועו"ש)
                        <Fig v={otherTotal} className="text-[11.5px] text-[var(--ink)]" />
                      </span>
                    )}
                    {overdueTotal > 0 && (
                      <span
                        className="flex items-center gap-1.5 rounded-[var(--r-pill)] border px-2.5 py-1 text-[11px] font-bold"
                        style={{ borderColor: "rgba(194,59,46,0.3)", background: "var(--neg-tint)", color: "var(--neg-strong)" }}
                      >
                        <WarningCircle className="size-3.5" />
                        יתרות בפיגור על פי הדוח
                        <Fig v={overdueTotal} className="text-[11.5px]" />
                      </span>
                    )}
                  </div>
                )}
              </motion.div>

              {/* ---- 02 · proposed mix ---- */}
              <motion.div {...seg(2)}>
                <SheetSection index="02" title="התמהיל המוצע" sub={`${realMix.length} מסלולים · סך ${shekel(totalMix)}`}>
                  <table className="aa4-sheet-table w-full border-collapse text-[12.5px]">
                    <thead>
                      <tr className="border-b text-[10px] font-semibold text-[var(--ink-3)]" style={{ borderColor: "var(--line-2)" }}>
                        <th className="px-4 py-2.5 text-right font-semibold">מסלול</th>
                        <th className="px-3 py-2.5 text-left font-semibold">
                          סכום <span className="opacity-60">₪</span>
                        </th>
                        <th className="px-3 py-2.5 text-center font-semibold">ריבית</th>
                        <th className="px-3 py-2.5 text-center font-semibold">חודשים</th>
                        <th className="px-4 py-2.5 text-left font-semibold">
                          החזר חודשי <span className="opacity-60">₪</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {realMix.map((m, i) => {
                        const meta = mixTypeMeta(m.type);
                        return (
                          <tr key={m._id ?? i} className="border-b" style={{ borderColor: "var(--line-soft)" }}>
                            <td className="px-4 py-2.5">
                              <span className="flex items-center gap-2 font-semibold text-[var(--ink)]">
                                <span className="size-2.5 rounded-full" style={{ background: meta?.color ?? "var(--brand)" }} />
                                {m.type || "מסלול"}
                              </span>
                            </td>
                            <td className="aa4-fig px-3 py-2.5 text-left font-medium text-[var(--ink)]">{num(parseNum(m.balance))}</td>
                            <td className="aa4-fig px-3 py-2.5 text-center text-[var(--ink-2)]">{m.interest ? `${m.interest}%` : "—"}</td>
                            <td className="aa4-fig px-3 py-2.5 text-center text-[var(--ink-2)]">{m.months || "—"}</td>
                            <td className="aa4-fig px-4 py-2.5 text-left font-semibold text-[var(--ink)]">
                              {num(monthlyPayment(m.balance, m.interest, m.months))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <TotalsRow label={`סה"כ ${realMix.length} מסלולים`} balance={totalMix} monthly={newPayment} />
                  </table>
                </SheetSection>
              </motion.div>

              {/* ---- closing statement — the signature moment ---- */}
              <motion.div
                {...seg(3)}
                className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-[14px] border px-5 py-4"
                style={
                  saving
                    ? { background: "linear-gradient(135deg, #e9f7f1 0%, #d8f0e4 55%, #e4f4ed 100%)", borderColor: "rgba(13,138,98,0.26)" }
                    : { background: "linear-gradient(135deg, #f9ecea 0%, #f2ddd8 55%, #f7e8e4 100%)", borderColor: "rgba(194,59,46,0.22)" }
                }
              >
                <span
                  className="grid size-11 shrink-0 place-items-center rounded-full text-white"
                  style={{
                    background: saving ? "var(--pos)" : "var(--neg)",
                    boxShadow: saving ? "0 8px 18px -8px rgba(13,138,98,0.6)" : "0 8px 18px -8px rgba(194,59,46,0.55)",
                  }}
                >
                  <SealCheck className="size-6" weight="fill" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-bold leading-snug" style={{ color: accentStrong }}>
                    {saving ? (
                      <>
                        חיסכון של <Fig v={Math.abs(delta)} className="text-[1.1em]" /> בכל חודש
                      </>
                    ) : (
                      <>
                        תוספת של <Fig v={Math.abs(delta)} className="text-[1.1em]" /> בכל חודש
                      </>
                    )}
                  </div>
                  <div className="mt-0.5 text-[12px] font-medium text-[var(--ink-2)]">
                    <Fig v={Math.abs(delta) * 12} className="text-[12px]" /> בשנה · {pct}%{" "}
                    {saving ? "פחות מההחזר הנוכחי" : "מעל ההחזר הנוכחי"}
                  </div>
                </div>
                {newDti !== null && (
                  <div className="shrink-0">
                    <div className="text-[10.5px] font-semibold text-[var(--ink-3)]">יחס החזר להכנסה לאחר איחוד</div>
                    <div className="mt-1.5 flex items-center gap-2.5">
                      <div className="aa4-bar-track" style={{ width: 110, height: 6, background: "rgba(15,32,40,0.09)" }}>
                        <motion.span
                          className="aa4-bar-fill"
                          initial={reduce ? false : { width: "0%" }}
                          animate={{ width: `${Math.min(newDti / 40, 1) * 100}%` }}
                          transition={reduce ? { duration: 0 } : { duration: 0.6, ease, delay: 0.5 }}
                          style={{ background: newDti <= 40 ? "var(--pos)" : "var(--neg)" }}
                        />
                      </div>
                      <span
                        dir="ltr"
                        className="aa4-fig text-[13px] font-bold leading-none"
                        style={{ color: newDti <= 40 ? "var(--pos-strong)" : "var(--neg-strong)" }}
                      >
                        {newDti}%<span className="text-[9.5px] font-medium text-[var(--ink-3)]"> /40%</span>
                      </span>
                    </div>
                  </div>
                )}
              </motion.div>

              <div className="mt-4 border-t pt-3 text-center text-[10px] leading-relaxed text-[var(--ink-4)]" style={{ borderColor: "var(--line)" }}>
                הופק באמצעות סימולטור איחוד ההלוואות · {today} · החישובים להמחשה בלבד ואינם מהווים ייעוץ או הצעה מחייבת
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* The statement's totals band: closed with the classic accounting double rule,
   tinted, and set a size up so the bottom line is unmistakable. */
function TotalsRow({ label, balance, monthly }: { label: string; balance: number; monthly: number }) {
  const cell = { borderTop: "3px double var(--line-2)", background: "rgba(29,117,161,0.055)" } as const;
  return (
    <tfoot>
      <tr>
        <td className="px-4 py-3 text-[11.5px] font-bold text-[var(--ink-2)]" style={cell}>
          {label}
        </td>
        <td className="px-3 py-3 text-left" style={cell}>
          <Fig v={balance} className="text-[15px] text-[var(--ink)]" />
        </td>
        <td colSpan={2} style={cell} />
        <td className="px-4 py-3 text-left" style={cell}>
          <span className="flex items-baseline justify-end gap-1.5">
            <Fig v={monthly} className="text-[16px] text-[var(--brand-deep)]" />
            <span className="text-[9.5px] font-semibold text-[var(--ink-3)]">לחודש</span>
          </span>
        </td>
      </tr>
    </tfoot>
  );
}

function SheetSection({
  index,
  title,
  sub,
  children,
}: {
  index: string;
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-0.5">
        <h3 className="flex items-center gap-2 text-[13.5px] font-bold text-[var(--ink)]">
          <span className="h-3.5 w-[3px] rounded-full" style={{ background: "var(--brand)" }} />
          <span className="aa4-fig text-[11px] font-semibold text-[var(--brand)]">{index}</span>
          {title}
        </h3>
        {sub && <span className="aa4-fig text-[11px] text-[var(--ink-3)]">{sub}</span>}
      </div>
      <div className="overflow-hidden rounded-[var(--r-control)] border bg-[var(--surface)]" style={{ borderColor: "var(--line)" }}>
        {children}
      </div>
    </section>
  );
}

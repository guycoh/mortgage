"use client";

// The customer-facing deliverable: a one-page consolidation summary the
// advisor presents (or prints to PDF) at the end of the session. Document
// styling — letterhead accent, clean tables, one savings statement — in the
// same institutional design language as the rest of /aa4.

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  X,
  Printer,
  TrendDown,
  TrendUp,
  Wallet,
  WarningCircle,
  SealCheck,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { parseNum as liabNum, type LiabilityRow, type ReportSlot } from "@/components/credit-import";
import { monthlyPayment, parseNum, shekel } from "../lib/calc";
import { shortBank } from "../debtTags";
import { BankBadge, TypeTag } from "./badges";
import type { LoanRow, MixRow } from "./Ledger";
import { mixTypeMeta } from "./mixTypes";
import type { Persona } from "./LiabilitiesBoard";

const ease = [0.22, 1, 0.36, 1] as const;

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
            className="aa4-summary-sheet relative m-auto w-full max-w-[860px] overflow-hidden rounded-[var(--r-card)] bg-[var(--surface)]"
            style={{ boxShadow: "0 40px 90px -30px rgba(15,32,40,0.55)" }}
          >
            {/* letterhead accent */}
            <div className="h-[5px]" style={{ background: "linear-gradient(90deg, var(--brand-deep), var(--brand-bright) 55%, var(--pos))" }} />

            {/* header */}
            <header className="flex items-start justify-between gap-4 border-b px-6 pb-5 pt-5 md:px-8" style={{ borderColor: "var(--line)" }}>
              <div className="min-w-0">
                <div className="aa4-kicker">מסמך סיכום ללקוח · {today}</div>
                <h2 className="aa4-display mt-1 text-[1.55rem] font-bold leading-tight text-[var(--ink)]">
                  סיכום איחוד הלוואות
                </h2>
                {slots.length > 0 ? (
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                    {slots.map((s, i) => (
                      <span key={s.id} className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--ink-2)]">
                        <span
                          className="grid size-5 place-items-center rounded-full text-[10px] font-bold text-white"
                          style={{ background: personas[i]?.color ?? "var(--brand)" }}
                        >
                          {(s.report.client.name || "?").charAt(0)}
                        </span>
                        {s.report.client.name}
                        {s.report.client.idNumber && (
                          <span className="aa4-fig text-[10.5px] font-medium text-[var(--ink-3)]" dir="ltr">
                            ת.ז {s.report.client.idNumber}
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
              <div className="aa4-no-print flex shrink-0 items-center gap-1.5">
                <button onClick={() => window.print()} className="aa4-btn aa4-btn-ghost !px-3 !py-2 !text-[12.5px]">
                  <Printer className="size-4" />
                  הדפסה / PDF
                </button>
                <button onClick={onClose} className="aa4-iconbtn" aria-label="סגירת הסיכום" autoFocus>
                  <X className="size-4.5" />
                </button>
              </div>
            </header>

            <div className="px-6 py-5 md:px-8">
              {/* the story in three figures */}
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <SheetFigure label="החזר חודשי היום" value={currentPayment} color="var(--ink)" />
                <div
                  className="order-first rounded-[12px] border px-4 py-3.5 text-center sm:order-none"
                  style={{
                    background: saving
                      ? "linear-gradient(152deg, #e8f7f0 0%, #d2eee1 100%)"
                      : "linear-gradient(152deg, #f9e9e6 0%, #f1dbd6 100%)",
                    borderColor: saving ? "rgba(13,138,98,0.25)" : "rgba(194,59,46,0.22)",
                  }}
                >
                  <span
                    className="flex items-center justify-center gap-1.5 text-[11.5px] font-bold"
                    style={{ color: saving ? "var(--pos-strong)" : "var(--neg-strong)" }}
                  >
                    {saving ? <TrendDown className="size-3.5" weight="bold" /> : <TrendUp className="size-3.5" weight="bold" />}
                    {saving ? "חיסכון חודשי" : "תוספת חודשית"}
                  </span>
                  <div className="aa4-fig mt-0.5 text-[2rem] font-semibold leading-none" style={{ color: saving ? "var(--pos-strong)" : "var(--neg-strong)" }}>
                    {shekel(Math.abs(delta))}
                  </div>
                  <div className="mt-1 text-[11px] font-semibold" style={{ color: saving ? "var(--pos-strong)" : "var(--neg-strong)" }}>
                    {pct}% · <span className="aa4-fig">{shekel(Math.abs(delta) * 12)}</span> בשנה
                  </div>
                </div>
                <SheetFigure label="החזר חודשי לאחר איחוד" value={newPayment} color={saving ? "var(--pos-strong)" : "var(--neg-strong)"} />
              </div>

              {/* one bar: what remains vs. what's saved */}
              <div className="mt-4">
                <div className="aa4-bar-track" style={{ height: 12 }}>
                  <span
                    className="absolute inset-y-0"
                    style={{ insetInlineStart: 0, width: `${(Math.min(currentPayment, newPayment) / Math.max(currentPayment, newPayment, 1)) * 100}%`, background: "var(--brand)" }}
                  />
                  <span
                    className="absolute inset-y-0"
                    style={{
                      insetInlineStart: `${(Math.min(currentPayment, newPayment) / Math.max(currentPayment, newPayment, 1)) * 100}%`,
                      width: `${(Math.abs(delta) / Math.max(currentPayment, newPayment, 1)) * 100}%`,
                      background: saving ? "var(--pos)" : "var(--neg)",
                      opacity: 0.35,
                    }}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[10.5px] text-[var(--ink-3)]">
                  <span>
                    החזר לאחר איחוד <b className="aa4-fig text-[var(--ink-2)]">{shekel(newPayment)}</b>
                  </span>
                  <span style={{ color: saving ? "var(--pos-strong)" : "var(--neg-strong)" }}>
                    {saving ? "נחסך" : "תוספת"} <b className="aa4-fig">{shekel(Math.abs(delta))}</b>
                  </span>
                </div>
              </div>

              {/* existing liabilities */}
              <SheetSection title="ההתחייבויות הקיימות" sub={`${realLoans.length} הלוואות ומשכנתאות · יתרה כוללת ${shekel(totalBalance)}`}>
                <table className="w-full border-collapse text-[12px]">
                  <thead>
                    <tr className="border-b text-[10px] font-semibold text-[var(--ink-3)]" style={{ borderColor: "var(--line)" }}>
                      <th className="py-1.5 pe-2 text-right font-semibold">גורם מלווה</th>
                      <th className="px-2 py-1.5 text-left font-semibold">יתרת חוב</th>
                      <th className="px-2 py-1.5 text-center font-semibold">ריבית</th>
                      <th className="px-2 py-1.5 text-center font-semibold">חודשים</th>
                      <th className="ps-2 py-1.5 text-left font-semibold">החזר חודשי</th>
                    </tr>
                  </thead>
                  <tbody>
                    {realLoans.map((l, i) => (
                      <tr key={l._id ?? i} className="border-b last:border-0" style={{ borderColor: "var(--line-soft)" }}>
                        <td className="py-1.5 pe-2">
                          <span className="flex items-center gap-2">
                            <BankBadge source={l.source || undefined} size={18} />
                            <span className="font-semibold text-[var(--ink)]">{shortBank(l.source) || l.source || "הלוואה"}</span>
                            <TypeTag kind={l.kind} typeLabel={l.typeLabel} />
                          </span>
                        </td>
                        <td className="aa4-fig px-2 py-1.5 text-left font-medium text-[var(--ink)]">{shekel(parseNum(l.balance))}</td>
                        <td className="aa4-fig px-2 py-1.5 text-center text-[var(--ink-2)]">{l.interest ? `${l.interest}%` : "—"}</td>
                        <td className="aa4-fig px-2 py-1.5 text-center text-[var(--ink-2)]">{l.months || "—"}</td>
                        <td className="aa4-fig ps-2 py-1.5 text-left font-semibold text-[var(--ink)]">
                          {shekel(monthlyPayment(l.balance, l.interest, l.months))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t text-[12px] font-bold" style={{ borderColor: "var(--line-2)" }}>
                      <td className="py-2 pe-2 text-[11px] text-[var(--ink-2)]">סה"כ</td>
                      <td className="aa4-fig px-2 py-2 text-left text-[var(--ink)]">{shekel(totalBalance)}</td>
                      <td colSpan={2} />
                      <td className="aa4-fig ps-2 py-2 text-left text-[var(--brand-deep)]">{shekel(currentPayment)}</td>
                    </tr>
                  </tfoot>
                </table>

                {(otherDebts.length > 0 || overdueTotal > 0) && (
                  <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-[var(--ink-3)]">
                    {otherDebts.length > 0 && (
                      <span className="flex items-center gap-1.5">
                        <Wallet className="size-3.5" />
                        חובות נוספים שאינם באיחוד (מסגרות ועו"ש): {otherDebts.length} ·{" "}
                        <b className="aa4-fig text-[var(--ink-2)]">{shekel(otherTotal)}</b>
                      </span>
                    )}
                    {overdueTotal > 0 && (
                      <span className="flex items-center gap-1.5 font-semibold" style={{ color: "var(--neg-strong)" }}>
                        <WarningCircle className="size-3.5" />
                        יתרות בפיגור על פי הדוח: <b className="aa4-fig">{shekel(overdueTotal)}</b>
                      </span>
                    )}
                  </div>
                )}
              </SheetSection>

              {/* proposed mix */}
              <SheetSection title="התמהיל המוצע" sub={`${realMix.length} מסלולים · סך ${shekel(totalMix)}`}>
                <table className="w-full border-collapse text-[12px]">
                  <thead>
                    <tr className="border-b text-[10px] font-semibold text-[var(--ink-3)]" style={{ borderColor: "var(--line)" }}>
                      <th className="py-1.5 pe-2 text-right font-semibold">מסלול</th>
                      <th className="px-2 py-1.5 text-left font-semibold">סכום</th>
                      <th className="px-2 py-1.5 text-center font-semibold">ריבית</th>
                      <th className="px-2 py-1.5 text-center font-semibold">חודשים</th>
                      <th className="ps-2 py-1.5 text-left font-semibold">החזר חודשי</th>
                    </tr>
                  </thead>
                  <tbody>
                    {realMix.map((m, i) => {
                      const meta = mixTypeMeta(m.type);
                      return (
                        <tr key={m._id ?? i} className="border-b last:border-0" style={{ borderColor: "var(--line-soft)" }}>
                          <td className="py-1.5 pe-2">
                            <span className="flex items-center gap-2 font-semibold text-[var(--ink)]">
                              <span className="size-2.5 rounded-full" style={{ background: meta?.color ?? "var(--brand)" }} />
                              {m.type || "מסלול"}
                            </span>
                          </td>
                          <td className="aa4-fig px-2 py-1.5 text-left font-medium text-[var(--ink)]">{shekel(parseNum(m.balance))}</td>
                          <td className="aa4-fig px-2 py-1.5 text-center text-[var(--ink-2)]">{m.interest ? `${m.interest}%` : "—"}</td>
                          <td className="aa4-fig px-2 py-1.5 text-center text-[var(--ink-2)]">{m.months || "—"}</td>
                          <td className="aa4-fig ps-2 py-1.5 text-left font-semibold text-[var(--ink)]">
                            {shekel(monthlyPayment(m.balance, m.interest, m.months))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t text-[12px] font-bold" style={{ borderColor: "var(--line-2)" }}>
                      <td className="py-2 pe-2 text-[11px] text-[var(--ink-2)]">סה"כ</td>
                      <td className="aa4-fig px-2 py-2 text-left text-[var(--ink)]">{shekel(totalMix)}</td>
                      <td colSpan={2} />
                      <td className="aa4-fig ps-2 py-2 text-left text-[var(--brand-deep)]">{shekel(newPayment)}</td>
                    </tr>
                  </tfoot>
                </table>
              </SheetSection>

              {/* closing statement */}
              <div
                className="mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-[var(--r-control)] border px-4 py-3.5"
                style={
                  saving
                    ? { background: "var(--pos-tint)", borderColor: "rgba(13,138,98,0.22)" }
                    : { background: "var(--neg-tint)", borderColor: "rgba(194,59,46,0.2)" }
                }
              >
                <span className="flex items-center gap-2 text-[13px] font-bold" style={{ color: saving ? "var(--pos-strong)" : "var(--neg-strong)" }}>
                  <SealCheck className="size-[18px]" weight="duotone" />
                  {saving
                    ? `האיחוד המוצע חוסך ${shekel(Math.abs(delta))} בכל חודש — ${shekel(Math.abs(delta) * 12)} בשנה`
                    : `האיחוד המוצע מוסיף ${shekel(Math.abs(delta))} לחודש`}
                </span>
                {newDti !== null && (
                  <span className="text-[11.5px] font-semibold text-[var(--ink-2)]">
                    יחס החזר להכנסה לאחר איחוד: <b className="aa4-fig" dir="ltr">{newDti}%</b>
                  </span>
                )}
              </div>

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

function SheetFigure({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-[12px] border px-4 py-3.5 text-center" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
      <div className="text-[11.5px] font-semibold text-[var(--ink-3)]">{label}</div>
      <div className="aa4-fig mt-0.5 text-[1.6rem] font-semibold leading-none" style={{ color }}>
        {shekel(value)}
      </div>
      <div className="mt-1 text-[10.5px] text-[var(--ink-4)]">לחודש</div>
    </div>
  );
}

function SheetSection({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
        <h3 className="text-[13.5px] font-bold text-[var(--ink)]">{title}</h3>
        {sub && <span className="aa4-fig text-[11px] text-[var(--ink-3)]">{sub}</span>}
      </div>
      <div className={cn("overflow-hidden rounded-[var(--r-control)] border px-3 py-1", "bg-[var(--surface)]")} style={{ borderColor: "var(--line)" }}>
        {children}
      </div>
    </section>
  );
}

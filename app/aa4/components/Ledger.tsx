"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Plus, X, Stack, ListChecks } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { monthlyPayment, parseNum, groupDigits, shekel } from "../lib/calc";
import { shortBank } from "../debtTags";
import { BankBadge, TypeTag } from "./badges";
import { Money } from "./primitives";
import TypeSelect from "./TypeSelect";
import { mixTypeMeta } from "./mixTypes";

const ease = [0.22, 1, 0.36, 1] as const;

export interface LoanRow {
  _id?: string;
  balance: string;
  interest: string;
  months: string;
  source?: string;
  kind?: "mortgage" | "loan";
  typeLabel?: string;
}
export interface MixRow {
  _id?: string;
  balance: string;
  interest: string;
  months: string;
  type: string;
}

function Cell({
  value,
  onChange,
  placeholder,
  align = "right",
  maxLength,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  align?: "right" | "center";
  maxLength?: number;
  ariaLabel?: string;
}) {
  return (
    <input
      value={value}
      maxLength={maxLength}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn("aa4-ledger-input", align === "center" ? "text-center" : "text-right")}
    />
  );
}

function LedgerFooter({
  totalBalance,
  totalPayment,
  paymentLabel,
}: {
  totalBalance: number;
  totalPayment: number;
  paymentLabel: string;
}) {
  return (
    <div className="mt-3 flex items-center justify-between rounded-[var(--r-control)] border px-4 py-3" style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}>
      <div className="flex items-baseline gap-2">
        <span className="text-[11.5px] font-semibold text-[var(--ink-3)]">סך יתרה</span>
        <span className="aa4-fig text-[1.05rem] font-semibold text-[var(--ink)]">
          <Money value={totalBalance} />
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-[11.5px] font-semibold text-[var(--ink-3)]">{paymentLabel}</span>
        <span className="aa4-fig text-[1.2rem] font-semibold text-[var(--brand-deep)]">
          <Money value={totalPayment} />
        </span>
      </div>
    </div>
  );
}

function ColHeads({ cols, labels }: { cols: string; labels: string[] }) {
  return (
    <div className={cn("mb-1.5 grid gap-1.5 border-b px-2 pb-2", cols)} style={{ borderColor: "var(--line)" }}>
      {labels.map((h, i) => (
        <span key={i} className={cn("text-[10.5px] font-semibold text-[var(--ink-3)]", h === "ריבית" || h === "חודשים" || h === "החזר" ? "text-center" : "text-right")}>
          {h}
        </span>
      ))}
    </div>
  );
}

// A numeric ledger column with an optional subtle leading divider.
function Col({ divider, center, children }: { divider?: boolean; center?: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn("flex min-w-0 items-center", center && "justify-center", divider && "border-s ps-2")}
      style={divider ? { borderColor: "var(--line)" } : undefined}
    >
      {children}
    </div>
  );
}

/* ---------------------------------------------------------- Existing loans */
export function LoanLedger({
  loans,
  onUpdate,
  onDelete,
  onAdd,
}: {
  loans: LoanRow[];
  onUpdate: (i: number, key: keyof LoanRow, value: string) => void;
  onDelete: (i: number) => void;
  onAdd: () => void;
}) {
  const reduce = useReducedMotion();
  const cols = "grid-cols-[1.25fr_0.95fr_0.5fr_0.5fr_0.8fr_22px]";
  const totalBalance = loans.reduce((s, l) => s + parseNum(l.balance), 0);
  const totalPayment = loans.reduce((s, l) => s + monthlyPayment(l.balance, l.interest, l.months), 0);

  return (
    <section className="aa4-card aa4-card-pad flex flex-col">
      <div className="mb-3.5 flex items-start justify-between">
        <div>
          <h3 className="aa4-card-title flex items-center gap-2">
            <ListChecks className="size-[18px] text-[var(--brand)]" />
            הלוואות קיימות
          </h3>
          <p className="aa4-card-sub">המצב הנוכחי, לפני איחוד.</p>
        </div>
        <button onClick={onAdd} className="aa4-btn aa4-btn-soft">
          <Plus className="size-4" />
          הלוואה
        </button>
      </div>

      <ColHeads cols={cols} labels={["הלוואה", "יתרה", "ריבית", "חודשים", "החזר", ""]} />

      <div className="space-y-1">
        <AnimatePresence initial={false}>
          {loans.map((l, i) => {
            const pay = monthlyPayment(l.balance, l.interest, l.months);
            const hasMeta = !!l.source;
            return (
              <motion.div
                key={l._id ?? i}
                layout={!reduce}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, ease }}
                className={cn("grid items-stretch gap-1.5 rounded-[var(--r-control)] border px-2 py-1 [&>*]:min-w-0", cols)}
                style={{ borderColor: "var(--line)", background: "var(--surface)" }}
              >
                <div className="flex items-center gap-2 py-0.5">
                  {hasMeta ? (
                    <>
                      <BankBadge source={l.source} size={22} />
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-[12px] font-semibold leading-tight text-[var(--ink)]" title={l.source}>
                          {shortBank(l.source)}
                        </span>
                        <TypeTag kind={l.kind} typeLabel={l.typeLabel} />
                      </span>
                    </>
                  ) : (
                    <span className="self-center ps-0.5 text-[11px] text-[var(--ink-4)]">שורה ידנית</span>
                  )}
                </div>
                <Col divider>
                  <Cell value={l.balance} onChange={(v) => onUpdate(i, "balance", groupDigits(v))} placeholder="0" maxLength={11} ariaLabel={`יתרת הלוואה, שורה ${i + 1}`} />
                </Col>
                <Col>
                  <Cell value={l.interest} onChange={(v) => onUpdate(i, "interest", v)} placeholder="0" align="center" maxLength={5} ariaLabel={`ריבית, שורה ${i + 1}`} />
                </Col>
                <Col>
                  <Cell value={l.months} onChange={(v) => onUpdate(i, "months", v)} placeholder="0" align="center" maxLength={3} ariaLabel={`חודשים, שורה ${i + 1}`} />
                </Col>
                <Col divider center>
                  <span className="aa4-fig text-[13px] font-semibold text-[var(--ink)]">{shekel(pay)}</span>
                </Col>
                <Col center>
                  <button onClick={() => onDelete(i)} disabled={loans.length === 1} className="aa4-iconbtn disabled:pointer-events-none disabled:opacity-0" aria-label="מחיקה">
                    <X className="size-3.5" />
                  </button>
                </Col>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <LedgerFooter totalBalance={totalBalance} totalPayment={totalPayment} paymentLabel="החזר נוכחי" />
    </section>
  );
}

/* ------------------------------------------------------------- New mix ---- */
export function MixLedger({
  loans,
  onUpdate,
  onDelete,
  onAdd,
}: {
  loans: MixRow[];
  onUpdate: (i: number, key: keyof MixRow, value: string) => void;
  onDelete: (i: number) => void;
  onAdd: () => void;
}) {
  const reduce = useReducedMotion();
  const cols = "grid-cols-[1.55fr_1fr_0.55fr_0.55fr_0.85fr_26px]";
  const totalBalance = loans.reduce((s, l) => s + parseNum(l.balance), 0);
  const totalPayment = loans.reduce((s, l) => s + monthlyPayment(l.balance, l.interest, l.months), 0);

  return (
    <section className="aa4-card aa4-card-pad flex flex-col">
      <div className="mb-3.5 flex items-start justify-between">
        <div>
          <h3 className="aa4-card-title flex items-center gap-2">
            <Stack className="size-[18px] text-[var(--pos)]" />
            תמהיל איחוד חדש
          </h3>
          <p className="aa4-card-sub">בנו את התמהיל המוצע והשוו.</p>
        </div>
        <button onClick={onAdd} className="aa4-btn aa4-btn-soft">
          <Plus className="size-4" />
          מסלול
        </button>
      </div>

      <ColHeads cols={cols} labels={["סוג", "סכום", "ריבית", "חודשים", "החזר", ""]} />

      <div className="space-y-1.5">
        <AnimatePresence initial={false}>
          {loans.map((l, i) => {
            const pay = monthlyPayment(l.balance, l.interest, l.months);
            const meta = mixTypeMeta(l.type);
            return (
              <motion.div
                key={l._id ?? i}
                layout={!reduce}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, ease }}
                className={cn("grid items-stretch gap-1.5 rounded-[var(--r-control)] border px-2 py-1 [&>*]:min-w-0", cols)}
                style={{
                  borderColor: meta ? `color-mix(in srgb, ${meta.color} 32%, var(--line))` : "var(--line)",
                  background: meta ? `color-mix(in srgb, ${meta.color} 5.5%, var(--surface))` : "var(--surface)",
                }}
              >
                <div className="flex items-center">
                  <TypeSelect value={l.type || ""} onChange={(v) => onUpdate(i, "type", v)} ariaLabel={`סוג מסלול, שורה ${i + 1}`} />
                </div>
                <Col divider>
                  <Cell value={l.balance} onChange={(v) => onUpdate(i, "balance", groupDigits(v))} placeholder="0" maxLength={11} ariaLabel={`סכום מסלול, שורה ${i + 1}`} />
                </Col>
                <Col>
                  <Cell value={l.interest} onChange={(v) => onUpdate(i, "interest", v)} placeholder="0" align="center" maxLength={5} ariaLabel={`ריבית, שורה ${i + 1}`} />
                </Col>
                <Col>
                  <Cell value={l.months} onChange={(v) => onUpdate(i, "months", v)} placeholder="0" align="center" maxLength={3} ariaLabel={`חודשים, שורה ${i + 1}`} />
                </Col>
                <Col divider center>
                  <span className="aa4-fig text-[13px] font-semibold text-[var(--ink)]">{shekel(pay)}</span>
                </Col>
                <Col center>
                  <button onClick={() => onDelete(i)} disabled={loans.length === 1} className="aa4-iconbtn disabled:pointer-events-none disabled:opacity-0" aria-label="מחיקה">
                    <X className="size-3.5" />
                  </button>
                </Col>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <LedgerFooter totalBalance={totalBalance} totalPayment={totalPayment} paymentLabel="החזר תמהיל" />
    </section>
  );
}

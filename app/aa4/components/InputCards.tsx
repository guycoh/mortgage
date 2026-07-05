"use client";

import { useId } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Plus, X, House, Bank, Wallet, TrendUp, HandCoins } from "@phosphor-icons/react";
import type { ExtractedLoan } from "@/components/credit-import";
import { shekel } from "../lib/calc";
import { shortBank } from "../debtTags";
import { MoneyField, PlainField, Money, Stat } from "./primitives";
import { BankBadge } from "./badges";

const ease = [0.22, 1, 0.36, 1] as const;

export interface PropertyRow {
  _id?: string;
  assetValue: number;
  mortgageValue: number;
}

/* ---------------------------------------------------------------- Assets -- */
export function AssetsCard({
  properties,
  onChange,
  onAdd,
  onDelete,
}: {
  properties: PropertyRow[];
  onChange: (i: number, field: keyof PropertyRow, value: number) => void;
  onAdd: () => void;
  onDelete: (i: number) => void;
}) {
  const reduce = useReducedMotion();
  return (
    <section className="aa4-card aa4-card-pad">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="aa4-card-title">שווי נכסים ויתרות משכנתא</h3>
          <p className="aa4-card-sub">הנכסים והמשכנתאות הרשומות על שמם.</p>
        </div>
        <button onClick={onAdd} className="aa4-btn aa4-btn-soft">
          <Plus className="size-4" />
          הוספת נכס
        </button>
      </div>

      <div className="space-y-2.5">
        <AnimatePresence initial={false}>
          {properties.map((row, i) => (
            <motion.div
              key={row._id ?? i}
              layout={!reduce}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease }}
              className="grid grid-cols-[auto_1fr_1fr_auto] items-end gap-3 rounded-[var(--r-control)] border p-3 [&>*]:min-w-0"
              style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}
            >
              <span className="grid size-9 place-items-center self-center rounded-[var(--r-control)] bg-[var(--brand-tint)] aa4-fig text-[13px] font-semibold text-[var(--brand-deep)]">
                {i + 1}
              </span>
              <MiniMoney label="שווי נכס" icon={<House className="size-3.5" />} value={row.assetValue} onChange={(v) => onChange(i, "assetValue", v)} />
              <MiniMoney label="יתרת משכנתא" icon={<Bank className="size-3.5" />} value={row.mortgageValue} onChange={(v) => onChange(i, "mortgageValue", v)} />
              <button
                onClick={() => onDelete(i)}
                disabled={properties.length === 1}
                className="aa4-iconbtn mb-1 self-end disabled:pointer-events-none disabled:opacity-0"
                aria-label="מחיקת נכס"
              >
                <X className="size-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}

function MiniMoney({
  label,
  icon,
  value,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  value: number;
  onChange: (n: number) => void;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-semibold text-[var(--ink-3)]">
        {icon}
        {label}
      </label>
      <div className="aa4-field-affix">
        <span className="aa4-affix">₪</span>
        <input
          id={id}
          inputMode="numeric"
          className="aa4-field aa4-field-num text-right"
          placeholder="0"
          value={value ? value.toLocaleString("en-US") : ""}
          onChange={(e) => onChange(Number(e.target.value.replace(/[^\d]/g, "")) || 0)}
        />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Income -- */
export function IncomeCard({
  ages,
  incomes,
  onAge,
  onIncome,
}: {
  ages: { primary: string; secondary: string; guarantor: string };
  incomes: { primary: number; secondary: number; guarantor: number };
  onAge: (field: "primary" | "secondary" | "guarantor", value: string) => void;
  onIncome: (field: "primary" | "secondary" | "guarantor", value: number) => void;
}) {
  return (
    <section className="aa4-card aa4-card-pad">
      <div className="mb-4">
        <h3 className="aa4-card-title">פרטים אישיים והכנסות</h3>
        <p className="aa4-card-sub">גילאי הלווים וההכנסה החודשית נטו.</p>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-3">
        <PlainField label="גיל לווה ראשי" value={ages.primary} onChange={(v) => onAge("primary", v)} placeholder="35" max={120} />
        <PlainField label="גיל לווה משני" value={ages.secondary} onChange={(v) => onAge("secondary", v)} placeholder="35" max={120} />
        <PlainField label="גיל ערב" value={ages.guarantor} onChange={(v) => onAge("guarantor", v)} placeholder="" max={120} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MoneyField label="הכנסת לווה ראשי" value={incomes.primary} onChange={(v) => onIncome("primary", v)} />
        <MoneyField label="הכנסת לווה משני" value={incomes.secondary} onChange={(v) => onIncome("secondary", v)} />
        <MoneyField label="הכנסת ערב" hint="נספרת 50%" value={incomes.guarantor} onChange={(v) => onIncome("guarantor", v)} />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- Summary --- */
export function SummaryRail({
  totalAssets,
  totalMortgages,
  totalLoans,
  totalIncome,
  otherDebts,
  otherDebtsTotal,
}: {
  totalAssets: number;
  totalMortgages: number;
  totalLoans: number;
  totalIncome: number;
  otherDebts: ExtractedLoan[];
  otherDebtsTotal: number;
}) {
  return (
    <section className="aa4-card aa4-card-pad sticky top-4 h-fit">
      <h3 className="aa4-card-title">ריכוז נתונים</h3>

      {/* refined stat list, divided rather than nested cards */}
      <div className="mt-1 [&>*+*]:border-t [&>*+*]:border-[color:var(--line)]">
        <Stat label="שווי נכסים" value={totalAssets} tone="brand" icon={<House className="size-5" weight="duotone" />} />
        <Stat label="יתרות משכנתא" value={totalMortgages} tone="neg" icon={<Bank className="size-5" weight="duotone" />} />
        <Stat label="יתרות הלוואה" value={totalLoans} tone="loan" icon={<HandCoins className="size-5" weight="duotone" />} />
        <Stat
          label="הכנסה מוכרת"
          value={totalIncome}
          tone="pos"
          icon={<TrendUp className="size-5" weight="duotone" />}
          sub={
            <div className="mt-1.5 flex items-center justify-between rounded-[var(--r-control)] px-2.5 py-1.5 text-[11.5px]" style={{ background: "var(--pos-tint)", color: "var(--pos-strong)" }}>
              <span className="font-medium">החזר מרבי · 40%</span>
              <span className="aa4-fig font-semibold">
                <Money value={totalIncome * 0.4} />
              </span>
            </div>
          }
        />
      </div>

      {/* other debts — a distinct panel, opens below the stats */}
      <div className="mt-4">
        {otherDebts.length > 0 ? (
          <div className="overflow-hidden rounded-[var(--r-control)] border" style={{ borderColor: "var(--line)" }}>
            <div className="flex items-center justify-between gap-2 px-3 pt-3">
              <span className="flex items-center gap-2 text-[12px] font-semibold text-[var(--ink-2)]">
                <span className="grid size-7 place-items-center rounded-[var(--r-control)]" style={{ background: "var(--surface-3)", color: "var(--ink-2)" }}>
                  <Wallet className="size-4" weight="duotone" />
                </span>
                חובות נוספים
                <span className="aa4-fig text-[var(--ink-4)]">({otherDebts.length})</span>
              </span>
              <span className="text-[10.5px] text-[var(--ink-4)]">לא במחשבון</span>
            </div>
            <div className="px-3 pb-1.5">
              <span className="aa4-fig text-[1.35rem] font-semibold text-[var(--neg-strong)]">
                <Money value={otherDebtsTotal} />
              </span>
            </div>
            <div className="max-h-36 space-y-0.5 overflow-y-auto border-t p-1.5" style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}>
              {otherDebts.map((d) => (
                <div key={d.uid} className="flex items-center gap-2 rounded-[8px] px-2 py-1.5 text-[12px]">
                  <BankBadge source={d.source} size={18} />
                  <span className="min-w-0 flex-1 truncate text-[var(--ink-2)]" title={`${d.source} · ${d.type}`}>
                    {shortBank(d.source)}
                  </span>
                  <span className="shrink-0 aa4-fig font-semibold text-[var(--ink)]">{shekel(d.balance)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-[var(--r-control)] border border-dashed p-4 text-center text-[12px] text-[var(--ink-3)]" style={{ borderColor: "var(--line-2)" }}>
            ייבוא דוח אשראי יזהה חובות נוספים
          </div>
        )}
      </div>
    </section>
  );
}

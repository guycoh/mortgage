"use client";

import { useCallback, useRef, useState } from "react";
import { Lock } from "@phosphor-icons/react";
import {
  buildLiabilities,
  mergeRows,
  splitRow,
  manualRow,
  parseNum as parseLiabNum,
  PERSON_COLORS,
  type ReportSlot,
  type LiabilityRow,
  type MatchSuggestion,
  type LiabilityCategory,
} from "@/components/credit-import";

// Self-hosted fonts (no runtime Google fetch, sans/mono fallbacks -> never Times).
import "@fontsource/ibm-plex-sans-hebrew/400.css";
import "@fontsource/ibm-plex-sans-hebrew/500.css";
import "@fontsource/ibm-plex-sans-hebrew/600.css";
import "@fontsource/ibm-plex-sans-hebrew/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "./aa4-theme.css";

import ImportBar from "./components/ImportBar";
import ResultHero from "./components/ResultHero";
import CustomerSummary from "./components/CustomerSummary";
import LiabilitiesBoard, { type Persona } from "./components/LiabilitiesBoard";
import { AssetsCard, IncomeCard, SummaryRail, type PropertyRow, type OtherDebt } from "./components/InputCards";
import { LoanLedger, MixLedger, type LoanRow, type MixRow } from "./components/Ledger";
import { monthlyPayment, parseNum } from "./lib/calc";

// Stable row ids so Framer layout/AnimatePresence track the correct row across
// middle-of-list deletes (array-index keys misattribute the animation).
let rowSeq = 0;
const nid = () => `row_${++rowSeq}`;

export default function ConsolidationSimulator() {
  /* ---- assets / mortgages ------------------------------------------------ */
  const [properties, setProperties] = useState<PropertyRow[]>([{ _id: nid(), assetValue: 0, mortgageValue: 0 }]);
  const totalAssets = properties.reduce((s, p) => s + p.assetValue, 0);
  const totalMortgages = properties.reduce((s, p) => s + p.mortgageValue, 0);

  const updateProperty = (i: number, field: keyof PropertyRow, value: number) =>
    setProperties((prev) => prev.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));
  const addProperty = () => setProperties((prev) => [...prev, { _id: nid(), assetValue: 0, mortgageValue: 0 }]);
  const deleteProperty = (i: number) =>
    setProperties((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)));

  /* ---- income / ages ----------------------------------------------------- */
  const [incomes, setIncomes] = useState({ primary: 0, secondary: 0, guarantor: 0 });
  const [ages, setAges] = useState({ primary: "", secondary: "", guarantor: "" });
  const totalIncome = incomes.primary + incomes.secondary + incomes.guarantor * 0.5;

  /* ---- existing loans ---------------------------------------------------- */
  const [loans, setLoans] = useState<LoanRow[]>([{ _id: nid(), balance: "", interest: "", months: "", manual: true }]);
  const updateLoan = (i: number, key: keyof LoanRow, value: string) =>
    setLoans((prev) => prev.map((l, idx) => (idx === i ? { ...l, [key]: value } : l)));
  const addLoan = () => setLoans((prev) => [...prev, { _id: nid(), balance: "", interest: "", months: "", manual: true }]);
  const deleteLoan = (i: number) =>
    setLoans((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)));

  /* ---- new mix ----------------------------------------------------------- */
  const [mixLoans, setMixLoans] = useState<MixRow[]>([{ _id: nid(), balance: "", interest: "", months: "", type: "" }]);
  const updateMix = (i: number, key: keyof MixRow, value: string) =>
    setMixLoans((prev) => prev.map((l, idx) => (idx === i ? { ...l, [key]: value } : l)));
  const addMix = () => setMixLoans((prev) => [...prev, { _id: nid(), balance: "", interest: "", months: "", type: "" }]);
  const deleteMix = (i: number) =>
    setMixLoans((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)));

  /* ---- credit-report import + liabilities board -------------------------- */
  const [slots, setSlots] = useState<ReportSlot[]>([]);
  const [liabRows, setLiabRows] = useState<LiabilityRow[]>([]);
  const [suggestions, setSuggestions] = useState<MatchSuggestion[]>([]);
  const [otherDebts, setOtherDebts] = useState<OtherDebt[]>([]);
  const otherDebtsTotal = otherDebts.reduce((s, l) => s + l.balance, 0);
  const loansCardRef = useRef<HTMLDivElement>(null);
  const [flash, setFlash] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const personas: Persona[] = slots.map((s, i) => ({
    name: (s.report.client.name || `דוח ${i + 1}`).split(" ")[0],
    color: PERSON_COLORS[i % PERSON_COLORS.length],
  }));

  /**
   * The liabilities board is the single source for the calculator: checked
   * loans/mortgages become the existing-loans table, mortgage balances fill
   * property #1, and revolving debts land in the summary rail.
   */
  const syncCalculator = useCallback((rows: LiabilityRow[]) => {
    const included = rows.filter((r) => r.include && (r.category === "mortgage" || r.category === "loan"));
    setLoans(
      included.length
        ? included.map((r) => ({
            _id: r.id,
            balance: r.balance,
            interest: r.interest,
            months: r.months,
            source: r.bank || undefined,
            typeLabel: r.typeLabel || undefined,
            kind: r.category === "mortgage" ? ("mortgage" as const) : ("loan" as const),
          }))
        : [{ _id: nid(), balance: "", interest: "", months: "", manual: true }]
    );
    const mortgageSum = rows
      .filter((r) => r.category === "mortgage")
      .reduce((s, r) => s + parseLiabNum(r.balance), 0);
    setProperties((prev) => prev.map((p, idx) => (idx === 0 ? { ...p, mortgageValue: mortgageSum } : p)));
    setOtherDebts(
      rows
        .filter((r) => r.category === "card" || r.category === "overdraft" || r.category === "other")
        .map((r) => ({ uid: r.id, source: r.bank, type: r.typeLabel, balance: parseLiabNum(r.balance) }))
    );
  }, []);

  const handleReports = useCallback(
    (next: ReportSlot[]) => {
      setSlots(next);
      const { rows, suggestions: sugg } = buildLiabilities(next);
      setLiabRows(rows);
      setSuggestions(sugg);
      syncCalculator(rows);
    },
    [syncCalculator]
  );

  const applyRows = (rows: LiabilityRow[]) => {
    setLiabRows(rows);
    syncCalculator(rows);
  };

  const updateLiab = (id: string, patch: Partial<LiabilityRow>) =>
    applyRows(liabRows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const deleteLiab = (id: string) => {
    setSuggestions((prev) => prev.filter((s) => s.a !== id && s.b !== id));
    applyRows(liabRows.filter((r) => r.id !== id));
  };
  const addLiab = (category: LiabilityCategory) => applyRows([...liabRows, manualRow(category)]);
  const mergeLiab = (a: string, b: string) => {
    setSuggestions((prev) => prev.filter((s) => s.a !== a && s.b !== b));
    applyRows(mergeRows(liabRows, a, b));
  };
  const dismissSuggestion = (a: string, b: string) =>
    setSuggestions((prev) => prev.filter((s) => !(s.a === a && s.b === b)));
  const splitLiab = (id: string) => applyRows(splitRow(liabRows, id));

  const handleImported = () => {
    setFlash(true);
    setTimeout(() => loansCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
    setTimeout(() => setFlash(false), 2000);
  };

  /* ---- derived headline figures ----------------------------------------- */
  const existingPayment = loans.reduce((s, l) => s + monthlyPayment(l.balance, l.interest, l.months), 0);
  // total loan balances (excluding any mortgage rows — those live in totalMortgages)
  const totalLoans = loans.reduce((s, l) => (l.kind === "mortgage" ? s : s + parseNum(l.balance)), 0);
  const mixPayment = mixLoans.reduce((s, l) => s + monthlyPayment(l.balance, l.interest, l.months), 0);

  return (
    <div className="aa4-root aa4-grain" dir="rtl">
      <div className="relative z-[1] mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-9">
        {/* header */}
        <header className="mb-6 md:mb-7">
          <div className="aa4-hairline mb-5" />
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="aa4-kicker">
                מחשבון ייעוץ משכנתאות
                <span
                  className="ms-2 rounded-[var(--r-pill)] px-2 py-0.5 text-[10px] font-bold"
                  style={{ background: "var(--brand-tint-2)", color: "var(--brand-deep)" }}
                >
                  גרסת ניסוי
                </span>
              </span>
              <h1 className="aa4-display mt-1.5 text-[clamp(1.7rem,3.6vw,2.35rem)] font-bold leading-[1.08] text-[var(--ink)]">
                סימולטור איחוד הלוואות
              </h1>
              <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-[var(--ink-2)]">
                ייבאו דוח ריכוז נתונים אחד או שניים, בדקו את כל ההתחייבויות ובנו תמהיל חדש. ההשוואה והחיסכון מתעדכנים בזמן אמת.
              </p>
            </div>
            <div
              className="hidden shrink-0 items-center gap-2 rounded-[var(--r-pill)] border px-3 py-1.5 text-[11.5px] font-semibold text-[var(--ink-3)] sm:flex"
              style={{ borderColor: "var(--line-2)", background: "var(--surface)" }}
            >
              <Lock className="size-3.5 text-[var(--pos-strong)]" />
              עיבוד מקומי בדפדפן
            </div>
          </div>
        </header>

        <div className="flex flex-col gap-4 md:gap-5">
          <ImportBar onReports={handleReports} onImported={handleImported} />

          {/* liabilities board — the report's "עסקות בהן הלקוח חייב", editable */}
          {slots.length > 0 && (
            <LiabilitiesBoard
              rows={liabRows}
              suggestions={suggestions}
              personas={personas}
              onUpdate={updateLiab}
              onDelete={deleteLiab}
              onAdd={addLiab}
              onMerge={mergeLiab}
              onDismissSuggestion={dismissSuggestion}
              onSplit={splitLiab}
            />
          )}

          {/* inputs + summary rail */}
          <div className="grid gap-4 md:gap-5 lg:grid-cols-[1.85fr_1fr]">
            <div className="flex flex-col gap-4 md:gap-5">
              <AssetsCard properties={properties} onChange={updateProperty} onAdd={addProperty} onDelete={deleteProperty} />
              <IncomeCard
                ages={ages}
                incomes={incomes}
                onAge={(f, v) => setAges((p) => ({ ...p, [f]: v }))}
                onIncome={(f, v) => setIncomes((p) => ({ ...p, [f]: v }))}
              />
            </div>
            <SummaryRail
              totalAssets={totalAssets}
              totalMortgages={totalMortgages}
              totalLoans={totalLoans}
              totalIncome={totalIncome}
              otherDebts={otherDebts}
              otherDebtsTotal={otherDebtsTotal}
            />
          </div>

          {/* ledgers */}
          <div className="grid gap-4 md:gap-5 lg:grid-cols-2">
            <div
              ref={loansCardRef}
              className="rounded-[var(--r-card)] transition-shadow duration-500"
              style={flash ? { boxShadow: "0 0 0 4px var(--brand-tint), var(--shadow-raise)" } : undefined}
            >
              <LoanLedger loans={loans} onUpdate={updateLoan} onDelete={deleteLoan} onAdd={addLoan} />
            </div>
            <MixLedger loans={mixLoans} onUpdate={updateMix} onDelete={deleteMix} onAdd={addMix} />
          </div>

          {/* result summary — below the calculators */}
          <ResultHero
            currentPayment={existingPayment}
            newPayment={mixPayment}
            income={totalIncome}
            onPresent={() => setSummaryOpen(true)}
          />

          <div className="pt-1 text-center text-[11.5px] text-[var(--ink-2)]">
            החישובים להמחשה בלבד ואינם מהווים ייעוץ או הצעה מחייבת
          </div>
        </div>
      </div>

      {/* customer-facing one-page summary */}
      <CustomerSummary
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        loans={loans}
        mixLoans={mixLoans}
        liabRows={liabRows}
        slots={slots}
        personas={personas}
        currentPayment={existingPayment}
        newPayment={mixPayment}
        income={totalIncome}
      />
    </div>
  );
}

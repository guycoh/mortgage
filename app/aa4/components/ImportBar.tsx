"use client";

// Bespoke credit-report import for /aa4. Reuses the validated in-browser parser
// (parsePdfFile -> extractLoans) and the full-report viewers, restyled in the
// /aa4 institutional-fintech language.

import { useCallback, useRef, useState } from "react";
import {
  UploadSimple,
  CircleNotch,
  CheckCircle,
  ArrowsClockwise,
  FileMagnifyingGlass,
  BracketsCurly,
  WarningCircle,
  X,
  CaretLeft,
  File as FileIcon,
} from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { BankBadge, TypeTag } from "./badges";
import {
  parsePdfFile,
  extractLoans,
  ReportSheet,
  ReportJsonPanel,
  type ExtractedLoan,
  type CreditReport,
} from "@/components/credit-import";
import { shortBank } from "../debtTags";
import { shekel } from "../lib/calc";

type Status = "idle" | "loading" | "done" | "error";

interface Props {
  onSelect: (loans: ExtractedLoan[]) => void;
  onExtract: (all: ExtractedLoan[]) => void;
  onImported: () => void;
}

export default function ImportBar({ onSelect, onExtract, onImported }: Props) {
  const reduce = useReducedMotion();
  const [status, setStatus] = useState<Status>("idle");
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [loans, setLoans] = useState<ExtractedLoan[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [report, setReport] = useState<CreditReport | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      if (!/pdf$/i.test(file.name) && file.type !== "application/pdf") {
        setStatus("error");
        setError("קובץ לא נתמך. יש להעלות דוח PDF.");
        return;
      }
      setStatus("loading");
      setError("");
      setFileName(file.name);
      try {
        const parsed = await parsePdfFile(file);
        const all = extractLoans(parsed);
        const sel = new Set(all.filter((l) => l.isLoanOrMortgage && l.defaultInclude).map((l) => l.uid));
        setReport(parsed);
        setLoans(all);
        setSelected(sel);
        setStatus("done");
        onSelect(all.filter((l) => sel.has(l.uid)));
        onExtract(all);
        onImported();
      } catch (e) {
        setStatus("error");
        setError((e as Error).message || "לא ניתן לקרוא את הקובץ.");
      }
    },
    [onSelect, onExtract, onImported]
  );

  const toggle = (uid: string) => {
    const loan = loans.find((l) => l.uid === uid);
    if (!loan || !loan.isLoanOrMortgage) return;
    const next = new Set(selected);
    next.has(uid) ? next.delete(uid) : next.add(uid);
    setSelected(next);
    onSelect(loans.filter((l) => next.has(l.uid)));
  };

  const reset = () => {
    setStatus("idle");
    setError("");
    setFileName("");
    setLoans([]);
    setSelected(new Set());
    setReport(null);
    setSheetOpen(false);
    setJsonOpen(false);
    onSelect([]);
    onExtract([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const injectables = loans.filter((l) => l.isLoanOrMortgage);
  const others = loans.filter((l) => !l.isLoanOrMortgage);
  const chosen = injectables.filter((l) => selected.has(l.uid));
  const totalBalance = chosen.reduce((s, l) => s + l.balance, 0);
  const othersTotal = others.reduce((s, l) => s + l.balance, 0);

  /* -------------------------------------------------- DONE / RESULTS ------ */
  if (status === "done") {
    return (
      <>
        <ReportSheet report={report} fileName={fileName} open={sheetOpen} onClose={() => setSheetOpen(false)} />
        <ReportJsonPanel report={report} open={jsonOpen} onClose={() => setJsonOpen(false)} side="left" />

        <motion.div initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }} className="aa4-card overflow-hidden">
          <div className="flex items-center justify-between gap-3 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-[var(--r-control)] text-white" style={{ background: "var(--pos)" }}>
                <CheckCircle className="size-6" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[15px] font-bold text-[var(--ink)]">{report?.client.name || "לקוח"}</span>
                  {report?.client.idNumber && (
                    <span className="shrink-0 aa4-fig text-[11px] font-medium text-[var(--ink-3)]" dir="ltr">
                      ת.ז {report.client.idNumber}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-[12.5px] text-[var(--ink-2)]">
                  יובאו <b className="aa4-fig font-semibold text-[var(--ink)]">{chosen.length}</b> הלוואות ומשכנתאות
                  <span className="mx-1.5 opacity-40">·</span>
                  יתרה <span className="aa4-fig font-semibold text-[var(--brand-deep)]">{shekel(totalBalance)}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-[var(--ink-3)]">
                  <FileIcon className="size-3.5" /> {fileName}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button onClick={() => setJsonOpen(true)} className="aa4-btn aa4-btn-ghost" aria-label="נתוני הדוח">
                <BracketsCurly className="size-4" />
              </button>
              <button onClick={reset} className="aa4-btn aa4-btn-ghost">
                <ArrowsClockwise className="size-4" />
                החלף
              </button>
            </div>
          </div>

          <button
            onClick={() => setSheetOpen(true)}
            className="group flex w-full items-center justify-between gap-2 border-y px-4 py-3 text-right transition-colors hover:bg-[var(--brand-tint)]"
            style={{ borderColor: "var(--line)" }}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-[var(--r-control)] bg-[var(--brand-tint)] text-[var(--brand-deep)]">
                <FileMagnifyingGlass className="size-[18px]" />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-bold text-[var(--ink)]">צפייה בדוח האשראי המלא</span>
                <span className="block truncate text-[11.5px] text-[var(--ink-3)]">כל הפרמטרים, העסקאות ומסלולי הריבית</span>
              </span>
            </span>
            <CaretLeft className="size-4 shrink-0 text-[var(--ink-4)] transition-transform group-hover:-translate-x-0.5" />
          </button>

          {injectables.length > 0 && (
            <div className="p-4 pt-3.5">
              <div className="mb-2 flex items-center justify-between text-[11.5px]">
                <span className="font-semibold text-[var(--ink-2)]">מוזרם למחשבון</span>
                <span className="text-[var(--ink-3)]">סמנו או בטלו</span>
              </div>
              <ul className="space-y-1.5">
                <AnimatePresence initial={false}>
                  {injectables.map((l, i) => (
                    <DebtRow key={l.uid} loan={l} on={selected.has(l.uid)} idx={i} onToggle={() => toggle(l.uid)} />
                  ))}
                </AnimatePresence>
              </ul>
              {chosen.length === 0 && <div className="mt-2 text-center text-[11.5px] text-[var(--ink-3)]">לא נבחרו הלוואות, טבלת המחשבון רוקנה.</div>}
            </div>
          )}

          {others.length > 0 && (
            <div className="border-t px-4 py-3.5" style={{ borderColor: "var(--line)" }}>
              <div className="mb-2 flex items-center justify-between text-[11.5px]">
                <span className="font-semibold text-[var(--ink-2)]">חובות נוספים, לצפייה בלבד</span>
                <span className="aa4-fig font-semibold text-[var(--ink-2)]">{shekel(othersTotal)}</span>
              </div>
              <ul className="space-y-1.5">
                {others.map((l, i) => (
                  <DebtRow key={l.uid} loan={l} idx={i} readonly />
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      </>
    );
  }

  /* ------------------------------------------------ IDLE / LOADING / ERR -- */
  const loading = status === "loading";
  const isError = status === "error";
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!loading) setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (!loading) handleFile(e.dataTransfer.files?.[0]);
      }}
      onClick={() => !loading && inputRef.current?.click()}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !loading) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      role="button"
      tabIndex={loading ? -1 : 0}
      aria-label="העלאת דוח ריכוז נתונים בפורמט PDF"
      data-drag={drag}
      className={cn("aa4-drop flex cursor-pointer items-center gap-4 px-5 py-4", loading && "pointer-events-none")}
      style={isError ? { borderColor: "var(--neg)", borderStyle: "solid" } : undefined}
    >
      <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />

      <span
        className="grid size-12 shrink-0 place-items-center rounded-[var(--r-control)] text-white"
        style={{ background: isError ? "var(--neg)" : "linear-gradient(160deg, var(--brand-bright), var(--brand-deep))" }}
      >
        {loading ? <CircleNotch className="size-6 animate-spin" /> : isError ? <WarningCircle className="size-6" /> : <UploadSimple className="size-6" />}
      </span>

      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-bold text-[var(--ink)]">
          {loading ? "מנתח את הדוח" : isError ? "לא הצלחנו לקרוא את הדוח" : "גררו לכאן דוח ריכוז נתונים"}
        </div>
        <div className="mt-0.5 truncate text-[12.5px] text-[var(--ink-3)]">
          {loading ? "מחלץ הלוואות, משכנתאות ומסלולי ריבית. רגע אחד." : isError ? error : "PDF ממערכת נתוני אשראי, חילוץ אוטומטי אל המחשבון"}
        </div>
      </div>

      {!loading && (
        <span className={cn("aa4-btn shrink-0", isError ? "aa4-btn-ghost" : "aa4-btn-primary")}>
          {isError ? (
            <>
              <X className="size-4" /> נסו שוב
            </>
          ) : (
            "בחירת קובץ"
          )}
        </span>
      )}
    </div>
  );
}

function DebtRow({
  loan,
  on = false,
  readonly = false,
  idx,
  onToggle,
}: {
  loan: ExtractedLoan;
  on?: boolean;
  readonly?: boolean;
  idx: number;
  onToggle?: () => void;
}) {
  const reduce = useReducedMotion();
  const interactive = !readonly && !!onToggle;
  return (
    <motion.li
      layout={!reduce}
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? undefined : { opacity: 0, y: -6 }}
      transition={{ duration: 0.26, delay: Math.min(idx * 0.028, 0.22) }}
      onClick={onToggle}
      role={interactive ? "checkbox" : undefined}
      aria-checked={interactive ? on : undefined}
      aria-label={interactive ? `${shortBank(loan.source) || loan.source}, ${shekel(loan.balance)}` : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onToggle?.();
              }
            }
          : undefined
      }
      className={cn(
        "flex items-center gap-2.5 rounded-[var(--r-control)] border px-3 py-2 text-[12px] transition focus-visible:outline-none",
        interactive && "focus-visible:border-[var(--brand)] focus-visible:shadow-[0_0_0_3px_var(--brand-tint)]",
        readonly ? "border-transparent bg-[var(--surface-2)]" : on ? "cursor-pointer border-[var(--line)] bg-[var(--surface)] hover:border-[var(--brand)]" : "cursor-pointer border-transparent bg-[var(--surface-2)] opacity-60 hover:opacity-90"
      )}
    >
      {readonly ? (
        <span className="size-1.5 shrink-0 rounded-full bg-[var(--ink-4)]" />
      ) : (
        <span className="grid size-[18px] shrink-0 place-items-center rounded-[var(--r-control)] border transition" style={on ? { background: "var(--brand)", borderColor: "transparent", color: "#fff" } : { borderColor: "var(--line-2)", background: "var(--surface)" }}>
          {on && <CheckCircle className="size-[15px]" weight="fill" />}
        </span>
      )}
      <BankBadge source={loan.source} size={20} />
      <span className="min-w-0 flex-1 truncate font-semibold text-[var(--ink-2)]" title={loan.source}>{shortBank(loan.source) || loan.source}</span>
      <span className="hidden shrink-0 sm:inline">
        <TypeTag kind={loan.isMortgage ? "mortgage" : "loan"} typeLabel={loan.type} />
      </span>
      <span
        className="shrink-0 rounded-[var(--r-pill)] px-1.5 py-0.5 text-[9.5px] font-bold"
        style={loan.role === "debtor" ? { background: "var(--brand-tint)", color: "var(--brand-deep)" } : { background: "var(--surface-3)", color: "var(--ink-3)" }}
      >
        {loan.role === "debtor" ? "חייב" : "ערב"}
      </span>
      <span className="w-[74px] shrink-0 text-left aa4-fig font-semibold text-[var(--ink)]">{shekel(loan.balance)}</span>
      <span className="w-[42px] shrink-0 text-center aa4-fig text-[11px] text-[var(--ink-3)]">{loan.interest ? `${loan.interest}%` : "-"}</span>
      <span className="w-[46px] shrink-0 text-center aa4-fig text-[11px] text-[var(--ink-3)]">{loan.months ? `${loan.months}ח׳` : "-"}</span>
    </motion.li>
  );
}

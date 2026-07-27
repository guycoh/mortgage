"use client";

// /aa100test — the mortgage mix simulator, standalone.
//
// Same actions as the CRM simulator (add / rename / duplicate / delete a mix,
// compare two, open a schedule, edit every row) rebuilt on one design system,
// plus the credit-report intake that fills a mix in a single drop. It carries
// no lead: the workbook lives in this browser, so the page can be opened and
// tried by anyone without touching a client record.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import NumberFlow from "@number-flow/react";
import {
  CheckCircle,
  Copy,
  DotsThree,
  FloppyDisk,
  ListChecks,
  MicrosoftExcelLogo,
  PencilSimple,
  Plus,
  Trash,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import type { LoanPath } from "@/app/data/hooks/useLoanPaths";
import { paths as STATIC_PATHS } from "@/app/data/paths";
import { calculateLoan } from "@/app/private/crm/leads/simulators/components/calculate/loanCalculators";
import Bay from "./components/Bay";
import Ledger from "./components/Ledger";
import Charts from "./components/Charts";
import Compare from "./components/Compare";
import ScheduleModal from "./components/ScheduleModal";
import Select from "./components/Select";
import {
  PATH_LABEL,
  TRACK_HEX,
  mergeReportLoans,
  type ImportedLoan,
  type ImportSummary,
} from "./lib/credit";
import { exportMixToExcel } from "./lib/excel";
import "@fontsource-variable/rubik";
import "@fontsource-variable/archivo";
import "@fontsource/assistant/hebrew-400.css";
import "@fontsource/assistant/hebrew-600.css";
import "@fontsource/assistant/hebrew-700.css";
import "./theme.css";

type Mix = { id: string; mix_name: string; loans: ImportedLoan[]; is_base?: boolean };

const STORE = "aa100test.workbook.v1";

/** The five canonical tracks, shaped like the hook's rows. */
const PATHS: LoanPath[] = STATIC_PATHS.map((p) => ({
  id: p.id,
  name: p.name,
  is_indexed: p.indexed,
  created_at: "",
}));

const newLoan = (mixId: string): ImportedLoan => ({
  id: crypto.randomUUID(),
  mix_id: mixId,
  path_id: 1,
  grace_type_id: 1,
  grace_months: 0,
  amortization_schedule_id: 1,
  amount: 0,
  rate: 0,
  months: 0,
  group: "mortgage",
});

const makeMix = (name: string, isBase = false, rows = 3): Mix => {
  const id = crypto.randomUUID();
  return { id, mix_name: name, is_base: isBase, loans: Array.from({ length: rows }, () => newLoan(id)) };
};

const snapshot = (mixes: Mix[]) => JSON.stringify(mixes);

/** The base mix is named after whoever's reports built it. */
function nameFor(mix: Mix, summary: ImportSummary, first: boolean): string {
  if (!mix.is_base || !summary.clientName) return mix.mix_name;
  if (first) return `משכנתא נוכחית · ${summary.clientName}`;
  return mix.mix_name.includes(summary.clientName) ? mix.mix_name : `${mix.mix_name} + ${summary.clientName}`;
}

export default function Aa100TestPage() {
  const [mixes, setMixes] = useState<Mix[] | null>(null);
  const [activeMixId, setActiveMixId] = useState<string | null>(null);
  const [compareMixId, setCompareMixId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [annualInflation, setAnnualInflation] = useState(2.8);
  const [schedFor, setSchedFor] = useState<ImportedLoan | "mix" | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [flash, setFlash] = useState(false);
  /** Row values as of the last load / import / save — drives the change marks. */
  const [baseline, setBaseline] = useState<Record<string, ImportedLoan>>({});
  const [saved, setSaved] = useState("");
  /** Reports folded into the active mix, oldest first. */
  const [reports, setReports] = useState<ImportSummary[]>([]);
  const [exporting, setExporting] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);

  const list = mixes ?? [];
  const activeMix = list.find((m) => m.id === activeMixId) ?? null;
  const loans = activeMix?.loans ?? [];
  const dirty = mixes !== null && snapshot(mixes) !== saved;

  const rebaseline = (ms: Mix[]) => {
    const map: Record<string, ImportedLoan> = {};
    for (const m of ms) for (const l of m.loans) map[l.id] = { ...l };
    setBaseline(map);
    setSaved(snapshot(ms));
  };

  /* ---------------------------------------------------------------- load */
  useEffect(() => {
    let start: Mix[];
    try {
      const raw = localStorage.getItem(STORE);
      const parsed = raw ? (JSON.parse(raw) as Mix[]) : null;
      start = parsed?.length ? parsed : [makeMix("משכנתא נוכחית", true)];
    } catch {
      start = [makeMix("משכנתא נוכחית", true)];
    }
    setMixes(start);
    setActiveMixId(start[0].id);
    rebaseline(start);
  }, []);

  useEffect(() => setCompareMixId(null), [activeMixId]);

  // leave guard — the workbook only lives here, so losing it should cost a click
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  /* -------------------------------------------------------------- totals */
  const totals = useMemo(() => {
    let amount = 0;
    let monthly = 0;
    let interest = 0;
    for (const l of loans) {
      const r = calculateLoan(l, annualInflation);
      amount += Number(l.amount) || 0;
      monthly += r.monthlyPayment;
      interest += r.totalInterest;
    }
    return { amount, monthly, interest };
  }, [loans, annualInflation]);

  /** The mix's colour signature — share of balance per track, biggest first. */
  const trackSegs = useMemo(() => {
    const per = new Map<number, number>();
    for (const l of loans) per.set(l.path_id, (per.get(l.path_id) ?? 0) + (Number(l.amount) || 0));
    const tot = Array.from(per.values()).reduce((s, v) => s + v, 0);
    if (!tot) return [];
    return Array.from(per.entries())
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([id, v]) => ({ id, pct: (v / tot) * 100 }));
  }, [loans]);

  /* ------------------------------------------------------------- actions */
  const setLoans = useCallback(
    (next: ImportedLoan[]) =>
      setMixes((prev) => (prev ?? []).map((m) => (m.id === activeMixId ? { ...m, loans: next } : m))),
    [activeMixId]
  );

  const addMix = () => {
    const m = makeMix("תמהיל חדש");
    setMixes((prev) => [...(prev ?? []), m]);
    setActiveMixId(m.id);
  };

  const deleteMix = (id: string) => {
    const mix = list.find((m) => m.id === id);
    if (!mix || mix.is_base) return;
    const rest = list.filter((m) => m.id !== id);
    setMixes(rest);
    setActiveMixId(rest.length ? rest[0].id : null);
    setMenuFor(null);
  };

  const duplicateMix = () => {
    if (!activeMix) return;
    const id = crypto.randomUUID();
    const copy: Mix = {
      ...activeMix,
      id,
      mix_name: `${activeMix.mix_name} (העתק)`,
      is_base: false,
      loans: activeMix.loans.map((l) => ({ ...l, id: crypto.randomUUID(), mix_id: id })),
    };
    setMixes((prev) => [...(prev ?? []), copy]);
    setActiveMixId(id);
  };

  const flash4s = (t: { kind: "ok" | "err"; text: string }) => {
    setToast(t);
    setTimeout(() => setToast(null), 4000);
  };

  const save = () => {
    if (!mixes) return;
    try {
      localStorage.setItem(STORE, snapshot(mixes));
      rebaseline(mixes);
      flash4s({ kind: "ok", text: "התמהיל נשמר בדפדפן" });
    } catch {
      flash4s({ kind: "err", text: "השמירה נכשלה — אחסון הדפדפן מלא או חסום" });
    }
  };

  /**
   * The first report replaces the mix's empty starter rows. Every report after
   * it is folded in — a household's two reports both list the joint mortgage in
   * full, so the overlap is merged instead of doubling the balance.
   */
  const applyImport = useCallback(
    (summary: ImportSummary) => {
      if (!activeMixId) return;
      const first = reports.length === 0;
      let duplicates = 0;

      setMixes((prev) => {
        const next = (prev ?? []).map((m) => {
          if (m.id !== activeMixId) return m;
          const incoming = summary.loans.map((l) => ({ ...l, mix_id: activeMixId }));
          const loans = first ? incoming : undefined;
          if (!first) {
            const res = mergeReportLoans(m.loans, incoming);
            duplicates = res.duplicates;
            return { ...m, mix_name: nameFor(m, summary, first), loans: res.merged };
          }
          return { ...m, mix_name: nameFor(m, summary, first), loans: loans! };
        });
        // the freshly imported rows are the new "unchanged" reference
        const map: Record<string, ImportedLoan> = {};
        for (const m of next) for (const l of m.loans) map[l.id] = { ...l };
        setBaseline(map);
        return next;
      });

      setReports((prev) => [...prev, summary]);
      if (!first) {
        flash4s(
          duplicates > 0
            ? { kind: "ok", text: `${duplicates} התחייבויות משותפות אוחדו ולא נספרו פעמיים` }
            : { kind: "ok", text: "הדוח נוסף — לא נמצאו חפיפות" }
        );
      }
      setFlash(true);
      setTimeout(() => boardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
      setTimeout(() => setFlash(false), 1600);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeMixId, reports.length]
  );

  /** Start over: drop the reports and give the mix its blank rows back. */
  const clearImport = useCallback(() => {
    setReports([]);
    setMixes((prev) =>
      (prev ?? []).map((m) =>
        m.id === activeMixId
          ? { ...m, mix_name: m.is_base ? "משכנתא נוכחית" : m.mix_name, loans: [newLoan(m.id), newLoan(m.id), newLoan(m.id)] }
          : m
      )
    );
  }, [activeMixId]);

  const exportExcel = async () => {
    if (!activeMix || !loans.length) return;
    setExporting(true);
    try {
      await exportMixToExcel({
        mixName: activeMix.mix_name,
        loans,
        annualInflation,
        clients: reports.map((r) => ({ name: r.clientName, id: r.clientId, reportDate: r.reportDate })),
      });
    } catch {
      flash4s({ kind: "err", text: "ייצוא האקסל נכשל" });
    } finally {
      setExporting(false);
    }
  };

  /* ----------------------------------------------------------------- ui */
  return (
    <div className="fin-root" dir="rtl">
      <div className="mx-auto w-full max-w-[1300px] px-4 py-5 md:px-6 md:py-7">
        {/* ---------------------------------------------------------- head */}
        <motion.header
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="mb-4 flex flex-wrap items-center justify-between gap-x-5 gap-y-3"
        >
          <div className="flex items-center gap-2.5">
            <h1 className="fin-display text-[30px]">סימולטור תמהילים</h1>
            <span className="fin-chip" style={{ borderColor: "var(--line-2)", color: "var(--ink-3)" }}>
              aa100test
            </span>
            <AnimatePresence>
              {dirty && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="fin-chip"
                  style={{ borderColor: "var(--warn-line)", background: "var(--warn-tint)", color: "var(--warn)" }}
                >
                  <span className="fin-dot" style={{ background: "var(--warn)" }} />
                  לא נשמר
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-[12px]" style={{ color: "var(--ink-3)" }}>
              אינפלציה שנתית
              <span className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={annualInflation}
                  onChange={(e) => setAnnualInflation(parseFloat(e.target.value) || 0)}
                  onFocus={(e) => e.currentTarget.select()}
                  className="fin-input fin-fig w-[76px] pe-6 text-center"
                  aria-label="אינפלציה שנתית באחוזים"
                />
                <span
                  className="pointer-events-none absolute inset-y-0 end-2 grid place-items-center text-[11px]"
                  style={{ color: "var(--ink-4)" }}
                >
                  %
                </span>
              </span>
            </label>

            {list.length > 1 && (
              <div style={{ minWidth: 190 }}>
                <Select
                  variant="input"
                  value={compareMixId ?? ""}
                  onChange={(v) => setCompareMixId(v ? String(v) : null)}
                  placeholder="השוואה לתמהיל…"
                  options={[
                    { value: "", label: "ללא השוואה" },
                    ...list
                      .filter((m) => m.id !== activeMixId)
                      .map((m) => ({ value: m.id, label: m.mix_name })),
                  ]}
                  ariaLabel="תמהיל להשוואה"
                />
              </div>
            )}

            <button className="fin-btn" onClick={() => setSchedFor("mix")} disabled={!loans.length}>
              <ListChecks size={14} weight="bold" />
              לוח סילוקין
            </button>
            <button className="fin-btn" onClick={duplicateMix} disabled={!activeMix}>
              <Copy size={14} weight="bold" />
              שכפל
            </button>
            <button className="fin-btn fin-btn-primary" onClick={save} disabled={!dirty}>
              <FloppyDisk size={14} weight="bold" />
              {dirty ? "שמור שינויים" : "נשמר"}
            </button>
          </div>
        </motion.header>

        {/* ---------------------------------------------------------- rail */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="fin-rail mb-3"
        >
          <div className="fin-rail-cells">
            {[
              { label: "סכום התמהיל", value: totals.amount },
              { label: "החזר חודשי", value: totals.monthly, hot: true },
              { label: 'סה"כ ריבית', value: totals.interest },
            ].map((f) => (
              <div key={f.label} className="fin-rail-cell">
                <span className="fin-rail-label">{f.label}</span>
                <span className="fin-rail-value" data-hot={f.hot || undefined}>
                  <NumberFlow value={Math.round(f.value)} locales="he-IL" />
                  <span className="fin-cur">₪</span>
                </span>
              </div>
            ))}
            <div className="fin-rail-cell" data-side="true">
              <span className="fin-rail-label">הרכב לפי מסלול</span>
              <div className="fin-rail-strip" dir="ltr">
                {trackSegs.map((s) => (
                  <span key={s.id} style={{ width: `${s.pct}%`, background: TRACK_HEX[s.id] }} />
                ))}
              </div>
              <div className="fin-rail-legend">
                {trackSegs.length ? (
                  trackSegs.slice(0, 3).map((s) => (
                    <span key={s.id} className="inline-flex items-center gap-1.5">
                      <span className="fin-dot" style={{ background: TRACK_HEX[s.id] }} />
                      {PATH_LABEL[s.id]}
                      <b>{Math.round(s.pct)}%</b>
                    </span>
                  ))
                ) : (
                  <span>אין עדיין סכומים בתמהיל</span>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ------------------------------------------------------ the intake */}
        {activeMixId && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="mb-3"
          >
            <Bay mixId={activeMixId} reports={reports} onImport={applyImport} onClear={clearImport} />
          </motion.div>
        )}

        {/* -------------------------------------------------------- mix tabs */}
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {list.map((m) => (
            <div key={m.id} className="relative">
              <div className="fin-tab" data-on={m.id === activeMixId} onClick={() => setActiveMixId(m.id)}>
                {editingId === m.id ? (
                  <input
                    autoFocus
                    value={m.mix_name}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      setMixes((prev) =>
                        (prev ?? []).map((x) => (x.id === m.id ? { ...x, mix_name: e.target.value } : x))
                      )
                    }
                    onBlur={() => setEditingId(null)}
                    onKeyDown={(e) => e.key === "Enter" && setEditingId(null)}
                    className="w-[130px] rounded border-0 bg-white/95 px-1 text-[12.5px] text-[var(--ink)] outline-none"
                  />
                ) : (
                  <>
                    {m.is_base && (
                      <span
                        className="fin-dot"
                        style={{ background: m.id === activeMixId ? "#fff" : "var(--primary)" }}
                      />
                    )}
                    {m.mix_name}
                    <span className="fin-fig text-[10.5px] opacity-55">{m.loans.length}</span>
                  </>
                )}
                <button
                  className="fin-tab-x"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuFor(menuFor === m.id ? null : m.id);
                  }}
                  aria-label="פעולות תמהיל"
                >
                  <DotsThree size={15} weight="bold" />
                </button>
              </div>

              <AnimatePresence>
                {menuFor === m.id && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuFor(null)} />
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="fin-card absolute z-50 mt-1 w-36 overflow-hidden p-1"
                      style={{ insetInlineStart: 0, boxShadow: "var(--shadow-lift)" }}
                    >
                      <button
                        className="fin-btn fin-btn-ghost fin-btn-sm w-full !justify-start"
                        onClick={() => {
                          setEditingId(m.id);
                          setMenuFor(null);
                        }}
                      >
                        <PencilSimple size={13} />
                        שינוי שם
                      </button>
                      <button
                        className="fin-btn fin-btn-ghost fin-btn-sm w-full !justify-start"
                        style={{ color: m.is_base ? "var(--ink-4)" : "var(--neg)" }}
                        disabled={m.is_base}
                        onClick={() => deleteMix(m.id)}
                      >
                        <Trash size={13} />
                        {m.is_base ? "תמהיל בסיס" : "מחיקה"}
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          ))}

          <button className="fin-btn fin-btn-sm" onClick={addMix}>
            <Plus size={13} weight="bold" />
            תמהיל
          </button>

          <button
            className="fin-btn fin-btn-sm fin-btn-excel ms-auto"
            onClick={exportExcel}
            disabled={!loans.length || exporting}
            title={loans.length ? "ייצוא התמהיל לגיליון אקסל" : "אין שורות לייצוא"}
          >
            <MicrosoftExcelLogo size={15} weight="fill" className="fin-excel-ico" />
            {exporting ? "מייצא…" : "יצוא לאקסל"}
          </button>
        </div>

        {/* ------------------------------------------------------- workbench */}
        <div
          ref={boardRef}
          className="rounded-[var(--r)] transition-shadow duration-500"
          style={flash ? { boxShadow: "0 0 0 3px var(--primary-tint)" } : undefined}
        >
          {mixes === null ? (
            <div className="fin-card overflow-hidden">
              <div className="fin-head">
                <div className="fin-skel h-4 w-32" />
              </div>
              <div className="flex flex-col gap-2 p-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="fin-skel h-8 w-full" style={{ opacity: 1 - i * 0.16 }} />
                ))}
              </div>
            </div>
          ) : (
            activeMix && (
              <Ledger
                loans={loans}
                paths={PATHS}
                annualInflation={annualInflation}
                baseline={baseline}
                onChange={setLoans}
                onSchedule={(l) => setSchedFor(l)}
              />
            )
          )}
        </div>

        {/* ---------------------------------------------------------- charts */}
        <div className="mt-3">
          <Charts loans={loans} annualInflation={annualInflation} />
        </div>

        {/* ------------------------------------------------------ comparison */}
        <section className="fin-card mt-3 overflow-hidden">
          <header className="fin-head">
            <h2 className="fin-title">השוואת תמהילים</h2>
            <span className="fin-sub ms-auto">ערך שלילי = התמהיל הנוכחי זול יותר</span>
          </header>
          <Compare
            activeMixId={activeMixId}
            mixes={list}
            annualInflation={annualInflation}
            compareMixId={compareMixId}
          />
        </section>
      </div>

      {/* ------------------------------------------------------------ toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fin-toast fixed bottom-5 left-5 z-[100]"
            style={{ color: toast.kind === "ok" ? "var(--pos)" : "var(--neg)" }}
          >
            {toast.kind === "ok" ? (
              <CheckCircle size={16} weight="fill" />
            ) : (
              <WarningCircle size={16} weight="fill" />
            )}
            {toast.text}
            <button className="ms-1 opacity-50 hover:opacity-100" onClick={() => setToast(null)} aria-label="סגירה">
              <X size={12} weight="bold" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {schedFor && activeMix && (
        <ScheduleModal
          subject={
            schedFor === "mix"
              ? { kind: "mix", name: activeMix.mix_name, loans }
              : { kind: "loan", loan: schedFor }
          }
          annualInflation={annualInflation}
          onClose={() => setSchedFor(null)}
        />
      )}
    </div>
  );
}

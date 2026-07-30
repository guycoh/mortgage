"use client";

// The mix simulator's working surface, for one lead.
//
// Same actions as the CRM simulator — add / rename / duplicate / delete a mix,
// compare two, open a schedule, edit every row — rebuilt on one design system,
// plus the credit-report intake that fills a mix in a single drop.
//
// The lead arrives as a prop from the route, never from storage: /aa101test/3
// IS the state. With no lead the same surface opens on a blank board — you can
// drag a report in and work — but there is nowhere to save it until a lead is
// picked, and nothing is restored from a previous visit.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import NumberFlow from "@number-flow/react";
import {
  CheckCircle,
  CircleNotch,
  Copy,
  DotsThree,
  ListChecks,
  MicrosoftExcelLogo,
  PencilSimple,
  Plus,
  Trash,
  UserCircle,
  WarningCircle,
  X,
  FilePdf,
  Stethoscope,
  UserFocus,
} from "@phosphor-icons/react";
import type { LoanPath } from "@/app/data/hooks/useLoanPaths";
import { paths as STATIC_PATHS } from "@/app/data/paths";
import { calculateLoan } from "@/app/private/crm/leads/simulators/components/calculate/loanCalculators";
import Bay from "./components/Bay";
import Btn from "./components/Btn";
import AnalysisModal from "./components/AnalysisModal";
import ClientSummaryModal from "./components/ClientSummaryModal";
import ReportViewerModal from "./components/ReportViewerModal";
import { analyseReports } from "./lib/analysis";
import StatementAnalysisModal from "./components/StatementAnalysisModal";
import StatementSummaryModal from "./components/StatementSummaryModal";
import { analyseStatement } from "@/lib/bank-parser/analysis";
import { useRouter } from "next/navigation";
import LeadPicker, { type Lead } from "./components/LeadPicker";
import Ledger from "./components/Ledger";
import Charts from "./components/Charts";
import Compare from "./components/Compare";
import ScheduleModal from "./components/ScheduleModal";
import Select from "./components/Select";
import {
  FAMILY,
  PATH_LABEL,
  TRACK_HEX,
  mergeReportLoans,
  type ImportedLoan,
  type ImportSummary,
} from "./lib/credit";
import { exportMixToExcel } from "./lib/excel";
import { rise, settle } from "./lib/transitions";
// ONE TYPEFACE. Inter carries the Latin, the figures and the tabular numerals;
// Assistant carries the Hebrew, which Inter has no glyphs for. Their x-heights
// and stroke weights are close enough that "משכנתא 1,240,000" reads as a single
// voice rather than as two fonts meeting mid-line. Nothing else is loaded —
// Rubik and Archivo were a third and a fourth voice on the same page.
import "@fontsource-variable/inter";
import "@fontsource/assistant/hebrew-400.css";
import "@fontsource/assistant/hebrew-500.css";
import "@fontsource/assistant/hebrew-600.css";
import "@fontsource/assistant/hebrew-700.css";
import "./theme.css";

type Mix = { id: string; mix_name: string; loans: ImportedLoan[]; is_base?: boolean };


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

/** The rail, in the order it reads: what it costs a month, then the context. */
const RAIL = [
  { key: "monthly" as const, label: "החזר חודשי", hero: true },
  { key: "amount" as const, label: "סכום התמהיל" },
  { key: "interest" as const, label: 'סה"כ ריבית' },
];

/** Count-ups get their own timing: long enough to read as counting, short
 *  enough that four of them finishing feels like one event. */
const COUNT_UP: EffectTiming = { duration: 400, easing: "cubic-bezier(0.2, 0, 0, 1)" };

/** The identity violet, raised to where it can be seen on the #1C1C1E slab.
 *  #5B54D6 on near-black is legible but muddy at 8px; this is the same hue
 *  with the lightness a dark surface needs. */
const MORTGAGE_ON_DARK = "#9d97f0";

/** The initial for the lead avatar — Hebrew has no case, so this is just the
 *  first letter, and a lead with no name gets the neutral glyph. */
const initialOf = (name?: string | null) => (name ?? "").trim().charAt(0) || "•";

/**
 * WHERE THE BOARD STANDS.
 *
 * Not a button when there is nothing to do: with the board saved this is a
 * plain "✓ נשמר", no fill, no border, no affordance — information.
 *
 * It becomes pressable only while there are unsaved changes, because this page
 * does not autosave. Showing an autosave status over a manual save would be a
 * lie the first time someone closed the tab trusting it, so the chip states the
 * truth instead and offers the one action that resolves it.
 */
function SaveStatus({
  dirty,
  saving,
  canSave,
  onSave,
}: {
  dirty: boolean;
  saving: boolean;
  canSave: boolean;
  onSave: () => void;
}) {
  const tone = saving ? "busy" : dirty ? "dirty" : "ok";
  const label = saving ? "שומר…" : dirty ? (canSave ? "שמירת שינויים" : "בחרו ליד כדי לשמור") : "נשמר";

  return (
    <span className="ink-status" data-tone={tone === "dirty" && canSave ? "dirty" : tone}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={tone}
          className="inline-flex items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
        >
          {saving ? (
            <CircleNotch size={14} weight="bold" className="animate-spin" />
          ) : dirty ? (
            <span className="ink-status-dot" aria-hidden />
          ) : (
            // the tick draws itself in rather than appearing, which is the one
            // moment on this page worth a beat of animation
            <motion.svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <motion.path
                d="M2.5 7.4L5.5 10.4L11.5 3.9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
              />
            </motion.svg>
          )}
          {dirty && canSave && !saving ? (
            <button type="button" className="ink-status-act" onClick={onSave}>
              {label}
            </button>
          ) : (
            label
          )}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** The base mix is named after whoever's reports built it. */
function nameFor(mix: Mix, summary: ImportSummary, first: boolean): string {
  if (!mix.is_base || !summary.clientName) return mix.mix_name;
  if (first) return `משכנתא נוכחית · ${summary.clientName}`;
  return mix.mix_name.includes(summary.clientName) ? mix.mix_name : `${mix.mix_name} + ${summary.clientName}`;
}

export default function Simulator({
  lead,
  endpoint = "/api/aa100/mixes",
  locked = false,
}: {
  lead: Lead | null;
  /**
   * Where the board is read and written. /aa101test names the lead in the
   * request; the Fireberry route uses /api/simulator/mixes, which takes it
   * from a signed cookie instead so there is no id left to tamper with.
   */
  endpoint?: string;
  /**
   * This board belongs to exactly one lead and cannot be pointed at another.
   *
   * The cookie scoping is only as good as the ways out of the page: the lead
   * picker navigates to /aa101test/<id>, which is the open sandbox route and
   * takes its id from the URL. Left in place on a Fireberry session it hands
   * every visitor a menu of every client — undoing the entire reason the id
   * was taken out of the URL.
   */
  locked?: boolean;
}) {
  const [mixes, setMixes] = useState<Mix[] | null>(null);
  const [activeMixId, setActiveMixId] = useState<string | null>(null);
  const [compareMixId, setCompareMixId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [annualInflation, setAnnualInflation] = useState(2.0);
  const [schedFor, setSchedFor] = useState<ImportedLoan | "mix" | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [flash, setFlash] = useState(false);
  /** Row values as of the last load / import / save — drives the change marks. */
  const [baseline, setBaseline] = useState<Record<string, ImportedLoan>>({});
  const [saved, setSaved] = useState("");
  /** Reports folded into the active mix, oldest first. */
  const [reports, setReports] = useState<ImportSummary[]>([]);
  // The two analyses read a חיווי אשראי. A bank statement fills the same board
  // but carries none of that material — no arrears history, no proceedings, no
  // inquiries — so those buttons belong only to the reports that can answer them.
  const creditReports = reports.filter((r) => r.report).map((r) => r.report!);
  // A statement analysis reads one bank's mortgage; a credit report reads a whole
  // household. Only one of the two is ever loaded, so the buttons follow the
  // document rather than being shown and then explaining themselves away.
  const statement = reports.find((r) => r.bank)?.bank ?? null;
  const [showDoc, setShowDoc] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showClient, setShowClient] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const boardRef = useRef<HTMLDivElement>(null);

  const list = mixes ?? [];
  const activeMix = list.find((m) => m.id === activeMixId) ?? null;
  // A report describes what the client owes TODAY, so it belongs to the first
  // mix — the one that means "as things stand". Dropping it onto a proposal
  // would silently overwrite the alternative being drafted.
  const isPrimaryMix = !!activeMixId && (list[0]?.id === activeMixId || !!activeMix?.is_base);
  const loans = activeMix?.loans ?? [];
  const dirty = mixes !== null && snapshot(mixes) !== saved;

  const rebaseline = (ms: Mix[]) => {
    const map: Record<string, ImportedLoan> = {};
    for (const m of ms) for (const l of m.loans) map[l.id] = { ...l };
    setBaseline(map);
    setSaved(snapshot(ms));
  };

  /* ---------------------------------------------------------------- load */

  /** Adopt a set of mixes as the current, unmodified board. */
  const adopt = useCallback((ms: Mix[]) => {
    const start = ms.length ? ms : [makeMix("משכנתא נוכחית", true)];
    setMixes(start);
    setActiveMixId(start[0].id);
    const map: Record<string, ImportedLoan> = {};
    for (const m of start) for (const l of m.loans) map[l.id] = { ...l };
    setBaseline(map);
    setSaved(snapshot(start));
    setReports([]);
  }, []);

  useEffect(() => {
    // No lead: a blank board, every time. Nothing is carried over from a
    // previous visit — the server is the only store this page has.
    if (!lead) {
      adopt([]);
      return;
    }
    let cancelled = false;
    setMixes(null);
    fetch(endpoint.includes("simulator") ? endpoint : `${endpoint}?lead=${lead.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.error) throw new Error(d.error);
        adopt(
          (d.mixes ?? []).map((m: Mix) => ({
            ...m,
            loans: (m.loans ?? []).map((l) => ({ ...l, mix_id: m.id })),
          }))
        );
        if (d.hasExtra === false) {
          flash4s({ kind: "err", text: "העמודות הנוספות חסרות — סוג ההתחייבות והמקור לא יישמרו" });
        }
      })
      .catch((e) => {
        if (cancelled) return;
        adopt([]);
        flash4s({ kind: "err", text: `טעינת הליד נכשלה: ${e.message ?? "שגיאה"}` });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead?.id, adopt, endpoint]);

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

  /**
   * How the balance splits between the two families. Drawn as a two-tone rule
   * under סכום התמהיל rather than as a fourth chart: it answers "how much of
   * this is actually the mortgage" in one glance, which is the first thing an
   * advisor asks of a total.
   */
  const famSplit = useMemo(() => {
    let mortgage = 0;
    let loan = 0;
    for (const l of loans) {
      const v = Number(l.amount) || 0;
      if (l.group === "loan") loan += v;
      else mortgage += v;
    }
    const tot = mortgage + loan;
    if (!tot) return null;
    return { mortgage: (mortgage / tot) * 100, loan: (loan / tot) * 100 };
  }, [loans]);

  /** Nothing has been entered yet — so the rail states nothing, rather than ₪0. */
  const railEmpty = !totals.amount && !totals.monthly && !totals.interest;

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

  const save = async () => {
    if (!mixes || !lead) return;
    setSaving(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead: lead.id, mixes }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`);
      rebaseline(mixes);
      flash4s({
        kind: "ok",
        text:
          data.hasExtra === false
            ? "נשמר — אך סוג ההתחייבות והמקור לא נשמרו (חסרות עמודות)"
            : `נשמר לליד ${lead.id}`,
      });
    } catch (e) {
      flash4s({ kind: "err", text: `השמירה נכשלה: ${(e as Error).message}` });
    } finally {
      setSaving(false);
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
    <div className="ink-root" dir="rtl">
      <div className="mx-auto w-full max-w-[1300px] px-4 py-5 md:px-6 md:py-7">
        {/* ------------------------------------------------- 1. the title row */}
        <motion.header {...rise(0)} className="mb-4 flex flex-wrap items-center gap-3">
          <h1 className="ink-display text-[30px]">סימולטור תמהילים</h1>
          {locked ? (
            // Same picker, no way out of it: the client is stated, not chosen.
            <span className="ink-picker" data-static="" title="הליד שאליו משויך התמהיל">
              <span className="ink-avatar">{initialOf(lead?.name)}</span>
              <span className="ink-picker-name">{lead?.name || "ללא שם"}</span>
              {lead && <span className="ink-picker-id">{lead.id}</span>}
            </span>
          ) : (
            <LeadPicker
              lead={lead}
              onPick={(l) => {
                if (dirty && !window.confirm("יש שינויים שלא נשמרו. לעבור לליד אחר ולאבד אותם?")) return;
                router.push(`/aa101test/${l.id}`);
              }}
              onClear={() => {
                if (dirty && !window.confirm("יש שינויים שלא נשמרו. לצאת מהליד ולאבד אותם?")) return;
                router.push("/aa101test");
              }}
            />
          )}
        </motion.header>

        {/* ------------------------------------- 2 + 3. the console: one panel */}
        {/* Toolbar and KPI slab share an outline, a radius and a shadow, so the
            controls and the figures they drive read as one instrument rather
            than two stacked cards. Light on top, dark underneath. */}
        <motion.section {...rise(1)} className="ink-console mb-6">
          <div className="ink-toolbar">
            {/* — simulation parameters — */}
            <div className="ink-tool-group">
              <label className="ink-param">
                <span className="ink-param-label">אינפלציה שנתית</span>
                <span className="ink-param-sep" />
                <input
                  type="number"
                  step="0.1"
                  value={annualInflation}
                  onChange={(e) => setAnnualInflation(parseFloat(e.target.value) || 0)}
                  onFocus={(e) => e.currentTarget.select()}
                  className="ink-param-in"
                  aria-label="אינפלציה שנתית באחוזים"
                />
                <span className="ink-param-unit">%</span>
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
            </div>

            {/* — views — */}
            <div className="ink-tool-group">
              <Btn className="ink-btn" onClick={() => setSchedFor("mix")} disabled={!loans.length}>
                <ListChecks size={14} weight="bold" />
                לוח סילוקין
              </Btn>
            </div>

            {/* — document actions, and where the document stands — */}
            <div className="ink-tool-group" data-end="true">
              <Btn className="ink-btn" onClick={duplicateMix} disabled={!activeMix}>
                <Copy size={14} weight="bold" />
                שכפל
              </Btn>
              <SaveStatus dirty={dirty} saving={saving} canSave={!!lead} onSave={save} />
            </div>
          </div>

          <div className="ink-rail">
            <div className="ink-rail-cells">
              {RAIL.map((f) => {
                const value = totals[f.key];
                return (
                  <div key={f.key} className="ink-rail-cell" data-hero={f.hero || undefined}>
                    <span className="ink-rail-label">{f.label}</span>
                    {railEmpty ? (
                      <span className="ink-rail-value" data-empty="true">
                        —
                      </span>
                    ) : (
                      <span className="ink-rail-value">
                        <span className="ink-cur">₪</span>
                        <NumberFlow
                          value={Math.round(value)}
                          locales="he-IL"
                          spinTiming={COUNT_UP}
                          transformTiming={COUNT_UP}
                        />
                      </span>
                    )}
                  </div>
                );
              })}

              <div className="ink-rail-cell">
                <span className="ink-rail-label">הרכב לפי מסלול</span>
                {trackSegs.length ? (
                  <>
                    {/* A real segmented bar: one block per track, in the two
                        identity colours' own ramp, hairline-separated so a 4%
                        slice is still a slice. Hover dims the rest. */}
                    <div className="ink-rail-strip" dir="ltr">
                      {trackSegs.map((s) => (
                        <span
                          key={s.id}
                          style={{ width: `${s.pct}%`, background: TRACK_HEX[s.id] }}
                          title={`${PATH_LABEL[s.id]} · ${Math.round(s.pct)}%`}
                        />
                      ))}
                    </div>
                    {/* The legend names what the bar is made of, and the bar is
                        made of tracks — so the legend is tracks. The family
                        split has its own two chips in the totals row and its own
                        two cards under the charts; stating it here as well,
                        against a bar that is not showing it, is how a reader
                        ends up believing the segments are families. */}
                    <div className="ink-rail-legend">
                      {trackSegs.slice(0, 3).map((s) => (
                        <span key={s.id} className="inline-flex items-center gap-1.5">
                          <span className="ink-dot" style={{ background: TRACK_HEX[s.id] }} />
                          {PATH_LABEL[s.id]}
                          <b>{Math.round(s.pct)}%</b>
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <span className="ink-rail-hint">הזינו סכומים כדי לראות תוצאות</span>
                )}
              </div>
            </div>
          </div>
        </motion.section>

        {/* ------------------------------------------------------ the intake */}
        {activeMixId && isPrimaryMix && (
          <motion.div
            {...rise(2)}
            className="mb-6"
          >
            <Bay mixId={activeMixId} reports={reports} onImport={applyImport} onClear={clearImport} />
          </motion.div>
        )}

        {/* -------------------------------------------------------- mix tabs */}
        <motion.div {...rise(3)} className="mb-3 flex flex-wrap items-center gap-1.5">
          {list.map((m) => (
            <div key={m.id} className="relative">
              <div className="ink-tab" data-on={m.id === activeMixId} onClick={() => setActiveMixId(m.id)}>
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
                        className="ink-dot"
                        style={{ background: m.id === activeMixId ? "#fff" : "var(--primary)" }}
                      />
                    )}
                    {m.mix_name}
                    <span className="ink-fig text-[10.5px] opacity-55">{m.loans.length}</span>
                  </>
                )}
                <button
                  className="ink-tab-x"
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
                      className="ink-card absolute z-50 mt-1 w-36 overflow-hidden p-1"
                      style={{ insetInlineStart: 0, boxShadow: "var(--shadow-lift)" }}
                    >
                      <Btn
                        className="ink-btn ink-btn-ghost ink-btn-sm w-full !justify-start"
                        onClick={() => {
                          setEditingId(m.id);
                          setMenuFor(null);
                        }}
                      >
                        <PencilSimple size={13} />
                        שינוי שם
                      </Btn>
                      <Btn
                        className="ink-btn ink-btn-ghost ink-btn-sm w-full !justify-start"
                        style={{ color: m.is_base ? "var(--ink-4)" : "var(--neg)" }}
                        disabled={m.is_base}
                        onClick={() => deleteMix(m.id)}
                      >
                        <Trash size={13} />
                        {m.is_base ? "תמהיל בסיס" : "מחיקה"}
                      </Btn>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          ))}

          <Btn className="ink-btn ink-btn-sm" onClick={addMix}>
            <Plus size={13} weight="bold" />
            תמהיל
          </Btn>

          {/* The report's own findings, and the report itself. Both only exist
              once something has been dropped, so they appear with the data. */}
          {reports.length > 0 && (
            <>
              {statement && (
                <>
                  <Btn
                    className="ink-btn ink-btn-sm ms-auto"
                    onClick={() => setShowClient(true)}
                    title="עמוד אחד להראות ללקוח — מה יש לו, כמה זה עולה בחודש, ומה יעלה לסלק"
                  >
                    <UserFocus size={14} weight="bold" style={{ color: "var(--pos)" }} />
                    סיכום ללקוח
                  </Btn>
                  <Btn
                    className="ink-btn ink-btn-sm"
                    onClick={() => setShowAnalysis(true)}
                    title="ניתוח המשכנתא — תמהיל, עמלות יציאה, שינויי ריבית וכדאיות מיחזור"
                  >
                    <Stethoscope size={14} weight="bold" style={{ color: "var(--primary)" }} />
                    ניתוח משכנתא
                  </Btn>
                </>
              )}
              {creditReports.length > 0 && (
                <>
              <Btn
                className="ink-btn ink-btn-sm ms-auto"
                onClick={() => setShowClient(true)}
                title="עמוד אחד להראות ללקוח — מה יש לו, כמה זה עולה בחודש, ומה לשים לב אליו"
              >
                <UserFocus size={14} weight="bold" style={{ color: "var(--pos)" }} />
                סיכום ללקוח
              </Btn>
              <Btn
                className="ink-btn ink-btn-sm"
                onClick={() => setShowAnalysis(true)}
                title="ניתוח מלא של חיווי האשראי — פיגורים, הליכים, חשיפות וסיכונים"
              >
                <Stethoscope size={14} weight="bold" style={{ color: "var(--primary)" }} />
                ניתוח חיווי
              </Btn>
                </>
              )}
              <button
                className={`ink-btn ink-btn-sm${creditReports.length || statement ? "" : " ms-auto"}`}
                onClick={() => setShowDoc(true)}
                disabled={!reports.some((r) => r.file)}
                title={reports.some((r) => r.file) ? "צפייה במסמך המקורי" : "המסמך אינו זמין בהפעלה הזו"}
              >
                <FilePdf size={14} weight="fill" style={{ color: "var(--neg)" }} />
                צפייה בחיווי
              </button>
            </>
          )}

          <Btn
            className={`ink-btn ink-btn-excel${reports.length ? "" : " ms-auto"}`}
            onClick={exportExcel}
            disabled={!loans.length || exporting}
            aria-busy={exporting}
            title={loans.length ? "ייצוא התמהיל לגיליון אקסל" : "אין שורות לייצוא"}
          >
            {exporting ? (
              <CircleNotch size={16} weight="bold" className="ink-excel-ico animate-spin" />
            ) : (
              <MicrosoftExcelLogo size={16} weight="fill" className="ink-excel-ico" />
            )}
            יצוא לאקסל
          </Btn>
        </motion.div>

        {/* ------------------------------------------------------- workbench */}
        <motion.div
          {...rise(4)}
          ref={boardRef}
          className="rounded-[var(--r)] transition-shadow duration-500"
          style={flash ? { boxShadow: "0 0 0 3px var(--primary-tint)" } : undefined}
        >
          {mixes === null ? (
            <div className="ink-card overflow-hidden">
              <div className="ink-head">
                <div className="ink-skel h-4 w-32" />
              </div>
              <div className="flex flex-col gap-2 p-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="ink-skel h-8 w-full" style={{ opacity: 1 - i * 0.16 }} />
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
        </motion.div>

        {/* ---------------------------------------------------------- charts */}
        <motion.div {...rise(5)} className="mt-6">
          <Charts loans={loans} annualInflation={annualInflation} />
        </motion.div>

        {/* ------------------------------------------------------ comparison */}
        <motion.section {...rise(6)} className="ink-card mt-6 overflow-hidden">
          <header className="ink-head">
            <h2 className="ink-title">השוואת תמהילים</h2>
            <span className="ink-sub ms-auto">ערך שלילי = התמהיל הנוכחי זול יותר</span>
          </header>
          <Compare
            activeMixId={activeMixId}
            mixes={list}
            annualInflation={annualInflation}
            compareMixId={compareMixId}
          />
        </motion.section>
      </div>

      {/* ------------------------------------------------------------ toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="ink-toast fixed bottom-5 left-5 z-[100]"
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

      {showDoc && reports.length > 0 && (
        <ReportViewerModal reports={reports} onClose={() => setShowDoc(false)} />
      )}

      {/* Derived on open rather than on import: the analysis is a read of the
          reports, and recomputing it costs nothing next to parsing the PDF. */}
      {showClient && statement && (
        <StatementSummaryModal
          analysis={analyseStatement(statement)}
          onClose={() => setShowClient(false)}
        />
      )}

      {showAnalysis && statement && (
        <StatementAnalysisModal
          analysis={analyseStatement(statement)}
          onClose={() => setShowAnalysis(false)}
        />
      )}

      {showClient && creditReports.length > 0 && (
        <ClientSummaryModal
          analysis={analyseReports(creditReports, reports.map((r) => r.fileName))}
          onClose={() => setShowClient(false)}
        />
      )}

      {showAnalysis && creditReports.length > 0 && (
        <AnalysisModal
          analysis={analyseReports(creditReports, reports.map((r) => r.fileName))}
          onClose={() => setShowAnalysis(false)}
        />
      )}
    </div>
  );
}

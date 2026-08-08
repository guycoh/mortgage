"use client";

// The mix simulator's working surface, for one lead.
//
// Same actions as the CRM simulator — add / rename / duplicate / delete a mix,
// compare two, open a schedule, edit every row — rebuilt on one design system,
// plus the credit-report intake that fills a mix in a single drop.
//
// The lead arrives as a prop from the route, never from storage: /aa102test/3
// IS the state. With no lead the same surface opens on a blank board — you can
// drag a report in and work — but there is nowhere to save it until a lead is
// picked, and nothing is restored from a previous visit.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import NumberFlow from "@number-flow/react";
import {
  CheckCircle,
  CircleNotch,
  Copy,
  DotsThree,
  FloppyDisk,
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
import ToolSwitch, { type Tool } from "./components/ToolSwitch";
import Logo from "./components/Logo";
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
import { track } from "./lib/track.client";
import { collapse, collapseOut, rise, still, viewIn, type Enter } from "./lib/transitions";
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

/**
 * THE OTHER TOOL, code-split.
 *
 * It is a whole second instrument — its own console, two product cards, an
 * ECharts canvas and a 361-row schedule — and most sessions never open it. It
 * loads on the pointer entering its switch button, which is 200ms before the
 * click lands, so by the time the fill has travelled the chunk is already in.
 */
const ReverseTool = dynamic(() => import("./reverse/ReverseMortgage"), {
  loading: () => (
    <div className="lgr-card overflow-hidden">
      <div className="lgr-head">
        <div className="lgr-skel h-4 w-40" />
      </div>
      <div className="flex flex-col gap-2 p-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="lgr-skel h-10 w-full" style={{ opacity: 1 - i * 0.2 }} />
        ))}
      </div>
    </div>
  ),
});

type Mix = {
  id: string;
  mix_name: string;
  loans: ImportedLoan[];
  is_base?: boolean;
  /** גובה התמהיל — the total the אחוז column allocates against. Proposals only. */
  target_amount?: number | null;
};


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
 * THE SAVE.
 *
 * This was a text chip with a dot, on the theory that a status is information
 * rather than an action. It was the wrong call: the one thing an advisor needs
 * to find on this page without looking is the button that commits their work,
 * and a line of text is not that. So it is a real primary button — the same
 * solid violet as "בחירת קובץ", the only filled control in the toolbar, with a
 * disk icon and a label that says what it does.
 *
 * Four states, one shape, so the button never changes size under the cursor:
 *   dirty   → enabled, "שמירת שינויים"
 *   saving  → spinner, "שומר…"
 *   saved   → a tick that draws itself in, "נשמר", held for a beat
 *   clean   → the same button, disabled and quiet
 *
 * With no lead picked it stays disabled and says so, because there is nowhere
 * for the board to go.
 */
function SaveButton({
  dirty,
  saving,
  justSaved,
  canSave,
  onSave,
}: {
  dirty: boolean;
  saving: boolean;
  /** True for a couple of seconds after a save lands. */
  justSaved: boolean;
  canSave: boolean;
  onSave: () => void;
}) {
  const state = saving ? "saving" : justSaved ? "saved" : dirty ? "dirty" : "clean";
  const label = saving
    ? "שומר…"
    : justSaved
      ? "נשמר"
      : dirty
        ? canSave
          ? "שמירת שינויים"
          : "בחרו ליד כדי לשמור"
        : "נשמר";

  return (
    <Btn
      className="lgr-btn lgr-btn-primary lgr-btn-save"
      onClick={onSave}
      disabled={!dirty || saving || !canSave}
      data-state={state}
      title={canSave ? "שמירת התמהיל לליד" : "בחרו ליד כדי לשמור"}
    >
      {saving ? (
        <CircleNotch size={15} weight="bold" className="animate-spin" />
      ) : state === "dirty" ? (
        <FloppyDisk size={15} weight="fill" />
      ) : (
        // the tick draws itself rather than appearing — the one moment on this
        // page worth a beat of animation
        <motion.svg key="tick" width="15" height="15" viewBox="0 0 14 14" fill="none" aria-hidden>
          <motion.path
            d="M2.5 7.4L5.5 10.4L11.5 3.9"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
          />
        </motion.svg>
      )}
      {label}
    </Btn>
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
  initialTool = "mix",
}: {
  lead: Lead | null;
  /**
   * Where the board is read and written. /aa102test names the lead in the
   * request; the Fireberry route uses /api/simulator/mixes, which takes it
   * from a signed cookie instead so there is no id left to tamper with.
   */
  endpoint?: string;
  /**
   * This board belongs to exactly one lead and cannot be pointed at another.
   *
   * The cookie scoping is only as good as the ways out of the page: the lead
   * picker navigates to /aa102test/<id>, which is the open sandbox route and
   * takes its id from the URL. Left in place on a Fireberry session it hands
   * every visitor a menu of every client — undoing the entire reason the id
   * was taken out of the URL.
   */
  locked?: boolean;
  /**
   * Which tool the surface opens on, resolved on the server from ?tool= so a
   * deep link paints the right one on the first frame instead of showing the
   * ledger and then swapping it out.
   */
  initialTool?: Tool;
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
  /** Held for a beat after a save lands, so the button can confirm it. */
  const [justSaved, setJustSaved] = useState(false);

  /* ------------------------------------------------------------- the tools */
  /**
   * TWO INSTRUMENTS, ONE SURFACE.
   *
   * משכנתא הפוכה is not another page. The switch in the title row swaps the
   * body under it and nothing else moves — same route, same lead, no
   * navigation, so the change costs a render and the fill can travel between
   * the two buttons while it happens.
   *
   * The address bar is kept in step with a NATIVE pushState rather than the
   * router: `?tool=reverse` makes the tool linkable and the Back button
   * behave, without paying for a soft navigation that would re-run the page's
   * server component and tear the board down.
   */
  const [tool, setTool] = useState<Tool>(initialTool);
  const dir: -1 | 1 = tool === "reverse" ? -1 : 1;

  /** The page-load stagger belongs to the page load. A tool switch moves the
   *  whole view as one object, and blocks that also staggered inside it would
   *  be two animations of the same pixels — so after first paint they arrive
   *  already in place. */
  const firstPaint = useRef(true);
  useEffect(() => {
    firstPaint.current = false;
  }, []);
  const enter: Enter = (i) => (firstPaint.current ? rise(i) : still);

  const pickTool = (next: Tool) => {
    if (next === tool) return;
    setTool(next);
    try {
      const url = new URL(window.location.href);
      if (next === "reverse") url.searchParams.set("tool", "reverse");
      else url.searchParams.delete("tool");
      window.history.pushState(null, "", url);
    } catch {
      /* the tool still switches — only the address bar missed it */
    }
    // The two tools are different heights and the eye should land on the top
    // of the new one, not halfway down it.
    if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const onPop = () =>
      setTool(new URLSearchParams(window.location.search).get("tool") === "reverse" ? "reverse" : "mix");
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // The pointer-enter preload covers mouse users; this covers everyone else.
  // One idle-time import, so the switch never lands on a skeleton — the chunk
  // is a few KB against a board that already shipped ECharts.
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1200));
    const id = idle(() => void import("./reverse/ReverseMortgage"));
    return () => (window.cancelIdleCallback ?? window.clearTimeout)(id as number);
  }, []);

  // Telemetry — openings only, on the transition to open, so a modal held
  // open for ten minutes is one event, not a stream. No-ops off the board.
  useEffect(() => {
    if (showAnalysis) track(statement ? "statement_analysis_open" : "analysis_open");
  }, [showAnalysis, statement]);
  useEffect(() => {
    if (showClient) track(statement ? "statement_summary_open" : "summary_open");
  }, [showClient, statement]);
  useEffect(() => {
    if (showDoc) track("report_view");
  }, [showDoc]);
  useEffect(() => {
    if (schedFor) track("schedule_open", { data: { subject: schedFor === "mix" ? "mix" : "row" } });
  }, [schedFor]);
  useEffect(() => {
    if (compareMixId) track("compare_open");
  }, [compareMixId]);
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
        } else if (d.hasTarget === false) {
          // Said out loud rather than left to be discovered on the next reload:
          // the אחוז column still works, its divisor just is not stored yet.
          flash4s({ kind: "err", text: "העמודה target_amount חסרה — גובה התמהיל לא יישמר" });
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

  /** גובה התמהיל, on the mix being looked at. */
  const setTarget = useCallback(
    (value: number | null) =>
      setMixes((prev) =>
        (prev ?? []).map((m) => (m.id === activeMixId ? { ...m, target_amount: value } : m))
      ),
    [activeMixId]
  );

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
      // A copy of the current mortgage is the usual starting point for a
      // proposal, and its total is the figure being re-cut. Seeding גובה התמהיל
      // with it means אחוז works on the first keystroke instead of after a
      // detour to type a number the mix already knows.
      target_amount:
        activeMix.target_amount ??
        activeMix.loans.reduce((s, l) => s + (Number(l.amount) || 0), 0) ??
        null,
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
      track("save", {
        ok: true,
        mortgages: mixes.reduce((s, m) => s + m.loans.filter((l) => l.group === "mortgage").length, 0),
        loans: mixes.reduce((s, m) => s + m.loans.filter((l) => l.group !== "mortgage").length, 0),
        data: { mixes: mixes.length },
      });
      rebaseline(mixes);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2200);
      flash4s({
        kind: "ok",
        text:
          data.hasExtra === false
            ? "נשמר — אך סוג ההתחייבות והמקור לא נשמרו (חסרות עמודות)"
            : `נשמר לליד ${lead.id}`,
      });
    } catch (e) {
      track("save", { ok: false, error: ((e as Error).message || "").slice(0, 300) });
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

      // A second document naming a DIFFERENT person is either the legitimate
      // household case (a couple's two חיווי reports — the very reason the
      // merge exists) or a mis-drag of another client's file. The board cannot
      // tell a spouse from a stranger, so it asks — one click for the couple,
      // a saved disaster for the wrong file. Same person is recognised by ת"ז
      // when both sides carry one, by name otherwise; with no identity on
      // either side the drop passes, since refusing on missing data would
      // block real work.
      if (!first) {
        const norm = (s: string) => s.replace(/\s+/g, " ").trim();
        const sameClient = reports.some((r) => {
          if (r.clientId && summary.clientId) return r.clientId === summary.clientId;
          if (r.clientName && summary.clientName)
            return norm(r.clientName) === norm(summary.clientName);
          return true;
        });
        if (!sameClient) {
          const held = reports.map((r) => r.clientName).filter(Boolean).join(", ");
          const ok = window.confirm(
            `המסמך שייך ל־${summary.clientName || "אדם אחר"}, והבורד פתוח על ${held || "לקוח אחר"}.\n\n` +
              `אם אלה בני זוג — אישור יאחד את החובות לתמהיל משותף.\n` +
              `אם זה קובץ של לקוח אחר — ביטול ישאיר את הבורד כמו שהוא.`
          );
          if (!ok) {
            track("import", {
              ok: false,
              kind: summary.kind,
              file_name: summary.fileName,
              client_name: summary.clientName || undefined,
              error: "client-mismatch-declined",
            });
            flash4s({ kind: "err", text: "הייבוא בוטל — המסמך לא אוחד לבורד" });
            return;
          }
        }
      }

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
    track("excel_export", { mortgages: loans.filter((l) => l.group === "mortgage").length, loans: loans.filter((l) => l.group !== "mortgage").length });
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
    <div className="lgr-root" dir="rtl">
      <div className="mx-auto w-full max-w-[1300px] px-4 py-5 md:px-6 md:py-7">
        {/* --------------------------------------- 1. the chrome, then the title */}
        {/* A band of tabs above the page rather than a control inside it: which
            instrument you are on is a property of the app, not of the sheet.
            The client rides at the far end of the same bar, because that is the
            other thing that is true of every view underneath it. */}
        <motion.header {...enter(0)} className="mb-5">
          <nav className="lgr-nav">
            {/* The mark, at the start of the bar. It is the only thing on this
                page that is allowed to be shiny — an app's own emblem is the
                one place a gloss is a signature rather than decoration. */}
            <div className="lgr-brand">
              <Logo size={34} />
              <span className="lgr-brand-name">מורגי</span>
            </div>

            <ToolSwitch
              value={tool}
              onChange={pickTool}
              onPreload={(t) => {
                if (t === "reverse") void import("./reverse/ReverseMortgage");
              }}
              // The unsaved-dot: crossing to the other tool must not mean
              // forgetting this one has work uncommitted. Only the mix can be
              // dirty — the reverse tool computes and never saves.
              marks={{ mix: dirty }}
            />

            <div className="lgr-nav-end">
          {locked ? (
            // Same picker, no way out of it: the client is stated, not chosen.
            <span className="lgr-picker" data-static="" title="הליד שאליו משויך התמהיל">
              <span className="lgr-avatar">{initialOf(lead?.name)}</span>
              <span className="lgr-picker-name">{lead?.name || "ללא שם"}</span>
              {lead && <span className="lgr-picker-id">{lead.id}</span>}
            </span>
          ) : (
            <LeadPicker
              lead={lead}
              onPick={(l) => {
                if (dirty && !window.confirm("יש שינויים שלא נשמרו. לעבור לליד אחר ולאבד אותם?")) return;
                router.push(`/aa102test/${l.id}`);
              }}
              onClear={() => {
                if (dirty && !window.confirm("יש שינויים שלא נשמרו. לצאת מהליד ולאבד אותם?")) return;
                router.push("/aa102test");
              }}
            />
          )}
            </div>
          </nav>

          {/* The title is the tool, and it changes with the tab. Keyed, but
              deliberately NOT inside an AnimatePresence: mode="wait" would hold
              the old word for its exit and only then start the new one, leaving
              the row with no title at all for a third of a second. Replacing
              the element outright keeps the geometry honest from the first
              frame; only the ink fades. */}
          <motion.h1
            key={tool}
            className="lgr-display mt-5 text-[30px]"
            initial={{ opacity: 0, y: 7 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
          >
            {tool === "mix" ? "סימולטור תמהילים" : "משכנתא הפוכה"}
          </motion.h1>
        </motion.header>

        <AnimatePresence mode="wait" initial={false}>
        {tool === "reverse" ? (
          <motion.div key="reverse" {...viewIn(dir)}>
            <ReverseTool
              enter={enter}
              // A Fireberry session is named by its cookie; the open sandbox
              // names its lead. Either way the tool can ask for the client's
              // שווי נכס and ages — read-only — and open already filled in.
              profileUrl={
                locked
                  ? "/api/simulator/reverse-profile"
                  : lead
                    ? `/api/simulator/reverse-profile?lead=${lead.id}`
                    : null
              }
            />
          </motion.div>
        ) : (
        <motion.div key="mix" {...viewIn(dir)}>

        {/* ------------------------------------- 2 + 3. the console: one panel */}
        {/* Toolbar and KPI slab share an outline, a radius and a shadow, so the
            controls and the figures they drive read as one instrument rather
            than two stacked cards. Light on top, dark underneath. */}
        <motion.section {...enter(1)} className="lgr-console mb-6">
          <div className="lgr-toolbar">
            {/* — simulation parameters — */}
            <div className="lgr-tool-group">
              <label className="lgr-param">
                <span className="lgr-param-label">אינפלציה שנתית</span>
                <span className="lgr-param-sep" />
                <input
                  type="number"
                  step="0.1"
                  value={annualInflation}
                  onChange={(e) => setAnnualInflation(parseFloat(e.target.value) || 0)}
                  onFocus={(e) => e.currentTarget.select()}
                  className="lgr-param-in"
                  aria-label="אינפלציה שנתית באחוזים"
                />
                <span className="lgr-param-unit">%</span>
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

            {/* Only the commit stays up here — it is the one control that has to
                be findable without looking. */}
            <div className="lgr-tool-group" data-end="true">
              <SaveButton dirty={dirty} saving={saving} justSaved={justSaved} canSave={!!lead} onSave={save} />
            </div>
          </div>

          <div className="lgr-rail">
            <div className="lgr-rail-cells">
              {RAIL.map((f) => {
                const value = totals[f.key];
                return (
                  <div key={f.key} className="lgr-rail-cell" data-hero={f.hero || undefined}>
                    <span className="lgr-rail-label">{f.label}</span>
                    {railEmpty ? (
                      <span className="lgr-rail-value" data-empty="true">
                        —
                      </span>
                    ) : (
                      <span className="lgr-rail-value">
                        <span className="lgr-cur">₪</span>
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

              <div className="lgr-rail-cell">
                <span className="lgr-rail-label">הרכב לפי מסלול</span>
                {trackSegs.length ? (
                  <>
                    {/* A real segmented bar: one block per track, in the two
                        identity colours' own ramp, hairline-separated so a 4%
                        slice is still a slice. Hover dims the rest. */}
                    <div className="lgr-rail-strip" dir="ltr">
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
                    <div className="lgr-rail-legend">
                      {trackSegs.slice(0, 3).map((s) => (
                        <span key={s.id} className="inline-flex items-center gap-1.5">
                          <span className="lgr-dot" style={{ background: TRACK_HEX[s.id] }} />
                          {PATH_LABEL[s.id]}
                          <b>{Math.round(s.pct)}%</b>
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <span className="lgr-rail-hint">הזינו סכומים כדי לראות תוצאות</span>
                )}
              </div>
            </div>
          </div>
        </motion.section>

        {/* ------------------------------------- the intake, and the mix views */}
        {/* The strip stops at its content rather than banding across the page,
            and the room it gives back carries the two mix-wide views — left
            edge shared with the export cluster on the strip below, so the two
            clusters read as one stack rather than as two stray rows. */}
        <motion.div {...enter(2)} className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-3">
          {/* THE STRIP BELONGS TO THE BASE MIX ONLY — a scenario you invented
              has nothing to import into. Switching to one used to delete the
              strip on the spot, dropping the band from 90px to 56px in a single
              frame and yanking the whole board up with it.

              It leaves properly now: it takes its own height down with it, so
              the page below travels the same 34px over 340ms instead of
              teleporting. `initial={false}` keeps this out of the page-load
              sequence — rise(2) already handles the first appearance, and this
              should only ever fire on a tab you chose. */}
          <AnimatePresence initial={false}>
            {activeMixId && isPrimaryMix && (
              <motion.div
                key="bay"
                className="flex-[1_1_520px] overflow-hidden"
                initial={{ height: 0, opacity: 0, y: -6, scale: 0.99 }}
                animate={{ height: "auto", opacity: 1, y: 0, scale: 1 }}
                exit={{ height: 0, opacity: 0, y: -6, scale: 0.99, transition: collapseOut }}
                transition={collapse}
                // Capped while it is an invitation; once reports are in it is a
                // receipt carrying names and chips and earns the rest of the row.
                style={{ maxWidth: reports.length ? undefined : 760 }}
              >
                <Bay mixId={activeMixId} reports={reports} onImport={applyImport} onClear={clearImport} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* The well's own 11px padding and 1px border put the buttons inside
              it 12px in from its edge; 3px more here lands them at 15px from
              the page margin — the tab strip's 14px padding plus its border —
              so this pair sits exactly above the יצוא לאקסל cluster on the
              strip below and the two read as one stack. */}
          <div className="lgr-side ms-auto" style={{ marginInlineEnd: 3 }}>
            <Btn className="lgr-btn" onClick={() => setSchedFor("mix")} disabled={!loans.length}>
              <ListChecks size={14} weight="bold" />
              לוח סילוקין מאוחד
            </Btn>
            <Btn className="lgr-btn" onClick={duplicateMix} disabled={!activeMix}>
              <Copy size={14} weight="bold" />
              שכפל תמהיל
            </Btn>
          </div>
        </motion.div>

        {/* -------------------------------------------------------- mix tabs */}
        {/* BAND 3 — the mix workspace.
            The selector used to float 12px above the board, so the tab you
            picked and the table it governed were two separate objects. They are
            one now: the strip sits flush on the card's top edge and shares its
            border, and both enter together rather than on staggered delays. */}
        <motion.div {...enter(3)} className="mb-6">
        <div className="lgr-tabs">
          {list.map((m) => (
            <div key={m.id} className="relative">
              <div className="lgr-tab" data-on={m.id === activeMixId} onClick={() => setActiveMixId(m.id)}>
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
                        className="lgr-dot"
                        style={{ background: m.id === activeMixId ? "#fff" : "var(--primary)" }}
                      />
                    )}
                    {m.mix_name}
                    <span className="lgr-fig text-[10.5px] opacity-55">{m.loans.length}</span>
                  </>
                )}
                <button
                  className="lgr-tab-x"
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
                      className="lgr-card absolute z-50 mt-1 w-36 overflow-hidden p-1"
                      style={{ insetInlineStart: 0, boxShadow: "var(--shadow-lift)" }}
                    >
                      <Btn
                        className="lgr-btn lgr-btn-ghost lgr-btn-sm w-full !justify-start"
                        onClick={() => {
                          setEditingId(m.id);
                          setMenuFor(null);
                        }}
                      >
                        <PencilSimple size={13} />
                        שינוי שם
                      </Btn>
                      <Btn
                        className="lgr-btn lgr-btn-ghost lgr-btn-sm w-full !justify-start"
                        style={{ color: m.is_base ? "var(--lgr-4)" : "var(--neg)" }}
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

          <Btn className="lgr-btn lgr-btn-sm" onClick={addMix}>
            <Plus size={13} weight="bold" />
            תמהיל
          </Btn>

          {/* WHAT YOU DO WITH THE MIX, on the strip that names it — one
              cluster on the far side, in the small button size this row uses. */}
          <div className="ms-auto flex flex-wrap items-center gap-1.5">
              {/* Once a document is in, its three readings join the strip.
              A credit report and a bank statement are alternatives — only
              one is ever loaded — so this is one set of tiles whose wording
              follows whichever arrived, not two duplicated blocks. */}
              {reports.length > 0 && (
              <>
              <Btn
                className="lgr-btn lgr-btn-sm"
                onClick={() => setShowClient(true)}
                title={
                  statement
                    ? "עמוד אחד להראות ללקוח — מה יש לו, כמה זה עולה בחודש, ומה יעלה לסלק"
                    : "עמוד אחד להראות ללקוח — מה יש לו, כמה זה עולה בחודש, ומה לשים לב אליו"
                }
              >
                <UserFocus size={14} weight="bold" style={{ color: "var(--pos)" }} />
                סיכום ללקוח
              </Btn>
              <Btn
                className="lgr-btn lgr-btn-sm"
                onClick={() => setShowAnalysis(true)}
                title={
                  statement
                    ? "ניתוח המשכנתא — תמהיל, עמלות יציאה, שינויי ריבית וכדאיות מיחזור"
                    : "ניתוח מלא של חיווי האשראי — פיגורים, הליכים, חשיפות וסיכונים"
                }
              >
                <Stethoscope size={14} weight="bold" style={{ color: "var(--primary)" }} />
                {statement ? "ניתוח משכנתא" : "ניתוח חיווי"}
              </Btn>
              <Btn
                className="lgr-btn lgr-btn-sm"
                onClick={() => setShowDoc(true)}
                disabled={!reports.some((r) => r.file)}
                title={reports.some((r) => r.file) ? "צפייה במסמך המקורי" : "המסמך אינו זמין בהפעלה הזו"}
              >
                <FilePdf size={14} weight="fill" style={{ color: "var(--neg)" }} />
                צפייה במסמך
              </Btn>
              </>
              )}
              <Btn
              className="lgr-btn lgr-btn-sm lgr-btn-excel"
              onClick={exportExcel}
              disabled={!loans.length || exporting}
              aria-busy={exporting}
              title={loans.length ? "ייצוא התמהיל לגיליון אקסל" : "אין שורות לייצוא"}
              >
              {exporting ? (
              <CircleNotch size={14} weight="bold" className="lgr-excel-ico animate-spin" />
              ) : (
              <MicrosoftExcelLogo size={14} weight="fill" className="lgr-excel-ico" />
              )}
              יצוא לאקסל
              </Btn>
          </div>
        </div>

        <div
          ref={boardRef}
          className="lgr-board transition-shadow duration-500"
          style={flash ? { boxShadow: "0 0 0 3px var(--primary-tint)" } : undefined}
        >
          {mixes === null ? (
            <div className="lgr-card overflow-hidden">
              <div className="lgr-head">
                <div className="lgr-skel h-4 w-32" />
              </div>
              <div className="flex flex-col gap-2 p-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="lgr-skel h-8 w-full" style={{ opacity: 1 - i * 0.16 }} />
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
                // The master is the same mix a dropped report belongs to — what
                // the client owes today. Allocation by percentage is a thing you
                // do to a proposal, so both gates read off the one flag.
                isBase={isPrimaryMix}
                target={activeMix?.target_amount ?? null}
                onTarget={setTarget}
                onChange={setLoans}
                onSchedule={(l) => setSchedFor(l)}
              />
            )
          )}
        </div>
        </motion.div>

        {/* ---------------------------------------------------------- charts */}
        <motion.div {...enter(4)} className="mt-6">
          <Charts loans={loans} annualInflation={annualInflation} />
        </motion.div>

        {/* ------------------------------------------------------ comparison */}
        <motion.section {...enter(5)} className="lgr-card mt-6 overflow-hidden">
          <header className="lgr-head">
            <h2 className="lgr-title">השוואת תמהילים</h2>
            <span className="lgr-sub ms-auto">ערך שלילי = התמהיל הנוכחי זול יותר</span>
          </header>
          <Compare
            activeMixId={activeMixId}
            mixes={list}
            annualInflation={annualInflation}
            compareMixId={compareMixId}
          />
        </motion.section>
        </motion.div>
        )}
        </AnimatePresence>
      </div>

      {/* ------------------------------------------------------------ toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="lgr-toast fixed bottom-5 left-5 z-[100]"
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

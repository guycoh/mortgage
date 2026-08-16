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
import ToolSwitch from "./components/ToolSwitch";
import { TOOLS, parseTool, type Tool } from "./lib/tools";
import { useNoFieldDrag } from "./lib/no-field-drag";
import { warmProfile } from "./lib/profile-cache";
import Logo from "./components/Logo";
import Charts from "./components/Charts";
import Compare from "./components/Compare";
import ScheduleModal from "./components/ScheduleModal";
import Select from "./components/Select";
import {
  FAMILY,
  PATH_LABEL,
  TRACK_HEX,
  foldMasterRow,
  masterTotals,
  mergeReportLoans,
  owedOnly,
  perShekel,
  type ImportedLoan,
  type ImportSummary,
} from "./lib/credit";
import DuplicateMasterModal from "./components/DuplicateMasterModal";
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
 * THE OTHER TOOLS, code-split.
 *
 * Each is a whole second instrument — משכנתא הפוכה carries its own console, a
 * comparison table, an ECharts canvas and a 361-row schedule — and most
 * sessions never open either. They load on the pointer entering their switch
 * button, which is ~200ms before the click lands, so by the time the fill has
 * travelled the chunk is already in.
 */
const toolSkeleton = () => (
  // Sized like the instrument it stands in for, not like a placeholder: a
  // skeleton a third of the view's height means the page grows by the
  // difference the moment the chunk lands, and everything below lurches. The
  // stand-in holds the space so the content's arrival changes pixels, not
  // geometry.
  <div className="lgr-card lgr-tool-skel overflow-hidden">
    <div className="lgr-head">
      <div className="lgr-skel h-4 w-40" />
    </div>
    <div className="flex flex-col gap-2 p-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="lgr-skel h-10 w-full" style={{ opacity: 1 - i * 0.2 }} />
      ))}
    </div>
  </div>
);

const ReverseTool = dynamic(() => import("./reverse/ReverseMortgage"), { loading: toolSkeleton });
const AbilityTool = dynamic(() => import("./ability/AbilityCalculator"), { loading: toolSkeleton });

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
  /** The שכפול משכנתא נוכחית question is open. */
  const [dupAsk, setDupAsk] = useState(false);
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

  // Bound once for the whole surface — all three tools and every portalled
  // modal — so no field anywhere can have its value dragged into another one.
  useNoFieldDrag();

  /* ------------------------------------------------------------- the tools */
  /**
   * THREE INSTRUMENTS, ONE SURFACE.
   *
   * משכנתא הפוכה and יכולת החזר are not other pages. The switch in the nav band
   * swaps the body under it and nothing else moves — same route, same lead, no
   * navigation, so the change costs a render and the fill can travel between
   * the buttons while it happens.
   *
   * The address bar is kept in step with a NATIVE pushState rather than the
   * router: `?tool=reverse` / `?tool=ability` makes the tool linkable and the
   * Back button behave, without paying for a soft navigation that would re-run
   * the page's server component and tear the board down.
   */
  const [tool, setTool] = useState<Tool>(initialTool);
  /**
   * WHICH WAY THE VIEW CAME FROM. With two tools the direction could be read
   * off the destination alone; with three it is a property of the MOVE, so it
   * is carried rather than inferred — a mirror ref, because the value has to be
   * read inside the setter that changes it.
   */
  const [dir, setDir] = useState<-1 | 1>(1);
  const toolRef = useRef<Tool>(initialTool);
  const goTool = (next: Tool) => {
    if (next === toolRef.current) return false;
    // RTL: moving to a later tab means the new surface arrives from the left.
    setDir(TOOLS.indexOf(next) > TOOLS.indexOf(toolRef.current) ? -1 : 1);
    toolRef.current = next;
    setTool(next);
    return true;
  };

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
    if (!goTool(next)) return;
    try {
      const url = new URL(window.location.href);
      // The ledger is the default, so it is the one tool the URL stays silent
      // about — /aa102test/3 and /aa102test/3?tool=mix would otherwise be two
      // addresses for one board.
      if (next === "mix") url.searchParams.delete("tool");
      else url.searchParams.set("tool", next);
      window.history.pushState(null, "", url);
    } catch {
      /* the tool still switches — only the address bar missed it */
    }
    // The pointer usually preloaded the chunk on its way in, but a touch (or a
    // keyboard arrow) clicks without ever hovering — so the import is kicked
    // here too. Idempotent: if the hover already won, this resolves instantly.
    if (next === "reverse") void import("./reverse/ReverseMortgage");
    else if (next === "ability") void import("./ability/AbilityCalculator");
    const profile = profileUrlFor(next);
    if (profile) warmProfile(profile);
    // NO scroll here. Scrolling smoothly while the old view is still fading
    // and the new one is growing is three movements at once, and the height
    // collapse mid-swap clamps the smooth scroll into a visible jump. The
    // scroll-to-top happens in the AnimatePresence gap instead — the one
    // moment nothing is on stage to see it happen.
  };

  useEffect(() => {
    const onPop = () => goTool(parseTool(new URLSearchParams(window.location.search).get("tool")));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * WHERE A TOOL READS ITS CLIENT FROM — one resolver for the props below and
   * the preload hook, because two copies of this ternary is how a fifth tool
   * ends up prefilling from the wrong door. A Fireberry session is named by
   * its cookie; the open sandbox names its lead. No client, no URL.
   */
  const profileUrlFor = (t: Tool): string | null => {
    const api =
      t === "reverse" ? "/api/simulator/reverse-profile" : t === "ability" ? "/api/simulator/ability-profile" : null;
    if (!api) return null;
    return locked ? api : lead ? `${api}?lead=${lead.id}` : null;
  };

  // The pointer-enter preload covers mouse users; this covers everyone else.
  // One idle-time import each, so a switch never lands on a skeleton — both
  // chunks together are a fraction of the board that already shipped ECharts.
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1200));
    const id = idle(() => {
      void import("./reverse/ReverseMortgage");
      void import("./ability/AbilityCalculator");
    });
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
  /**
   * EVERY FIGURE ON THIS PAGE IS THE CLIENT'S OWN.
   *
   * Guarantees stay on the board — imported fact, saved with the mix, editable —
   * but they are somebody else's balance and somebody else's monthly repayment,
   * so they are out of the rail, the composition, the runoff, the unified
   * schedule and the comparison. `Ledger` still receives all of them, because it
   * is the one surface whose job is to show and edit rows rather than add them
   * up; it draws them as their own section, broken out below the mix. See
   * isSurety in lib/credit.
   */
  const owed = useMemo(() => owedOnly(loans), [loans]);
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
        } else if (d.hasSplit === false) {
          // Same story for the master's split: the board computes on the
          // amount either way, but הצמדת קרן and הפרשי היוון would not
          // survive a reload until the migration is run.
          flash4s({ kind: "err", text: "העמודות indexation / prepayment_fee חסרות — הצמדת קרן והפרשי היוון לא יישמרו" });
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
    for (const l of owed) {
      const r = calculateLoan(l, annualInflation);
      amount += Math.round(Number(l.amount) || 0);
      // Rounded per row so the rail's החזר חודשי is the same figure as the
      // ledger's סה״כ and the export's grand total — see the note in Ledger.
      monthly += Math.round(r.monthlyPayment);
      interest += r.totalInterest;
    }
    // החזר לשקל — the mix's quality in one figure, and the only cell here that
    // reads across two mixes of different sizes. Defined once in lib/credit,
    // because the comparison table and the export quote the same name.
    const ratio = perShekel(owed, annualInflation);
    return { amount, monthly, interest, perShekel: ratio.value, unpriced: ratio.unpriced };
  }, [owed, annualInflation]);

  /** The mix's colour signature — share of balance per track, biggest first. */
  const trackSegs = useMemo(() => {
    const per = new Map<number, number>();
    for (const l of owed) per.set(l.path_id, (per.get(l.path_id) ?? 0) + (Number(l.amount) || 0));
    const tot = Array.from(per.values()).reduce((s, v) => s + v, 0);
    if (!tot) return [];
    return Array.from(per.entries())
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([id, v]) => ({ id, pct: (v / tot) * 100 }));
  }, [owed]);

  /**
   * How the balance splits between the two families. Drawn as a two-tone rule
   * under סכום התמהיל rather than as a fourth chart: it answers "how much of
   * this is actually the mortgage" in one glance, which is the first thing an
   * advisor asks of a total.
   */
  const famSplit = useMemo(() => {
    let mortgage = 0;
    let loan = 0;
    for (const l of owed) {
      const v = Number(l.amount) || 0;
      if (l.group === "loan") loan += v;
      else mortgage += v;
    }
    const tot = mortgage + loan;
    if (!tot) return null;
    return { mortgage: (mortgage / tot) * 100, loan: (loan / tot) * 100 };
  }, [owed]);

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

  /** A plain copy — a proposal duplicated as another proposal. */
  const duplicateMix = () => {
    if (!activeMix) return;
    // THE MASTER IS NOT COPIED, IT IS FOLDED — see duplicateMaster. Its rows
    // hold the balance in the bank's two parts and a fee beside them, and the
    // one thing a copy has to ask is whether that fee joins the new principal.
    // A master with nothing on it yet has nothing to fold and nothing to ask.
    if (isPrimaryMix) {
      const t = masterTotals(activeMix.loans);
      if (t.balance > 0 || t.fee > 0) {
        setDupAsk(true);
        return;
      }
    }
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

  /**
   * שכפול משכנתא נוכחית — the master, as a proposal.
   *
   * Every row's יתרת קרן and הצמדת קרן become one amount (which `amount`
   * already is), and with `withFees` the row's הפרשי היוון is added to it —
   * the new mortgage funds the cost of leaving the old one. The split and the
   * fee stay behind on the master; the copy carries a receipt for what was
   * folded (fee_folded) and nothing else it would have to explain. See
   * foldMasterRow in lib/credit.
   *
   * גובה התמהיל is seeded with the copy's own total, fees included when they
   * are — so אחוז on the new tab reads 100% allocated from its first paint and
   * every re-cut is measured against the sum that actually has to be borrowed.
   */
  const duplicateMaster = (withFees: boolean) => {
    setDupAsk(false);
    if (!activeMix) return;
    const id = crypto.randomUUID();
    const loans = activeMix.loans.map((l) => foldMasterRow(l, withFees, id));
    const total = owedOnly(loans).reduce((s, l) => s + (Number(l.amount) || 0), 0);
    const copy: Mix = {
      ...activeMix,
      id,
      mix_name: withFees ? "שכפול משכנתא נוכחית + עמלות" : "שכפול משכנתא נוכחית",
      is_base: false,
      target_amount: total || null,
      loans,
    };
    setMixes((prev) => [...(prev ?? []), copy]);
    setActiveMixId(id);
    const folded = masterTotals(owedOnly(activeMix.loans)).fee;
    flash4s({
      kind: "ok",
      text: withFees
        ? `נוצר העתק — הפרשי היוון של ₪${folded.toLocaleString("he-IL")} נוספו לקרן`
        : "נוצר העתק — יתרת הקרן והצמדתה אוחדו לסכום אחד, ללא עמלות",
    });
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
      {/* --------------------------------------- 1. the shell, then the title */}
      {/* The chrome belongs to the application, not to the sheet: a full-bleed
          bar fastened to the top of the document, ruled off the canvas by a
          hairline. It scrolls away with the page — rule 5 holds, nothing on
          this surface sticks. Inside, the row still reads brand → tools →
          client — the two constants bracketing the thing you switch — aligned
          to the same 1300px column as the page. */}
      <motion.header {...enter(0)} className="lgr-shell">
        <nav className="lgr-nav" aria-label="ניווט ראשי">
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
              // The chunk AND the data: by the time the fill has travelled,
              // the view exists and its prefill is already in hand.
              if (t === "reverse") void import("./reverse/ReverseMortgage");
              else if (t === "ability") void import("./ability/AbilityCalculator");
              const url = profileUrlFor(t);
              if (url) warmProfile(url);
            }}
            // The unsaved-dot: crossing to another tool must not mean
            // forgetting this one has work uncommitted. Only the mix can be
            // dirty — the other two compute and never save.
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
      </motion.header>

      <div className="mx-auto w-full max-w-[1300px] px-4 py-4 md:px-6 md:py-6">
        {/* ----------------------------------------------------- 1. the masthead */}
        {/* THE PAGE'S NAME, AND THE ONE ACTION THAT COMMITS IT.

            It briefly also carried אינפלציה שנתית and השוואה לתמהיל, and they
            were homeless there. A control belongs beside the thing it changes:
            the inflation rate is the assumption every figure in the read-out is
            computed under, so it is a cell IN the read-out; the comparison
            picker chooses the subject of השוואת תמהילים, so it is in that
            section's header. Parked up here they were two form controls floating
            in a title bar, and the comparison one asked you to remember a choice
            made 1,200px above the thing it governed.

            What is left is a masthead: the name at the start, the commit at the
            end, nothing in between. The title stays OUTSIDE the view swap —
            keyed, but deliberately not inside an AnimatePresence, because
            mode="wait" would hold the old word for its exit and leave the row
            titleless for a third of a second. Only the mix can be dirty, so only
            the mix shows a save; the row keeps its height either way, so nothing
            under it moves. */}
        <div className="lgr-masthead">
          <motion.h1
            key={tool}
            className="lgr-masthead-title"
            initial={{ opacity: 0, y: 7 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
          >
            {tool === "mix" ? "סימולטור תמהילים" : tool === "reverse" ? "משכנתא הפוכה" : "משכנתא חדשה"}
          </motion.h1>

          <AnimatePresence initial={false}>
            {tool === "mix" && (
              <motion.div
                key="mix-controls"
                className="lgr-masthead-tools"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
              >
                <SaveButton dirty={dirty} saving={saving} justSaved={justSaved} canSave={!!lead} onSave={save} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* THE STAGE. A floor under the view change: while mode="wait" holds
            the gap between an exit and an entry, the page would otherwise
            collapse to the masthead — the scrollbar vanishes, the centred
            column re-seats itself, and the whole UI appears to lurch. The
            stage keeps the document's height through the swap, and the
            scroll-to-top happens inside the gap, when there is nothing on
            stage to see it. */}
        <div className="lgr-stage">
        <AnimatePresence mode="wait" initial={false}>
        {tool === "reverse" ? (
          <motion.div key="reverse" {...viewIn(dir)}>
            <ReverseTool
              enter={enter}
              // A Fireberry session is named by its cookie; the open sandbox
              // names its lead. Either way the tool can ask for the client's
              // שווי נכס and ages — read-only — and open already filled in.
              profileUrl={profileUrlFor("reverse")}
            />
          </motion.div>
        ) : tool === "ability" ? (
          <motion.div key="ability" {...viewIn(dir)}>
            <AbilityTool
              enter={enter}
              // Same two doors as the reverse tool: a Fireberry session is named
              // by its cookie, the open sandbox names its lead. Either way the
              // tool can read the client's asset, ages, incomes and existing
              // repayments — read-only — and open already filled in.
              profileUrl={profileUrlFor("ability")}
            />
          </motion.div>
        ) : (
        <motion.div key="mix" {...viewIn(dir)}>

        {/* ------------------------------------------ 2. the workbench: one object */}
        {/* ONE INSTRUMENT, FROM THE FIGURES TO THE LAST ROW.
            This was four cards in a column — a console, an intake bay, a tray
            holding two loose buttons, and a tab strip welded to the table — each
            with its own outline, its own shadow, and 24px of canvas between
            them. Four outlines is four objects, and not one of them was the
            instrument; the instrument was the thing they added up to.

            So they are bands inside a single card now, divided by the same
            hairline the ledger already divides its own rows with. Reading down:
            what the mix costs → what you can put into it → which mix, and what
            you can do to it → the rows themselves. The tray is gone; its two
            buttons had nowhere to live except beside the actions they belong
            with, on the strip that names the mix they act on.

            One shadow for the whole object, and the quiet one — a card this tall
            wearing the console's raised shadow would read as a slab lying on the
            page rather than as the page's working surface. */}
        <motion.section {...enter(1)} className="lgr-workbench mb-5">
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

              {/* החזר לשקל — THE ONE FIGURE THAT SAYS WHETHER THE MIX IS GOOD.
                  The three beside it are sizes: how much a month, how much
                  borrowed, how much interest — all of which grow with the
                  mortgage and none of which can be judged without knowing the
                  other two. This one is the quotient, so it reads on its own
                  and it reads ACROSS mixes: 1.42 against 1.61 is the whole
                  comparison, at any scale.

                  Deliberately not the hero and deliberately not loud: it takes
                  the satellites' size, in the same words the export's masthead
                  and the comparison's last row use. And no caption under it —
                  the cell is 53px by design, which is a label and a figure and
                  nothing else, and growing the band to explain a term every
                  advisor says out loud would cost the whole page 13px. The
                  arithmetic is on the hover instead. */}
              <div
                className="lgr-rail-cell"
                title={
                  "סך כל התשלומים לאורך חיי התמהיל, חלקי הקרן שנפרעת — כמה ישולם בפועל על כל שקל שנלווה" +
                  (totals.unpriced
                    ? `\nאינו כולל ${totals.unpriced === 1 ? "שורה אחת ללא תקופה" : `${totals.unpriced} שורות ללא תקופה`} — חוב ללא לוח סילוקין אינו משלם דבר, וספירתו במכנה הייתה משפרת את היחס`
                    : "")
                }
              >
                <span className="lgr-rail-label">החזר לשקל</span>
                {/* Also em-dash when nothing in the mix amortizes — a board of
                    debts with no term has a balance and no repayment, and
                    ₪0.00 there would read as "this mix costs nothing". */}
                {railEmpty || !totals.perShekel ? (
                  <span className="lgr-rail-value" data-empty="true">
                    —
                  </span>
                ) : (
                  <span className="lgr-rail-value">
                    <span className="lgr-cur">₪</span>
                    <NumberFlow
                      value={totals.perShekel}
                      locales="he-IL"
                      format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
                      spinTiming={COUNT_UP}
                      transformTiming={COUNT_UP}
                    />
                  </span>
                )}
              </div>

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

            {/* THE ASSUMPTION, IN THE BAND IT GOVERNS.
                Every figure to the right of this rule is computed at this rate —
                the הצמדה on an indexed track, and therefore החזר חודשי, סה"כ
                ריבית and every payment in the ledger. Sitting in a title bar it
                was a form control with no subject; sitting here it takes the
                rail's own anatomy — label above, value below — and reads as what
                it is: the one cell of the read-out you are allowed to type in.
                Ruled off rather than spaced off, because an input among outputs
                needs the seam stated. */}
            <label className="lgr-rail-assume" title="שיעור האינפלציה השנתי שלפיו מחושבת ההצמדה">
              <span className="lgr-rail-label">אינפלציה שנתית</span>
              <span className="lgr-rail-assume-well">
                <input
                  type="number"
                  step="0.1"
                  value={annualInflation}
                  onChange={(e) => setAnnualInflation(parseFloat(e.target.value) || 0)}
                  onFocus={(e) => e.currentTarget.select()}
                  className="lgr-rail-assume-in"
                  aria-label="אינפלציה שנתית באחוזים"
                />
                <span className="lgr-rail-assume-unit">%</span>
              </span>
            </label>
          </div>

          {/* -------------------------------------------------- the intake band */}
          {/* THE BAY BELONGS TO THE BASE MIX ONLY — a scenario you invented has
              nothing to import into. It used to float beside a tray of buttons
              on its own band of canvas; it is a slot cut into the instrument
              now, on the instrument's own ground, which is what a place-a-
              document-here actually is.

              It still leaves properly, taking its own height down with it so the
              rows below travel rather than teleport. `initial={false}` keeps
              this out of the page-load sequence — the workbench's own rise
              already handles the first appearance, and this should only ever
              fire on a tab you chose. */}
          <AnimatePresence initial={false}>
            {activeMixId && isPrimaryMix && (
              <motion.div
                key="bay"
                className="overflow-hidden"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0, transition: collapseOut }}
                transition={collapse}
              >
                <div className="lgr-wb-intake">
                  <Bay
                    mixId={activeMixId}
                    reports={reports}
                    onImport={applyImport}
                    onClear={clearImport}
                    // The three readings of the loaded document, on the
                    // document's own receipt. A credit report and a bank
                    // statement are alternatives — only one is ever loaded — so
                    // this is one set of tiles whose wording follows whichever
                    // arrived, not two duplicated blocks.
                    readings={
                      reports.length > 0 ? (
                        <>
                          <Btn
                            className="lgr-btn lgr-btn-ghost lgr-btn-sm lgr-reading"
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
                            className="lgr-btn lgr-btn-ghost lgr-btn-sm lgr-reading"
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
                            className="lgr-btn lgr-btn-ghost lgr-btn-sm lgr-reading"
                            onClick={() => setShowDoc(true)}
                            disabled={!reports.some((r) => r.file)}
                            title={
                              reports.some((r) => r.file)
                                ? "צפייה במסמך המקורי"
                                : "המסמך אינו זמין בהפעלה הזו"
                            }
                          >
                            <FilePdf size={14} weight="fill" style={{ color: "var(--neg)" }} />
                            צפייה במסמך
                          </Btn>
                        </>
                      ) : null
                    }
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        {/* -------------------------------------------------------- mix tabs */}
        {/* WHICH MIX, AND WHAT YOU DO TO IT — one band, two clusters.
            The selector was already welded to the board it governs. What is new
            is the far side: לוח סילוקין מאוחד and שכפל תמהיל used to sit in a
            tray of their own, one band up, with nothing but canvas tying them to
            the mix they act on. They are actions on the named mix, so they are
            on the strip that names it, next to the other three. */}
        <div className="lgr-tabs">
          {list.map((m) => (
            <div key={m.id} className="relative">
              <div
                className="lgr-mixtab"
                role="tab"
                tabIndex={0}
                aria-selected={m.id === activeMixId}
                data-on={m.id === activeMixId}
                onClick={() => setActiveMixId(m.id)}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActiveMixId(m.id);
                  }
                }}
              >
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
                    className="lgr-mixtab-edit"
                    aria-label="שם התמהיל"
                  />
                ) : (
                  <>
                    {m.is_base && <span className="lgr-dot" style={{ background: "var(--primary)" }} />}
                    {m.mix_name}
                    <span className="lgr-mixtab-n">{m.loans.length}</span>
                  </>
                )}
                <button
                  className="lgr-mixtab-x"
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

          <Btn className="lgr-btn lgr-btn-sm lgr-mixtab-add" onClick={addMix} title="תמהיל חדש וריק">
            <Plus size={13} weight="bold" />
            תמהיל
          </Btn>

          {/* WHAT YOU DO TO THE MIX, on the strip that names it.
              It briefly carried six buttons about two different subjects, and a
              dropped report pushed the strip onto a second row — a floating band
              of controls under the tabs, which is the exact shape this redesign
              set out to remove. The three that read the DOCUMENT moved to the
              document's own receipt in the band above. What is left is three
              actions on the named mix, which is inside what a person can hold at
              one decision point. */}
          <div className="lgr-strip-acts">
              <div className="lgr-act-group">
              <Btn
                className="lgr-btn lgr-btn-sm"
                onClick={() => setSchedFor("mix")}
                disabled={!loans.length}
                title={loans.length ? "לוח סילוקין של כל התמהיל, חודש בחודש" : "אין שורות בתמהיל"}
              >
                <ListChecks size={14} weight="bold" />
                לוח סילוקין מאוחד
              </Btn>
              <Btn
                className="lgr-btn lgr-btn-sm"
                onClick={duplicateMix}
                disabled={!activeMix}
                title={
                  isPrimaryMix
                    ? "שכפול המשכנתא הנוכחית לתמהיל חדש — יתרת הקרן והצמדתה מאוחדות לסכום אחד, ותישאלו אם להוסיף את הפרשי ההיוון"
                    : "יצירת עותק של התמהיל הזה כנקודת פתיחה להצעה"
                }
              >
                <Copy size={14} weight="bold" />
                שכפל תמהיל
              </Btn>
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
        </div>

        {/* The import flash marks the rows that just arrived. It was a 3px ring
            drawn OUTSIDE the board, which had a card edge of its own to sit
            against; inside the workbench that ring would be sitting on the card
            it is inside. Inset, it lands on the band's own inner edge. */}
        <div
          ref={boardRef}
          className="lgr-board transition-shadow duration-500"
          style={flash ? { boxShadow: "inset 0 0 0 2px var(--primary-tint-2)" } : undefined}
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
        </motion.section>

        {/* --------------------------------------------- 3. the verdict, below */}
        {/* THE COMPARISON COMES BEFORE THE CHARTS.
            It used to run last, under two ECharts canvases, which put the one
            question an advisor is in this tool to answer — is this proposal
            better than that one — at the bottom of a 2,300px page. The charts
            describe the mix you are looking at; the comparison judges it against
            the alternative. Judgement first, description after.

            Its picker lives in its own header now. The old "ערך שלילי = התמהיל
            הנוכחי זול יותר" caption is gone with it: a legend that teaches you to
            decode a minus sign is a legend the column should not have needed.
            Every difference states its direction in a word, an arrow and a
            colour instead. */}
        <motion.div {...enter(2)}>
          <Compare
            activeMixId={activeMixId}
            mixes={list}
            annualInflation={annualInflation}
            compareMixId={compareMixId}
            onDuplicate={duplicateMix}
            control={
              list.length > 1 ? (
                <div style={{ minWidth: 208 }}>
                  <Select
                    variant="input"
                    value={compareMixId ?? ""}
                    onChange={(v) => setCompareMixId(v ? String(v) : null)}
                    placeholder="בחרו תמהיל להשוואה…"
                    options={[
                      { value: "", label: "ללא השוואה" },
                      ...list
                        .filter((m) => m.id !== activeMixId)
                        .map((m) => ({ value: m.id, label: m.mix_name })),
                    ]}
                    ariaLabel="תמהיל להשוואה"
                  />
                </div>
              ) : null
            }
          />
        </motion.div>

        {/* ------------------------------------------------------- the charts */}
        {/* What the mix LOOKS like rather than what it is or how it scores. Last,
            and keeping its own outline: this is the only place on the page where
            one card ends and another begins. */}
        <motion.div {...enter(3)} className="mt-5">
          <Charts loans={owed} annualInflation={annualInflation} />
        </motion.div>
        </motion.div>
        )}
        </AnimatePresence>
        </div>
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

      {dupAsk && activeMix && (
        <DuplicateMasterModal
          mixName={activeMix.mix_name}
          loans={activeMix.loans}
          onPick={duplicateMaster}
          onClose={() => setDupAsk(false)}
        />
      )}

      {schedFor && activeMix && (
        <ScheduleModal
          subject={
            schedFor === "mix"
              ? { kind: "mix", name: activeMix.mix_name, loans: owed }
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

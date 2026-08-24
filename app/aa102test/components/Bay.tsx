"use client";

// The intake bay. Drop a credit report (חיווי אשראי / דוח ריכוז נתונים) and the
// mix fills itself in: mortgages first, consumer loans under them, each already
// matched to a track and a term.
//
// THIS IS THE HERO OF THE PAGE. One drop replaces twenty minutes of typing, so
// it is the largest thing on the board and the only surface allowed a gradient
// and a dashed edge — because "put a document here" has to read as an opening,
// not as another panel. Everything else about it is the same design system:
// two radii, hairlines, the two identity colours.
//
// It says four things, in this order: what to do (the headline), what happens
// (the subline), how to do it without dragging (the button), and what it takes
// (the formats). A first-time advisor should need none of them explained.
//
// The file never leaves the tab: the PDF is decoded here, in the browser.

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationControls } from "motion/react";
import {
  ArrowClockwise,
  Bank,
  CheckCircle,
  HandCoins,
  Plus,
  CircleNotch,
  IdentificationCard,
  UploadSimple,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { extractPages, parsePdfFile } from "@/lib/credit-parser/extract.client";
import { detectBank, parseBankStatement } from "@/lib/bank-parser";
import { bankStatementToLoans } from "@/lib/bank-parser/to-loans";
import { track } from "../lib/track.client";
import { FAMILY, importReportToLoans, type ImportedLoan, type ImportSummary } from "../lib/credit";
import Btn from "./Btn";
import { settle, snap } from "../lib/transitions";

/**
 * The mark: a document being lifted off a stack and read.
 *
 * Flat, geometric, and drawn entirely in the page's two identity colours — the
 * orange sheet behind is the הלוואה this report will yield, the violet-ruled
 * sheet in front is the משכנתא. The scan line only runs when the bay is live.
 * No perspective, no gloss, no stock-illustration figure holding a folder.
 */
function Mark() {
  return (
    <div className="lgr-mark" aria-hidden>
      <svg viewBox="12 12 80 82" fill="none">
        {/* the sheet behind — the consumer loans, in their own orange */}
        <rect
          x="26"
          y="20"
          width="52"
          height="66"
          rx="7"
          fill={FAMILY.loan.tint}
          stroke={FAMILY.loan.line}
          strokeWidth="1.5"
          transform="rotate(6 52 53)"
        />
        {/* the sheet in front — the mortgage */}
        <g className="m-front">
          <rect
            x="22"
            y="16"
            width="52"
            height="66"
            rx="7"
            fill="#fff"
            stroke={FAMILY.mortgage.line}
            strokeWidth="1.5"
          />
          {/* ruled lines: three quiet, one in the ink — the row that matters */}
          <rect x="31" y="30" width="26" height="3" rx="1.5" fill={FAMILY.mortgage.color} opacity="0.75" />
          <rect x="31" y="40" width="34" height="3" rx="1.5" fill={FAMILY.mortgage.color} opacity="0.2" />
          <rect x="31" y="50" width="30" height="3" rx="1.5" fill={FAMILY.mortgage.color} opacity="0.2" />
          <rect x="31" y="60" width="20" height="3" rx="1.5" fill={FAMILY.loan.color} opacity="0.6" />
          <rect x="31" y="70" width="27" height="3" rx="1.5" fill={FAMILY.mortgage.color} opacity="0.2" />
        </g>
        {/* the scan line — a beam, not a strike-through, so it stays thin and
            carries its light in the halo rather than in the line */}
        <g className="m-scan">
          <rect x="14" y="24" width="76" height="12" rx="6" fill={FAMILY.mortgage.color} opacity="0.09" />
          <rect x="14" y="29.2" width="76" height="1.6" rx="0.8" fill={FAMILY.mortgage.color} opacity="0.55" />
        </g>
      </svg>
    </div>
  );
}

export default function Bay({
  mixId,
  reports,
  onBoard = [],
  onImport,
  onClear,
  readings,
}: {
  mixId: string;
  /** Reports already folded into this mix, oldest first. */
  reports: ImportSummary[];
  /** The rows those reports actually produced, after the merge. */
  onBoard?: ImportedLoan[];
  onImport: (summary: ImportSummary) => void;
  onClear: () => void;
  /**
   * The readings of the loaded document — its analysis, the client summary, the
   * original PDF. Rendered on the receipt, because that is the document they
   * read; the mix strip below has its own three buttons about the mix.
   */
  readings?: React.ReactNode;
}) {
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Counts rejections rather than tracking a boolean: dropping the same wrong
  // file twice has to shake twice, and a boolean that is already true does not
  // re-fire an animation.
  const [rejects, setRejects] = useState(0);
  /** A file is over the window, though not necessarily over the strip. */
  const [armed, setArmed] = useState(false);
  const shake = useAnimationControls();
  const inputRef = useRef<HTMLInputElement>(null);
  // dragenter/dragleave fire per child element; count them so the state is stable
  const depth = useRef(0);
  // The window listener is bound once and must never read a stale handler or a
  // stale busy flag, so both go through refs.
  const handleRef = useRef<(f: FileList | File[] | null) => void>(() => {});
  const busyRef = useRef(false);

  // One shake per rejection, and a single red border flash comes free with
  // data-state="err" on the panel itself.
  useEffect(() => {
    if (!rejects) return;
    shake.start({ x: [0, -7, 7, -4, 4, 0], transition: { duration: 0.34, ease: "easeOut" } });
  }, [rejects, shake]);

  /**
   * THE WHOLE WINDOW IS AWARE OF THE FILE.
   *
   * A strip 90px tall is a small thing to aim at, and a browser's default
   * response to a PDF dropped anywhere else is to navigate to it — which
   * throws away an unsaved board without asking. So the window listens: a file
   * dragged anywhere lights the strip, and a file dropped anywhere is caught
   * and routed here instead of opening.
   *
   * The counter is the same trick as `depth` below — dragenter/dragleave fire
   * per element, so a boolean would flicker its way across the page.
   */
  useEffect(() => {
    let depth = 0;
    const carriesFile = (e: DragEvent) =>
      Array.from(e.dataTransfer?.types ?? []).includes("Files");

    const onEnter = (e: DragEvent) => {
      if (!carriesFile(e)) return;
      depth += 1;
      setArmed(true);
    };
    const onOver = (e: DragEvent) => {
      // without this the browser refuses the drop and falls back to navigating
      if (carriesFile(e)) e.preventDefault();
    };
    const onLeave = (e: DragEvent) => {
      if (!carriesFile(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setArmed(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!carriesFile(e)) return;
      e.preventDefault();
      depth = 0;
      setArmed(false);
      // A credit report takes seconds to decode, and an advisor holding both
      // spouses' PDFs drops the second one straight after the first. That used
      // to be swallowed in silence — no error, no shake, nothing.
      if (busyRef.current) {
        setError("קובץ אחד בכל פעם — המתינו לסיום הפענוח וגררו שוב");
        setRejects((n) => n + 1);
        return;
      }
      handleRef.current(e.dataTransfer?.files ?? null);
    };

    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragover", onOver);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, []);

  const handle = useCallback(
    async (files: FileList | File[] | null) => {
      const pdf = Array.from(files ?? []).find(
        (f) => /\.pdf$/i.test(f.name) || f.type === "application/pdf"
      );
      if (!pdf) {
        setError("צריך קובץ PDF — חיווי אשראי או תדפיס משכנתא מהבנק.");
        setRejects((n) => n + 1);
        return;
      }
      setBusy(true);
      setError("");
      const t0 = performance.now();
      try {
        // Decode once, then decide what it is. A חיווי אשראי and a bank's own
        // mortgage statement are alternatives — whichever arrives fills the same
        // board — so the bank templates are tried first when they match, because
        // the credit-report parser would reject them with a misleading message.
        const pages = await extractPages(pdf);
        const summary = detectBank(pages)
          ? bankStatementToLoans(parseBankStatement(pages), mixId, pdf.name)
          : importReportToLoans(await parsePdfFile(pdf), mixId, pdf.name);

        if (!summary.loans.length) {
          setRejects((n) => n + 1);
          track("import", {
            ok: false,
            kind: summary.kind,
            file_name: pdf.name,
            pages: pages.length,
            duration_ms: Math.round(performance.now() - t0),
            skipped: summary.skipped.reduce((s, x) => s + x.count, 0),
            error: "no-importable-rows",
          });
          setError(
            summary.skipped.length
              ? `בדוח נמצאו רק ${summary.skipped
                  .map((s) => `${s.label} (${s.count})`)
                  .join(" ו-")} — אלה אינם ניתנים לשילוב בתמהיל.`
              : summary.kind === "bank"
                ? "לא נמצאו בתדפיס הלוואות פעילות עם יתרה."
                : "לא נמצאו בדוח התחייבויות פעילות עם יתרה."
          );
          return;
        }
        track("import", {
          ok: true,
          kind: summary.kind,
          bank: summary.bank?.bank || undefined,
          client_name: summary.clientName || undefined,
          client_id: summary.clientId || undefined,
          file_name: pdf.name,
          pages: pages.length,
          duration_ms: Math.round(performance.now() - t0),
          mortgages: summary.mortgages.length,
          loans: summary.others.length,
          skipped: summary.skipped.reduce((s, x) => s + x.count, 0),
          total_balance: Math.round(summary.totalBalance),
          total_monthly: Math.round(summary.totalMonthly),
        });
        // Keep the file itself: the advisor reads the original alongside the
        // analysis, and re-picking it just to look at it is friction.
        onImport({ ...summary, file: pdf });
      } catch (e) {
        setRejects((n) => n + 1);
        track("import", {
          ok: false,
          file_name: pdf.name,
          duration_ms: Math.round(performance.now() - t0),
          error: ((e as Error)?.message || "unreadable").slice(0, 300),
        });
        setError((e as Error)?.message || "לא הצלחנו לקרוא את המסמך.");
      } finally {
        setBusy(false);
        depth.current = 0;
        setDrag(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [mixId, onImport]
  );

  handleRef.current = handle;
  busyRef.current = busy;

  const pick = () => inputRef.current?.click();

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept="application/pdf,.pdf"
      className="hidden"
      onChange={(e) => handle(e.target.files)}
    />
  );

  /* -------------------------------------------------- imported: the receipt */
  // Once the rows are in the grid, the numbers belong to the grid — repeating
  // them here was just a second, staler copy. What this strip owes the user is
  // confirmation that the drop landed and what it found: whose reports these
  // are, how many of each family came out, and the two ways on — add another,
  // or start over. Counts, not amounts: the grid states the amounts.
  if (reports.length) {
    /* WHAT IS ON THE BOARD, NOT WHAT WAS IN THE DOCUMENTS.
       These chips used to add the documents up. Two reports of one household
       therefore counted the joint mortgage twice — the very thing the merge
       had just prevented one line above — and the same file dropped twice
       printed "משכנתאות 4 · הלוואות 4" over a ledger holding four rows. They
       count the mix now, which is the thing the advisor is looking at, and
       they leave guarantees out: a debt somebody else repays is stated by the
       ערב tag on its own row, not counted among the client's. */
    const found = onBoard.reduce(
      (acc, l) => {
        if (l.is_guarantor) return acc;
        if (l.group === "loan") acc.loan += 1;
        else acc.mortgage += 1;
        return acc;
      },
      { mortgage: 0, loan: 0 }
    );
    const shared = onBoard.filter((l) => l.is_shared).length;

    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="lgr-card overflow-hidden"
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <span
            className="grid size-9 flex-none place-items-center rounded-full"
            style={{ background: "var(--pos-tint)", color: "var(--pos)" }}
          >
            <CheckCircle size={19} weight="fill" />
          </span>

          {reports.map((r, i) => (
            <div
              key={`${r.clientId}-${i}`}
              className="min-w-0 ps-4"
              style={{ borderInlineStart: i ? "1px solid var(--line)" : undefined }}
            >
              <div className="flex items-center gap-2">
                <span className="lgr-display text-[16px]">{r.clientName || "דוח ללא שם"}</span>
                {r.clientId && (
                  <span className="lgr-chip !h-[21px] !px-2 !text-[10.5px]" style={{ color: "var(--lgr-3)" }}>
                    <IdentificationCard size={11} />
                    <span className="lgr-fig">{r.clientId}</span>
                  </span>
                )}
              </div>
              <div
                className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px]"
                style={{ color: "var(--lgr-3)" }}
              >
                <span className="truncate" style={{ maxWidth: 190 }} title={r.fileName}>
                  {r.fileName}
                </span>
                {r.reportDate && <span>· דוח מ־{r.reportDate}</span>}
                {r.guaranteed > 0 && <span title="חובות שהלקוח ערב להם">· {r.guaranteed} בערבות</span>}
              </div>
            </div>
          ))}

          {/* WHAT CAME OUT, in the two family colours — the same violet and
              copper the rows below now carry, so the receipt and the grid
              read as one statement. */}
          <div className="flex items-center gap-2 ps-4" style={{ borderInlineStart: "1px solid var(--line)" }}>
            {(
              [
                { key: "mortgage" as const, n: found.mortgage, icon: <Bank size={12} weight="fill" /> },
                { key: "loan" as const, n: found.loan, icon: <HandCoins size={12} weight="fill" /> },
              ] as const
            )
              .filter((f) => f.n > 0)
              .map((f, i) => (
                <motion.span
                  key={f.key}
                  className="lgr-chip"
                  style={{
                    borderColor: FAMILY[f.key].line,
                    background: FAMILY[f.key].tint,
                    color: FAMILY[f.key].text,
                  }}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...settle, delay: 0.12 + i * 0.07 }}
                  title={`זוהו ${f.n} ${FAMILY[f.key].plural}`}
                >
                  {f.icon}
                  {FAMILY[f.key].plural}
                  <span className="lgr-fig" style={{ opacity: 0.8 }}>
                    {f.n}
                  </span>
                </motion.span>
              ))}
          </div>

          {shared > 0 && (
            <span
              className="lgr-chip"
              style={{ background: "var(--primary-tint)", color: "var(--primary-deep)", borderColor: "var(--primary-line)" }}
              title="חובות שהופיעו בשני הדוחות — נספרו פעם אחת"
            >
              {shared === 1 ? "התחייבות משותפת" : `${shared} משותפות`}
            </span>
          )}

          <div className="lgr-receipt-acts">
            {/* WHAT YOU CAN READ OUT OF THIS DOCUMENT, on the document.
                These three lived on the mix strip below, where they were three
                of six buttons about two different subjects and wrapped the strip
                onto a second row the moment a report landed. They are readings
                of the report — its analysis, its client summary, the original
                PDF — so they belong on the report's own receipt, beside the
                controls that manage it. */}
            {readings}
            {readings && <span className="lgr-receipt-sep" aria-hidden />}
            {/* A household holds one mortgage between two people, and each of
                their reports lists all of it. Joint debts are merged, not
                doubled — see mergeReportLoans. */}
            <Btn className="lgr-btn lgr-btn-sm" onClick={pick} disabled={busy}>
              {busy ? (
                <CircleNotch size={13} weight="bold" className="animate-spin" />
              ) : (
                <Plus size={13} weight="bold" />
              )}
              {busy ? "מפענח…" : "הוספת דוח נוסף"}
            </Btn>
            <Btn className="lgr-act lgr-tip" data-tip-side="start" data-tip="התחלה מחדש" onClick={onClear} aria-label="התחלה מחדש">
              <ArrowClockwise size={14} weight="bold" />
            </Btn>
          </div>
        </div>

        {error && (
          <div
            className="flex items-center gap-2 border-t px-3.5 py-1.5 text-[11.5px] font-semibold"
            style={{ borderColor: "var(--neg-line)", background: "var(--neg-tint)", color: "var(--neg)" }}
          >
            <WarningCircle size={13} weight="fill" />
            {error}
            <button className="ms-auto opacity-60 hover:opacity-100" onClick={() => setError("")} aria-label="סגירה">
              <X size={12} weight="bold" />
            </button>
          </div>
        )}
        {fileInput}
      </motion.div>
    );
  }

  /* ------------------------------------------------------------ idle / busy */
  const headline = busy
    ? "מפענח את הדוח…"
    : error
      ? "לא הצלחנו לקרוא את הדוח"
      : drag || armed
        ? "שחררו כאן"
        : "גררו לכאן חיווי אשראי או תדפיס משכנתא";

  // The payoff, stated before the work. Without it the zone asks for a file and
  // never says what it gives back, which is the whole reason to use it.
  const subline = busy
    ? "קוראים את ההתחייבויות ומתאימים אותן למסלולים"
    : error
      ? "בדקו שזה קובץ PDF של חיווי אשראי או של תדפיס משכנתא מהבנק"
      : "נזהה את ההלוואות אוטומטית ונמלא את התמהיל עבורכם";

  return (
    // TWO LAYERS, TWO JOBS. The outer element owns the rejection shake (fired
    // imperatively, so the same failure twice in a row plays twice); the inner
    // one owns the 1% drag lift. One element cannot take both a controls-driven
    // animation and a declarative `animate`, and nesting is cheaper than
    // orchestrating them.
    <motion.div animate={shake}>
    <motion.div
      className="lgr-bay"
      role="button"
      tabIndex={0}
      data-drag={drag || undefined}
      data-armed={(armed && !drag) || undefined}
      data-busy={busy || undefined}
      data-state={error ? "err" : undefined}
      aria-label="גררו לכאן דוח ריכוז נתונים"
      aria-busy={busy}
      animate={{ scale: drag ? 1.01 : 1 }}
      transition={snap}
      onDragEnter={(e) => {
        e.preventDefault();
        depth.current += 1;
        if (!busy) setDrag(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        e.preventDefault();
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setDrag(false);
      }}
      // No onDrop here on purpose: the window-level listener above catches
      // every drop on the page, including this one. Handling it in both places
      // imported the same report twice.
      onDrop={() => {
        depth.current = 0;
        setDrag(false);
      }}
      onClick={() => !busy && inputRef.current?.click()}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !busy) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
    >
      {fileInput}

      {(drag || armed) && (
        <svg className="lgr-ants" aria-hidden preserveAspectRatio="none">
          <rect x="0" y="0" width="100%" height="100%" rx="16" />
        </svg>
      )}
      {(drag || busy) && <span className="lgr-beam" aria-hidden />}

      {/* ONE BAND, NOT A HERO PANEL.
          This is the most valuable control on the page, but value is not the
          same as height: a 340px rectangle above the board pushed the ledger
          off the first screen and made a working tool read like a landing page.
          Everything it said is still here — mark, what to do, what happens, how
          to do it without dragging, and what it takes — laid across instead of
          down, in about a third of the height. */}
      {/* py-3 rather than py-3.5: the strip settled at 90px and stays there. */}
      <div className="relative flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3">
        <div className="relative flex-none">
          <Mark />
          <AnimatePresence>
            {(busy || (error && !busy)) && (
              <motion.span
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                className="absolute -bottom-0.5 -start-1 grid size-7 place-items-center rounded-full border bg-white"
                style={{
                  borderColor: busy ? "var(--line-2)" : "var(--neg-line)",
                  color: busy ? "var(--primary)" : "var(--neg)",
                  boxShadow: "var(--shadow)",
                }}
              >
                {busy ? (
                  <CircleNotch size={14} weight="bold" className="animate-spin" />
                ) : (
                  <WarningCircle size={15} weight="fill" />
                )}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="min-w-[190px] flex-1">
          <div className="lgr-display text-[17px]" style={{ color: error ? "var(--neg)" : "var(--ink)" }}>
            {headline}
          </div>
          <p
            className="mt-1 text-[12.5px] leading-snug"
            style={{ color: error ? "var(--neg)" : "var(--lgr-3)" }}
          >
            {error || subline}
          </p>
          {/* what it takes, on the line it is relevant to */}
          <div className="lgr-bay-foot">
            <span>PDF</span>
            <i />
            <span>חיווי אשראי</span>
            <i />
            <span>תדפיס משכנתא מהבנק</span>
          </div>
        </div>

        {/* The primary CTA lives inside the zone. It is a <span>: the whole bay
            is already the button, and a nested <button> would swallow the click
            it is meant to represent. */}
        <span className="lgr-btn lgr-btn-primary flex-none !px-4" aria-hidden>
          {busy ? (
            <CircleNotch size={14} weight="bold" className="animate-spin" />
          ) : error ? (
            <ArrowClockwise size={14} weight="bold" />
          ) : (
            <UploadSimple size={14} weight="bold" />
          )}
          {busy ? "מפענח…" : error ? "נסו שוב" : "בחירת קובץ"}
        </span>

        {error && (
          <Btn
            className="lgr-act absolute end-2 top-2"
            aria-label="סגירת ההודעה"
            onClick={(e) => {
              e.stopPropagation();
              setError("");
            }}
          >
            <X size={13} weight="bold" />
          </Btn>
        )}
      </div>
    </motion.div>
    </motion.div>
  );
}

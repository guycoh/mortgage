"use client";

// The editing surface: ONE continuous financial table.
//
// Mortgages and consumer loans used to live in two separate tables with two
// saturated headers. They are the same kind of object with the same columns, so
// they now share one grid and one interaction model. What tells them apart is
// a 3px coloured spine on the row's start edge, a worded chip (משכנתא /
// הלוואה), an icon and a faint tint — never colour on its own. A slim divider
// row keeps the two families scannable without breaking the table in half.
//
// Every field the old grid had is still here. The four rarely-touched ones
// (עוגן, מרווח, גרייס, חודשי גרייס) open in a sheet off the row's settings icon,
// so reaching them never reflows the grid.
//
// תדירות שינוי is on the grid rather than in that sheet: both document types now
// fill it on import, and how often a rate resets belongs next to the rate it
// resets — it is the difference between a 3% tranche that stays 3% and one that
// reprices next spring.

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowCounterClockwise,
  ArrowsClockwise,
  Bank,
  CircleNotch,
  HandCoins,
  Plus,
  Sliders,
  ShieldWarning,
  Table as TableIcon,
  Trash,
  Warning,
} from "@phosphor-icons/react";
import { schedules } from "@/app/data/amortization_schedules";
import type { LoanPath } from "@/app/data/hooks/useLoanPaths";
import { calculateLoan } from "@/app/private/crm/leads/simulators/components/calculate/loanCalculators";
import Select from "./Select";
import DateField from "./DateField";
import { BankIcon } from "./bankIcons";
import Money from "./Money";
import RowSettings from "./RowSettings";
import Btn from "./Btn";
import { settle, snap } from "../lib/transitions";
import Toaster, { type Toast, type ToastTone } from "./Toast";
import {
  FAMILY,
  PATH_SHORT,
  TRACK_HEX,
  isSurety,
  rateHeat,
  type DebtGroup,
  type ImportedLoan,
} from "../lib/credit";
import { addMonths, monthsBetween, parseDate, startOfToday, toIso } from "../lib/dates";
import { lenderOf } from "../lib/lenders";
import { freqLabel } from "@/lib/rate-frequency";
import type { AnchorResponse } from "@/lib/anchors/types";

const ORDER: DebtGroup[] = ["mortgage", "loan"];

/**
 * THE SWEEP'S CLOCK.
 *
 * Under two seconds, and gone. A mark that lingers stops being feedback and
 * becomes a state the reader has to dismiss in their head — so the bloom is
 * fully clear well before anyone would reach to get rid of it.
 *
 * The 65ms stagger is the whole trick. Simultaneous is a flash and reads as an
 * error state; too slow and the reader loses that the rows are one event. At
 * 65ms four rows resolve in a fifth of a second — fast enough to be one
 * gesture, slow enough that the eye can follow it down the column.
 */
const FLASH_TOTAL_MS = 1900;
const FLASH_STAGGER_MS = 65;

/** Toast ids only have to be unique within a session, and monotonic for order. */
let toastSeq = 1;

const FAM_ICON = {
  mortgage: <Bank size={12} weight="fill" className="lgr-fam-ico" />,
  loan: <HandCoins size={12} weight="fill" className="lgr-fam-ico" />,
} as const;

/** The family's palette as CSS variables, for a row or for its subtotal bar. */
const famVarsOf = (key: DebtGroup): React.CSSProperties => {
  const fam = FAMILY[key];
  return {
    "--fam": fam.color,
    "--fam-text": fam.text,
    "--fam-tint": fam.tint,
    "--fam-tint-2": fam.tint2,
    "--fam-line": fam.line,
    "--fam-wash": fam.wash,
    "--fam-ring": fam.ring,
  } as React.CSSProperties;
};

/**
 * The guarantee section's bar — slate, not a third family colour and not a
 * warning colour. The two families are identity; this is a different KIND of
 * fact about the board, and a red or amber bar would read as "this debt is in
 * trouble" rather than "this debt is not the client's".
 */
const SURETY_VARS = {
  "--fam": "#64748b",
  "--fam-text": "#475569",
  "--fam-tint": "#eef1f5",
  "--fam-tint-2": "#e2e7ee",
  "--fam-line": "#d3dae3",
  "--fam-wash": "#f7f9fb",
  "--fam-ring": "rgba(100, 116, 139, 0.4)",
} as React.CSSProperties;

/** Fields whose change we mark with the corner tick. */
const TRACKED = [
  "amount",
  "rate",
  "months",
  "path_id",
  "amortization_schedule_id",
  "loan_end_date",
  "grace_type_id",
  "grace_months",
  "anchor",
  "anchor_margin",
  "change_frequency",
  "anchor_interval",
  "source_anchor",
  "is_guarantor",
] as const;

type Baseline = Record<string, ImportedLoan>;

export default function Ledger({
  loans,
  paths,
  annualInflation,
  baseline,
  isBase = false,
  target = null,
  onTarget,
  onChange,
  onSchedule,
}: {
  loans: ImportedLoan[];
  paths: LoanPath[];
  annualInflation: number;
  /** Row values as of the last load / import / save — drives the change marks. */
  baseline: Baseline;
  /**
   * The master mix — what the client owes today. Its amounts are imported fact,
   * so אחוז reads there and never writes: you do not re-slice a mortgage that
   * already exists. Allocation by percentage belongs to a תמהיל חדש or a copy.
   */
  isBase?: boolean;
  /** גובה התמהיל — the figure אחוז is a percentage OF. Null until it is set. */
  target?: number | null;
  onTarget?: (value: number | null) => void;
  onChange: (loans: ImportedLoan[]) => void;
  onSchedule: (loan: ImportedLoan) => void;
}) {
  const [armed, setArmed] = useState<string | null>(null);
  const [sheet, setSheet] = useState<{ id: string; rect: DOMRect } | null>(null);
  const [anchorBusy, setAnchorBusy] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  /**
   * THE SWEEP.
   *
   * Which rows just changed, and when. `at` is a nonce, not a clock: it keys the
   * overlay so pressing the button twice replays the light rather than leaving a
   * finished animation mounted and inert. `ids` is ordered top-to-bottom, and the
   * index in it is the row's place in the stagger — which is what turns "four
   * numbers changed" into one legible event travelling down the mix instead of
   * four unrelated flashes.
   */
  const [flash, setFlash] = useState<{ ids: string[]; at: number } | null>(null);
  /* While a percent cell has focus the field shows what was TYPED, not what the
     amount rounds back to — otherwise "2" becomes "2.0" under the caret and the
     next keystroke lands in the wrong place. */
  const [pctDraft, setPctDraft] = useState<{ id: string; text: string } | null>(null);
  const today = startOfToday();

  const patch = (id: string, next: Partial<ImportedLoan>) =>
    onChange(loans.map((l) => (l.id === id ? { ...l, ...next } : l)));

  /** Raise a toast. Three on screen at once is the ceiling; older ones drop. */
  const toast = (tone: ToastTone, message: string, detail?: string, ttl = 5200) =>
    setToasts((prev) => [...prev.slice(-2), { id: toastSeq++, tone, message, detail, ttl }]);

  const dismissToast = useCallback(
    (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id)),
    []
  );

  // The sweep unmounts once it has finished. Leaving a completed animation in the
  // tree costs a compositor layer per row for nothing, and — more to the point —
  // a `data-flash` that never clears would leave the wells tinted green forever.
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), FLASH_TOTAL_MS + flash.ids.length * FLASH_STAGGER_MS);
    return () => clearTimeout(t);
  }, [flash]);

  const remove = (id: string) => {
    onChange(loans.filter((l) => l.id !== id));
    setArmed(null);
  };

  const add = (group: DebtGroup) =>
    onChange([
      ...loans,
      {
        id: crypto.randomUUID(),
        mix_id: loans[0]?.mix_id ?? "",
        path_id: paths[0]?.id ?? 1,
        amount: 0,
        rate: 0,
        months: 0,
        amortization_schedule_id: schedules[0]?.id ?? 1,
        grace_type_id: 1,
        grace_months: 0,
        loan_end_date: null,
        end_date: null,
        group,
      },
    ]);

  /* --- תאריך סיום and חודשים describe one fact, so they move together ---
     The anchor for the conversion is the row's OWN frame — end minus months —
     not today. An imported row carries a term measured from its report's
     date; anchoring the sync on today silently rewrote that term the moment
     either cell was touched (on a 14-month-old report, editing the end date
     snapped 74 months back to 60 — the exact bug the import just fixed).
     A hand-made row has no dates yet, and there the anchor IS today. */
  const anchorOf = (l: ImportedLoan): Date => {
    const end = parseDate(l.loan_end_date ?? l.end_date);
    const m = Number(l.months) || 0;
    return end && m > 0 ? addMonths(end, -m) : today;
  };
  const setTerm = (id: string, months: number) => {
    const l = loans.find((x) => x.id === id);
    const m = Math.max(0, Math.round(months) || 0);
    const iso = l && m > 0 ? toIso(addMonths(anchorOf(l), m)) : null;
    patch(id, { months: m, loan_end_date: iso, end_date: iso });
  };
  const setEnd = (id: string, iso: string | null) => {
    const l = loans.find((x) => x.id === id);
    const d = iso ? parseDate(iso) : null;
    patch(id, {
      loan_end_date: iso,
      end_date: iso,
      months: l && d ? Math.max(0, monthsBetween(anchorOf(l), d)) : 0,
    });
  };

  /* --- תדירות שינוי: months are the value, the wording is derived from them --- */
  // The grid edits the number. `change_frequency` is a text column other pages
  // read, so it is kept in step rather than left to contradict the integer beside
  // it — one fact, written once, in both shapes.
  const setFreq = (id: string, raw: string) => {
    const months = raw === "" ? null : Math.max(0, Math.round(Number(raw))) || null;
    patch(id, {
      anchor_interval: months,
      change_frequency: freqLabel(months),
    } as Partial<ImportedLoan>);
  };

  /** The interval in the words an advisor would say, under the figure. */
  const freqNote = (loan: ImportedLoan) => {
    const m = Number(loan.anchor_interval);
    if (loan.anchor_interval === null || loan.anchor_interval === undefined || !Number.isFinite(m) || m <= 0)
      return "";
    if (m === 1) return "כל חודש";
    if (m % 12 === 0) return `${m / 12} שנ׳`;
    return `${m} ח׳`;
  };

  /* --- עוגן: the name is the value, its margin is the note underneath --- */
  const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(2)}%`;

  /**
   * One of the two rate fields in the עוגן cell.
   *
   * Empty means absent, not zero: a fixed-rate row has no anchor and no margin,
   * and writing 0 into either would claim it is anchored at nothing. So the value
   * clears to null rather than to 0 — which also keeps the numeric columns
   * nullable in the database, the way they are declared.
   */
  const numField = (
    loan: ImportedLoan,
    key: "anchor" | "anchor_margin",
    label: string,
    placeholder: string
  ) => (
    <input
      className="lgr-cell lgr-num-in"
      type="number"
      step="0.01"
      aria-label={label}
      title={label}
      // A placeholder that repeats the column header ("עוגן" over the עוגן
      // column) tells nobody anything; it also made an empty field look filled
      // from two feet away. The shape of the number that belongs here does the
      // work instead, at 40% so it can never be mistaken for a typed value.
      placeholder={placeholder}
      value={loan[key] ?? ""}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) =>
        patch(loan.id, {
          [key]: e.target.value === "" ? null : Number(e.target.value),
        } as Partial<ImportedLoan>)
      }
    />
  );

  /** The sum spelled out, for the cell's tooltip: anchor + margin = the rate. */
  const anchorTip = (loan: ImportedLoan) => {
    // A row the refresh declined to price says why, and says it here rather than
    // anywhere that would make the grid taller. It is the only place the reason
    // exists, so it comes first.
    if (loan.anchor_note) return loan.anchor_note;
    if (loan.anchor === null && loan.anchor_margin === null)
      return "המסמך לא ציין עוגן לשורה הזו";
    const parts = [loan.source_anchor || "עוגן"];
    if (loan.anchor !== null && Number.isFinite(Number(loan.anchor)))
      parts.push(`${Number(loan.anchor).toFixed(2)}%`);
    if (loan.anchor_margin !== null && Number.isFinite(Number(loan.anchor_margin)))
      parts.push(`מרווח ${signed(Number(loan.anchor_margin))}`);
    parts.push(`סה"כ ${(Number(loan.rate) || 0).toFixed(2)}%`);
    // Where a refreshed anchor came from and how old it is. Both are the point of
    // the button: the value is only worth anything if you can see its date, and an
    // unverified source has to say so rather than borrow the credibility of one
    // that was checked against the bank's own price list.
    if (loan.anchor_asof) {
      const [y, m, d] = loan.anchor_asof.split("-");
      parts.push(
        `${loan.anchor_stale ? "העוגן האחרון שפורסם" : "עוגן עדכני"} · ${loan.anchor_source ?? "מקור"} · נכון ל־${d}/${m}/${y}`
      );
      // The cadence is what makes the date mean something: "נכון ל־11/07" says
      // little until you know the table republishes twice a month.
      if (loan.anchor_cadence) parts.push(`מתעדכן ${loan.anchor_cadence}`);
      if (loan.anchor_verified === false) parts.push("המקור טרם אומת מול פרסום הבנק");
    }
    return parts.join(" · ");
  };

  /** Why the cell says what it says — the report's own wording, where there was one. */
  const freqTip = (loan: ImportedLoan) => {
    const m = Number(loan.anchor_interval);
    if (loan.anchor_interval === null || !Number.isFinite(m) || m <= 0)
      return loan.source_track
        ? `המסמך לא ציין תדירות שינוי · מהדוח: ${loan.source_track}`
        : "ריק = הריבית אינה מתעדכנת במחזור קבוע";
    return `הריבית מתעדכנת כל ${m} חודשים${loan.source_track ? ` · מהדוח: ${loan.source_track}` : ""}`;
  };

  /* ------------------------------------------------------------- grouping */
  // Rows with no family (hand-added before an import) sit with the mortgages,
  // which is what the base mix means by default.
  const famOf = (l: ImportedLoan): DebtGroup => (l.group === "loan" ? "loan" : "mortgage");

  /**
   * THREE SECTIONS, TWO OF WHICH ARE THE CLIENT'S.
   *
   * Guarantees are still rows on this board — they are imported fact, they are
   * saved with the mix, and an advisor has to be able to correct one. What they
   * are not is part of any total: see isSurety in lib/credit. So they get a
   * section of their own, last, whose subtotal is stated and then left out of
   * סה"כ — the same shape the Excel export takes, so the sheet and the screen
   * can never quote different numbers at each other.
   */
  const sections = useMemo(() => {
    // ROUNDED PER ROW, then added — because that is what the reader does. Every
    // row prints its payment through Money, which rounds, so a subtotal that
    // sums the raw values and rounds once at the end can miss the column above
    // it by a shekel: 13,870 + 20,999 came to 34,868. The Excel export is forced
    // into the same rule by its SUM() formulas, so this also keeps the sheet and
    // the screen from quoting different numbers at each other.
    const of = (rows: ImportedLoan[]) => ({
      rows,
      amount: rows.reduce((s, l) => s + Math.round(Number(l.amount) || 0), 0),
      monthly: rows.reduce((s, l) => s + Math.round(calculateLoan(l, annualInflation).monthlyPayment), 0),
    });
    const owed = loans.filter((l) => !isSurety(l));
    return [
      ...ORDER.map((key) => ({ key, ...of(owed.filter((l) => famOf(l) === key)) })),
      { key: "surety" as const, ...of(loans.filter(isSurety)) },
    ];
  }, [loans, annualInflation]);

  /** The client's own — never the guarantees. */
  const grand = useMemo(() => {
    const own = sections.filter((s) => s.key !== "surety");
    return {
      amount: own.reduce((s, g) => s + g.amount, 0),
      monthly: own.reduce((s, g) => s + g.monthly, 0),
    };
  }, [sections]);

  const surety = sections[sections.length - 1];

  /* ------------------------------------------------------------------ אחוז */
  // THE PERCENT HAS TO BE A PERCENT OF SOMETHING THAT HOLDS STILL.
  // Dividing by the running total is the trap: typing 25 moves the numerator
  // and the denominator together, so the row never lands on 25 and the figure
  // argues with what was just typed. גובה התמהיל is set once and does not move
  // while rows are being allocated against it, so it is the divisor whenever it
  // exists. With none set the column still READS — as a share of the mix as it
  // stands — it just cannot be written, which is the honest state rather than
  // an input that silently does nothing.
  const base = Number(target) || 0;
  const denom = base || grand.amount;
  /** Writable only on a proposal, and only once there is a total to divide by. */
  const canWritePct = !isBase && !!onTarget && base > 0;
  const remaining = base ? base - grand.amount : 0;

  const setPct = (id: string, raw: string) => {
    if (!base) return;
    const pct = Number(raw);
    if (raw === "" || !Number.isFinite(pct)) return;
    patch(id, { amount: Math.max(0, Math.round((pct / 100) * base)) });
  };

  const dirtyOf = (loan: ImportedLoan) => {
    const base = baseline[loan.id];
    if (!base) return new Set<string>(); // a row added after the snapshot
    const out = new Set<string>();
    for (const k of TRACKED) {
      const a = loan[k as keyof ImportedLoan] ?? null;
      const b = base[k as keyof ImportedLoan] ?? null;
      if (String(a) !== String(b)) out.add(k);
    }
    return out;
  };

  const addBtns = (size: "sm" | "md" = "sm") => (
    <div className="flex items-center gap-1.5">
      {ORDER.map((key) => (
        <Btn
          key={key}
          className={`lgr-btn lgr-btn-fam ${size === "sm" ? "lgr-btn-sm" : ""}`}
          style={
            {
              "--fam": FAMILY[key].color,
              "--fam-text": FAMILY[key].text,
              "--fam-tint": FAMILY[key].tint,
              "--fam-tint-2": FAMILY[key].tint2,
              "--fam-line": FAMILY[key].line,
              "--fam-ring": FAMILY[key].ring,
              "--fam-wash": FAMILY[key].wash,
            } as React.CSSProperties
          }
          onClick={() => add(key)}
        >
          <Plus size={13} weight="bold" />
          {FAMILY[key].label}
        </Btn>
      ))}
    </div>
  );

  /** Add a row from the bottom, so a long list never sends you back up. */
  const addRow = (
    <tr className="lgr-addrow">
      <td colSpan={13}>
        <div className="lgr-addrow-in">
          {addBtns()}
          <span className="lgr-addrow-hint">הוספת שורה ריקה לתמהיל</span>
        </div>
      </td>
    </tr>
  );

  const sheetLoan = sheet ? loans.find((l) => l.id === sheet.id) : null;

  /* ------------------------------------------------- עדכון עוגנים ------- */
  /**
   * Replace each variable row's anchor with what that anchor is worth NOW.
   *
   * The anchor on an imported row is the one that priced the tranche on the day
   * it was taken — 0.97% on a five-year track struck in 2022. To ask what
   * recycling that tranche would cost you need the same anchor today, and the
   * two are different facts about the same track rather than a correction of one
   * by the other. So the original is kept on the row and can be put back.
   *
   * One request for the whole mix. The server holds the published tables; the
   * board sends only what prices a row — lender, track, reset period — and gets
   * a verdict per row. Anything it will not price is left exactly as it was,
   * because a made-up anchor walks straight into a repayment schedule.
   */
  const refreshAnchors = async () => {
    if (anchorBusy) return;
    setAnchorBusy(true);
    setFlash(null);
    try {
      const res = await fetch("/api/simulator/anchors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: loans.map((l) => ({
            rowId: l.id,
            // The registry is keyed by the short name, not the document's legal
            // one: "הבנק הבינלאומי הראשון לישראל בע\"מ" is הבינלאומי here.
            bank: l.source_bank ? lenderOf(l.source_bank).name : "",
            pathId: Number(l.path_id) || 0,
            resetMonths:
              l.anchor_interval === null || l.anchor_interval === undefined
                ? null
                : Number(l.anchor_interval) || null,
          })),
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data: AnchorResponse = await res.json();

      const byId = new Map(data.rows.map((r) => [r.rowId, r]));
      const changed: string[] = [];
      let updated = 0;
      let eligible = 0;


      const next = loans.map((l) => {
        const r = byId.get(l.id);
        if (!r) return l;
        // NOT_APPLICABLE is a fixed row, which was never a candidate. Only the
        // rows that SHOULD have priced count towards "3 מתוך 4".
        if (r.status !== "NOT_APPLICABLE") eligible++;
        if (r.status !== "RESOLVED" || r.anchor === undefined) {
          return { ...l, anchor_note: r.reason ?? undefined };
        }
        const before = Number(l.anchor);
        const had = l.anchor !== null && l.anchor !== undefined && Number.isFinite(before);
        if (had && Math.abs(before - r.anchor) < 0.0005) {
          // Already current. Not a change, and not a failure either.
          return { ...l, anchor_asof: r.effectiveAt, anchor_source: r.familyLabel, anchor_note: undefined };
        }
        updated++;
        // Collected in row order, because the stagger reads down the board.
        changed.push(l.id);
        const margin = Number(l.anchor_margin);
        const hasMargin = l.anchor_margin !== null && l.anchor_margin !== undefined && Number.isFinite(margin);
        return {
          ...l,
          // Written once. Pressing the button twice must not overwrite the
          // client's own anchor with the previous refresh's value.
          anchor_original: l.anchor_original !== undefined ? l.anchor_original : (had ? before : null),
          anchor: r.anchor,
          // ריבית = עוגן + מרווח is this board's existing arithmetic, not a new
          // rule — anchorRate() in lib/credit derives the anchor by subtracting
          // the margin from the rate. Where the document gave no margin there is
          // nothing to add to, and the rate is left alone rather than replaced by
          // a bare anchor.
          rate: hasMargin ? Math.round((r.anchor + margin) * 100) / 100 : l.rate,
          anchor_asof: r.effectiveAt,
          anchor_source: r.familyLabel,
          anchor_verified: r.verified,
          anchor_stale: r.stale,
          anchor_cadence: r.cadence,
          anchor_note: undefined,
        };
      });

      onChange(next);

      // The light only fires on rows that actually moved. Sweeping a row whose
      // anchor was already current would be the animation telling a small lie.
      if (changed.length) setFlash({ ids: changed, at: Date.now() });

      if (updated === 0) {
        toast(
          "neutral",
          eligible === 0 ? "אין בתמהיל מסלולים הנגזרים מעוגן" : "העוגנים כבר עדכניים",
          eligible === 0 ? "כל השורות בריבית קבועה" : undefined
        );
      } else {
        // The count that did not resolve is the honest half of the sentence, and
        // it belongs on its own line rather than buried in the headline.
        const missed = eligible - updated;
        toast(
          "pos",
          updated === eligible
            ? `עודכנו ${updated} עוגנים`
            : `עודכנו ${updated} מתוך ${eligible} עוגנים`,
          // Only what the advisor can act on. How old our cache is, is our
          // problem — the button's whole promise is that pressing it gives the
          // current anchor, and reporting our own staleness to the person who
          // just pressed it makes them audit our plumbing instead of reading
          // their client's mortgage. Freshness is enforced upstream, in the
          // refresh route; see docs/mortgage-anchor-sources.md.
          missed > 0
            ? `${missed} שורות נותרו ללא שינוי — חסר מידע לזיהוי העוגן`
            : undefined
        );
      }
    } catch {
      toast("neg", "לא ניתן היה לקבל עוגנים עדכניים", "השורות נותרו ללא שינוי");
    } finally {
      setAnchorBusy(false);
    }
  };

  /** Put every refreshed row back to the anchor its document stated. */
  const restoreAnchors = () => {
    onChange(
      loans.map((l) => {
        if (l.anchor_original === undefined) return l;
        const margin = Number(l.anchor_margin);
        const hasMargin = l.anchor_margin !== null && l.anchor_margin !== undefined && Number.isFinite(margin);
        const back = l.anchor_original;
        return {
          ...l,
          anchor: back,
          rate: hasMargin && back !== null ? Math.round((back + margin) * 100) / 100 : l.rate,
          anchor_original: undefined,
          anchor_asof: undefined,
          anchor_source: undefined,
          anchor_verified: undefined,
          anchor_stale: undefined,
          anchor_cadence: undefined,
        };
      })
    );
    setFlash(null);
    toast("neutral", "הוחזרו העוגנים מהמסמך", "הריביות חושבו מחדש מהמרווח המקורי");
  };

  const refreshed = loans.filter((l) => l.anchor_original !== undefined).length;

  /** A row's place in the sweep, or -1 if it did not change on this run. */
  const flashOrder = (id: string) => (flash ? flash.ids.indexOf(id) : -1);

  /* ------------------------------------------------------------------- ui */
  return (
    // No clipping on this card on purpose: `overflow: hidden` would make it the
    // containing block for the table's sticky header and totals bar, and a box
    // that never scrolls pins them in place — they would slide away with the
    // page instead of holding. Visible overflow hands them the page as their
    // scroller, which is the point now that the list is not boxed.
    <section className="lgr-card">
      <header className="lgr-head">
        <h2 className="lgr-title">התחייבויות בתמהיל</h2>
        <span className="lgr-count">{loans.length}</span>

        {/* גובה התמהיל, and what is left of it. Only on a proposal: the master
            mix is a balance, not a budget, and giving it a target would invite
            editing the client's actual debt to fit a round number. */}
        {!isBase && onTarget && (
          <div className="lgr-target">
            <label className="lgr-target-field">
              <span>גובה התמהיל</span>
              <input
                className="lgr-cell lgr-num-in"
                inputMode="numeric"
                placeholder="0"
                aria-label="גובה התמהיל"
                value={target ? Number(target).toLocaleString("he-IL") : ""}
                onFocus={(e) => e.currentTarget.select()}
                onChange={(e) => onTarget(Number(e.target.value.replace(/[^\d]/g, "")) || null)}
              />
            </label>
            {base > 0 && (
              <span
                className="lgr-target-left"
                data-over={remaining < 0 || undefined}
                title={
                  remaining < 0
                    ? "שויך יותר מגובה התמהיל"
                    : remaining > 0
                      ? "נותר לשייך למסלולים"
                      : "התמהיל משויך במלואו"
                }
              >
                יתרה לשיוך
                <b>{remaining.toLocaleString("he-IL")}</b>
              </span>
            )}
          </div>
        )}

        {/* עדכון עוגנים.
            PROPOSALS ONLY. The master mix is what the client owes today, read off
            their documents — replacing its anchors with this month's would
            overwrite the record with a simulation and leave nothing to compare
            against. On a copy the same act is the whole question: what would this
            tranche cost if it repriced now?

            It sits in the card header rather than in the עוגן column head: the
            column is 9.5% of the grid, which fits an 11px icon and no word, and
            an unlabelled glyph over a numeric column reads as a sort control. Up
            here it can say what it does, and its result can be a sentence beside
            it instead of a tooltip. */}
        {!isBase && (
          <div className="lgr-anchor-bar">
            <Btn className="lgr-btn lgr-btn-sm" onClick={refreshAnchors} disabled={anchorBusy}>
              {anchorBusy ? (
                <CircleNotch size={13} weight="bold" className="lgr-spin" />
              ) : (
                <ArrowsClockwise size={13} weight="bold" />
              )}
              עדכון עוגנים
            </Btn>
            {/* Only once there is something to go back TO. An always-present
                restore implies the board is in a state that needs undoing. */}
            <AnimatePresence initial={false}>
              {refreshed > 0 && !anchorBusy && (
                <motion.div
                  initial={{ opacity: 0, x: 6, scale: 0.96 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 6, scale: 0.96, transition: { duration: 0.14 } }}
                  transition={snap}
                >
                  <Btn className="lgr-btn lgr-btn-sm" onClick={restoreAnchors}>
                    <ArrowCounterClockwise size={13} weight="bold" />
                    שחזור
                  </Btn>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div className="ms-auto">{addBtns()}</div>
      </header>

      {loans.length === 0 ? (
        <div className="lgr-empty">
          <span
            className="grid size-10 place-items-center rounded-lg border"
            style={{ borderColor: "var(--line-2)", color: "var(--lgr-4)" }}
          >
            <Bank size={19} />
          </span>
          התמהיל ריק — גררו דוח אשראי למעלה, או הוסיפו שורה ידנית.
          <div className="mt-1">{addBtns("md")}</div>
        </div>
      ) : (
        // The board is as tall as the debts are many. A report with forty
        // liabilities used to become a small scrolling window inside a
        // full-height page — two scrollbars fighting, and no way to see the
        // list whole. The page is the only scroller now; the header and the
        // totals bar stay put on their own.
        <div>
          <table className="lgr-table">
            <colgroup>
              {/* Fourteen columns summing to 100. תאריך סיום is the one that must
                  not be squeezed: a ten-character date plus the calendar button
                  is the widest fixed content in the grid, and shaving it is what
                  put the button on top of the digits. It gets 10% here, and the
                  button's space is reserved in padding rather than hoped for —
                  see .lgr-date-in.

                  גוף מימון costs 9.5%, and 2.5 of those came back out of סכום:
                  the lender used to ride inside the amount cell as a 14px disc
                  with a 26px reserved lane and another 34px for its tags, on a
                  cell that also had to hold a six-figure number. Giving the
                  lender its own column hands סכום back to the money. The rest is
                  half a point each off six columns that were carrying slack. */}
              {[
                "8%", // סוג
                "7%", // מטרה
                "9%", // גוף מימון
                "8.5%", // סכום
                "5%", // אחוז
                "7.5%", // מסלול
                "7%", // לוח סילוקין
                "9.5%", // עוגן / מרווח
                "5%", // ריבית %
                "6%", // תדירות שינוי
                "5%", // חודשים
                "9.5%", // תאריך סיום
                "7%", // החזר חודשי
                "6%", // actions
              ].map((w, i) => (
                <col key={i} style={{ width: w }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th>סוג</th>
                {/* מטרת ההלוואה, beside the type it qualifies: "משכנתא" says what
                    the debt is, "כל מטרה" says what it was for, and the second
                    changes how the first reads. */}
                <th>מטרה</th>
                <th>גוף מימון</th>
                <th>סכום</th>
                {/* the same fact as סכום in the other unit, so it sits beside it
                    rather than at the far edge of the grid */}
                <th>אחוז</th>
                <th>מסלול</th>
                <th>לוח סילוקין</th>
                {/* one header for the paired field, so both halves are named and
                    the margin's unit is stated once instead of per row */}
                {/* One <th> over a paired cell, split on the same 1fr/56px grid the
                    pair uses, so "מרווח" sits over the מרווח box instead of trailing
                    off the end of the column. It leads ריבית now: the parts are
                    read before the total they add up to. */}
                <th>
                  <span className="lgr-th-pair">
                    <span>עוגן %</span>
                    <span className="lgr-th-pair-b">מרווח %</span>
                  </span>
                </th>
                <th>ריבית %</th>
                <th>תדירות שינוי</th>
                <th>חודשים</th>
                <th>תאריך סיום</th>
                {/* the unit lives in the header, so it is stated once instead of
                    once per row — and the figures below keep a clean right edge */}
                <th>החזר חודשי</th>
                <th />
              </tr>
            </thead>

            <AnimatePresence initial={false} mode="popLayout">
            <tbody>
              {sections.map((g) => {
                if (!g.rows.length) return null;
                const isSuretySection = g.key === "surety";

                return (
                  <Fragment key={g.key}>
                    {/* WHERE THE CLIENT'S LEDGER ENDS.
                        The guarantee block used to run on from the loans as if
                        it were a third family, and with the grand total below it
                        the eye had no reason to stop. So the mix is closed first
                        — its add-row, then a band of the page itself showing
                        through the card — and the guarantees open afterwards
                        under a heading of their own. The heading is the word and
                        nothing else: the bar below it already carries the
                        "לא נכלל בסה"כ" chip, the grand total says ללא ערבויות,
                        and every row is tagged ערב, so a sentence here was the
                        fourth statement of one fact. */}
                    {isSuretySection && (
                      <>
                        {addRow}
                        <tr className="lgr-sec-gap" aria-hidden>
                          <td colSpan={14} />
                        </tr>
                        <tr className="lgr-surety-head">
                          <td colSpan={14}>
                            <div className="lgr-surety-head-in">
                              <ShieldWarning size={14} weight="fill" />
                              <span className="lgr-surety-head-t">ערבויות</span>
                            </div>
                          </td>
                        </tr>
                      </>
                    )}
                    {g.rows.map((loan) => {
                      // THE FAMILY IS THE ROW'S, NOT THE SECTION'S. The guarantee
                      // section holds both families at once — a guaranteed
                      // mortgage is still a mortgage, and its chip, its spine and
                      // its rate thresholds all have to say so.
                      const key = famOf(loan);
                      const fam = FAMILY[key];
                      const famVars = {
                        "--fam": fam.color,
                        "--fam-text": fam.text,
                        "--fam-tint": fam.tint,
                        "--fam-tint-2": fam.tint2,
                        "--fam-line": fam.line,
                        "--fam-wash": fam.wash,
                        "--fam-ring": fam.ring,
                      } as React.CSSProperties;

                      const res = calculateLoan(loan, annualInflation);
                      const dirty = dirtyOf(loan);
                      const amount = Number(loan.amount) || 0;
                      const months = Number(loan.months) || 0;
                      const end = parseDate(loan.loan_end_date ?? loan.end_date);
                      // a priced row with no term cannot be amortized at all
                      const noTerm = amount > 0 && months <= 0;
                      // an already-elapsed end date is stale data, not a blocker
                      const stale = !!end && end < today;
                      const flag = noTerm ? "err" : stale ? "warn" : undefined;
                      // A guarantee is no share of the mix, because it is not in
                      // the mix — the column says so rather than quoting a
                      // percentage of a total this row is not part of.
                      const share = isSuretySection || !denom ? 0 : (amount / denom) * 100;
                      const heat = rateHeat(loan.rate, key);
                      // Who the debt is with. Null on a hand-added row, which is
                      // exactly the distinction the column is there to draw:
                      // a named lender means the row is imported fact.
                      const lender = loan.source_bank ? lenderOf(loan.source_bank) : null;

                      return (
                        <motion.tr
                          key={loan.id}
                          layout="position"
                          className="lgr-row"
                          style={famVars}
                          data-flag={flag}
                          data-surety={isSuretySection || undefined}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={settle}
                        >
                          {/* --- סוג: spine + the family control --- */}
                          <td>
                            <Select
                              variant="chip"
                              value={key}
                              onChange={(v) => patch(loan.id, { group: v as DebtGroup })}
                              ariaLabel="סוג ההתחייבות"
                              minWidth={148}
                              options={ORDER.map((k) => ({
                                value: k,
                                label: FAMILY[k].label,
                                icon: FAM_ICON[k],
                                tone: FAMILY[k].color,
                              }))}
                            />
                            <div className="lgr-share mt-0.5" title={`${share.toFixed(1)}% מהתמהיל`}>
                              <span style={{ width: `${Math.min(100, share)}%` }} />
                            </div>
                          </td>

                          {/* --- מטרה: WHAT THE MONEY WAS FOR ---
                              Read, never edited: this is the document's claim,
                              and a purpose typed over it would be indistinguish-
                              able from one the bank printed.

                              The wording is the source's own, because the four
                              lenders each have their own and an advisor is
                              reading against the letter in front of them —
                              "רכישת דירה יד שניה" from מזרחי, "הלוואה לדיור
                              לרכישה" from הפועלים, "לווה פרטי-מגורים" from
                              לאומי. A חיווי אשראי row carries the report's much
                              coarser 201-017 instead, and a hand-added row
                              carries nothing at all, which the dash says.

                              זכאות rides here as a tag rather than a column of
                              its own: it is a different axis (whose money) but
                              it only ever qualifies a purpose, and it is true of
                              a handful of tranches in a file. */}
                          <td>
                            {loan.source_purpose ? (
                              <span className="lgr-purpose" title={loan.source_purpose}>
                                {loan.source_purpose}
                              </span>
                            ) : (
                              <span className="lgr-purpose-none">—</span>
                            )}
                            {loan.source_eligibility && (
                              <span className="lgr-purpose-tag">זכאות</span>
                            )}
                          </td>

                          {/* --- גוף מימון: WHERE THE ROW CAME FROM ---
                              The report names its own sources, one per
                              transaction block, and until now the only thing on
                              screen was a 14px disc riding inside the amount
                              cell with the full legal name on hover. That works
                              for the five banks an advisor can recognise blind
                              and for nobody else: a third of the rows in a real
                              חיווי אשראי come from מימון ישיר, כלמוביל, טריא or
                              a card company, none of which have a mark anyone
                              knows, and a hover is not a reading.

                              So the lender is a column, and the mark went back
                              to being a bullet beside its own name. Under it,
                              when there is something to say, the kind of body it
                              is and how the client is attached to the debt —
                              both facts about provenance, which is what this
                              column is. Banks say nothing there: "בנק" under
                              "לאומי" is a line spent on nothing.

                              A row with no lender is a row somebody typed. The
                              dash says so, which the grid could not before. */}
                          <td>
                            {lender ? (
                              <div className="lgr-lender" title={lender.full}>
                                <span className="lgr-lender-id">
                                  <BankIcon source={loan.source_bank} size={18} />
                                  <span className="lgr-lender-name">{lender.name}</span>
                                </span>
                                {(lender.kindLabel || loan.is_guarantor || loan.is_shared) && (
                                  <span className="lgr-lender-meta">
                                    {lender.kindLabel && (
                                      <span className="lgr-lender-kind">{lender.kindLabel}</span>
                                    )}
                                    {loan.is_guarantor && (
                                      <span
                                        className="lgr-tag"
                                        style={{ background: FAMILY.loan.tint, color: FAMILY.loan.text }}
                                        title="הלקוח ערב לחוב הזה — הוא לא מחזיר אותו"
                                      >
                                        ערב
                                      </span>
                                    )}
                                    {loan.is_shared && (
                                      <span
                                        className="lgr-tag"
                                        style={{ background: "var(--primary-tint)", color: "var(--primary-deep)" }}
                                        title="החוב מופיע בשני הדוחות — נספר פעם אחת"
                                      >
                                        משותף
                                      </span>
                                    )}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="lgr-lender-none" title="שורה שנוספה ידנית — אין לה מקור בדוח">
                                —
                              </span>
                            )}
                          </td>

                          {/* --- סכום --- */}
                          <td>
                            <div className="lgr-well" data-dirty={dirty.has("amount") || undefined}>
                              <input
                                className="lgr-cell lgr-num-in font-bold"
                                value={amount ? amount.toLocaleString("he-IL") : ""}
                                placeholder="0"
                                aria-label="סכום"
                                inputMode="numeric"
                                onFocus={(e) => e.currentTarget.select()}
                                onChange={(e) =>
                                  patch(loan.id, { amount: Number(e.target.value.replace(/[^\d]/g, "")) || 0 })
                                }
                              />
                            </div>
                          </td>

                          {/* --- אחוז: the same money, expressed against גובה
                              התמהיל. Derived, never stored — a percent column
                              that is saved alongside the amount it describes is
                              a second copy of one fact, and the two drift the
                              moment either is edited on its own. --- */}
                          <td>
                            {canWritePct ? (
                              <div className="lgr-well" data-dirty={dirty.has("amount") || undefined}>
                                <input
                                  className="lgr-cell lgr-num-in"
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  placeholder="0.0"
                                  aria-label="אחוז מגובה התמהיל"
                                  title="אחוז מגובה התמהיל — הקלדה כאן קובעת את הסכום"
                                  value={
                                    pctDraft?.id === loan.id
                                      ? pctDraft.text
                                      : share
                                        ? share.toFixed(1)
                                        : ""
                                  }
                                  onFocus={(e) => e.currentTarget.select()}
                                  onChange={(e) => {
                                    setPctDraft({ id: loan.id, text: e.target.value });
                                    setPct(loan.id, e.target.value);
                                  }}
                                  onBlur={() => setPctDraft(null)}
                                />
                              </div>
                            ) : (
                              <span
                                className="lgr-pct-ro"
                                title={
                                  isBase
                                    ? "חלקו של המסלול במשכנתא הקיימת"
                                    : "הזינו גובה תמהיל כדי לשייך באחוזים"
                                }
                              >
                                {share ? `${share.toFixed(1)}%` : "—"}
                              </span>
                            )}
                          </td>

                          {/* --- מסלול --- */}
                          <td>
                            <div className="lgr-well" data-dirty={dirty.has("path_id") || undefined}>
                              <Select
                                value={loan.path_id}
                                onChange={(v) => patch(loan.id, { path_id: Number(v) })}
                                options={paths.map((p) => ({
                                  value: p.id,
                                  label: PATH_SHORT[p.id] ?? p.name,
                                  dot: TRACK_HEX[p.id],
                                }))}
                                ariaLabel="מסלול"
                                minWidth={150}
                              />
                            </div>
                          </td>

                          {/* --- לוח סילוקין --- */}
                          <td>
                            <div className="lgr-well" data-dirty={dirty.has("amortization_schedule_id") || undefined}>
                              <Select
                                value={loan.amortization_schedule_id}
                                onChange={(v) => patch(loan.id, { amortization_schedule_id: Number(v) })}
                                options={schedules.map((s) => ({ value: s.id, label: s.schedule_name }))}
                                ariaLabel="לוח סילוקין"
                              />
                            </div>
                          </td>

                          {/* --- עוגן / מרווח: two rates, both numeric ---
                              The pair is the ריבית cell that FOLLOWS it, taken
                              apart: anchor + margin = the rate. Reading order is
                              now the arithmetic's own order — the two operands,
                              then the sum — instead of the total arriving before
                              anything it is made of. Both typed, so a hand-added
                              row can price an anchor as fully as an imported one.
                              The lender's own name for the anchor is words, so it
                              stays off the grid and rides on the cell's tooltip
                              and the row's settings sheet. */}
                          <td>
                            <div
                              className="lgr-well"
                              data-dirty={dirty.has("anchor") || dirty.has("anchor_margin") || undefined}
                              // The state the wash rides on. CSS owns the border
                              // and the ink here, Motion owns the light — the two
                              // never write the same property. See lib/transitions.
                              data-flash={flashOrder(loan.id) >= 0 || undefined}
                              title={anchorTip(loan)}
                            >
                              {/* THE RING.
                                  It arrives a little larger than the field and
                                  contracts onto its border, holds, then releases
                                  outward as it fades — the shape of something
                                  landing on the box and letting go, which is
                                  what "this one just changed" looks like. The
                                  border is the right surface for it: a wash
                                  behind the digits competes with them, an
                                  outline traces the thing that changed.

                                  Keyed on the run so a second press replays it
                                  rather than leaving a finished animation
                                  mounted. */}
                              {flashOrder(loan.id) >= 0 && flash && (
                                <span
                                  key={`${loan.id}:${flash.at}`}
                                  className="lgr-flash-halo"
                                  aria-hidden
                                  style={
                                    {
                                      "--flash-delay": `${flashOrder(loan.id) * FLASH_STAGGER_MS}ms`,
                                      "--flash-dur": `${FLASH_TOTAL_MS}ms`,
                                    } as React.CSSProperties
                                  }
                                />
                              )}
                              <div className="lgr-pair">
                                {numField(loan, "anchor", "ריבית העוגן באחוזים", "0.00")}
                                {numField(loan, "anchor_margin", "מרווח מהעוגן באחוזים", "0.00")}
                              </div>
                              {/* What the document said, beside what the anchor is
                                  worth now. The field holds the current value, so
                                  the note only has to state the one it replaced —
                                  "0.97 →" reads into the box beside it. Absolute,
                                  like every other note here, so a refreshed row is
                                  never a taller row. */}
                              {loan.anchor_original !== undefined && loan.anchor_original !== null && (
                                <span className="lgr-note lgr-note-num lgr-note-was">
                                  {Number(loan.anchor_original).toFixed(2)} →
                                </span>
                              )}
                            </div>
                          </td>

                          {/* --- ריבית: the sum of the two boxes before it, and
                              it warms as the rate climbs, per family --- */}
                          <td>
                            <div className="lgr-well" data-dirty={dirty.has("rate") || undefined}>
                              <input
                                className="lgr-cell lgr-num-in"
                                type="number"
                                step="0.01"
                                min={0}
                                aria-label="ריבית באחוזים"
                                data-heat={heat ?? undefined}
                                title={
                                  heat === "hot"
                                    ? `ריבית גבוהה ל${fam.label}`
                                    : heat === "warm"
                                      ? `ריבית גבוהה מהממוצע ל${fam.label}`
                                      : undefined
                                }
                                value={loan.rate || ""}
                                placeholder="0.00"
                                onFocus={(e) => e.currentTarget.select()}
                                onChange={(e) => patch(loan.id, { rate: Number(e.target.value) || 0 })}
                              />
                            </div>
                          </td>

                          {/* --- תדירות שינוי, in months ---
                              A number, not a phrase: the interval is arithmetic and
                              the column is read alongside ריבית and עוגן, which are
                              also numbers. The words the documents use ("כל 5 שנים",
                              "עדכ':3 חודשים", "תדירות שינוי הריבית בחודשים") all
                              reduce to the same integer, and the human phrasing is
                              still derived from it for the database and the export.
                              Blank means the rate does not reset on a fixed cycle —
                              which the מסלול column already distinguishes between a
                              fixed rate and a variable one the document left open. */}
                          <td>
                            <div
                              className="lgr-well"
                              data-dirty={dirty.has("anchor_interval") || undefined}
                              title={freqTip(loan)}
                            >
                              <input
                                className="lgr-cell lgr-num-in"
                                type="number"
                                min={0}
                                step={1}
                                aria-label="תדירות שינוי הריבית, בחודשים"
                                placeholder="0"
                                value={loan.anchor_interval ?? ""}
                                onFocus={(e) => e.currentTarget.select()}
                                onChange={(e) => setFreq(loan.id, e.target.value)}
                              />
                              {freqNote(loan) && <span className="lgr-note">{freqNote(loan)}</span>}
                            </div>
                          </td>

                          {/* --- חודשים (synced with the end date) --- */}
                          <td>
                            <div className="lgr-well" data-dirty={dirty.has("months") || undefined}>
                              <input
                                className="lgr-cell lgr-num-in"
                                type="number"
                                min={0}
                                aria-label="מספר חודשים"
                                data-state={noTerm ? "err" : undefined}
                                value={months || ""}
                                placeholder="0"
                                onFocus={(e) => e.currentTarget.select()}
                                onChange={(e) => setTerm(loan.id, Number(e.target.value))}
                              />
                              {months > 0 && <span className="lgr-note">{(months / 12).toFixed(1)} שנ׳</span>}
                            </div>
                          </td>

                          {/* --- תאריך סיום --- */}
                          <td>
                            <div className="lgr-well" data-dirty={dirty.has("loan_end_date") || undefined}>
                              <DateField
                                value={loan.loan_end_date ?? loan.end_date}
                                onChange={(iso) => setEnd(loan.id, iso)}
                                state={stale ? "warn" : undefined}
                                hint={months > 0 ? `${months} חודשים מהיום` : "בחירת תאריך תקבע גם את מספר החודשים"}
                              />
                            </div>
                          </td>

                          {/* --- החזר חודשי (calculated: no well, but a well's box
                              so the note underneath cannot move the figure) --- */}
                          <td>
                            <div className="lgr-paycell">
                              {noTerm ? (
                                <span
                                  className="flex flex-1 items-center justify-end gap-1 px-1 text-[11.5px] font-bold"
                                  style={{ color: "var(--neg)" }}
                                  title="לשורה יש יתרה אבל אין תקופה — הזינו חודשים או תאריך סיום"
                                >
                                  <Warning size={13} weight="fill" />
                                  חסרה תקופה
                                </span>
                              ) : (
                                <Money value={res.monthlyPayment} className="lgr-pay" style={{ color: "var(--ink)" }} />
                              )}
                              {(res.isIndexed || stale) && (
                                <span className="lgr-note lgr-note-pay">
                                  {stale && <span className="lgr-note-stale">תאריך עבר</span>}
                                  {res.isIndexed && <span>צמוד מדד</span>}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* --- actions --- */}
                          <td>
                            <div className="flex items-center justify-end gap-0.5 pe-0.5">
                              <Btn
                                className="lgr-act lgr-tip"
                                data-tip="שדות נוספים"
                                aria-label="שדות נוספים"
                                aria-expanded={sheet?.id === loan.id}
                                onClick={(e) =>
                                  setSheet(
                                    sheet?.id === loan.id
                                      ? null
                                      : { id: loan.id, rect: e.currentTarget.getBoundingClientRect() }
                                  )
                                }
                              >
                                <Sliders size={14} />
                              </Btn>
                              <Btn
                                className="lgr-act lgr-tip"
                                data-tip="לוח סילוקין"
                                onClick={() => onSchedule(loan)}
                                aria-label="לוח סילוקין של השורה"
                              >
                                <TableIcon size={14} />
                              </Btn>
                              <Btn
                                className="lgr-act lgr-tip"
                                data-danger="true"
                                data-armed={armed === loan.id || undefined}
                                data-tip={armed === loan.id ? "לחצו שוב לאישור" : "מחיקה"}
                                onClick={() => (armed === loan.id ? remove(loan.id) : setArmed(loan.id))}
                                onBlur={() => setArmed((a) => (a === loan.id ? null : a))}
                                aria-label={armed === loan.id ? "אישור מחיקה" : "מחיקת השורה"}
                              >
                                <Trash size={14} weight={armed === loan.id ? "fill" : "regular"} />
                              </Btn>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}

                    {/* THE SECTION'S SUBTOTAL, under the rows it totals.
                        It used to head the group, which meant reading a sum
                        before the figures it came from and, on a section of
                        eight rows, meant the sum had scrolled away by the time
                        you reached the end of them. A total belongs after its
                        addends — the same order the grand total already sits
                        in at the foot of the table.

                        Its two figures sit in the real סכום and החזר חודשי
                        cells rather than floating in a spanned row: hand-tuned
                        widths could never land on the same pixel as the rows
                        above them, and a ledger whose three levels of total
                        each hang at a different offset is unreadable. */}
                    <tr
                      className="lgr-groupbar"
                      data-surety={isSuretySection || undefined}
                      style={isSuretySection ? SURETY_VARS : famVarsOf(g.key as DebtGroup)}
                    >
                      {/* Spans סוג + גוף מימון. A bar names a section rather
                          than describing one row, so it is not bound to the סוג
                          column's 9% — and "בערבות · 1 · לא נכלל בסה"כ" is three
                          things wide. The lender column has nothing to subtotal
                          anyway: counting distinct lenders here would be a
                          statistic nobody asked this bar for. */}
                      <td colSpan={3}>
                        <div className="lgr-groupbar-in">
                          <span className="lgr-groupbar-title">
                            {isSuretySection ? (
                              <ShieldWarning size={12} weight="fill" className="lgr-fam-ico" />
                            ) : (
                              FAM_ICON[g.key as DebtGroup]
                            )}
                            {isSuretySection ? "בערבות" : FAMILY[g.key as DebtGroup].plural}
                          </span>
                          <span className="lgr-count">{g.rows.length}</span>
                        </div>
                      </td>
                      <td>
                        <Money value={g.amount} className="lgr-groupbar-sum" />
                      </td>
                      <td>
                        <span className="lgr-pct-ro lgr-groupbar-sum">
                          {isSuretySection || !denom ? "" : `${((g.amount / denom) * 100).toFixed(0)}%`}
                        </span>
                      </td>
                      <td colSpan={7} />
                      <td>
                        <Money
                          value={g.monthly}
                          className="lgr-groupbar-sum"
                          style={{ color: isSuretySection ? "var(--lgr-2)" : FAMILY[g.key as DebtGroup].text }}
                        />
                      </td>
                      <td />
                    </tr>
                    {isSuretySection && (
                      <tr className="lgr-sec-gap" aria-hidden>
                        <td colSpan={14} />
                      </tr>
                    )}
                  </Fragment>
                );
              })}

              {/* With no guarantees the add-row still closes the list, exactly
                  as before. With them it moves up, above the break — adding a
                  row to "the mix" belongs with the mix. */}
              {!surety.rows.length && addRow}
            </tbody>
            </AnimatePresence>

            <tfoot>
              <tr>
                <td colSpan={3}>
                  <span className="lgr-total-label">
                    {surety.rows.length ? "סה״כ של הלקוח" : "סה״כ"}
                    {surety.rows.length > 0 && <em className="lgr-total-sub">ללא ערבויות</em>}
                  </span>
                </td>
                <td>
                  <Money value={grand.amount} className="lgr-total-fig" />
                </td>
                {/* Over-allocation states itself here: with a target set this
                    reads 108%, which is the same news as a negative יתרה לשיוך
                    said in the column the rows were typed in. */}
                <td>
                  <span className="lgr-pct-ro lgr-total-fig" data-over={base > 0 && grand.amount > base ? true : undefined}>
                    {denom ? `${Math.round((grand.amount / denom) * 100)}%` : ""}
                  </span>
                </td>
                <td colSpan={7}>
                  <div className="flex flex-wrap items-center gap-1.5 px-1">
                    {sections
                      .filter(
                        (g): g is { key: DebtGroup; rows: ImportedLoan[]; amount: number; monthly: number } =>
                          g.key !== "surety" && g.rows.length > 0
                      )
                      .map((g) => (
                        <span
                          key={g.key}
                          className="lgr-chip"
                          style={{
                            borderColor: FAMILY[g.key].line,
                            background: FAMILY[g.key].tint,
                            color: FAMILY[g.key].text,
                          }}
                        >
                          {FAM_ICON[g.key]}
                          {FAMILY[g.key].plural}
                          <span className="lgr-fig" style={{ opacity: 0.75 }}>
                            {denom ? Math.round((g.amount / denom) * 100) : 0}%
                          </span>
                        </span>
                      ))}
                  </div>
                </td>
                <td>
                  <Money value={grand.monthly} className="lgr-total-fig" hot />
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <Toaster toasts={toasts} onDismiss={dismissToast} />

      {sheet && sheetLoan && (
        <RowSettings
          loan={sheetLoan}
          anchorRect={sheet.rect}
          dirty={dirtyOf(sheetLoan)}
          onPatch={(next) => patch(sheetLoan.id, next)}
          onClose={() => setSheet(null)}
        />
      )}
    </section>
  );
}

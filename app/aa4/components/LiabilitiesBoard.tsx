"use client";

// The liabilities board — the BDI report's page 2 ("עסקות בהן הלקוח חייב")
// rebuilt as a live, editable surface: debts grouped by family (משכנתאות /
// הלוואות / מסגרות / עו"ש), a monthly-repayment column and a mortgage-track
// field per row, totals under every group, a combined all-liabilities strip,
// and joint-debt handling when two spouses' reports are loaded.

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  House,
  HandCoins,
  CreditCard,
  Wallet,
  Files,
  Plus,
  X,
  Check,
  LinkBreak,
  LinkSimple,
  UsersThree,
  Receipt,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import {
  CATEGORY_ORDER,
  CATEGORY_LABEL,
  rowTotals,
  parseNum,
  type LiabilityRow,
  type MatchSuggestion,
  type LiabilityCategory,
} from "@/components/credit-import";
import { groupDigits, shekel } from "../lib/calc";
import { shortBank } from "../debtTags";
import { BankBadge } from "./badges";
import { Money } from "./primitives";

const ease = [0.22, 1, 0.36, 1] as const;

export interface Persona {
  name: string;
  color: string;
}

interface Props {
  rows: LiabilityRow[];
  suggestions: MatchSuggestion[];
  personas: Persona[];
  onUpdate: (id: string, patch: Partial<LiabilityRow>) => void;
  onDelete: (id: string) => void;
  onAdd: (category: LiabilityCategory) => void;
  onMerge: (a: string, b: string) => void;
  onDismissSuggestion: (a: string, b: string) => void;
  onSplit: (id: string) => void;
}

/* ------------------------------------------------------------ category meta */

const CAT_META: Record<
  LiabilityCategory,
  { color: string; icon: React.ReactNode }
> = {
  mortgage: { color: "var(--brand)", icon: <House weight="duotone" className="size-[17px]" /> },
  loan: { color: "var(--cat-loan)", icon: <HandCoins weight="duotone" className="size-[17px]" /> },
  card: { color: "#0e8a80", icon: <CreditCard weight="duotone" className="size-[17px]" /> },
  overdraft: { color: "#5f7883", icon: <Wallet weight="duotone" className="size-[17px]" /> },
  other: { color: "#5f7883", icon: <Files weight="duotone" className="size-[17px]" /> },
};

// Column recipes per family. Loans/mortgages are amortized (rate + term feed
// the calculator); revolving families show their limit instead. All grids are
// RTL: first column is the rightmost.
const FULL = {
  mortgage: {
    cols: "grid-cols-[24px_1.35fr_1fr_0.95fr_0.52fr_0.52fr_0.9fr_58px]",
    heads: ["", "עסקה", "מסלול", "יתרת חוב", "ריבית", "חודשים", "החזר חודשי", ""],
  },
  loan: {
    cols: "grid-cols-[24px_1.75fr_0.95fr_0.52fr_0.52fr_0.9fr_58px]",
    heads: ["", "עסקה", "יתרת חוב", "ריבית", "חודשים", "החזר חודשי", ""],
  },
  card: {
    cols: "grid-cols-[1.75fr_0.8fr_0.95fr_0.9fr_58px]",
    heads: ["עסקה", "מסגרת", "יתרת חוב", "החזר חודשי", ""],
  },
} as const;
const gridOf = (c: LiabilityCategory) =>
  c === "mortgage" ? FULL.mortgage : c === "loan" ? FULL.loan : FULL.card;

/* ------------------------------------------------------------------- board */

export default function LiabilitiesBoard({
  rows,
  suggestions,
  personas,
  onUpdate,
  onDelete,
  onAdd,
  onMerge,
  onDismissSuggestion,
  onSplit,
}: Props) {
  const reduce = useReducedMotion();
  const multi = personas.length > 1;
  const totals = rowTotals(rows);

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease }}
      className="aa4-card overflow-hidden"
    >
      {/* head */}
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 md:px-6">
        <div>
          <h3 className="aa4-card-title flex items-center gap-2">
            <Receipt className="size-[18px] text-[var(--brand)]" weight="duotone" />
            עסקות בהן הלקוח חייב
          </h3>
          <p className="aa4-card-sub">
            פירוט ההתחייבויות מהדוח לפי סוג. כל שדה ניתן לעריכה ידנית, והסיכומים מתעדכנים מיד.
          </p>
        </div>
        {multi && (
          <div className="flex items-center gap-2 rounded-[var(--r-pill)] border px-3 py-1.5" style={{ borderColor: "var(--line-2)", background: "var(--surface-2)" }}>
            <UsersThree className="size-4 text-[var(--ink-3)]" />
            {personas.map((p, i) => (
              <span key={i} className="flex items-center gap-1.5 text-[11.5px] font-semibold text-[var(--ink-2)]">
                <PersonDot persona={p} size={16} />
                {p.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* cross-report merge suggestions */}
      <AnimatePresence initial={false}>
        {suggestions.map((s) => (
          <SuggestionStrip
            key={`${s.a}_${s.b}`}
            s={s}
            rows={rows}
            personas={personas}
            onMerge={onMerge}
            onDismiss={onDismissSuggestion}
          />
        ))}
      </AnimatePresence>

      {/* groups */}
      <div className="space-y-5 px-5 pb-5 pt-4 md:px-6">
        {CATEGORY_ORDER.map((cat) => {
          const catRows = rows.filter((r) => r.category === cat);
          if (!catRows.length) return null;
          return (
            <Group
              key={cat}
              category={cat}
              rows={catRows}
              multi={multi}
              personas={personas}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onSplit={onSplit}
            />
          );
        })}

        {/* manual additions */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11.5px] font-semibold text-[var(--ink-3)]">הוספה ידנית:</span>
          {(["mortgage", "loan", "card", "overdraft"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => onAdd(cat)}
              className="inline-flex items-center gap-1 rounded-[var(--r-pill)] border border-dashed px-2.5 py-1 text-[11.5px] font-semibold text-[var(--ink-2)] transition-colors hover:border-solid"
              style={{ borderColor: "var(--line-2)" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = CAT_META[cat].color)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--line-2)")}
            >
              <Plus className="size-3" style={{ color: CAT_META[cat].color }} />
              {CATEGORY_LABEL[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* combined all-liabilities summary */}
      <div
        className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t px-5 py-4 md:px-6"
        style={{
          borderColor: "var(--line)",
          background: "linear-gradient(180deg, var(--surface-2), var(--surface-3))",
        }}
      >
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-[var(--r-control)] bg-[var(--brand-tint)] text-[var(--brand-deep)]">
            <Receipt className="size-5" weight="duotone" />
          </span>
          <div>
            <div className="text-[13px] font-bold text-[var(--ink)]">סך כל ההתחייבויות</div>
            <div className="text-[11.5px] text-[var(--ink-3)]">
              {totals.count} התחייבויות
              {totals.joint > 0 && (
                <>
                  <span className="mx-1 opacity-50">·</span>
                  {totals.joint} משותפות נספרות פעם אחת
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-left">
            <div className="text-[10.5px] font-semibold text-[var(--ink-3)]">יתרת חוב כוללת</div>
            <div className="aa4-fig text-[1.4rem] font-semibold leading-tight text-[var(--ink)]">
              <Money value={totals.balance} />
            </div>
          </div>
          <div className="h-9 w-px" style={{ background: "var(--line-2)" }} />
          <div className="text-left">
            <div className="text-[10.5px] font-semibold text-[var(--ink-3)]">החזר חודשי כולל</div>
            <div className="aa4-fig text-[1.65rem] font-semibold leading-tight text-[var(--brand-deep)]">
              <Money value={totals.monthly} />
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

/* -------------------------------------------------------------------- group */

function Group({
  category,
  rows,
  multi,
  personas,
  onUpdate,
  onDelete,
  onSplit,
}: {
  category: LiabilityCategory;
  rows: LiabilityRow[];
  multi: boolean;
  personas: Persona[];
  onUpdate: Props["onUpdate"];
  onDelete: Props["onDelete"];
  onSplit: Props["onSplit"];
}) {
  const meta = CAT_META[category];
  const grid = gridOf(category);
  const totals = rowTotals(rows);
  const amortized = category === "mortgage" || category === "loan";

  return (
    <div>
      {/* group head */}
      <div className="mb-2 flex items-center gap-2.5">
        <span
          className="grid size-8 place-items-center rounded-[var(--r-control)]"
          style={{ background: `color-mix(in srgb, ${meta.color} 10%, transparent)`, color: meta.color }}
        >
          {meta.icon}
        </span>
        <span className="text-[13.5px] font-bold text-[var(--ink)]">{CATEGORY_LABEL[category]}</span>
        <span
          className="aa4-fig rounded-[var(--r-pill)] px-2 py-0.5 text-[10.5px] font-semibold"
          style={{ background: "var(--surface-3)", color: "var(--ink-2)" }}
        >
          {rows.length}
        </span>
        {amortized && (
          <span className="me-auto hidden text-[10.5px] text-[var(--ink-4)] sm:block">מסומן = נכלל במחשבון</span>
        )}
      </div>

      {/* column heads */}
      <div className={cn("grid gap-1.5 border-b px-2 pb-1.5", grid.cols)} style={{ borderColor: "var(--line)" }}>
        {grid.heads.map((h, i) => (
          <span
            key={i}
            className={cn(
              "text-[10.5px] font-semibold text-[var(--ink-3)]",
              ["ריבית", "חודשים"].includes(h) ? "text-center" : "text-right"
            )}
          >
            {h}
          </span>
        ))}
      </div>

      {/* rows */}
      <div className="mt-1 space-y-1">
        <AnimatePresence initial={false}>
          {rows.map((r) => (
            <Row
              key={r.id}
              row={r}
              grid={grid.cols}
              multi={multi}
              personas={personas}
              amortized={amortized}
              withTrack={category === "mortgage"}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onSplit={onSplit}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* group totals, aligned under the columns */}
      <div
        className={cn("mt-1 grid items-center gap-1.5 rounded-[var(--r-control)] px-2 py-2", grid.cols)}
        style={{ background: "var(--surface-2)" }}
      >
        {amortized && <span />}
        <span className="text-[11px] font-bold text-[var(--ink-2)]">סה"כ {CATEGORY_LABEL[category]}</span>
        {category === "mortgage" && <span />}
        {!amortized && <span />}
        <span className="aa4-fig px-2 text-right text-[13px] font-bold text-[var(--ink)]">
          <Money value={totals.balance} />
        </span>
        {amortized && <span />}
        {amortized && <span />}
        <span className="aa4-fig px-2 text-right text-[13px] font-bold" style={{ color: "var(--brand-deep)" }}>
          <Money value={totals.monthly} />
        </span>
        <span />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- row */

function Row({
  row,
  grid,
  multi,
  personas,
  amortized,
  withTrack,
  onUpdate,
  onDelete,
  onSplit,
}: {
  row: LiabilityRow;
  grid: string;
  multi: boolean;
  personas: Persona[];
  amortized: boolean;
  withTrack: boolean;
  onUpdate: Props["onUpdate"];
  onDelete: Props["onDelete"];
  onSplit: Props["onSplit"];
}) {
  const reduce = useReducedMotion();
  const dim = amortized && !row.include;

  return (
    <motion.div
      layout={!reduce}
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? undefined : { opacity: 0, y: -6 }}
      transition={{ duration: 0.26, ease }}
      className={cn("group/row grid items-center gap-1.5 rounded-[var(--r-control)] border px-2 py-1 [&>*]:min-w-0", grid)}
      style={{
        borderColor: row.joint ? "color-mix(in srgb, var(--pos) 30%, var(--line))" : "var(--line)",
        background: row.joint ? "color-mix(in srgb, var(--pos) 3.5%, var(--surface))" : "var(--surface)",
        opacity: dim ? 0.55 : 1,
      }}
    >
      {/* include checkbox (loans + mortgages feed the calculator) */}
      {amortized && (
        <button
          role="checkbox"
          aria-checked={row.include}
          aria-label={`הכללה במחשבון, ${shortBank(row.bank) || "שורה ידנית"}`}
          onClick={() => onUpdate(row.id, { include: !row.include })}
          className="grid size-[18px] place-items-center rounded-[6px] border transition focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--brand-tint)]"
          style={
            row.include
              ? { background: "var(--brand)", borderColor: "transparent", color: "#fff" }
              : { borderColor: "var(--line-2)", background: "var(--surface)" }
          }
        >
          {row.include && <Check className="size-3" weight="bold" />}
        </button>
      )}

      {/* identity */}
      <div className="flex items-center gap-2 py-0.5">
        {row.manual ? (
          <BankNameInput value={row.bank} onChange={(v) => onUpdate(row.id, { bank: v })} />
        ) : (
          <>
            <BankBadge source={row.bank} size={22} />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[12px] font-semibold leading-tight text-[var(--ink)]" title={row.bank}>
                {shortBank(row.bank) || row.bank}
              </span>
              <span className="truncate text-[10px] leading-tight text-[var(--ink-4)]">
                {row.typeLabel}
                {row.role === "guarantor" && " · ערב"}
              </span>
            </span>
          </>
        )}
        {multi && <OwnerDots owners={row.owners} personas={personas} joint={row.joint} />}
      </div>

      {/* track (mortgages) */}
      {withTrack && (
        <EditCell
          value={row.track}
          onChange={(v) => onUpdate(row.id, { track: v })}
          placeholder="מסלול"
          ui
          ariaLabel={`מסלול משכנתא, ${shortBank(row.bank)}`}
        />
      )}

      {/* limit (revolving) */}
      {!amortized && (
        <span className="aa4-fig px-2 text-right text-[12px] text-[var(--ink-3)]">
          {row.limit ? shekel(row.limit) : "—"}
        </span>
      )}

      {/* balance */}
      <EditCell
        value={row.balance}
        onChange={(v) => onUpdate(row.id, { balance: groupDigits(v) })}
        placeholder="0"
        ariaLabel={`יתרת חוב, ${shortBank(row.bank) || "שורה ידנית"}`}
      />

      {/* rate + months (amortized only) */}
      {amortized && (
        <EditCell
          value={row.interest}
          onChange={(v) => onUpdate(row.id, { interest: v })}
          placeholder="0"
          center
          maxLength={5}
          ariaLabel="ריבית"
        />
      )}
      {amortized && (
        <EditCell
          value={row.months}
          onChange={(v) => onUpdate(row.id, { months: v.replace(/\D/g, "") })}
          placeholder="0"
          center
          maxLength={3}
          ariaLabel="חודשים"
        />
      )}

      {/* monthly repayment */}
      <div className="border-s ps-1.5" style={{ borderColor: "var(--line)" }}>
        <EditCell
          value={row.monthly}
          onChange={(v) => onUpdate(row.id, { monthly: groupDigits(v) })}
          placeholder="0"
          strong
          ariaLabel={`החזר חודשי, ${shortBank(row.bank) || "שורה ידנית"}`}
        />
      </div>

      {/* actions */}
      <div className="flex items-center justify-end gap-0.5">
        {row.joint && (
          <button
            onClick={() => onSplit(row.id)}
            className="aa4-iconbtn"
            aria-label="הפרדת עסקה משותפת"
            title="הפרדה לשתי שורות"
          >
            <LinkBreak className="size-3.5" />
          </button>
        )}
        <button
          onClick={() => onDelete(row.id)}
          className="aa4-iconbtn opacity-0 transition-opacity focus-visible:opacity-100 group-hover/row:opacity-100"
          aria-label="מחיקת שורה"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------- pieces */

function EditCell({
  value,
  onChange,
  placeholder,
  center = false,
  strong = false,
  ui = false,
  maxLength,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  center?: boolean;
  strong?: boolean;
  ui?: boolean;
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
      className={cn(
        "aa4-ledger-input",
        center ? "text-center" : "text-right",
        strong && "font-semibold",
        ui && "!font-[family-name:var(--font-ui)] text-[12px]"
      )}
    />
  );
}

function BankNameInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="שם הבנק / הגורם"
      aria-label="שם הבנק"
      className="aa4-ledger-input !font-[family-name:var(--font-ui)] text-[12px] font-semibold"
    />
  );
}

export function PersonDot({ persona, size = 18 }: { persona: Persona; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-bold text-white"
      style={{ width: size, height: size, background: persona.color, fontSize: size * 0.52 }}
      title={persona.name}
    >
      {persona.name.charAt(0)}
    </span>
  );
}

function OwnerDots({
  owners,
  personas,
  joint,
}: {
  owners: number[];
  personas: Persona[];
  joint: boolean;
}) {
  return (
    <span className="ms-auto flex shrink-0 items-center gap-1 ps-1">
      <span className="flex -space-x-1.5 space-x-reverse">
        {owners.map((o) =>
          personas[o] ? (
            <span key={o} className="rounded-full ring-2 ring-[var(--surface)]">
              <PersonDot persona={personas[o]} size={17} />
            </span>
          ) : null
        )}
      </span>
      {joint && (
        <span
          className="rounded-[var(--r-pill)] px-1.5 py-px text-[9px] font-bold"
          style={{ background: "var(--pos-tint)", color: "var(--pos-strong)" }}
        >
          משותף
        </span>
      )}
    </span>
  );
}

/* -------------------------------------------------- duplicate suggestions -- */

function SuggestionStrip({
  s,
  rows,
  personas,
  onMerge,
  onDismiss,
}: {
  s: MatchSuggestion;
  rows: LiabilityRow[];
  personas: Persona[];
  onMerge: (a: string, b: string) => void;
  onDismiss: (a: string, b: string) => void;
}) {
  const reduce = useReducedMotion();
  const a = rows.find((r) => r.id === s.a);
  const b = rows.find((r) => r.id === s.b);
  if (!a || !b) return null;
  const amber = "#bf7d17";
  return (
    <motion.div
      layout={!reduce}
      initial={reduce ? false : { opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={reduce ? undefined : { opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease }}
      className="overflow-hidden"
    >
      <div
        className="mx-5 mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[var(--r-control)] border px-3 py-2.5 md:mx-6"
        style={{
          borderColor: `color-mix(in srgb, ${amber} 35%, var(--line))`,
          background: `color-mix(in srgb, ${amber} 6%, var(--surface))`,
        }}
      >
        <LinkSimple className="size-4 shrink-0" style={{ color: amber }} />
        <span className="min-w-0 flex-1 text-[12px] text-[var(--ink-2)]">
          <b className="font-bold text-[var(--ink)]">אולי אותה עסקה?</b> {shortBank(a.bank)} ·{" "}
          {a.typeLabel || CATEGORY_LABEL[a.category]}
          <span className="aa4-fig mx-1.5 font-semibold text-[var(--ink)]" dir="ltr">
            {a.balance || "0"} / {b.balance || "0"} ₪
          </span>
          מופיעה בשני הדוחות
          {personas[a.owners[0]] && personas[b.owners[0]] && (
            <span className="text-[var(--ink-3)]">
              {" "}
              ({personas[a.owners[0]].name} + {personas[b.owners[0]].name})
            </span>
          )}
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          <button onClick={() => onMerge(s.a, s.b)} className="aa4-btn aa4-btn-soft !px-2.5 !py-1 !text-[11.5px]">
            <LinkSimple className="size-3.5" />
            אחדו לעסקה משותפת
          </button>
          <button onClick={() => onDismiss(s.a, s.b)} className="aa4-btn aa4-btn-ghost !px-2.5 !py-1 !text-[11.5px]">
            עסקות נפרדות
          </button>
        </div>
      </div>
    </motion.div>
  );
}

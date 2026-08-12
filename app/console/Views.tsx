"use client";

// The five screens. Each is a projection of the same two models — the visit
// (someone sat down) and the action (someone produced something) — so a name
// means the same thing wherever you find it.

import { useMemo, useState } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import type { SimEvent } from "@/app/simulator/lib/telemetry";
import type { Action, Dashboard, LeadRow, OperatorRow, Visit } from "./aggregate";
import ActivityAxis from "./charts/ActivityAxis";
import ActionsAxis from "./charts/ActionsAxis";
import Volume, { VOLUME_SERIES } from "./charts/Volume";
import Rhythm from "./charts/Rhythm";
import { Funnel, RankBars } from "./charts/Bars";
import DataTable from "./ui/DataTable";
import VisitDrawer from "./ui/VisitDrawer";
import ActionDrawer from "./ui/ActionDrawer";
import { Badge, Segmented, SegmentedItem } from "./ui/kit";
import { Awaiting, Dial, Empty, Legend, Panel, Readout, Trail, ViewFade, Who } from "./ui/parts";
import { ACTION, OUTCOME, SERIES } from "./lib/tokens";
import {
  bankLabel,
  DENY_LABEL,
  duration,
  EVENT_LABEL,
  feedLine,
  KIND_LABEL,
  ms,
  nis,
  num,
} from "./lib/labels";
import { ago, DOW_HE, stamp, zoned } from "./lib/time";

/* ================================================================ shared */

/** The mark from the chart, inline, so the key never has to be consulted. */
function Mark({ kind }: { kind: Action["kind"] }) {
  const skin = ACTION[kind];
  return (
    <i
      aria-hidden
      className="flex-none"
      style={{
        background: skin.fill,
        ...(skin.shape === "dot"
          ? { width: 9, height: 9, borderRadius: 99 }
          : skin.shape === "diamond"
            ? { width: 8, height: 8, borderRadius: 1.5, transform: "rotate(45deg)" }
            : { width: 4, height: 12, borderRadius: 2 }),
      }}
    />
  );
}

function ActionCell({ kind }: { kind: Action["kind"] }) {
  return (
    <span className="inline-flex items-center gap-2 text-cns-fg">
      <Mark kind={kind} />
      {ACTION[kind].label}
    </span>
  );
}

/* =================================================================== work */

const ah = createColumnHelper<Action>();

const actionColumns = [
  ah.accessor("ts", { header: "מתי", cell: (c) => <span className="cns-num">{stamp(c.getValue())}</span> }),
  ah.accessor("operator", { header: "נציג", cell: (c) => <Who name={c.getValue()} /> }),
  ah.accessor("lead", {
    header: "לקוח",
    cell: (c) => <span className="font-medium text-cns-fg">{c.getValue()}</span>,
  }),
  ah.accessor((r) => r.client ?? "—", { id: "client", header: "שם בדוח" }),
  ah.accessor((r) => ACTION[r.kind].label, {
    id: "kind",
    header: "פעולה",
    cell: (c) => <ActionCell kind={c.row.original.kind} />,
  }),
  ah.accessor((r) => (r.docKind ? KIND_LABEL[r.docKind] ?? r.docKind : "—"), {
    id: "doc",
    header: "מסמך",
  }),
  ah.accessor((r) => r.pages ?? 0, {
    id: "pages",
    header: "עמ׳",
    cell: (c) => <span className="cns-num">{c.getValue() || "—"}</span>,
  }),
  ah.accessor((r) => r.rows ?? 0, {
    id: "rows",
    header: "שורות",
    cell: (c) => <span className="cns-num">{c.getValue() || "—"}</span>,
  }),
  ah.accessor((r) => r.balance ?? 0, {
    id: "balance",
    header: "יתרה",
    cell: (c) => <span className="cns-num">{nis(c.getValue())}</span>,
  }),
  ah.accessor((r) => r.parseMs ?? 0, {
    id: "parse",
    header: "פענוח",
    cell: (c) => <span className="cns-num">{ms(c.getValue())}</span>,
  }),
  ah.accessor((r) => bankLabel(r.bank), { id: "bank", header: "בנק" }),
] as ColumnDef<Action, any>[];

const KIND_TABS = [
  { key: "all", label: "הכל" },
  { key: "import", label: "ייבוא" },
  { key: "export", label: "אקסל" },
  { key: "save", label: "שמירה" },
  { key: "failed", label: "נכשל" },
] as const;

/**
 * The screen the console opens on: what people are doing with the simulator —
 * reports in, spreadsheets out — as a list first and a clock second.
 */
export function Work({ data }: { data: Dashboard }) {
  const [picked, setPicked] = useState<Action | null>(null);
  const [kind, setKind] = useState<(typeof KIND_TABS)[number]["key"]>("all");

  const [from, to] = useMemo(() => {
    const end = +new Date(data.generatedAt);
    return [end - data.days * 86_400_000, end];
  }, [data.days, data.generatedAt]);

  const rows = useMemo(
    () => (kind === "all" ? data.actions : data.actions.filter((a) => a.kind === kind)),
    [data.actions, kind]
  );

  const k = data.kpis;

  // Who is doing the most, and how much of the log arrived with no name on it —
  // the second number matters because an unnamed action cannot be attributed.
  const busiest = data.byOperator
    .filter((o) => o.operator !== "לא מזוהה")
    .reduce<OperatorRow | null>(
      (best, o) => (!best || o.imports + o.saves > best.imports + best.saves ? o : best),
      null
    );
  const unnamed = data.actions.filter((a) => a.operator === "לא מזוהה").length;

  return (
    <ViewFade k="work">
      <Readout>
        <Dial
          label="ייבוא דוחות"
          value={k.importsWindow}
          mark={<Mark kind="import" />}
          hint={`${num(k.importsToday)} היום`}
        />
        <Dial label="ייצוא אקסל" value={k.exportsWindow} mark={<Mark kind="export" />} />
        <Dial label="שמירות תמהיל" value={k.savesWindow} mark={<Mark kind="save" />} />
        <Dial
          label="נציגים"
          value={k.uniqueOperators}
          hint={busiest ? `הכי פעיל · ${busiest.operator}` : `${num(k.uniqueLeads)} לקוחות`}
        />
        <Dial
          label="לקוחות"
          value={k.uniqueLeads}
          hint={k.failureRatePct ? `${k.failureRatePct}% כשלי פענוח` : undefined}
        />
      </Readout>

      {unnamed ? (
        <div className="flex items-start gap-3 rounded-xl border border-cns-warn/25 bg-cns-warn/8 px-4 py-3 text-[12.5px] leading-relaxed text-[#7a5406]">
          <span className="cns-dot mt-[7px]" data-tone="warn" />
          <span>
            <b className="font-semibold">{num(unnamed)} פעולות בלי שם נציג.</b> הכפתור
            בפיירברי מעביר את בעל הרשומה בפרמטר{" "}
            <code className="cns-num rounded bg-[#7a5406]/10 px-1 text-[11.5px]">?u=</code> — כניסות
            מכפתור בגרסה ישנה נרשמות כ״לא מזוהה״.
          </span>
        </div>
      ) : null}

      {/* The list comes first: it is the thing that gets read every morning. */}
      <Panel
        title="כל הפעולות"
        hint={`${num(rows.length)} מתוך ${num(data.actions.length)} בחלון`}
        flush
        action={
          <Segmented>
            {KIND_TABS.map((t) => (
              <SegmentedItem key={t.key} active={kind === t.key} onClick={() => setKind(t.key)}>
                {t.label}
              </SegmentedItem>
            ))}
          </Segmented>
        }
      >
        <DataTable
          data={rows}
          columns={actionColumns}
          searchPlaceholder="חיפוש לפי נציג, לקוח או שם בדוח…"
          csvName="actions"
          pageSize={12}
          maxHeight={520}
          onRowClick={setPicked}
          groupBy={(a) => `${DOW_HE[zoned(a.ts).dow]} · ${zoned(a.ts).dm}`}
          empty={
            <Empty
              title="שקט"
              body="אף דוח לא יובא ואף אקסל לא יוצא בחלון הזה."
            />
          }
        />
      </Panel>

      <Panel
        title="מה נעשה, על ציר הזמן"
        hint="שורה לכל נציג · כל סימן הוא פעולה אחת"
        action={
          <Legend
            items={(["import", "export", "save", "failed"] as const).map((key) => ({
              key,
              label: ACTION[key].label,
              color: ACTION[key].fill,
              shape: ACTION[key].shape,
            }))}
          />
        }
      >
        {data.actionLanes.length ? (
          <ActionsAxis
            lanes={data.actionLanes}
            windowStart={from}
            windowEnd={to}
            onPick={setPicked}
          />
        ) : (
          <Empty
            title="עוד לא נעשתה פעולה"
            body="כל דוח שייגרר לבורד וכל קובץ אקסל שייוצא יופיעו כאן, על ציר הזמן, לפי הנציג שביצע אותם."
          />
        )}
      </Panel>

      <ActionDrawer action={picked} onClose={() => setPicked(null)} />
    </ViewFade>
  );
}

/* =============================================================== activity */

const vh = createColumnHelper<Visit>();

const visitColumns = [
  vh.accessor("start", { header: "מתי", cell: (c) => <span className="cns-num">{stamp(c.getValue())}</span> }),
  vh.accessor("operator", { header: "נציג", cell: (c) => <Who name={c.getValue()} /> }),
  vh.accessor("lead", {
    header: "לקוח",
    cell: (c) => <span className="font-medium text-cns-fg">{c.getValue()}</span>,
  }),
  vh.accessor((r) => r.clients.join(" · "), {
    id: "clients",
    header: "שם בדוח",
    cell: (c) => c.getValue() || "—",
  }),
  vh.accessor("minutes", {
    header: "משך",
    cell: (c) => <span className="cns-num">{duration(c.getValue())}</span>,
  }),
  vh.accessor("outcome", {
    header: "תוצאה",
    cell: (c) => {
      const o = c.getValue() as Visit["outcome"];
      return (
        <Badge variant={o === "failed" ? "bad" : o === "saved" ? "good" : "secondary"}>
          <i
            aria-hidden
            className="size-[7px] flex-none rounded-full"
            style={{ background: OUTCOME[o].fill }}
          />
          {OUTCOME[o].label}
        </Badge>
      );
    },
  }),
  vh.accessor((r) => r.trail.map((t) => t.label).join(" ← "), {
    id: "trail",
    header: "מה נעשה, לפי הסדר",
    enableSorting: false,
    cell: (c) => (
      <div className="max-w-[520px] whitespace-normal">
        <Trail steps={c.row.original.trail} />
      </div>
    ),
  }),
] as ColumnDef<Visit, any>[];

export function Activity({ data }: { data: Dashboard }) {
  const [picked, setPicked] = useState<Visit | null>(null);

  const [from, to] = useMemo(() => {
    const end = +new Date(data.generatedAt);
    return [end - data.days * 86_400_000, end];
  }, [data.days, data.generatedAt]);

  return (
    <ViewFade k="activity">
      <Panel title="ביקורים" hint={`${num(data.visits.length)} ישיבות עבודה בחלון`} flush>
        <DataTable
          data={data.visits}
          columns={visitColumns}
          searchPlaceholder="חיפוש לפי נציג, לקוח או שם בדוח…"
          csvName="visits"
          pageSize={12}
          maxHeight={520}
          onRowClick={setPicked}
          empty={<Empty body="אין ביקורים בחלון הזה." />}
        />
      </Panel>

      <Panel
        title="ציר הביקורים"
        hint="שורה לכל נציג · כל גלולה היא ישיבה אחת · לחיצה פותחת את הפירוט"
        action={
          <Legend
            items={(["browsed", "imported", "saved", "failed"] as const).map((o) => ({
              key: o,
              label: OUTCOME[o].label,
              color: OUTCOME[o].fill,
            }))}
          />
        }
      >
        {data.lanes.length ? (
          <ActivityAxis lanes={data.lanes} windowStart={from} windowEnd={to} onPick={setPicked} />
        ) : (
          <Empty
            title="אין ביקורים בחלון הזה"
            body="ציר הביקורים מצייר שורה לכל נציג ברגע שמישהו נכנס לבורד דרך פיירברי."
          />
        )}
      </Panel>

      <VisitDrawer visit={picked} onClose={() => setPicked(null)} />
    </ViewFade>
  );
}

/* =============================================================== overview */

export function Overview({ data }: { data: Dashboard }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const toggle = (key: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      // Never let the last series be switched off — an empty plot is not a
      // state anyone meant to reach.
      if (next.has(key)) next.delete(key);
      else if (next.size < VOLUME_SERIES.length - 1) next.add(key);
      return next;
    });

  const k = data.kpis;

  return (
    <ViewFade k="overview">
      <Readout>
        <Dial label="ייבואים היום" value={k.importsToday} />
        <Dial label={`ייבואים · ${data.days} ימים`} value={k.importsWindow} />
        <Dial
          label="ביקורים"
          value={k.visitsWindow}
          hint={k.activeMinutes ? `${duration(k.activeMinutes)} עבודה` : undefined}
        />
        <Dial label="שמירות תמהיל" value={k.savesWindow} />
        <Dial
          label="כשלי פענוח"
          value={k.failureRatePct == null ? "—" : k.failureRatePct}
          suffix={k.failureRatePct == null ? undefined : "%"}
          tone={k.failureRatePct != null && k.failureRatePct > 10 ? "bad" : undefined}
          hint={k.medianParseMs != null ? `חציון ${ms(k.medianParseMs)}` : undefined}
        />
      </Readout>

      <Panel
        title="נפח פעולות"
        hint="כל פעולה שנרשמה בבורד, לפי יום"
        action={
          <Legend
            items={VOLUME_SERIES.map((s) => ({ key: s.key, label: s.label, color: s.color }))}
            hidden={hidden}
            onToggle={toggle}
          />
        }
      >
        <Volume daily={data.daily} hidden={hidden} />
      </Panel>

      <div className="grid grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] gap-3.5">
        <Panel title="מקצב השבוע" hint="מתי בפועל עובדים על הבורד — שעון ישראל">
          <Rhythm cells={data.rhythm} />
        </Panel>
        <Panel title="מסלול העבודה" hint="כמה מהביקורים הגיעו לכל שלב">
          <Funnel stages={data.funnel} />
        </Panel>
      </div>

      <div className="grid grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] gap-3.5">
        <Panel title="מי משתמש בכלי" hint="ייבואים ושמירות לנציג">
          <RankBars
            rows={data.byOperator
              .map((o) => ({ label: o.operator, value: o.imports + o.saves }))
              .sort((a, b) => b.value - a.value)}
            empty="עוד לא זוהה אף נציג."
          />
        </Panel>
        <Panel title="לפי סוג מסמך" hint="חיווי אשראי מול דוח בנק">
          <RankBars
            rows={data.byKind.map((b) => ({ label: KIND_LABEL[b.kind] ?? b.kind, value: b.imports }))}
            empty="עוד לא יובאו מסמכים."
            color={SERIES.saves}
          />
        </Panel>
      </div>

      <Panel title="מה קרה עכשיו" hint="האירועים האחרונים" flush>
        {data.feed.length ? (
          <ul className="max-h-[340px] overflow-y-auto">
            {data.feed.slice(0, 22).map((e, i) => (
              <li
                key={`${e.ts}-${i}`}
                className="grid grid-cols-[74px_8px_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-cns-line px-4 py-2 text-[12.5px] last:border-0 hover:bg-cns-muted/70"
              >
                <span className="cns-num text-[10.5px] whitespace-nowrap text-cns-mutedfg">
                  {ago(e.ts, +new Date(data.generatedAt))}
                </span>
                <span
                  className={
                    "size-1.5 rounded-full " +
                    (e.ok === false || e.event === "door_denied" || e.event === "error"
                      ? "bg-cns-bad"
                      : "bg-cns-accent/60")
                  }
                />
                <span className="truncate text-cns-fg2">{feedLine(e)}</span>
                <span className="cns-num text-[10.5px] whitespace-nowrap text-cns-mutedfg">
                  {stamp(e.ts)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty body="שקט מוחלט בחלון הזה." />
        )}
      </Panel>
    </ViewFade>
  );
}

/* ================================================================= people */

const oh = createColumnHelper<OperatorRow>();
const operatorColumns = [
  oh.accessor("operator", { header: "נציג", cell: (c) => <Who name={c.getValue()} /> }),
  oh.accessor("visits", { header: "ביקורים", cell: (c) => <span className="cns-num">{num(c.getValue())}</span> }),
  oh.accessor("leads", { header: "לקוחות", cell: (c) => <span className="cns-num">{num(c.getValue())}</span> }),
  oh.accessor("imports", { header: "ייבואים", cell: (c) => <span className="cns-num">{num(c.getValue())}</span> }),
  oh.accessor("saves", { header: "שמירות", cell: (c) => <span className="cns-num">{num(c.getValue())}</span> }),
  oh.accessor("minutes", { header: "זמן עבודה", cell: (c) => <span className="cns-num">{duration(c.getValue())}</span> }),
  oh.accessor("errors", {
    header: "כשלים",
    cell: (c) =>
      c.getValue() ? <Badge variant="bad">{num(c.getValue())}</Badge> : <span className="text-cns-mutedfg">—</span>,
  }),
  oh.accessor("lastSeen", { header: "לאחרונה", cell: (c) => <span className="cns-num">{stamp(c.getValue())}</span> }),
] as ColumnDef<OperatorRow, any>[];

const lh = createColumnHelper<LeadRow>();
const leadColumns = [
  lh.accessor("lead", {
    header: "לקוח",
    cell: (c) => <span className="font-medium text-cns-fg">{c.getValue()}</span>,
  }),
  lh.accessor((r) => r.leadId ?? "", { id: "leadId", header: "מזהה", cell: (c) => <span className="cns-num">{c.getValue() || "—"}</span> }),
  lh.accessor((r) => r.clients.join(" · "), { id: "clients", header: "שמות בדוחות", cell: (c) => c.getValue() || "—" }),
  lh.accessor((r) => r.operators.join(" · "), { id: "ops", header: "טופל בידי", cell: (c) => c.getValue() || "—" }),
  lh.accessor("imports", { header: "ייבואים", cell: (c) => <span className="cns-num">{num(c.getValue())}</span> }),
  lh.accessor("saves", { header: "שמירות", cell: (c) => <span className="cns-num">{num(c.getValue())}</span> }),
  lh.accessor("lastSeen", { header: "לאחרונה", cell: (c) => <span className="cns-num">{stamp(c.getValue())}</span> }),
] as ColumnDef<LeadRow, any>[];

export function People({ data }: { data: Dashboard }) {
  return (
    <ViewFade k="people">
      <Readout>
        <Dial label="נציגים פעילים" value={data.kpis.uniqueOperators} />
        <Dial label="לקוחות" value={data.kpis.uniqueLeads} />
        <Dial label="ביקורים" value={data.kpis.visitsWindow} />
        <Dial label="זמן עבודה" value={duration(data.kpis.activeMinutes)} />
      </Readout>

      <Panel title="נציגים" hint="השם מגיע מכפתור פיירברי שדרכו נכנסו" flush>
        <DataTable
          data={data.byOperator}
          columns={operatorColumns}
          searchPlaceholder="חיפוש נציג…"
          csvName="operators"
          pageSize={10}
          empty={
            <Empty
              title="עוד לא זוהו נציגים"
              body="הכפתור בפיירברי מעביר את שם בעל הרשומה בפרמטר ‎?u=‎. כניסות מכפתור ישן יופיעו כ״לא מזוהה״."
            />
          }
        />
      </Panel>

      <Panel title="לקוחות" hint="לפי פעילות אחרונה" flush>
        <DataTable
          data={data.byLead}
          columns={leadColumns}
          searchPlaceholder="חיפוש לקוח או שם בדוח…"
          csvName="leads"
          pageSize={12}
          empty={<Empty body="אף לקוח לא נפתח בבורד בחלון הזה." />}
        />
      </Panel>
    </ViewFade>
  );
}

/* ================================================================= health */

// The failure log is the one table that still reads raw events: a denied door
// never became a visit and a broken import never became an action, so there is
// no richer model to project them through.
const eh = createColumnHelper<SimEvent>();

const errorColumns = [
  eh.accessor("ts", { header: "מתי", cell: (c) => <span className="cns-num">{stamp(c.getValue())}</span> }),
  eh.accessor((r) => EVENT_LABEL[r.event] ?? r.event, { id: "event", header: "אירוע" }),
  eh.accessor((r) => r.operator || "—", { id: "operator", header: "נציג" }),
  eh.accessor((r) => r.lead_name || (r.lead_id ? `ליד ${r.lead_id}` : "—"), { id: "lead", header: "לקוח" }),
  eh.accessor((r) => r.file_name || "—", { id: "file", header: "קובץ" }),
  eh.accessor((r) => (r.error ? DENY_LABEL[r.error] ?? r.error : "—"), {
    id: "error",
    header: "פירוט",
    cell: (c) => <span className="text-cns-bad">{c.getValue()}</span>,
  }),
] as ColumnDef<SimEvent, any>[];

export function Health({
  data,
  sources,
}: {
  data: Dashboard;
  sources: { supabase: boolean; file: boolean };
}) {
  const denials = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of data.errors) {
      if (e.event !== "door_denied") continue;
      const key = DENY_LABEL[e.error ?? ""] ?? e.error ?? "לא ידוע";
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return Array.from(m.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [data.errors]);

  const store = sources.supabase
    ? { tone: "good" as const, text: "Supabase — טבלת sim_events" }
    : sources.file
      ? { tone: "warn" as const, text: "קובץ מקומי — הטבלה טרם חוברה" }
      : { tone: undefined, text: "אין מקור פעיל" };

  return (
    <ViewFade k="health">
      <Readout>
        <Dial
          label="כשלים בחלון"
          value={data.kpis.errorsWindow}
          tone={data.kpis.errorsWindow ? "bad" : "good"}
        />
        <Dial label="כניסות שנדחו" value={data.kpis.deniedWindow} />
        <Dial
          label="שיעור כשל"
          value={data.kpis.failureRatePct == null ? "—" : data.kpis.failureRatePct}
          suffix={data.kpis.failureRatePct == null ? undefined : "%"}
          tone={data.kpis.failureRatePct != null && data.kpis.failureRatePct > 10 ? "bad" : undefined}
        />
        <Dial label="פענוח חציוני" value={data.kpis.medianParseMs == null ? "—" : ms(data.kpis.medianParseMs)} />
      </Readout>

      <div className="grid grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] gap-3.5">
        <Panel title="למה כניסות נדחו" hint="קישור שנחסם לפני שהפך לביקור">
          <RankBars rows={denials} empty="אף כניסה לא נדחתה — כמו שצריך." color="var(--cns-bad)" />
        </Panel>
        <Panel title="מקור הנתונים" hint="מאיפה המסך הזה קורא">
          <div className="flex flex-col gap-3.5">
            <div className="grid grid-cols-[8px_minmax(0,1fr)] items-start gap-3">
              <span className="cns-dot mt-[7px]" data-tone={store.tone} />
              <div>
                <b className="block text-[13px] font-semibold text-cns-fg">{store.text}</b>
                <span className="text-[11.5px] leading-relaxed text-cns-mutedfg">
                  {sources.supabase
                    ? "כל אירוע נכתב בצד השרת עם מפתח שירות. הדפדפן לא מחזיק מפתח שיכול לגעת בטבלה."
                    : "נתונים שנכתבים לקובץ נמחקים בכל פריסה מחדש. יש להגדיר את מפתח השירות בסביבת הייצור."}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-[8px_minmax(0,1fr)] items-start gap-3">
              <span
                className="cns-dot mt-[7px]"
                data-tone={data.lastEventAt ? "good" : undefined}
                data-live={data.lastEventAt ? "" : undefined}
              />
              <div>
                <b className="block text-[13px] font-semibold text-cns-fg">
                  {data.lastEventAt
                    ? `אירוע אחרון ${ago(data.lastEventAt, +new Date(data.generatedAt))}`
                    : "טרם נרשם אירוע"}
                </b>
                <span className="text-[11.5px] leading-relaxed text-cns-mutedfg">
                  {data.lastEventAt
                    ? `בשעה ${zoned(data.lastEventAt).hm}, לפי שעון ישראל.`
                    : "המוקד מחובר ומחכה לפעילות הראשונה בבורד."}
                </span>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <Panel title="יומן תקלות" hint="פענוחים שנכשלו, שמירות שנפלו וכניסות שנדחו" flush>
        <DataTable
          data={data.errors}
          columns={errorColumns}
          searchPlaceholder="חיפוש בתקלות…"
          csvName="errors"
          pageSize={12}
          empty={<Empty title="נקי" body="לא נרשמה אף תקלה בחלון הזה." />}
        />
      </Panel>
    </ViewFade>
  );
}

export { Awaiting };

"use client";

// The five screens. Each one is a projection of the same visit model, so a
// name means the same thing wherever you find it.

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
import { Card, Empty, Legend, Pill, Stat, Trail, ViewFade, Who } from "./ui/parts";
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
import { ago, stamp, zoned } from "./lib/time";

/* ================================================================ shared */

const outcomeTone = (o: Visit["outcome"]) =>
  o === "failed" ? "bad" : o === "saved" ? "good" : "mute";

function OutcomePill({ outcome }: { outcome: Visit["outcome"] }) {
  return (
    <span className="cns-pill" data-tone={outcomeTone(outcome)}>
      <i
        style={{
          width: 7,
          height: 7,
          borderRadius: 9,
          background: OUTCOME[outcome].fill,
          display: "inline-block",
        }}
      />
      {OUTCOME[outcome].label}
    </span>
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
      <div className="cns-stats">
        <Stat label="ייבואים היום" value={k.importsToday} accent={SERIES.imports} />
        <Stat label={`ייבואים · ${data.days} ימים`} value={k.importsWindow} />
        <Stat
          label="ביקורים"
          value={k.visitsWindow}
          hint={k.activeMinutes ? `${duration(k.activeMinutes)} עבודה` : undefined}
          accent={SERIES.entries}
        />
        <Stat label="ייצוא אקסל" value={k.exportsWindow} accent={ACTION.export.fill} />
        <Stat label="שמירות תמהיל" value={k.savesWindow} accent={SERIES.saves} tone={k.savesWindow ? "good" : undefined} />
        <Stat
          label="כשלי פענוח"
          value={k.failureRatePct == null ? "—" : k.failureRatePct}
          suffix={k.failureRatePct == null ? undefined : "%"}
          tone={k.failureRatePct != null && k.failureRatePct > 10 ? "bad" : undefined}
          hint={k.medianParseMs != null ? `חציון פענוח ${ms(k.medianParseMs)}` : undefined}
        />
      </div>

      <Card
        title="נפח פעולות"
        hint="כל פעולה שנרשמה בבורד, לפי יום"
        tools={
          <Legend
            items={VOLUME_SERIES.map((s) => ({ key: s.key, label: s.label, color: s.color }))}
            hidden={hidden}
            onToggle={toggle}
          />
        }
      >
        <Volume daily={data.daily} hidden={hidden} />
      </Card>

      <div className="cns-grid-32">
        <Card title="מקצב השבוע" hint="מתי בפועל עובדים על הבורד — שעון ישראל">
          <Rhythm cells={data.rhythm} />
        </Card>
        <Card title="מסלול העבודה" hint="מה קורה אחרי הכניסה">
          <Funnel stages={data.funnel} />
        </Card>
      </div>

      <div className="cns-grid-32">
        <Card title="מי משתמש בכלי" hint="פעולות לנציג — השם מגיע מכפתור פיירברי">
          <RankBars
            rows={data.byOperator
              .map((o) => ({ label: o.operator, value: o.imports + o.saves }))
              .sort((a, b) => b.value - a.value)}
            empty="עוד לא זוהה אף נציג."
          />
        </Card>
        <Card title="לפי סוג מסמך" hint="חיווי אשראי מול דוח בנק">
          <RankBars
            rows={data.byKind.map((b) => ({ label: KIND_LABEL[b.kind] ?? b.kind, value: b.imports }))}
            empty="עוד לא יובאו מסמכים."
            color={SERIES.saves}
          />
        </Card>
      </div>

      <Card title="מה קרה עכשיו" hint="60 האירועים האחרונים" flush>
        {data.feed.length ? (
          <ul className="cns-feed">
            {data.feed.slice(0, 22).map((e, i) => (
              <li key={`${e.ts}-${i}`}>
                <span className="cns-feed-when num">{ago(e.ts)}</span>
                <span
                  className="cns-feed-dot"
                  data-bad={(e.ok === false || e.event === "door_denied" || e.event === "error") || undefined}
                />
                <span className="cns-feed-line">{feedLine(e)}</span>
                <span className="cns-feed-stamp num">{stamp(e.ts)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty body="שקט מוחלט בחלון הזה." />
        )}
      </Card>
    </ViewFade>
  );
}

/* =============================================================== activity */

const vh = createColumnHelper<Visit>();

const visitColumns = [
  vh.accessor("start", {
    header: "מתי",
    cell: (c) => <span className="num">{stamp(c.getValue())}</span>,
  }),
  vh.accessor("operator", {
    header: "נציג",
    cell: (c) => <Who name={c.getValue()} />,
  }),
  vh.accessor("lead", { header: "לקוח" }),
  vh.accessor((r) => r.clients.join(" · "), {
    id: "clients",
    header: "שם בדוח",
    cell: (c) => c.getValue() || "—",
  }),
  vh.accessor("minutes", {
    header: "משך",
    cell: (c) => <span className="num">{duration(c.getValue())}</span>,
  }),
  vh.accessor("outcome", {
    header: "תוצאה",
    cell: (c) => <OutcomePill outcome={c.getValue()} />,
  }),
  vh.accessor((r) => r.trail.map((t) => t.label).join(" ← "), {
    id: "trail",
    header: "מה נעשה, לפי הסדר",
    enableSorting: false,
    cell: (c) => <Trail steps={c.row.original.trail} />,
  }),
] as ColumnDef<Visit, any>[];

export function Activity({ data }: { data: Dashboard }) {
  const [picked, setPicked] = useState<Visit | null>(null);

  const [from, to] = useMemo(() => {
    const end = Date.now();
    return [end - data.days * 86_400_000, end];
  }, [data.days]);

  return (
    <ViewFade k="activity">
      <Card
        title="ציר הפעילות"
        hint="שורה לכל נציג · כל גלולה היא ביקור אחד · לחיצה פותחת את הפירוט"
        tools={
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
            body="ציר הפעילות מצייר שורה לכל נציג ברגע שמישהו נכנס לבורד דרך פיירברי."
          />
        )}
      </Card>

      <Card title="ביקורים" hint={`${num(data.visits.length)} ביקורים בחלון`} flush>
        <DataTable
          data={data.visits}
          columns={visitColumns}
          searchPlaceholder="חיפוש לפי נציג, לקוח או שם בדוח…"
          csvName="visits"
          pageSize={14}
          onRowClick={setPicked}
          empty={<Empty body="אין ביקורים בחלון הזה." />}
        />
      </Card>

      <VisitDrawer visit={picked} onClose={() => setPicked(null)} />
    </ViewFade>
  );
}

/* =================================================================== work */

const ah = createColumnHelper<Action>();

function ActionMark({ kind }: { kind: Action["kind"] }) {
  const skin = ACTION[kind];
  const base: React.CSSProperties = { background: skin.fill, flex: "none" };
  const style: React.CSSProperties =
    skin.shape === "dot"
      ? { ...base, width: 9, height: 9, borderRadius: 99 }
      : skin.shape === "diamond"
        ? { ...base, width: 8, height: 8, borderRadius: 1.5, transform: "rotate(45deg)" }
        : { ...base, width: 4, height: 12, borderRadius: 2 };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <i style={style} aria-hidden />
      {skin.label}
    </span>
  );
}

const actionColumns = [
  ah.accessor("ts", { header: "מתי", cell: (c) => <span className="num">{stamp(c.getValue())}</span> }),
  ah.accessor("operator", { header: "נציג", cell: (c) => <Who name={c.getValue()} /> }),
  ah.accessor("lead", { header: "לקוח", cell: (c) => <span data-strong="">{c.getValue()}</span> }),
  ah.accessor((r) => r.client ?? "—", { id: "client", header: "שם בדוח" }),
  ah.accessor((r) => ACTION[r.kind].label, {
    id: "kind",
    header: "פעולה",
    cell: (c) => <ActionMark kind={c.row.original.kind} />,
  }),
  ah.accessor((r) => (r.docKind ? KIND_LABEL[r.docKind] ?? r.docKind : "—"), {
    id: "doc",
    header: "מסמך",
  }),
  ah.accessor((r) => bankLabel(r.bank), { id: "bank", header: "בנק" }),
  ah.accessor((r) => r.pages ?? 0, {
    id: "pages",
    header: "עמ׳",
    cell: (c) => <span className="num">{c.getValue() || "—"}</span>,
  }),
  ah.accessor((r) => r.rows ?? 0, {
    id: "rows",
    header: "שורות",
    cell: (c) => <span className="num">{c.getValue() || "—"}</span>,
  }),
  ah.accessor((r) => r.balance ?? 0, {
    id: "balance",
    header: "יתרה",
    cell: (c) => <span className="num">{nis(c.getValue())}</span>,
  }),
  ah.accessor((r) => r.parseMs ?? 0, {
    id: "parse",
    header: "פענוח",
    cell: (c) => <span className="num">{ms(c.getValue())}</span>,
  }),
] as ColumnDef<Action, any>[];

/**
 * The screen the console opens on: what people are actually doing with the
 * simulator — reports in, spreadsheets out — on a clock, by person.
 */
export function Work({ data }: { data: Dashboard }) {
  const [picked, setPicked] = useState<Action | null>(null);

  const [from, to] = useMemo(() => {
    const end = +new Date(data.generatedAt);
    return [end - data.days * 86_400_000, end];
  }, [data.days, data.generatedAt]);

  const k = data.kpis;

  // Who is doing the most, and how much of the log came in without a name on
  // it — the second number matters because an unnamed action is one this
  // panel cannot attribute to anybody.
  const busiest = data.byOperator
    .filter((o) => o.operator !== "לא מזוהה")
    .reduce<OperatorRow | null>(
      (best, o) => (!best || o.imports + o.saves > best.imports + best.saves ? o : best),
      null
    );
  const unnamed = data.actions.filter((a) => a.operator === "לא מזוהה").length;

  return (
    <ViewFade k="work">
      <div className="cns-stats">
        <Stat label={`ייבוא דוחות · ${data.days} ימים`} value={k.importsWindow} accent={ACTION.import.fill} />
        <Stat label="ייצוא אקסל" value={k.exportsWindow} accent={ACTION.export.fill} />
        <Stat label="שמירות תמהיל" value={k.savesWindow} accent={ACTION.save.fill} />
        <Stat
          label="נציגים פעילים"
          value={k.uniqueOperators}
          hint={busiest ? `הכי פעיל: ${busiest.operator}` : `${num(k.uniqueLeads)} לקוחות`}
        />
      </div>

      {unnamed ? (
        <div className="cns-flag">
          <span className="cns-dot" data-tone="warn" />
          <span>
            <b>{num(unnamed)} פעולות בלי שם נציג.</b> הכפתור בפיירברי מעביר את בעל
            הרשומה בפרמטר <code>?u=</code> — כניסות מכפתור בגרסה ישנה נרשמות כ״לא
            מזוהה״.
          </span>
        </div>
      ) : null}

      <Card
        title="מה נעשה בסימולטור"
        hint="שורה לכל נציג · כל סימן הוא פעולה אחת · גרירה בסרגל מזיזה את החלון"
        tools={
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
      </Card>

      <Card title="כל הפעולות" hint={`${num(data.actions.length)} פעולות בחלון`} flush>
        <DataTable
          data={data.actions}
          columns={actionColumns}
          searchPlaceholder="חיפוש לפי נציג, לקוח או שם בדוח…"
          csvName="actions"
          pageSize={14}
          maxHeight={640}
          onRowClick={setPicked}
          empty={
            <Empty
              title="שקט"
              body="אף דוח לא יובא ואף אקסל לא יוצא בחלון הזה."
            />
          }
        />
      </Card>

      <ActionDrawer action={picked} onClose={() => setPicked(null)} />
    </ViewFade>
  );
}

/* ================================================================= people */

const oh = createColumnHelper<OperatorRow>();
const operatorColumns = [
  oh.accessor("operator", { header: "נציג", cell: (c) => <Who name={c.getValue()} /> }),
  oh.accessor("visits", { header: "ביקורים", cell: (c) => <span className="num">{num(c.getValue())}</span> }),
  oh.accessor("leads", { header: "לקוחות", cell: (c) => <span className="num">{num(c.getValue())}</span> }),
  oh.accessor("imports", { header: "ייבואים", cell: (c) => <span className="num">{num(c.getValue())}</span> }),
  oh.accessor("saves", { header: "שמירות", cell: (c) => <span className="num">{num(c.getValue())}</span> }),
  oh.accessor("minutes", { header: "זמן עבודה", cell: (c) => <span className="num">{duration(c.getValue())}</span> }),
  oh.accessor("errors", {
    header: "כשלים",
    cell: (c) =>
      c.getValue() ? <Pill tone="bad">{num(c.getValue())}</Pill> : <span style={{ color: "var(--ink-4)" }}>—</span>,
  }),
  oh.accessor("lastSeen", { header: "לאחרונה", cell: (c) => <span className="num">{stamp(c.getValue())}</span> }),
] as ColumnDef<OperatorRow, any>[];

const lh = createColumnHelper<LeadRow>();
const leadColumns = [
  lh.accessor("lead", { header: "לקוח", cell: (c) => <span data-strong="">{c.getValue()}</span> }),
  lh.accessor((r) => r.leadId ?? "", { id: "leadId", header: "מזהה", cell: (c) => <span className="num">{c.getValue() || "—"}</span> }),
  lh.accessor((r) => r.clients.join(" · "), { id: "clients", header: "שמות בדוחות", cell: (c) => c.getValue() || "—" }),
  lh.accessor((r) => r.operators.join(" · "), { id: "ops", header: "טופל בידי", cell: (c) => c.getValue() || "—" }),
  lh.accessor("imports", { header: "ייבואים", cell: (c) => <span className="num">{num(c.getValue())}</span> }),
  lh.accessor("saves", { header: "שמירות", cell: (c) => <span className="num">{num(c.getValue())}</span> }),
  lh.accessor("lastSeen", { header: "לאחרונה", cell: (c) => <span className="num">{stamp(c.getValue())}</span> }),
] as ColumnDef<LeadRow, any>[];

export function People({ data }: { data: Dashboard }) {
  return (
    <ViewFade k="people">
      <div className="cns-stats">
        <Stat label="נציגים פעילים" value={data.kpis.uniqueOperators} accent={SERIES.entries} />
        <Stat label="לקוחות שנגעו בהם" value={data.kpis.uniqueLeads} />
        <Stat label="ביקורים" value={data.kpis.visitsWindow} />
        <Stat label="זמן עבודה מצטבר" value={duration(data.kpis.activeMinutes)} />
      </div>

      <Card title="מי משתמש בכלי" hint="ייבואים ושמירות לנציג, בחלון הנבחר">
        <RankBars
          rows={data.byOperator
            .map((o) => ({ label: o.operator, value: o.imports + o.saves }))
            .sort((a, b) => b.value - a.value)}
          empty="עוד לא זוהה אף נציג."
        />
      </Card>

      <Card title="נציגים" hint="השם מגיע מכפתור פיירברי שדרכו נכנסו" flush>
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
      </Card>

      <Card title="לקוחות" hint="לפי פעילות אחרונה" flush>
        <DataTable
          data={data.byLead}
          columns={leadColumns}
          searchPlaceholder="חיפוש לקוח או שם בדוח…"
          csvName="leads"
          pageSize={12}
          empty={<Empty body="אף לקוח לא נפתח בבורד בחלון הזה." />}
        />
      </Card>
    </ViewFade>
  );
}

/* ================================================================= health */

// The failure log is the one table that still reads raw events: a denied door
// never became a visit and a broken import never became an action, so there is
// no richer model to project them through.
const eh = createColumnHelper<SimEvent>();

const errorColumns = [
  eh.accessor("ts", { header: "מתי", cell: (c) => <span className="num">{stamp(c.getValue())}</span> }),
  eh.accessor((r) => EVENT_LABEL[r.event] ?? r.event, { id: "event", header: "אירוע" }),
  eh.accessor((r) => r.operator || "—", { id: "operator", header: "נציג" }),
  eh.accessor((r) => r.lead_name || (r.lead_id ? `ליד ${r.lead_id}` : "—"), { id: "lead", header: "לקוח" }),
  eh.accessor((r) => r.file_name || "—", { id: "file", header: "קובץ" }),
  eh.accessor((r) => (r.error ? DENY_LABEL[r.error] ?? r.error : "—"), {
    id: "error",
    header: "פירוט",
    cell: (c) => <span style={{ color: "var(--bad)" }}>{c.getValue()}</span>,
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
      : { tone: "mute" as const, text: "אין מקור פעיל" };

  return (
    <ViewFade k="health">
      <div className="cns-stats">
        <Stat
          label="כשלים בחלון"
          value={data.kpis.errorsWindow}
          tone={data.kpis.errorsWindow ? "bad" : "good"}
        />
        <Stat label="כניסות שנדחו" value={data.kpis.deniedWindow} />
        <Stat
          label="שיעור כשל בייבוא"
          value={data.kpis.failureRatePct == null ? "—" : data.kpis.failureRatePct}
          suffix={data.kpis.failureRatePct == null ? undefined : "%"}
          tone={data.kpis.failureRatePct != null && data.kpis.failureRatePct > 10 ? "bad" : undefined}
        />
        <Stat label="זמן פענוח חציוני" value={data.kpis.medianParseMs == null ? "—" : ms(data.kpis.medianParseMs)} />
      </div>

      <div className="cns-grid-32">
        <Card title="למה כניסות נדחו" hint="קישור שנחסם לפני שהפך לביקור">
          <RankBars rows={denials} empty="אף כניסה לא נדחתה — כמו שצריך." color="var(--bad)" />
        </Card>
        <Card title="מקור הנתונים" hint="מאיפה המסך הזה קורא">
          <div className="cns-health">
            <div className="cns-health-row">
              <span className="cns-dot" data-tone={store.tone} />
              <div>
                <b>{store.text}</b>
                <span>
                  {sources.supabase
                    ? "כל אירוע נכתב בצד השרת עם מפתח שירות. הדפדפן לא מחזיק מפתח שיכול לגעת בטבלה."
                    : "נתונים שנכתבים לקובץ נמחקים בכל פריסה מחדש. יש להגדיר את מפתח השירות בסביבת הייצור."}
                </span>
              </div>
            </div>
            <div className="cns-health-row">
              <span className="cns-dot" data-tone={data.lastEventAt ? "good" : undefined} data-live={data.lastEventAt ? "" : undefined} />
              <div>
                <b>{data.lastEventAt ? `אירוע אחרון ${ago(data.lastEventAt)}` : "טרם נרשם אירוע"}</b>
                <span>
                  {data.lastEventAt
                    ? `בשעה ${zoned(data.lastEventAt).hm}, לפי שעון ישראל.`
                    : "המוקד מחובר ומחכה לפעילות הראשונה בבורד."}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card title="יומן תקלות" hint="פענוחים שנכשלו, שמירות שנפלו וכניסות שנדחו" flush>
        <DataTable
          data={data.errors}
          columns={errorColumns}
          searchPlaceholder="חיפוש בתקלות…"
          csvName="errors"
          pageSize={14}
          empty={<Empty title="נקי" body="לא נרשמה אף תקלה בחלון הזה." />}
        />
      </Card>
    </ViewFade>
  );
}

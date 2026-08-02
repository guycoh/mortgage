"use client";

// The monitoring surface. One screen, top to bottom: health, volume over
// time, what was dropped, who dropped it, what broke. Light, editorial,
// desktop — reads like a report, not a cockpit.
//
// Charts are recharts (already the repo's charting engine); tables are
// TanStack Table v8 — headless sorting over typed rows, no markup opinions.

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import type { SimEvent } from "@/app/simulator/lib/telemetry";
import type { Dashboard as Data, LeadRow, OperatorRow, SessionRow } from "./aggregate";
import "@fontsource-variable/inter";
import "@fontsource/assistant/hebrew-400.css";
import "@fontsource/assistant/hebrew-600.css";
import "@fontsource/assistant/hebrew-700.css";
import "./admin.css";

/* --------------------------------------------------------------- helpers */

const nis = (n: number | null | undefined) =>
  n == null ? "—" : "₪" + Math.round(n).toLocaleString("he-IL");

const num = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString("he-IL");

const when = (iso: string) => {
  const d = new Date(iso);
  const p = (x: number) => String(x).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

const EVENT_LABEL: Record<string, string> = {
  door_entry: "כניסה מפיירברי",
  door_denied: "כניסה נדחתה",
  board_view: "פתיחת הבורד",
  import: "ייבוא דוח",
  analysis_open: "ניתוח חיווי",
  statement_analysis_open: "ניתוח משכנתא",
  summary_open: "סיכום ללקוח",
  statement_summary_open: "סיכום ללקוח (בנק)",
  schedule_open: "לוח סילוקין",
  compare_open: "השוואה",
  excel_export: "ייצוא אקסל",
  report_view: "צפייה במסמך",
  save: "שמירה",
  error: "שגיאה",
};

const BANK_LABEL: Record<string, string> = {
  leumi: "לאומי",
  poalim: "הפועלים",
  mizrahi: "מזרחי טפחות",
  discount: "דיסקונט",
  mercantile: "מרכנתיל",
};

/* ------------------------------------------------------------ primitives */

function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "bad" | "good" }) {
  return (
    <div className="adm-kpi" data-tone={tone}>
      <span className="adm-kpi-label">{label}</span>
      <span className="adm-kpi-value">{value}</span>
      {hint ? <span className="adm-kpi-hint">{hint}</span> : null}
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="adm-sec">
      <header className="adm-sec-head">
        <h2>{title}</h2>
        {hint ? <span>{hint}</span> : null}
      </header>
      {children}
    </section>
  );
}

/** A sortable table over typed rows. Click a header to sort. */
function DataTable<T>({ data, columns, empty }: { data: T[]; columns: ColumnDef<T, any>[]; empty: string }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  if (!data.length) return <div className="adm-empty">{empty}</div>;
  return (
    <div className="adm-tbl-wrap">
      <table className="adm-tbl">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th key={h.id} onClick={h.column.getToggleSortingHandler()} data-sortable="">
                  {flexRender(h.column.columnDef.header, h.getContext())}
                  {{ asc: " ↑", desc: " ↓" }[h.column.getIsSorted() as string] ?? ""}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((r) => (
            <tr key={r.id}>
              {r.getVisibleCells().map((c) => (
                <td key={c.id}>{flexRender(c.column.columnDef.cell, c.getContext())}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------------------------------------------------- columns */

const ev = createColumnHelper<SimEvent>();

const importCols = [
  ev.accessor("ts", { header: "מתי", cell: (c) => when(c.getValue()) }),
  ev.accessor("operator", { header: "נציג", cell: (c) => c.getValue() || "—" }),
  ev.accessor("lead_id", { header: "ליד", cell: (c) => c.getValue() ?? "—" }),
  ev.accessor("client_name", { header: "לקוח בדוח", cell: (c) => c.getValue() || "—" }),
  ev.accessor("kind", {
    header: "סוג",
    cell: (c) => (c.getValue() === "bank" ? "דוח בנק" : c.getValue() === "credit" ? "חיווי אשראי" : "—"),
  }),
  ev.accessor("bank", { header: "בנק", cell: (c) => BANK_LABEL[c.getValue() ?? ""] ?? c.getValue() ?? "—" }),
  ev.accessor("pages", { header: "עמ׳", cell: (c) => c.getValue() ?? "—" }),
  ev.accessor((r) => (r.mortgages ?? 0) + (r.loans ?? 0), {
    id: "rows",
    header: "שורות",
    cell: (c) => c.getValue() || "—",
  }),
  ev.accessor("total_balance", { header: "יתרה", cell: (c) => nis(c.getValue()) }),
  ev.accessor("duration_ms", { header: "פענוח", cell: (c) => (c.getValue() ? `${c.getValue()} מ״ש` : "—") }),
  ev.accessor("ok", {
    header: "תוצאה",
    cell: (c) =>
      c.getValue() === false ? <span className="adm-pill adm-bad">נכשל</span> : <span className="adm-pill adm-good">תקין</span>,
  }),
] as ColumnDef<SimEvent, any>[];

const sesH = createColumnHelper<SessionRow>();
const sessionCols = [
  sesH.accessor("start", { header: "מתי", cell: (c) => when(c.getValue()) }),
  sesH.accessor("operator", { header: "נציג" }),
  sesH.accessor("lead", { header: "ליד" }),
  sesH.accessor("minutes", {
    header: "משך",
    cell: (c) => (c.getValue() < 1 ? "רגע" : `${c.getValue()} דק׳`),
  }),
  sesH.accessor("trail", {
    header: "מה קרה, לפי הסדר",
    enableSorting: false,
    cell: (c) => (
      <span className="adm-trail">
        {c.getValue().map((t: SessionRow["trail"][number], i: number) => (
          <span key={i} className="adm-step" data-bad={!t.ok || undefined}>
            {t.label}
          </span>
        ))}
      </span>
    ),
  }),
] as ColumnDef<SessionRow, any>[];

const errorCols = [
  ev.accessor("ts", { header: "מתי", cell: (c) => when(c.getValue()) }),
  ev.accessor("event", { header: "אירוע", cell: (c) => EVENT_LABEL[c.getValue()] ?? c.getValue() }),
  ev.accessor("operator", { header: "נציג", cell: (c) => c.getValue() || "—" }),
  ev.accessor("file_name", { header: "קובץ", cell: (c) => c.getValue() || "—" }),
  ev.accessor("error", { header: "שגיאה", cell: (c) => <span className="adm-err">{c.getValue() || "—"}</span> }),
] as ColumnDef<SimEvent, any>[];

const opH = createColumnHelper<OperatorRow>();
const operatorCols = [
  opH.accessor("operator", { header: "נציג" }),
  opH.accessor("sessions", { header: "כניסות", cell: (c) => num(c.getValue()) }),
  opH.accessor("imports", { header: "ייבואים", cell: (c) => num(c.getValue()) }),
  opH.accessor("saves", { header: "שמירות", cell: (c) => num(c.getValue()) }),
  opH.accessor("lastSeen", { header: "נראה לאחרונה", cell: (c) => when(c.getValue()) }),
] as ColumnDef<OperatorRow, any>[];

const leadH = createColumnHelper<LeadRow>();
const leadCols = [
  leadH.accessor("lead", { header: "ליד" }),
  leadH.accessor("leadId", { header: "מזהה", cell: (c) => c.getValue() ?? "—" }),
  leadH.accessor("events", { header: "אירועים", cell: (c) => num(c.getValue()) }),
  leadH.accessor("imports", { header: "ייבואים", cell: (c) => num(c.getValue()) }),
  leadH.accessor("saves", { header: "שמירות", cell: (c) => num(c.getValue()) }),
  leadH.accessor("lastSeen", { header: "נראה לאחרונה", cell: (c) => when(c.getValue()) }),
] as ColumnDef<LeadRow, any>[];

/* ------------------------------------------------------------------ page */

export default function Dashboard({
  data,
  sources,
}: {
  data: Data;
  sources: { supabase: boolean; file: boolean };
}) {
  const { kpis } = data;

  const bankRows = useMemo(
    () => data.byBank.map((b) => ({ ...b, bank: BANK_LABEL[b.bank] ?? b.bank })),
    [data.byBank]
  );

  return (
    <div className="adm" dir="rtl">
      <header className="adm-head">
        <div>
          <div className="adm-kicker">SIMULATOR / BOARD — MONITORING</div>
          <h1>ניטור הסימולטור</h1>
          <p className="adm-sub">
            כל אירוע בבורד — כניסות, ייבוא דוחות, ניתוחים ושמירות. {""}
            <span className="adm-store" data-ok={sources.supabase || undefined}>
              {sources.supabase ? "מחובר ל-Supabase" : sources.file ? "קובץ מקומי (הטבלה טרם הוקמה)" : "אין נתונים עדיין"}
            </span>
          </p>
        </div>
        <nav className="adm-range">
          {[7, 30, 90].map((d) => (
            <a key={d} href={`/adminoam?days=${d}`} data-on={d === data.days || undefined}>
              {d} ימים
            </a>
          ))}
          <a href="/adminoam/auth?logout" className="adm-logout" title="יציאה">
            יציאה
          </a>
        </nav>
      </header>

      <div className="adm-kpis">
        <Kpi label="ייבואים היום" value={num(kpis.importsToday)} />
        <Kpi label="ייבואים · 7 ימים" value={num(kpis.imports7)} />
        <Kpi label={`ייבואים · ${data.days} ימים`} value={num(kpis.importsWindow)} />
        <Kpi label="ביקורים בבורד" value={num(kpis.sessionsWindow)} hint={kpis.deniedWindow ? `${num(kpis.deniedWindow)} כניסות נדחו` : undefined} />
        <Kpi label="לידים פעילים" value={num(kpis.uniqueLeads)} />
        <Kpi label="נציגים" value={num(kpis.uniqueOperators)} />
        <Kpi
          label="כשלי פענוח"
          value={kpis.failureRatePct == null ? "—" : `${kpis.failureRatePct}%`}
          tone={kpis.failureRatePct != null && kpis.failureRatePct > 10 ? "bad" : undefined}
        />
        <Kpi label="זמן פענוח חציוני" value={kpis.medianParseMs == null ? "—" : `${num(kpis.medianParseMs)} מ״ש`} />
        <Kpi label="שמירות" value={num(kpis.savesWindow)} tone="good" />
      </div>

      <Section title="פעילות יומית" hint="ייבואים, כניסות, ניתוחים ושמירות — לפי יום">
        <div className="adm-chart" dir="ltr">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.daily} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
              <defs>
                <linearGradient id="gImp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5B54D6" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#5B54D6" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gView" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8a8272" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#8a8272" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#eceae4" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#857f6e" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} width={28} tick={{ fontSize: 11, fill: "#857f6e" }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ fontFamily: "inherit", fontSize: 12, borderRadius: 10, border: "1px solid #e5e2da" }}
                formatter={(v: any, name: any) =>
                  [v, ({ imports: "ייבואים", views: "כניסות", analyses: "ניתוחים", saves: "שמירות" } as Record<string, string>)[name] ?? name]
                }
                labelFormatter={(l) => `יום ${l}`}
              />
              <Area type="monotone" dataKey="views" stroke="#8a8272" strokeWidth={1.4} fill="url(#gView)" />
              <Area type="monotone" dataKey="imports" stroke="#5B54D6" strokeWidth={2} fill="url(#gImp)" />
              <Area type="monotone" dataKey="saves" stroke="#3f6b45" strokeWidth={1.6} fill="transparent" />
              <Area type="monotone" dataKey="analyses" stroke="#B8902E" strokeWidth={1.2} fill="transparent" strokeDasharray="4 3" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Section>

      <div className="adm-cols">
        <Section title="ייבואים לפי בנק" hint="דוחות בנק שזוהו">
          {bankRows.length ? (
            <div className="adm-chart" dir="ltr">
              <ResponsiveContainer width="100%" height={Math.max(120, bankRows.length * 44)}>
                <BarChart data={bankRows} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 12 }}>
                  <XAxis type="number" hide allowDecimals={false} />
                  <YAxis type="category" dataKey="bank" width={92} tick={{ fontSize: 12, fill: "#4a463d" }} tickLine={false} axisLine={false} orientation="right" />
                  <Tooltip
                    contentStyle={{ fontFamily: "inherit", fontSize: 12, borderRadius: 10, border: "1px solid #e5e2da" }}
                    formatter={(v: any) => [v, "ייבואים"]}
                  />
                  <Bar dataKey="imports" fill="#5B54D6" radius={[0, 6, 6, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="adm-empty">עוד לא יובאו דוחות בנק</div>
          )}
        </Section>

        <Section title="נציגים" hint="לפי שם שהגיע מכפתור פיירברי">
          <DataTable data={data.byOperator} columns={operatorCols} empty="עוד לא זוהו נציגים — הכפתור מעביר שם רק מהגרסה החדשה" />
        </Section>
      </div>

      <Section title="מי השתמש, מתי, ומה עשה" hint="ביקור = אותו ליד ברצף, הפסקה של 30 דק׳ פותחת ביקור חדש">
        <DataTable data={data.sessions} columns={sessionCols} empty="אין ביקורים בחלון הזה" />
      </Section>

      <Section title="ייבואים אחרונים" hint="50 האחרונים בחלון">
        <DataTable data={data.recentImports} columns={importCols} empty="עוד לא יובאו דוחות בחלון הזה" />
      </Section>

      <div className="adm-cols">
        <Section title="לידים פעילים" hint="לפי פעילות אחרונה">
          <DataTable data={data.byLead} columns={leadCols} empty="אין פעילות לידים בחלון הזה" />
        </Section>

        <Section title="שגיאות" hint="פענוחים שנכשלו, שמירות שנפלו, כניסות שנדחו">
          <DataTable data={data.recentErrors} columns={errorCols} empty="לא נרשמו שגיאות — כמו שצריך" />
        </Section>
      </div>

      <footer className="adm-foot">
        הפאנל קורא בלעדית בצד השרת; הדפדפן לא מחזיק מפתח שיכול לגעת בנתונים. אין קישורים לכאן מהסימולטור, והכניסה מוגנת בסיסמה.
      </footer>
    </div>
  );
}

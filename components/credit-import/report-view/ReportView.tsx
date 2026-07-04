"use client";

import { useMemo, useState } from "react";
import {
  Search, X, Wallet, HandCoins, Landmark, Activity, AlertTriangle,
  Gavel, FileSearch, ClipboardList, BookOpen, User, CreditCard,
  IdCard, CalendarDays, ChevronDown,
} from "lucide-react";
import type { CreditReport } from "@/lib/credit-parser/types";
import { FIELD_BY_CODE } from "@/lib/credit-parser/dictionary";
import { GLOSSARY } from "@/lib/credit-parser/glossary";
import {
  computeKpis, transactionSearchText, matchesQuery, formatMoney,
  SECTION_LABELS,
} from "@/lib/credit-parser/report";
import { cn } from "@/lib/utils";
import { Badge } from "./ui";
import { Highlight } from "./Highlight";
import { TransactionCard } from "./TransactionCard";

export function ReportView({
  report,
  fileName,
  onClose,
}: {
  report: CreditReport;
  fileName: string;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const searching = q.length > 0;
  const kpis = useMemo(() => computeKpis(report), [report]);

  const txnText = useMemo(
    () => new Map(report.transactions.map((t) => [t.uid, transactionSearchText(t)])),
    [report]
  );
  const [openSet, setOpenSet] = useState<Set<string>>(new Set());
  const isOpen = (uid: string) => (searching ? true : openSet.has(uid));
  const toggle = (uid: string) =>
    setOpenSet((s) => {
      const n = new Set(s);
      if (n.has(uid)) n.delete(uid);
      else n.add(uid);
      return n;
    });

  const txns = report.transactions.filter((t) =>
    matchesQuery(txnText.get(t.uid) ?? "", q)
  );
  const bySection = (s: "current" | "active" | "inactive") =>
    txns.filter((t) => t.section === s);

  const inqByDate = report.inquiriesByDate.filter((r) =>
    matchesQuery(`${r.date} ${r.purpose} ${r.requester} ${r.bureau}`.toLowerCase(), q)
  );
  const newCredit = report.newCreditInquiries.filter((r) =>
    matchesQuery(`${r.user} ${r.transactionType} ${r.date} ${r.purpose} ${r.amount} ${r.relation}`.toLowerCase(), q)
  );
  const admin = report.adminActions.filter((r) =>
    matchesQuery(`${r.ref} ${r.date} ${r.type} ${r.status}`.toLowerCase(), q)
  );
  const exec = report.execution.filter((c) =>
    matchesQuery(Object.values(c.fields).join(" ").toLowerCase(), q)
  );
  const indicators = report.nonPaymentIndicators.filter((c) =>
    matchesQuery(`${c.source} ${c.id} ${c.reportDate} ${c.description}`.toLowerCase(), q)
  );
  const glossary = GLOSSARY.filter((g) =>
    matchesQuery(`${g.term} ${g.definition}`.toLowerCase(), q)
  );
  const summaryGroups = report.summary
    .map((g) => ({
      ...g,
      blocks: g.blocks
        .map((b) => ({
          ...b,
          rows: b.rows.filter((r) =>
            matchesQuery(`${b.transactionType} ${r.source} ${r.limit} ${r.debtBalance}`.toLowerCase(), q)
          ),
        }))
        .filter((b) => b.rows.length),
    }))
    .filter((g) => g.blocks.length);

  const resultCount =
    txns.length + inqByDate.length + newCredit.length + admin.length +
    exec.length + indicators.length + glossary.length;

  return (
    <div className="flex min-h-full flex-col bg-slate-50 text-slate-800" dir="rtl">
      {/* Toolbar */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#1d75a1] text-white">
              <Landmark className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold leading-tight">{report.client.name || "דוח אשראי"}</div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="font-mono" dir="ltr">{report.client.idNumber}</span>
                <span>·</span>
                <span>{report.meta.reportDate}</span>
              </div>
            </div>
          </div>

          <div className="relative order-last w-full sm:order-none sm:flex-1">
            <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חיפוש בכל הדוח — בנק, סכום, סטטוס, תאריך…"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pe-9 ps-9 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#1d75a1]/40"
            />
            {searching && (
              <button
                onClick={() => setQuery("")}
                className="absolute start-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-400 hover:bg-slate-100"
                aria-label="נקה חיפוש"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <X className="size-4" />
            סגירה
          </button>
        </div>
        {searching && (
          <div className="border-t border-slate-200 bg-slate-50 px-4 py-1.5 text-center text-xs text-slate-500 sm:px-6">
            {resultCount > 0 ? `נמצאו ${resultCount} תוצאות עבור “${query}”` : `לא נמצאו תוצאות עבור “${query}”`}
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-6">
        {/* Risk banner */}
        {!searching && kpis.hasFlag && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 animate-fade-in-up">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" />
            <div className="text-sm">
              <div className="font-semibold">נמצאו אינדיקציות לאי-עמידה בתשלומים</div>
              <div className="text-red-500">
                {report.execution.length > 0 && `${report.execution.length} תיק הוצאה לפועל`}
                {report.execution.length > 0 && report.nonPaymentIndicators.length > 0 && " · "}
                {report.nonPaymentIndicators.length > 0 && `${report.nonPaymentIndicators.length} נתון מובהק לאי-פירעון`}
              </div>
            </div>
          </div>
        )}

        {/* KPI cards */}
        {!searching && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi icon={Wallet} tone="primary" label="יתרת חוב כחייב" value={formatMoney(String(kpis.debtorDebt))} />
            <Kpi icon={HandCoins} tone="warning" label="יתרת חוב כערב" value={formatMoney(String(kpis.guarantorDebt))} />
            <Kpi icon={Activity} tone="primary" label="עסקאות פעילות" value={String(kpis.activeCount)} sub={`+ ${kpis.inactiveCount} לא פעילות`} />
            <Kpi icon={FileSearch} tone="muted" label="פניות לקבלת מידע" value={String(kpis.inquiries)} sub={`${kpis.newCredit} בקשות אשראי`} />
          </div>
        )}

        {/* Identity */}
        {!searching && <IdentityCard report={report} />}

        {/* Non-payment indicators */}
        {indicators.length > 0 && (
          <Section icon={AlertTriangle} title="נתונים המעידים על אי-עמידה בפירעון" count={indicators.length} danger>
            <div className="space-y-3">
              {indicators.map((ind, i) => (
                <div key={i} className="rounded-lg border border-red-200 bg-white p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-red-300 text-red-600">{ind.source}</Badge>
                    <span className="font-mono text-sm" dir="ltr"><Highlight text={ind.id} query={query} /></span>
                    <span className="text-xs text-slate-500">דווח: {ind.reportDate}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <Flag on={ind.stopsCollection}>הפסקת איסוף נתונים</Flag>
                    <Flag on={ind.allowsBureauTransfer}>העברה ללשכה בחיווי אשראי</Flag>
                    <Flag on={ind.prevents}>מונע / מבטל</Flag>
                  </div>
                  {ind.description && (
                    <p className="mt-2 text-sm text-slate-500"><Highlight text={ind.description} query={query} /></p>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Summary */}
        {summaryGroups.length > 0 && (
          <Section icon={ClipboardList} title="תמצית נתוני לקוח" count={summaryGroups.reduce((a, g) => a + g.blocks.reduce((x, b) => x + b.rows.length, 0), 0)}>
            <div className="space-y-5">
              {summaryGroups.map((g) => (
                <div key={g.role}>
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <Badge variant={g.role === "debtor" ? "default" : "secondary"}>{g.role === "debtor" ? "כחייב" : "כערב"}</Badge>
                    {g.title}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {g.blocks.map((b, bi) => (
                      <div key={bi} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                        <div className="bg-slate-100 px-3 py-1.5 text-xs font-semibold">{b.transactionType}</div>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-xs text-slate-500">
                              <th className="px-3 py-1.5 text-start font-medium">מקור</th>
                              <th className="px-3 py-1.5 text-start font-medium">{b.col2Label || "מזהה"}</th>
                              <th className="px-3 py-1.5 text-start font-medium">{b.col3Label || "מסגרת"}</th>
                              <th className="px-3 py-1.5 text-start font-medium">יתרת חוב</th>
                            </tr>
                          </thead>
                          <tbody>
                            {b.rows.map((r, ri) => (
                              <tr key={ri} className={cn("border-t border-slate-100", r.isTotal && "bg-slate-50 font-semibold")}>
                                <td className="px-3 py-1.5"><Highlight text={r.source} query={query} /></td>
                                <td className="px-3 py-1.5 font-mono text-xs" dir="ltr">{r.idOrCount || "—"}</td>
                                <td className="px-3 py-1.5 tabular-nums">{formatMoney(r.limit)}</td>
                                <td className={cn("px-3 py-1.5 tabular-nums", parseFloat(r.debtBalance || "0") > 0 && "text-red-600")}>{formatMoney(r.debtBalance)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Transaction sections */}
        {(["current", "active", "inactive"] as const).map((s) => {
          const list = bySection(s);
          if (searching && list.length === 0) return null;
          const icon = s === "inactive" ? CreditCard : s === "active" ? Activity : Wallet;
          return (
            <Section key={s} icon={icon} title={SECTION_LABELS[s]} count={list.length}>
              <div className="space-y-2.5">
                {list.map((t) => (
                  <TransactionCard key={t.uid} t={t} query={query} open={isOpen(t.uid)} onToggle={() => toggle(t.uid)} />
                ))}
                {list.length === 0 && <Empty>אין עסקאות בקטגוריה זו</Empty>}
              </div>
            </Section>
          );
        })}

        {/* Execution */}
        {exec.length > 0 && (
          <Section icon={Gavel} title="מידע מרשויות וגופים ציבוריים — הוצאה לפועל" count={exec.length} danger>
            <div className="space-y-3">
              {exec.map((c, i) => (
                <div key={i} className="rounded-lg border border-slate-200 bg-white p-4">
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
                    {Object.entries(c.fields).map(([code, v]) => {
                      const def = FIELD_BY_CODE[code];
                      const isMoney = def?.kind === "money";
                      return (
                        <div key={code} className="border-b border-dashed border-slate-200 py-1">
                          <dt className="text-xs text-slate-500">{def?.he ?? code}</dt>
                          <dd className={cn("text-sm font-medium tabular-nums", isMoney && code === "197-007" && "text-red-600")} dir={def?.kind === "date" || def?.kind === "id" ? "ltr" : undefined}>
                            <Highlight text={isMoney ? formatMoney(v) : v} query={query} />
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Inquiries */}
        {(inqByDate.length > 0 || newCredit.length > 0) && (
          <Section icon={FileSearch} title="פניות לקבלת מידע על הלקוח" count={inqByDate.length + newCredit.length}>
            {newCredit.length > 0 && (
              <div className="mb-4">
                <div className="mb-1.5 text-xs font-semibold text-slate-500">בקשות אשראי חדשות (חצי שנה אחרונה)</div>
                <TableWrap head={["משתמש", "סוג עסקה", "תאריך", "מטרה", "סכום מבוקש", "סוג הקשר"]}>
                  {newCredit.map((r, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-3 py-1.5"><Highlight text={r.user} query={query} /></td>
                      <td className="px-3 py-1.5">{r.transactionType || "—"}</td>
                      <td className="px-3 py-1.5 tabular-nums" dir="ltr">{r.date}</td>
                      <td className="px-3 py-1.5">{r.purpose || "—"}</td>
                      <td className="px-3 py-1.5 tabular-nums font-medium">{formatMoney(r.amount)}</td>
                      <td className="px-3 py-1.5">{r.relation || "—"}</td>
                    </tr>
                  ))}
                </TableWrap>
              </div>
            )}
            {inqByDate.length > 0 && (
              <div>
                <div className="mb-1.5 text-xs font-semibold text-slate-500">פניות לפי תאריך</div>
                <TableWrap head={["תאריך", "מטרת הבקשה", "הגורם המבקש", "לשכת האשראי"]}>
                  {inqByDate.map((r, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-3 py-1.5 tabular-nums" dir="ltr">{r.date}</td>
                      <td className="px-3 py-1.5"><Highlight text={r.purpose} query={query} /></td>
                      <td className="px-3 py-1.5 text-slate-500">{r.requester || "—"}</td>
                      <td className="px-3 py-1.5"><Highlight text={r.bureau} query={query} /></td>
                    </tr>
                  ))}
                </TableWrap>
              </div>
            )}
          </Section>
        )}

        {/* Admin */}
        {admin.length > 0 && (
          <Section icon={ClipboardList} title="פעולות מנהליות" count={admin.length}>
            <TableWrap head={["מספר פנייה", "תאריך", "סוג פנייה", "סטטוס"]}>
              {admin.map((r, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-3 py-1.5 font-mono text-xs" dir="ltr">{r.ref}</td>
                  <td className="px-3 py-1.5 tabular-nums" dir="ltr">{r.date}</td>
                  <td className="px-3 py-1.5"><Highlight text={r.type} query={query} /></td>
                  <td className="px-3 py-1.5">
                    <Badge variant="secondary" className="font-normal">{r.status}</Badge>
                  </td>
                </tr>
              ))}
            </TableWrap>
          </Section>
        )}

        {/* Glossary */}
        {glossary.length > 0 && (
          <Section icon={BookOpen} title="מילון מונחים" count={glossary.length}>
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white px-3">
              {glossary.map((g, i) => (
                <details key={i} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 py-3 text-sm font-semibold marker:content-['']">
                    <Highlight text={g.term} query={query} />
                    <ChevronDown className="size-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="pb-3 text-sm text-slate-500">
                    <Highlight text={g.definition} query={query} />
                  </div>
                </details>
              ))}
            </div>
          </Section>
        )}

        {searching && resultCount === 0 && (
          <div className="grid place-items-center rounded-xl border border-dashed border-slate-300 py-16 text-center text-slate-500">
            <Search className="mb-2 size-8 opacity-40" />
            לא נמצאו תוצאות. נסו מונח אחר.
          </div>
        )}

        <footer className="flex items-center justify-between gap-2 border-t border-slate-200 pt-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5 truncate">
            <FileSearch className="size-3.5" /> {fileName}
          </span>
          <span>נותח מקומית בדפדפן — הקובץ לא נשלח לשרת</span>
        </footer>
      </main>
    </div>
  );
}

/* ---------- small building blocks ---------- */

function Kpi({
  icon: Icon, label, value, sub, tone,
}: {
  icon: React.ElementType; label: string; value: string; sub?: string;
  tone: "primary" | "warning" | "muted";
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">{label}</span>
        <span className={cn(
          "grid size-8 place-items-center rounded-lg",
          tone === "primary" && "bg-[#1d75a1]/10 text-[#1d75a1]",
          tone === "warning" && "bg-amber-100 text-amber-600",
          tone === "muted" && "bg-slate-100 text-slate-500"
        )}>
          <Icon className="size-4" />
        </span>
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight tabular-nums">{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

function Section({
  icon: Icon, title, count, children, danger,
}: {
  icon: React.ElementType; title: string; count: number;
  children: React.ReactNode; danger?: boolean;
}) {
  return (
    <section className="animate-fade-in-up">
      <div className="mb-3 flex items-center gap-2.5">
        <span className={cn("grid size-8 place-items-center rounded-lg", danger ? "bg-red-100 text-red-600" : "bg-[#1d75a1]/10 text-[#1d75a1]")}>
          <Icon className="size-4.5" />
        </span>
        <h2 className="text-base font-bold tracking-tight">{title}</h2>
        <Badge variant="secondary" className="rounded-full">{count}</Badge>
      </div>
      {children}
    </section>
  );
}

function TableWrap({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="bg-slate-100 text-xs text-slate-500">
            {head.map((h) => (
              <th key={h} className="px-3 py-2 text-start font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Flag({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full px-2 py-0.5",
      on ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-400 line-through"
    )}>
      {children}
    </span>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed border-slate-300 py-8 text-center text-sm text-slate-500">{children}</div>;
}

function IdentityCard({ report }: { report: CreditReport }) {
  const c = report.client;
  const rows: { icon: React.ElementType; label: string; value: string; ltr?: boolean }[] = [
    { icon: IdCard, label: "מספר זהות", value: c.idNumber || "—", ltr: true },
    { icon: User, label: "הגדרת הלקוח", value: c.clientType || "—" },
    { icon: CalendarDays, label: "תחילת איסוף נתונים", value: c.dataCollectionStart || "—", ltr: true },
    { icon: CalendarDays, label: "תאריך הפקת הדוח", value: report.meta.reportDate || "—", ltr: true },
  ];
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white animate-fade-in-up">
      <div className="flex items-center gap-4 border-b border-slate-200 bg-gradient-to-l from-[#1d75a1]/5 to-transparent p-5">
        <div className="grid size-14 place-items-center rounded-2xl bg-[#1d75a1] text-2xl font-bold text-white">
          {(c.name || "?").trim().charAt(0)}
        </div>
        <div className="min-w-0">
          <div className="truncate text-lg font-bold">{c.name || "לקוח"}</div>
          <div className="text-sm text-slate-500">{report.meta.reportType}</div>
        </div>
        {report.client.systemStatus && (
          <Badge variant="destructive" className="ms-auto self-start">{report.client.systemStatus}</Badge>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-px bg-slate-200 lg:grid-cols-4">
        {rows.map((r) => (
          <div key={r.label} className="bg-white p-4">
            <dt className="flex items-center gap-1.5 text-xs text-slate-500">
              <r.icon className="size-3.5" /> {r.label}
            </dt>
            <dd className="mt-1 font-semibold tabular-nums" dir={r.ltr ? "ltr" : undefined} style={r.ltr ? { textAlign: "start" } : undefined}>
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

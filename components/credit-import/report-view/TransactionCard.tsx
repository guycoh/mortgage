"use client";

import { ChevronDown, Building2, ShieldCheck, Car, Phone, Mail, MapPin, AlertTriangle } from "lucide-react";
import type { Transaction } from "@/lib/credit-parser/types";
import { cn } from "@/lib/utils";
import { Badge } from "./ui";
import { Highlight } from "./Highlight";
import { MonthlyGridTable } from "./MonthlyGrid";
import { transactionGroups, formatMoney, enumEn, ROLE_LABELS, parseNum } from "@/lib/credit-parser/report";

function statusTone(status?: string): "success" | "muted" | "danger" {
  if (!status) return "muted";
  if (status.includes("פיגור")) return "danger";
  if (status.includes("נסגרה")) return "muted";
  return "success";
}

export function TransactionCard({
  t,
  query,
  open,
  onToggle,
}: {
  t: Transaction;
  query: string;
  open: boolean;
  onToggle: () => void;
}) {
  const status = t.fields["201-022"];
  const overdue = parseNum(t.fields["201-051"]);
  const tone = overdue > 0 ? "danger" : statusTone(status);
  const type = t.fields["201-002"];
  const debt = t.fields["201-049"];
  const limit = t.fields["201-020"] ?? t.fields["201-045"];
  const groups = transactionGroups(t);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-sm">
      {/* Summary header (always visible) */}
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-start"
      >
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-slate-400 transition-transform",
            open && "rotate-180"
          )}
        />
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#1d75a1]/10 text-[#1d75a1]">
          <Building2 className="size-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate font-semibold text-slate-800">
              <Highlight text={t.source} query={query} />
            </span>
            {type && (
              <Badge variant="secondary" className="font-normal">
                <Highlight text={type} query={query} />
              </Badge>
            )}
            <Badge
              variant="outline"
              className={cn(
                "font-normal",
                t.role === "guarantor"
                  ? "border-amber-300 text-amber-600"
                  : "border-[#1d75a1]/30 text-[#1d75a1]"
              )}
            >
              {ROLE_LABELS[t.role]}
            </Badge>
          </div>
          <div className="mt-0.5 truncate font-mono text-xs text-slate-500" dir="ltr">
            <Highlight text={t.fields["201-029"] ?? ""} query={query} />
          </div>
        </div>
        <div className="hidden shrink-0 items-center gap-5 sm:flex">
          <Stat label="מסגרת / סכום" value={formatMoney(limit)} />
          <Stat label="יתרת חוב" value={formatMoney(debt)} strong={parseFloat(debt ?? "0") > 0} />
          {overdue > 0 && <Stat label="לא שולם במועד" value={formatMoney(t.fields["201-051"])} strong />}
        </div>
        {status && (
          <span
            className={cn(
              "hidden shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium md:inline-flex",
              tone === "success" && "bg-emerald-100 text-emerald-600",
              tone === "danger" && "bg-red-100 text-red-600",
              tone === "muted" && "bg-slate-100 text-slate-500"
            )}
          >
            <ShieldCheck className="size-3.5" />
            {tone === "success" ? "תקין" : tone === "danger" ? "פיגור" : "סגור"}
          </span>
        )}
      </button>

      {open && (
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-4">
          {/* Contact */}
          {(t.contact.phone || t.contact.email || t.contact.address) && (
            <div className="mb-4 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-slate-500">
              {t.contact.address && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5" /> {t.contact.address}
                </span>
              )}
              {t.contact.phone && (
                <span className="inline-flex items-center gap-1.5" dir="ltr">
                  <Phone className="size-3.5" /> {t.contact.phone}
                </span>
              )}
              {t.contact.email && (
                <span className="inline-flex items-center gap-1.5" dir="ltr">
                  <Mail className="size-3.5" /> {t.contact.email}
                </span>
              )}
            </div>
          )}

          {/* Field groups */}
          <div className="grid gap-4 lg:grid-cols-2">
            {groups.map((grp) => (
              <div key={grp.title} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {grp.title}
                </div>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
                  {grp.fields.map((f) => (
                    <div key={f.code} className="flex items-baseline justify-between gap-2 border-b border-dashed border-slate-200 py-1 last:border-0">
                      <dt className="text-xs text-slate-500">{f.he}</dt>
                      <dd
                        className={cn("text-sm font-medium tabular-nums text-slate-800")}
                        dir={f.kind === "date" || f.kind === "id" || f.kind === "percent" ? "ltr" : undefined}
                      >
                        <Highlight text={f.display} query={query} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>

          {/* Interest tracks */}
          {t.interestTracks.length > 0 && (
            <div className="mt-4">
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                מסלולי ריבית
              </div>
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                <table className="w-full min-w-[620px] border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-xs text-slate-500">
                      {["#", "סוג ריבית", "הצמדה", "עוגן", "מרווח", "נומינלית", "מתואמת", "ניצול"].map((h) => (
                        <th key={h} className="px-3 py-1.5 text-start font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {t.interestTracks.map((tr) => (
                      <tr key={tr.index} className="border-t border-slate-100">
                        <td className="px-3 py-1.5 font-semibold">{tr.index}</td>
                        <td className="px-3 py-1.5">{tr.type || "—"}</td>
                        <td className="px-3 py-1.5">{tr.linkage || "—"}</td>
                        <td className="px-3 py-1.5">{tr.anchor || "—"}</td>
                        <td className="px-3 py-1.5 tabular-nums" dir="ltr">{tr.margin ? `${tr.margin}%` : "—"}</td>
                        <td className="px-3 py-1.5 tabular-nums" dir="ltr">{tr.nominal ? `${tr.nominal}%` : "—"}</td>
                        <td className="px-3 py-1.5 tabular-nums font-medium" dir="ltr">{tr.effective ? `${tr.effective}%` : "—"}</td>
                        <td className="px-3 py-1.5 tabular-nums" dir="ltr">{formatMoney(tr.utilization)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Collateral */}
          {t.collateral.length > 0 && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {t.collateral.map((c, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
                  <div className="grid size-9 place-items-center rounded-lg bg-emerald-100 text-emerald-600">
                    <Car className="size-4.5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-slate-500">בטוחה · {c.type || "—"}</div>
                    <div className="font-semibold tabular-nums">{formatMoney(c.value)}</div>
                  </div>
                  <div className="font-mono text-[10px] text-slate-500" dir="ltr">{c.fileId}</div>
                </div>
              ))}
            </div>
          )}

          {/* Related corporations */}
          {t.relatedCorps.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {t.relatedCorps.map((c, i) => (
                <div key={i} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs">
                  <span className="font-medium">{c.name}</span>
                  <span className="font-mono text-slate-500" dir="ltr">{c.number}</span>
                  {c.country && <span className="text-slate-500">· {c.country}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Coded remarks (הערות) */}
          {(t.remarks?.length ?? 0) > 0 && (
            <div className="mt-4 space-y-1.5">
              {t.remarks.map((r, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  <Highlight text={r} query={query} />
                </div>
              ))}
            </div>
          )}

          {/* Monthly grids (checks / direct debits / arrears history) */}
          {t.grids.length > 0 && (
            <div className="mt-4 space-y-3">
              {t.grids.map((g, i) => (
                <MonthlyGridTable key={i} grid={g} />
              ))}
            </div>
          )}

          {enumEn(status ?? "") && (
            <div className="mt-3 text-xs text-slate-500">
              {status} · {enumEn(status ?? "")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="text-end">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={cn("text-sm font-semibold tabular-nums", strong ? "text-red-600" : "text-slate-800")}>{value}</div>
    </div>
  );
}

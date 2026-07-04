"use client";

import type { MonthlyGrid as Grid } from "@/lib/credit-parser/types";
import { cn } from "@/lib/utils";

const MONTHS = ["ינו׳", "פבר׳", "מרץ", "אפר׳", "מאי", "יוני", "יולי", "אוג׳", "ספט׳", "אוק׳", "נוב׳", "דצמ׳"];

const DANGER_LABEL = /לא כובדו|חזרו/;

export function MonthlyGridTable({ grid }: { grid: Grid }) {
  const danger = DANGER_LABEL.test(grid.label);
  return (
    <div>
      <div className="mb-1.5 text-xs font-medium text-slate-500">{grid.label}</div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[640px] border-collapse text-center text-xs tabular-nums">
          <thead>
            <tr className="bg-slate-100 text-slate-500">
              <th className="px-2 py-1.5 text-start font-medium">שנה</th>
              {MONTHS.map((m) => (
                <th key={m} className="px-1.5 py-1.5 font-medium">
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.rows.map((row) => (
              <tr key={row.year} className="border-t border-slate-100">
                <td className="px-2 py-1.5 text-start font-semibold">{row.year}</td>
                {row.months.map((v, i) => {
                  const num = v ? Number(v) : 0;
                  return (
                    <td
                      key={i}
                      className={cn(
                        "px-1.5 py-1.5",
                        v === null && "text-slate-300",
                        v !== null && danger && num > 0 && "bg-red-100 font-bold text-red-600",
                        v !== null && !danger && "text-slate-800"
                      )}
                    >
                      {v ?? "·"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

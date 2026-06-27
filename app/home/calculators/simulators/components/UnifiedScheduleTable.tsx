// UnifiedScheduleTable.tsx
"use client";

import React from "react";
import { Loan } from "./calculate/loanCalculators";
import { calculateUnifiedSchedule, CombinedRow } from "./calculate/mixScheduleCalculators";

interface Mix {
  id: string;
  mix_name: string;
  loans?: Loan[];
}

interface UnifiedScheduleProps {
  activeMixId: string | null;
  mixes: Mix[];
  annualInflation?: number;
  onClose?: () => void; // ✨ חדש - כדי שתוכל לסגור עם X
}

export default function UnifiedScheduleTable({
  activeMixId,
  mixes,
  annualInflation = 0,
  onClose,
}: UnifiedScheduleProps) {
  const activeMix = mixes.find((mix) => mix.id === activeMixId);

  if (!activeMix || !activeMix.loans?.length) {
    return (
      <div className="p-4 border rounded-lg shadow text-center">
        <h2 className="text-lg font-semibold mb-2">לוח סילוקין</h2>
        <p className="text-gray-500 italic">לא נמצאו הלוואות בתמהיל</p>
      </div>
    );
  }

  const combinedSchedule: CombinedRow[] = calculateUnifiedSchedule(
    activeMix.loans,
    annualInflation
  );

  return (
    <div className="p-4 border rounded-lg shadow relative">
      {/* X לסגירה */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 left-2 text-3xl font-extrabold text-gray-700 hover:text-red-600 transition"
        >
          ×
        </button>
      )}

      <h2 className="text-lg font-semibold text-center mb-4">
        לוח סילוקין מאוחד — {activeMix.mix_name}
      </h2>

      {/* ✨ scroll מתחת ל-header */}
      <div className="max-h-96 overflow-y-auto border-t border-gray-300">
        <table className="w-full border-collapse border border-gray-300 text-sm">
          <thead className="bg-gray-200 sticky top-0 z-10">
            <tr>
              <th className="border p-2">חודש</th>
              <th className="border p-2">תשלום חודשי</th>
              <th className="border p-2">קרן</th>
              <th className="border p-2">ריבית</th>
              <th className="border p-2">יתרת פתיחה</th>
              <th className="border p-2">יתרת סגירה</th>
            </tr>
          </thead>
          <tbody>
            {combinedSchedule.map((row) => (
              <tr key={row.month} className="hover:bg-gray-100">
                <td className="border p-2">{row.month}</td>
                <td className="border p-2">
                  {row.totalPayment.toLocaleString("he-IL", {
                    maximumFractionDigits: 0,
                  })}
                </td>
                <td className="border p-2">
                  {row.totalPrincipal.toLocaleString("he-IL", {
                    maximumFractionDigits: 0,
                  })}
                </td>
                <td className="border p-2">
                  {row.totalInterest.toLocaleString("he-IL", {
                    maximumFractionDigits: 0,
                  })}
                </td>
                <td className="border p-2">
                  {row.openingBalance.toLocaleString("he-IL", {
                    maximumFractionDigits: 0,
                  })}
                </td>
                <td className="border p-2">
                  {row.closingBalance.toLocaleString("he-IL", {
                    maximumFractionDigits: 0,
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

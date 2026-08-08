// UnifiedScheduleModal.tsx
"use client";

import React from "react";
import { Loan } from "./calculate/loanCalculators";
import { calculateUnifiedSchedule, CombinedRow } from "./calculate/mixScheduleCalculators";

interface Mix {
  id: string;
  mix_name: string;
  loans?: Loan[];
}

interface UnifiedScheduleModalProps {
  activeMixId: string | null;
  mixes: Mix[];
  annualInflation?: number;
  onClose: () => void; // חובה כדי לסגור את המודל
}

export default function UnifiedScheduleModal({
  activeMixId,
  mixes,
  annualInflation = 0,
  onClose,
}: UnifiedScheduleModalProps) {
  const activeMix = mixes.find((mix) => mix.id === activeMixId);

  if (!activeMix || !activeMix.loans?.length) {
    return null; // לא מציג מודל אם אין הלוואות
  }

  const combinedSchedule: CombinedRow[] = calculateUnifiedSchedule(
    activeMix.loans,
    annualInflation
  );

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-11/12 max-w-5xl max-h-[85vh] flex flex-col relative">
        {/* כפתור X לסגירה */}
        <button
          onClick={onClose}
          className="absolute top-3 left-3 text-3xl font-extrabold text-white hover:text-red-600 transition"
        >
          ×
        </button>

        {/* כותרת */}
        <h2 className="text-xl font-bold text-center p-4 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-t-2xl shadow">
          לוח סילוקין מאוחד — {activeMix.mix_name}
        </h2>


        {/* תוכן גלול */}
        <div className="flex-1 overflow-y-auto p-4">
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
    </div>
  );
}

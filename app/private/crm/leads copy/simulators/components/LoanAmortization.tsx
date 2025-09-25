"use client"

import { useMemo } from "react";
import { calculateAmortization, ScheduleRow, LoanParams } from "./calculate/loanCalculators";

export type LoanAmortizationProps = {
  isOpen: boolean;
  onClose: () => void;
  loan?: any;
  path?: any;
  annualInflation?: number;
  isIndexed?: boolean;
};

export default function LoanAmortization({
  isOpen,
  onClose,
  loan,
  path,
  isIndexed,
  annualInflation,
}: LoanAmortizationProps) {
  if (!isOpen || !loan) return null;

  // מחשב את לוח הסילוקין + תשלום חודשי
  const { schedule, monthlyPayment } = useMemo(() => {
    const params: LoanParams = {
      amount: loan.amount,
      months: loan.months,
      rate: loan.rate,
      amortization_schedule_id: loan.amortization_schedule_id,
      annualInflation,
      isIndexed,
    };
    return calculateAmortization(params);
  }, [loan, annualInflation, isIndexed]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-lg w-[90%] max-w-4xl h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* כותרת */}
        <div className="flex justify-between items-center border-b p-4">
          <h2 className="text-lg font-bold">לוח סילוקין</h2>
          <button
            onClick={onClose}
            className="text-red-600 font-bold px-2 py-1 hover:bg-red-100 rounded"
          >
            סגור
          </button>
        </div>

        {/* תוכן המודל עם גלילה פנימית */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* מידע כללי */}
          <div className="grid grid-cols-2 gap-4 text-sm mb-6">
            <div className="flex flex-col gap-2">
              <div className="flex gap-1">
                <span>מסלול:</span>
                <span className="underline">{path?.name ?? "-"}</span>
              </div>
              <div className="flex gap-1">
                <span>לוח מסוג:</span>
                <span className="underline">{loan.amortization_schedule_id}</span>
              </div>
              <div className="flex gap-1">
                <span>Annual Inflation:</span>
                <span className="underline">{annualInflation ?? "-"}</span>
              </div>
              <div className="flex gap-1">
                <span>סכום ההלוואה:</span>
                <span className="underline">{loan.amount.toLocaleString("he-IL")}</span>
              </div>
              <div className="flex gap-1">
                <span>מספר חודשים:</span>
                <span className="underline">{loan.months}</span>
              </div>
              <div className="flex gap-1">
                <span>ריבית:</span>
                <span className="underline">{loan.rate}%</span>
              </div>
              <div className="flex gap-1">
                <span>תשלום חודשי:</span>
                <span className="underline">{monthlyPayment.toLocaleString("he-IL")}</span>
              </div>
            </div>
          </div>

          {/* לוח סילוקין */}
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-200 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-1">חודש</th>
                  <th className="border p-1">יתרת פתיחה</th>
                  <th className="border p-1">ריבית</th>
                  <th className="border p-1">קרן</th>
                  <th className="border p-1">תשלום</th>
                  <th className="border p-1">יתרת סגירה</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((row: ScheduleRow) => (
                  <tr key={row.month} className="hover:bg-gray-50">
                    <td className="border p-1 text-center">{row.month}</td>
                    <td className="border p-1 text-right">{row.openingBalance.toLocaleString("he-IL")}</td>
                    <td className="border p-1 text-right">{row.interest.toLocaleString("he-IL")}</td>
                    <td className="border p-1 text-right">{row.principal.toLocaleString("he-IL")}</td>
                    <td className="border p-1 text-right">{row.payment.toLocaleString("he-IL")}</td>
                    <td className="border p-1 text-right">{row.closingBalance.toLocaleString("he-IL")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}





























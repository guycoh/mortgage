// LoanAmortization.tsx

"use client"

import React from "react";
import { Loan, LoanResult, calculateLoan } from "./calculate/loanCalculators";

interface LoanAmortizationProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan | null;
  annualInflation?: number;
}

export default function LoanAmortization({
  isOpen,
  onClose,
  loan,
  annualInflation = 0,
}: LoanAmortizationProps) {
  if (!isOpen || !loan) return null;

  const loanResult: LoanResult = calculateLoan(loan, annualInflation);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-11/12 max-w-5xl max-h-[85vh] flex flex-col relative">
        {/* כפתור X לסגירה */}
        <button
          onClick={onClose}
          className="absolute top-3 left-3 text-3xl font-extrabold text-gray-700 hover:text-red-600 transition"
        >
          ×
        </button>

        {/* כותרת */}
        <div className="bg-blue-600 text-white text-center py-3 rounded-t-2xl">
          <h2 className="text-xl font-bold">לוח סילוקין — {loan.id}</h2>
        </div>

        {/* סיכום */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border-b border-gray-200 text-sm">
          <div>
            <span className="font-semibold">תשלום חודשי התחלתי:</span>{" "}
            {loanResult.monthlyPayment.toLocaleString("he-IL", {
              maximumFractionDigits: 0,
            })}
          </div>
          <div>
            <span className="font-semibold">תשלום חודשי מקסימלי:</span>{" "}
            {loanResult.maxMonthlyPayment.toLocaleString("he-IL", {
              maximumFractionDigits: 0,
            })}
          </div>
          <div>
            <span className="font-semibold">סך קרן:</span>{" "}
            {loanResult.totalPrincipal.toLocaleString("he-IL", {
              maximumFractionDigits: 0,
            })}
          </div>
          <div>
            <span className="font-semibold">סך ריבית:</span>{" "}
            {loanResult.totalInterest.toLocaleString("he-IL", {
              maximumFractionDigits: 0,
            })}
          </div>
          <div className="col-span-2">
            <span className="font-semibold">סך תשלום כולל:</span>{" "}
            {loanResult.totalPaid.toLocaleString("he-IL", {
              maximumFractionDigits: 0,
            })}
          </div>
          <div>
            <span className="font-semibold">צמוד מדד:</span>{" "}
            {loanResult.isIndexed ? "כן" : "לא"}
          </div>
        </div>

        {/* טבלה */}
        <div className="flex-1 overflow-y-auto p-4">
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead className="bg-gray-200 sticky top-0 z-10">
              <tr>
                <th className="border p-2">חודש</th>
                <th className="border p-2">תשלום</th>
                <th className="border p-2">קרן</th>
                <th className="border p-2">ריבית</th>
                <th className="border p-2">יתרת פתיחה</th>
                <th className="border p-2">יתרת סגירה</th>
              </tr>
            </thead>
            <tbody>
              {loanResult.schedule.map((row) => (
                <tr key={row.month} className="hover:bg-gray-100">
                  <td className="border p-2">{row.month}</td>
                  <td className="border p-2">
                    {row.payment.toLocaleString("he-IL", {
                      maximumFractionDigits: 0,
                    })}
                  </td>
                  <td className="border p-2">
                    {row.principal.toLocaleString("he-IL", {
                      maximumFractionDigits: 0,
                    })}
                  </td>
                  <td className="border p-2">
                    {row.interest.toLocaleString("he-IL", {
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

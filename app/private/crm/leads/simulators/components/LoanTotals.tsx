// components/LoanTotals.tsx
"use client";

import React from "react";
import { LoanPath } from "@/app/data/hooks/useLoanPaths";
import { Loan } from "./LoanTable";

type Props = {
  loans: Loan[];
  paths: LoanPath[];
  annualInflation: number;
  calculateMonthly: (loan: Loan) => number;
  comparisonTotals?: { principal: number; interest: number; payment: number }; // אופציונלי לעמודת השוואה
};

export default function LoanTotals({
  loans,
  paths,
  annualInflation,
  calculateMonthly,
  comparisonTotals,
}: Props) {
  const calculateTotalsForLoan = (
    loan: Loan,
    monthlyInflation: number,
    isIndexed: boolean
  ) => {
    const monthlyPayment = calculateMonthly(loan);
    let openingBalance = loan.amount;
    let totalPrincipal = 0;
    let totalInterest = 0;
    let totalPayment = 0;

    for (let i = 1; i <= loan.months; i++) {
      const inflationFactor = isIndexed
        ? Math.pow(1 + monthlyInflation, i)
        : 1;
      const actualPayment = monthlyPayment * inflationFactor;
      const interestPayment =
        openingBalance *
        (loan.rate / 12 / 100) *
        (isIndexed ? 1 + monthlyInflation : 1);
      const principalPayment = actualPayment - interestPayment;

      totalPrincipal += principalPayment;
      totalInterest += interestPayment;
      totalPayment += actualPayment;

      openingBalance =
        (openingBalance * (isIndexed ? 1 + monthlyInflation : 1)) -
        principalPayment;
    }

    return { totalPrincipal, totalInterest, totalPayment };
  };

  // חישוב סיכומים לכל ההלוואות
  let grandPrincipal = 0;
  let grandInterest = 0;
  let grandPayment = 0;

  loans.forEach((loan) => {
    const path = paths.find((p) => p.id === loan.path_id);
    const isIndexed = path?.is_indexed ?? false;
    const monthlyInflation = Math.pow(1 + annualInflation / 100, 1 / 12) - 1;

    const totals = calculateTotalsForLoan(loan, monthlyInflation, isIndexed);
    grandPrincipal += totals.totalPrincipal;
    grandInterest += totals.totalInterest;
    grandPayment += totals.totalPayment;
  });

  // פונקציה להצגת ערכים שלמים
  const formatInt = (val: number) =>
    Math.round(val).toLocaleString("he-IL");

  return (
    <div className=" border border-gray-300 rounded-lg overflow-hidden text-sm bg-white shadow-sm">
      <table className="w-full border-collapse">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className="border border-gray-300 p-2 text-right w-1/3">
              שדה
            </th>
            <th className="border border-gray-300 p-2 text-center">
              תמהיל נוכחי
            </th>
            {comparisonTotals && (
              <th className="border border-gray-300 p-2 text-center">
                תמהיל להשוואה
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-gray-300 p-2 text-right">
              סה"כ קרן
            </td>
            <td className="border border-gray-300 p-2 text-center font-medium">
              {formatInt(grandPrincipal)}
            </td>
            {comparisonTotals && (
              <td className="border border-gray-300 p-2 text-center text-blue-600 font-medium">
                {formatInt(comparisonTotals.principal)}
              </td>
            )}
          </tr>
          <tr>
            <td className="border border-gray-300 p-2 text-right">
              סה"כ ריבית
            </td>
            <td className="border border-gray-300 p-2 text-center font-medium">
              {formatInt(grandInterest)}
            </td>
            {comparisonTotals && (
              <td className="border border-gray-300 p-2 text-center text-blue-600 font-medium">
                {formatInt(comparisonTotals.interest)}
              </td>
            )}
          </tr>
          <tr>
            <td className="border border-gray-300 p-2 text-right">
              סה"כ החזר
            </td>
            <td className="border border-gray-300 p-2 text-center font-medium">
              {formatInt(grandPayment)}
            </td>
            {comparisonTotals && (
              <td className="border border-gray-300 p-2 text-center text-blue-600 font-medium">
                {formatInt(comparisonTotals.payment)}
              </td>
            )}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

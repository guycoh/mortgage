"use client";

import React from "react";
//import { Loan } from "@/types/loan";
import { Loan } from "./calculate/loanCalculators";
import { calculateMixTotals } from "./calculate/mixCalculators";

type MixTotalsProps = {
  loans: Loan[];
  isIndexed: boolean;
  annualInflation: number;
};

export default function MixTotals({
  loans,
  isIndexed,
  annualInflation,
}: MixTotalsProps) {
  if (!loans || loans.length === 0) {
    return <div className="p-4 text-gray-500">אין הלוואות בתמהיל</div>;
  }

  const totals = calculateMixTotals(loans, isIndexed, annualInflation);

  return (
    <div className="mt-4 p-4 bg-gray-50 border rounded-lg shadow-sm">
      <h2 className="text-lg font-bold mb-3">סיכום תמהיל</h2>
      <div className="grid grid-cols-3 gap-4 text-right">
        <div>
          <p className="text-sm text-gray-600">סך כל ההלוואות</p>
          <p className="font-semibold">
            {totals.totalAmount.toLocaleString("he-IL")} ₪
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">החזר חודשי משוער</p>
          <p className="font-semibold">
            {totals.totalMonthlyPayment.toLocaleString("he-IL", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} ₪
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">החזר חודשי מקסימלי</p>
          <p className="font-semibold">
            {totals.maxMonthlyPayment.toLocaleString("he-IL", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} ₪
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import React from "react";
//import { Loan, calculateLoan } from "@/app/data/loanCalculators";
import {Loan, calculateLoan } from "./calculators/loanCalculators";

interface Mix {
  id: string;
  mix_name: string;
  loans?: Loan[];
}

interface ActiveMixProps {
  activeMixId: string | null;
  mixes: Mix[];
  annualInflation?: number; // במקרה של הצמדה
}

export default function ActiveMixCards({ activeMixId, mixes, annualInflation = 0 }: ActiveMixProps) {
  const activeMix = mixes.find((mix) => mix.id === activeMixId);

  if (!activeMix) {
    return (
      <div className="p-4 border rounded-lg shadow text-center">
        <h2 className="text-lg font-semibold mb-2">תמהיל פעיל</h2>
        <p className="text-gray-500 italic">לא נבחר תמהיל</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-center mb-4">
        תמהיל פעיל: {activeMix.mix_name}
      </h2>

      {activeMix.loans?.map((loan) => {
        const result = calculateLoan(loan, annualInflation);

        return (
          <div
            key={loan.id}
            className="p-4 border rounded-xl shadow bg-white hover:shadow-lg transition"
          >
            <h3 className="text-md font-bold mb-2 text-blue-700">
              הלוואה #{loan.id}
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium">לוח סילוקין:</span>{" "}
                {result.amortization_schedule_id}
              </div>
              <div>
                <span className="font-medium">תשלום חודשי התחלתי:</span>{" "}
                {result.monthlyPayment.toLocaleString("he-IL", {
                  maximumFractionDigits: 0,
                })}{" "}
                ₪
              </div>
              <div>
                <span className="font-medium">תשלום חודשי מקסימלי:</span>{" "}
                {result.maxMonthlyPayment.toLocaleString("he-IL", {
                  maximumFractionDigits: 0,
                })}{" "}
                ₪
              </div>
              <div>
                <span className="font-medium">סך קרן:</span>{" "}
                {result.totalPrincipal.toLocaleString("he-IL", {
                  maximumFractionDigits: 0,
                })}{" "}
                ₪
              </div>
              <div>
                <span className="font-medium">סך ריבית:</span>{" "}
                {result.totalInterest.toLocaleString("he-IL", {
                  maximumFractionDigits: 0,
                })}{" "}
                ₪
              </div>
              <div>
                <span className="font-medium">סך תשלום כולל:</span>{" "}
                {result.totalPaid.toLocaleString("he-IL", {
                  maximumFractionDigits: 0,
                })}{" "}
                ₪
              </div>
              <div>
                <span className="font-medium">צמוד מדד:</span>{" "}
                {result.isIndexed ? "כן" : "לא"}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

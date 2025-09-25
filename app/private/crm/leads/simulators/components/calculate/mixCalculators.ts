// utils/mixCalculators.ts
//import { Loan } from "@/types/loan";
import { calculateLoan } from "./loanCalculators";
import { Loan } from "./loanCalculators";


export type MixTotals = {
  totalAmount: number;          // סכום כל ההלוואות
  totalMonthlyPayment: number;  // סך ההחזר החודשי
  maxMonthlyPayment: number;    // סך ההחזר החודשי המקסימלי

};

export function calculateMixTotals(
  loans: Loan[],
  isIndexed: boolean,
  annualInflation: number
): MixTotals {
  let totalAmount = 0;
  let totalMonthlyPayment = 0;
  let maxMonthlyPayment = 0;

  for (const loan of loans) {
    totalAmount += loan.amount;

    const result = calculateLoan(loan, isIndexed, annualInflation);
    totalMonthlyPayment += result.monthlyPayment;
    maxMonthlyPayment += result.maxMonthlyPayment ?? 0; // ⬅️ תיקון
  }

  return {
    totalAmount,
    totalMonthlyPayment,
    maxMonthlyPayment,
  };
}

// utils/mixCalculators.ts
import { Loan, LoanResult, calculateLoan } from "./loanCalculators";

export type MixTotals = {
  mix_id: string;
  totalAmount: number;          // סכום כל ההלוואות
  totalMonthlyPayment: number;  // סך ההחזר החודשי
  maxMonthlyPayment: number;    // סך ההחזר החודשי המקסימלי
};

/**
 * מחשב סה"כ נתונים לכל תמהיל
 */
export function calculateMixTotals(
  loans: Loan[],
  isIndexed: boolean,
  annualInflation: number,
  mix_id: string
): MixTotals {
  let totalAmount = 0;
  let totalMonthlyPayment = 0;
  let maxMonthlyPayment = 0;

  for (const loan of loans) {
    totalAmount += loan.amount;

    const result: LoanResult = calculateLoan(loan, isIndexed, annualInflation);
    totalMonthlyPayment += result.monthlyPayment;
    maxMonthlyPayment += result.maxMonthlyPayment ?? 0; // ✨ fallback
  }

  return {
    mix_id, // לוקח מהפרמטר ולא מהלוואה
    totalAmount,
    totalMonthlyPayment,
    maxMonthlyPayment,
  };
}

/**
 * מחשב את סך הנתונים לכל התמהילים
 */
export function calculateAllMixTotals(
  loans: Loan[],
  isIndexed: boolean,
  annualInflation: number
): MixTotals[] {
  const totalsMap = new Map<string, Loan[]>();

  // קיבוץ הלוואות לפי mix_id
  loans.forEach((loan) => {
    if (!totalsMap.has(loan.mix_id)) {
      totalsMap.set(loan.mix_id, []);
    }
    totalsMap.get(loan.mix_id)!.push(loan);
  });

  const allTotals: MixTotals[] = [];

  // מעבר על כל mix_id וחישוב totals
  for (const [mix_id, mixLoans] of Array.from(totalsMap.entries())) {
    const totals = calculateMixTotals(mixLoans, isIndexed, annualInflation, mix_id);
    allTotals.push(totals);
  }

  return allTotals;
}




// import { calculateLoan } from "./loanCalculators";
// import { Loan } from "./loanCalculators";


// export type MixTotals = {
//   totalAmount: number;          // סכום כל ההלוואות
//   totalMonthlyPayment: number;  // סך ההחזר החודשי
//   maxMonthlyPayment: number;    // סך ההחזר החודשי המקסימלי

// };

// export function calculateMixTotals(
//   loans: Loan[],
//   isIndexed: boolean,
//   annualInflation: number
// ): MixTotals {
//   let totalAmount = 0;
//   let totalMonthlyPayment = 0;
//   let maxMonthlyPayment = 0;

//   for (const loan of loans) {
//     totalAmount += loan.amount;

//     const result = calculateLoan(loan, isIndexed, annualInflation);
//     totalMonthlyPayment += result.monthlyPayment;
//     maxMonthlyPayment += result.maxMonthlyPayment ?? 0; // ⬅️ תיקון
//   }

//   return {
//     totalAmount,
//     totalMonthlyPayment,
//     maxMonthlyPayment,
//   };
// }

// mixCalculators.ts
// מסכמת את כל ההלוואות בתמהיל

import { Loan, LoanResult, calculateLoan, ScheduleRow } from "./loanCalculators";


export type MixTotals = {
  mix_id: string;
  mixTotalAmount: number;           // סכום ההלוואות
  mixTotalPrincipal: number;        // סך קרן
  mixTotalInterest: number;         // סך ריבית   
  mixTotalPaid: number;             // סך תשלומים (קרן+ריבית)
  mixTotalMonthlyPayment: number;   // החזר חודשי ממוצע (סכום ראשוני)
  mixPeakMonthlyPayment: number;    // התשלום החודשי הגבוה ביותר
};

export function calculateMixTotals(
  loans: Loan[],
  isIndexed: boolean,
  annualInflation: number,
  mix_id: string
): MixTotals {
  let totalAmount = 0;
  let totalPrincipal = 0;
  let totalInterest = 0;
  let totalPaid = 0;
  let totalMonthlyPayment = 0;
  let peakMonthlyPayment = 0;

  const monthlySums: Record<number, number> = {};

  for (const loan of loans) {
    totalAmount += loan.amount;
    const result: LoanResult = calculateLoan(loan, isIndexed, annualInflation);
    const schedule = result.schedule ?? [];

    totalPrincipal += schedule.reduce((sum, row) => sum + row.principal, 0);
    totalInterest += schedule.reduce((sum, row) => sum + row.interest, 0);
    totalPaid += schedule.reduce((sum, row) => sum + row.payment, 0);

    totalMonthlyPayment += result.monthlyPayment;

    schedule.forEach((row) => {
      monthlySums[row.month] = (monthlySums[row.month] || 0) + row.payment;
    });
  }

  peakMonthlyPayment = Math.max(...Object.values(monthlySums));

  return {
    mix_id,
    mixTotalAmount: totalAmount,
    mixTotalPrincipal: totalPrincipal,
    mixTotalInterest: totalInterest,
    mixTotalPaid: totalPaid,
    mixTotalMonthlyPayment: totalMonthlyPayment,
    mixPeakMonthlyPayment: peakMonthlyPayment,
  };
}




export function calculateAllMixTotals(
  mixes: { id: string; loans?: Loan[] }[],
  isIndexed: boolean,
  annualInflation: number
): MixTotals[] {
  return mixes.map((mix) =>
    calculateMixTotals(mix.loans || [], isIndexed, annualInflation, mix.id)
  );
}

























// import { Loan, LoanResult, calculateLoan, ScheduleRow } from "./loanCalculators";

// export type MixTotals = {
//   mix_id: string;
//   totalAmount: number;          // סכום כל ההלוואות
//   totalMonthlyPayment: number;  // סך ההחזר החודשי
//   maxMonthlyPayment: number;    // סך ההחזר החודשי המקסימלי
// };

// /**
//  * מחשב סה"כ נתונים לכל תמהיל
//  */
// export function calculateMixTotals(
//   loans: Loan[],
//   isIndexed: boolean,
//   annualInflation: number,
//   mix_id: string
// ): MixTotals {
//   let totalAmount = 0;
//   let totalMonthlyPayment = 0;
//   let maxMonthlyPayment = 0;

//   for (const loan of loans) {
//     totalAmount += loan.amount;

//     const result: LoanResult = calculateLoan(loan, isIndexed, annualInflation);
//     totalMonthlyPayment += result.monthlyPayment;
//     maxMonthlyPayment += result.maxMonthlyPayment ?? 0; // fallback
//   }

//   return {
//     mix_id,
//     totalAmount,
//     totalMonthlyPayment,
//     maxMonthlyPayment,
//   };
// }

// /**
//  * מחשב את סך הנתונים לכל התמהילים
//  */
// export function calculateAllMixTotals(
//   loans: Loan[],
//   isIndexed: boolean,
//   annualInflation: number
// ): MixTotals[] {
//   const totalsMap = new Map<string, Loan[]>();

//   loans.forEach((loan) => {
//     if (!totalsMap.has(loan.mix_id)) {
//       totalsMap.set(loan.mix_id, []);
//     }
//     totalsMap.get(loan.mix_id)!.push(loan);
//   });

//   const allTotals: MixTotals[] = [];

//   for (const [mix_id, mixLoans] of Array.from(totalsMap.entries())) {
//     const totals = calculateMixTotals(mixLoans, isIndexed, annualInflation, mix_id);
//     allTotals.push(totals);
//   }

//   return allTotals;
// }

// /**
//  * 🔥 פונקציה חדשה: מאחדת לוחות סילוקין לכל ההלוואות בתמהיל
//  */
// export function mergeSchedulesForMix(
//   loans: Loan[],
//   isIndexed: boolean,
//   annualInflation: number
// ): ScheduleRow[] {
//   const scheduleMap = new Map<number, ScheduleRow>();

//   for (const loan of loans) {
//     const result: LoanResult = calculateLoan(loan, isIndexed, annualInflation);

//     if (!result.schedule) continue;

//     result.schedule.forEach((row) => {
//       if (!scheduleMap.has(row.month)) {
//         scheduleMap.set(row.month, {
//           month: row.month,
//           payment: 0,
//           principal: 0,
//           interest: 0,
//           openingBalance: 0,
//           closingBalance: 0,
//         });
//       }

//       const agg = scheduleMap.get(row.month)!;
//       agg.payment += row.payment;
//       agg.principal += row.principal;
//       agg.interest += row.interest;
//       agg.openingBalance += row.openingBalance;
//       agg.closingBalance += row.closingBalance;
//     });
//   }

//   // ממיינים לפי חודש
//   return Array.from(scheduleMap.values()).sort((a, b) => a.month - b.month);
// }


















// // utils/mixCalculators.ts
// import { Loan, LoanResult, calculateLoan } from "./loanCalculators";

// export type MixTotals = {
//   mix_id: string;
//   totalAmount: number;          // סכום כל ההלוואות
//   totalMonthlyPayment: number;  // סך ההחזר החודשי
//   maxMonthlyPayment: number;    // סך ההחזר החודשי המקסימלי
// };

// /**
//  * מחשב סה"כ נתונים לכל תמהיל
//  */
// export function calculateMixTotals(
//   loans: Loan[],
//   isIndexed: boolean,
//   annualInflation: number,
//   mix_id: string
// ): MixTotals {
//   let totalAmount = 0;
//   let totalMonthlyPayment = 0;
//   let maxMonthlyPayment = 0;

//   for (const loan of loans) {
//     totalAmount += loan.amount;

//     const result: LoanResult = calculateLoan(loan, isIndexed, annualInflation);
//     totalMonthlyPayment += result.monthlyPayment;
//     maxMonthlyPayment += result.maxMonthlyPayment ?? 0; // ✨ fallback
//   }

//   return {
//     mix_id, // לוקח מהפרמטר ולא מהלוואה
//     totalAmount,
//     totalMonthlyPayment,
//     maxMonthlyPayment,
//   };
// }

// /**
//  * מחשב את סך הנתונים לכל התמהילים
//  */
// export function calculateAllMixTotals(
//   loans: Loan[],
//   isIndexed: boolean,
//   annualInflation: number
// ): MixTotals[] {
//   const totalsMap = new Map<string, Loan[]>();

//   // קיבוץ הלוואות לפי mix_id
//   loans.forEach((loan) => {
//     if (!totalsMap.has(loan.mix_id)) {
//       totalsMap.set(loan.mix_id, []);
//     }
//     totalsMap.get(loan.mix_id)!.push(loan);
//   });

//   const allTotals: MixTotals[] = [];

//   // מעבר על כל mix_id וחישוב totals
//   for (const [mix_id, mixLoans] of Array.from(totalsMap.entries())) {
//     const totals = calculateMixTotals(mixLoans, isIndexed, annualInflation, mix_id);
//     allTotals.push(totals);
//   }

//   return allTotals;
// }



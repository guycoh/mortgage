//mixScheduleCalculators.ts
import { Loan, calculateLoan, ScheduleRow } from "./loanCalculators";

export type CombinedRow = {
  month: number;
  totalPayment: number;
  totalPrincipal: number;
  totalInterest: number;
  openingBalance: number;
  closingBalance: number;
};

export type CombinedTotals = {
  mixTotalPayment: number;
  mixTotalPrincipal: number;
  mixTotalInterest: number;
  mixOpeningBalance: number;
  mixClosingBalance: number;
};

/**
 * מחזיר לוח סילוקין מאוחד לכל ההלוואות בתמהיל
 */
export function calculateUnifiedSchedule(
  loans: Loan[],
  annualInflation: number = 0
): CombinedRow[] {
  if (!loans || loans.length === 0) return [];

  // חישוב לוח סילוקין לכל הלוואה
  const loanSchedules: ScheduleRow[][] = loans.map((loan) =>
    calculateLoan(loan, annualInflation).schedule
  );

  // מוצא את כמות החודשים הכי ארוכה
  const maxMonths = Math.max(...loanSchedules.map((s) => s.length));

  const combinedSchedule: CombinedRow[] = [];

  for (let month = 1; month <= maxMonths; month++) {
    let totalPayment = 0;
    let totalPrincipal = 0;
    let totalInterest = 0;
    let openingBalance = 0;
    let closingBalance = 0;

    loanSchedules.forEach((schedule) => {
      const row = schedule.find((r) => r.month === month);
      if (row) {
        totalPayment += row.payment;
        totalPrincipal += row.principal;
        totalInterest += row.interest;
        openingBalance += row.openingBalance;
        closingBalance += row.closingBalance;
      }
    });

    combinedSchedule.push({
      month,
      totalPayment,
      totalPrincipal,
      totalInterest,
      openingBalance,
      closingBalance,
    });
  }

  return combinedSchedule;
}

/**
 * מחזיר סכומים כוללים עבור לוח סילוקין מאוחד
 */
export function calculateUnifiedTotals(schedule: CombinedRow[]): CombinedTotals {
  return schedule.reduce<CombinedTotals>(
    (acc, row, idx) => {
      acc.mixTotalPayment += row.totalPayment;
      acc.mixTotalPrincipal += row.totalPrincipal;
      acc.mixTotalInterest += row.totalInterest;

      if (idx === 0) acc.mixOpeningBalance = row.openingBalance;
      acc.mixClosingBalance = row.closingBalance;

      return acc;
    },
    {
      mixTotalPayment: 0,
      mixTotalPrincipal: 0,
      mixTotalInterest: 0,
      mixOpeningBalance: 0,
      mixClosingBalance: 0,
    }
  );
}

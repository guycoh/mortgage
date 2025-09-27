import { Loan, LoanResult, calculateLoan, ScheduleRow } from "./loanCalculators";

export function mergeSchedulesForMix(
  loans: Loan[],
  isIndexed: boolean,
  annualInflation: number
): ScheduleRow[] {
  // מפה לפי חודש -> שורה מאוחדת
  const mergedMap = new Map<number, ScheduleRow>();

  for (const loan of loans) {
    const result: LoanResult = calculateLoan(loan, isIndexed, annualInflation);

    if (!result.schedule) continue; // 👈 אם אין לוח סילוקין – דלג

    result.schedule.forEach((row) => {
      if (!mergedMap.has(row.month)) {
        mergedMap.set(row.month, {
          month: row.month,
          payment: 0,
          principal: 0,
          interest: 0,
          openingBalance: 0,
          closingBalance: 0,
        });
      }

      const agg = mergedMap.get(row.month)!;
      agg.payment += row.payment;
      agg.principal += row.principal;
      agg.interest += row.interest;
      agg.openingBalance += row.openingBalance;
      agg.closingBalance += row.closingBalance;
    });
  }

  // ממירים למערך מסודר לפי חודש
  return Array.from(mergedMap.values()).sort((a, b) => a.month - b.month);
}

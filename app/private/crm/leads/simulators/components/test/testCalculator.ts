// testCalculator.ts

export type Loan = {
  amount: number;
  rate: number; // ריבית שנתית באחוזים
  months: number;
  amortization_schedule_id: number; // 1=שפיצר, 2=קרן שווה, 3=בלון חלקי, 4=בלון מלא
};

export type LoanResult = {
  amortization_schedule_id: number;
  monthlyPayment: number; // תשלום חודשי
  maxMonthlyPayment?: number; // תשלום חודשי בשיא
  totalInterest?: number; // סה"כ ריבית
  totalPaid?: number; // סה"כ תשלום כולל
  isIndexed: boolean; // ✨ חדש
  schedule?: ScheduleRow[]; // ✨ לוח סילוקין
};

export type ScheduleRow = {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  openingBalance: number; // יתרת פתיחה
  closingBalance: number; // יתרת סגירה
};












/**
 * מחשב את תוצאות ההלוואה לפי סוג לוח סילוקין
 * @param loan - הלוואה
 * @param isIndexed - האם הלוואה צמודה
 */
export function calculateLoan(loan: Loan, isIndexed: boolean,annualInflation: number ): LoanResult {
  const P = loan.amount;
  const n = loan.months;
  const r = loan.rate / 12 / 100;
  const infl = isIndexed ? annualInflation / 12 / 100 : 0; // הצמדה חודשית
 
 
  switch (loan.amortization_schedule_id) {
    /* ─────────────── לוח שפיצר ─────────────── */
    case 1: {
      const monthlyPayment =
        r === 0 ? P / n : (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

      return {
        amortization_schedule_id: 1,
        monthlyPayment,
        maxMonthlyPayment: monthlyPayment,
        isIndexed,
      };
    }
   /* ─────────────── קרן שווה ─────────────── */
case 2: {
  // נשאר – תשלום חודשי חישובי (ממוצע גס או הערכה)
  const monthlyPayment = P / n + P * r;

  // נוסיף לוח סילוקין אמיתי
  const principalPerMonth = P / n;
  let balance = P;
  let maxMonthlyPayment = 0;
  let totalInterest = 0;
  let totalPaid = 0;

  const schedule: {
    month: number;
    payment: number;
    principal: number;
    interest: number;
    openingBalance: number;
    closingBalance: number;
  }[] = [];

  for (let month = 1; month <= n; month++) {
    const interest = balance * r;
    const payment = principalPerMonth + interest;

    const openingBalance = balance;
    const closingBalance = openingBalance - principalPerMonth;

    schedule.push({
      month,
      payment,
      principal: principalPerMonth,
      interest,
      openingBalance,
      closingBalance: closingBalance > 0 ? closingBalance : 0,
    });

    balance = closingBalance;
    maxMonthlyPayment = Math.max(maxMonthlyPayment, payment);
    totalInterest += interest;
    totalPaid += payment;
  }

  return {
    amortization_schedule_id: 2,
    monthlyPayment, // ✨ שומר על הקיים
    maxMonthlyPayment,
    totalInterest,
    totalPaid,
    isIndexed,
    schedule, // ✨ לוח סילוקין אמיתי
  };
}

    /* ─────────────── בלון חלקי ─────────────── */
    case 3: {
      const monthlyPayment = P * r;
      return {
        amortization_schedule_id: 3,
        monthlyPayment,
        maxMonthlyPayment: monthlyPayment,
        isIndexed,
      };
    }
    /* ─────────────── בלון מלא ─────────────── */
    case 4: {
      return {
        amortization_schedule_id: 4,
        monthlyPayment: 0,
        maxMonthlyPayment: 0,
        isIndexed,
      };
    }

    default: {
      return {
        amortization_schedule_id: loan.amortization_schedule_id,
        monthlyPayment: 0,
        isIndexed,
      };
    }
  }
}

















// export type Loan = {
//   amount: number;
//   rate: number; // ריבית שנתית באחוזים
//   months: number;
//   amortization_schedule_id: number; // 1=שפיצר, 2=קרן שווה, 3=בלון חלקי, 4=בלון מלא
// };

// export type LoanResult = {
//   amortization_schedule_id: number;
//   monthlyPayment: number; // תשלום חודשי
//   maxMonthlyPayment?: number; // תשלום חודשי בשיא
//   totalInterest?: number; // סה"כ ריבית
//   totalPaid?: number; // סה"כ תשלום כולל
// };

// /**
//  * מחשב את תוצאות ההלוואה לפי סוג לוח סילוקין
//  */
// export function calculateLoan(loan: Loan): LoanResult {
//   const P = loan.amount;
//   const n = loan.months;
//   const r = loan.rate / 12 / 100;

//   switch (loan.amortization_schedule_id) {
//     /* ─────────────── לוח שפיצר ─────────────── */
//     case 1: {
//       const monthlyPayment =
//         r === 0 ? P / n : (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

//       return {
//         amortization_schedule_id: 1,
//         monthlyPayment,
//         maxMonthlyPayment: monthlyPayment, // בשפיצר זה תמיד קבוע
//       };
//     }

//     /* ─────────────── קרן שווה ─────────────── */
//     case 2: {
//       const monthlyPayment = P / n + P * r; // תשלום ראשון
//       return {
//         amortization_schedule_id: 2,
//         monthlyPayment,
//         maxMonthlyPayment: monthlyPayment,
//       };
//     }

//     /* ─────────────── בלון חלקי ─────────────── */
//     case 3: {
//       const monthlyPayment = P * r; // ריבית בלבד
//       return {
//         amortization_schedule_id: 3,
//         monthlyPayment,
//         maxMonthlyPayment: monthlyPayment,
//       };
//     }

//     /* ─────────────── בלון מלא ─────────────── */
//     case 4: {
//       return {
//         amortization_schedule_id: 4,
//         monthlyPayment: 0, // אין החזר חודשי
//         maxMonthlyPayment: 0,
//       };
//     }

//     default: {
//       return {
//         amortization_schedule_id: loan.amortization_schedule_id,
//         monthlyPayment: 0,
//       };
//     }
//   }
// }





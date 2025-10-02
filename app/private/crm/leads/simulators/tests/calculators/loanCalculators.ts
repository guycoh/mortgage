// loanCalculators.ts
import { paths } from "@/app/data/paths";

export type Loan = {
  id: string;
  amount: number;
  rate: number; // ריבית שנתית באחוזים
  months: number;
  amortization_schedule_id: number; // 1=שפיצר, 2=קרן שווה, 3=בלון חלקי, 4=בלון מלא
  mix_id: string;
  path_id: number; // מקשר למסלול
};

export type ScheduleRow = {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  openingBalance: number;
  closingBalance: number;
};

export type LoanResult = {
  amortization_schedule_id: number;
  monthlyPayment: number; // תשלום חודשי התחלה
  maxMonthlyPayment: number; // תשלום חודשי בשיא
  totalPrincipal: number; // סך קרן
  totalInterest: number; // סך ריבית
  totalPaid: number; // סך תשלום כולל
  isIndexed: boolean;
  schedule: ScheduleRow[];
};

/**
 * מחשב את תוצאות ההלוואה לפי סוג לוח סילוקין
 */
export function calculateLoan(
  loan: Loan,
  annualInflation: number = 0
): LoanResult {
  const path = paths.find((p) => p.id === loan.path_id);
  const isIndexed = path?.indexed ?? false;

  const P = loan.amount;
  const n = loan.months;
  const r = loan.rate / 12 / 100;
  const infl = isIndexed ? annualInflation / 12 / 100 : 0;

  let schedule: ScheduleRow[] = [];
  let totalPrincipal = 0;
  let totalInterest = 0;
  let totalPaid = 0;
  let maxMonthlyPayment = 0;
  let monthlyPayment = 0;

  switch (loan.amortization_schedule_id) {
    /* ─────────────── לוח שפיצר ─────────────── */
    case 1: {
      let balance = P;

      // תשלום חודשי התחלתי לפי קרן מקורית
      const baseMp =
        r === 0
          ? P / n
          : (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

      for (let month = 1; month <= n; month++) {
        // הצמדה ליתרת הפתיחה לפני חישוב התשלום
        if (isIndexed && month > 1) {
          balance *= 1 + infl;
        }

        const openingBalance = balance;

        // תשלום חודשי צמוד אינפלציה
        const mp = isIndexed
          ? baseMp * Math.pow(1 + infl, month - 1)
          : baseMp;

        const interest = balance * r;
        const principal = mp - interest;

        // יתרת סגירה עם הצמדה אם צריך
        let closingBalance = Math.max(balance - principal, 0);
        if (isIndexed) {
          closingBalance *= 1 + infl;
        }

        schedule.push({
          month,
          payment: mp,
          principal,
          interest,
          openingBalance,
          closingBalance,
        });

        balance = closingBalance;
        totalPrincipal += principal;
        totalInterest += interest;
        totalPaid += mp;
        maxMonthlyPayment = Math.max(maxMonthlyPayment, mp);
      }

      monthlyPayment = schedule[0]?.payment || 0;
      break;
    }

    /* ─────────────── קרן שווה ─────────────── */
    case 2: {
      const principalPerMonth = P / n;
      let balance = P;

      for (let month = 1; month <= n; month++) {
        if (isIndexed && month > 1) {
          balance *= 1 + infl;
        }

        const openingBalance = balance;
        const interest = balance * r;
        const payment = principalPerMonth + interest;
        const closingBalance = Math.max(balance - principalPerMonth, 0);

        schedule.push({
          month,
          payment: isIndexed ? payment * Math.pow(1 + infl, month - 1) : payment,
          principal: principalPerMonth,
          interest,
          openingBalance,
          closingBalance: isIndexed ? closingBalance * Math.pow(1 + infl, month - 1) : closingBalance,
        });

        balance = closingBalance;
        totalPrincipal += principalPerMonth;
        totalInterest += interest;
        totalPaid += payment;
        maxMonthlyPayment = Math.max(maxMonthlyPayment, payment);
      }

      monthlyPayment = schedule[0]?.payment || 0;
      break;
    }

    /* ─────────────── בלון חלקי ─────────────── */
    case 3: {
      let balance = P;
      for (let month = 1; month <= n; month++) {
        if (isIndexed && month > 1) {
          balance *= 1 + infl;
        }

        const interest = balance * r;
        let principalPayment = 0;
        let payment = interest;

        if (month === n) {
          principalPayment = balance;
          payment += principalPayment;
          balance = 0;
        }

        const openingBalance = month === 1 ? P : schedule[month - 2].closingBalance;
        const closingBalance = balance;

        schedule.push({
          month,
          payment: isIndexed ? payment * Math.pow(1 + infl, month - 1) : payment,
          principal: principalPayment,
          interest,
          openingBalance,
          closingBalance: isIndexed ? closingBalance * Math.pow(1 + infl, month - 1) : closingBalance,
        });

        totalPrincipal += principalPayment;
        totalInterest += interest;
        totalPaid += payment;
        maxMonthlyPayment = Math.max(maxMonthlyPayment, payment);
      }

      monthlyPayment = schedule[0]?.payment || 0;
      break;
    }

    /* ─────────────── בלון מלא ─────────────── */
    case 4: {
      let balance = P;
      for (let month = 1; month <= n; month++) {
        const openingBalance = month === 1 ? P : schedule[month - 2].closingBalance;
        const interest = openingBalance * r;
        const indexation = openingBalance * infl;

        balance = openingBalance + interest + indexation;
        let payment = 0;

        if (month === n) {
          payment = balance;
          totalPrincipal = P; // כל הקרן מוחזרת בסוף
          totalPaid += payment;
          maxMonthlyPayment = payment;
        }

        schedule.push({
          month,
          payment,
          principal: month === n ? P : 0,
          interest,
          openingBalance,
          closingBalance: balance,
        });
      }

      monthlyPayment = 0;
      break;
    }

    default: {
      schedule = [];
      monthlyPayment = 0;
      maxMonthlyPayment = 0;
      totalPrincipal = 0;
      totalInterest = 0;
      totalPaid = 0;
      break;
    }
  }

  return {
    amortization_schedule_id: loan.amortization_schedule_id,
    monthlyPayment,
    maxMonthlyPayment,
    totalPrincipal,
    totalInterest,
    totalPaid,
    isIndexed,
    schedule,
  };
}

















// export type Loan = {
//   id: string; // מזהה ייחודי להלוואה
//   amount: number;
//   rate: number; // ריבית שנתית באחוזים
//   months: number;
//   amortization_schedule_id: number; // 1=שפיצר, 2=קרן שווה, 3=בלון חלקי, 4=בלון מלא
//   mix_id: string;
// };

// export type ScheduleRow = {
//   month: number;
//   payment: number;
//   principal: number;
//   interest: number;
//   openingBalance: number;
//   closingBalance: number;
// };

// export type LoanResult = {
//   amortization_schedule_id: number;
//   monthlyPayment: number;    // תשלום חודשי התחלה
//   maxMonthlyPayment: number; // תשלום חודשי בשיא

//   totalInterest: number;     // סך ריבית
//   totalPaid: number;         // סך תשלום כולל
//   isIndexed: boolean;
//   schedule: ScheduleRow[];
// }






// /**
//  * מחשב את תוצאות ההלוואה לפי סוג לוח סילוקין
//  */
// export function calculateLoan(loan: Loan, isIndexed: boolean, annualInflation: number): LoanResult {
//   const P = loan.amount;
//   const n = loan.months;
//   const r = loan.rate / 12 / 100;
//   const infl = isIndexed ? annualInflation / 12 / 100 : 0;

//   let schedule: ScheduleRow[] = [];
//   let totalInterest = 0;
//   let totalPaid = 0;
//   let maxMonthlyPayment = 0;
//   let monthlyPayment = 0;

//   switch (loan.amortization_schedule_id) {
// /* ─────────────── לוח שפיצר צמוד ──────── */
//     case 1: { // שפיצר
//       let balance = P;
//       for (let month = 1; month <= n; month++) {
//         // קודם נגדיר את יתרת הפתיחה (לפני הצמדה)
//         const openingBalance = balance;

//         // הצמדה על יתרת הפתיחה (בחודש הראשון זה כבר חל)
//         if (isIndexed) balance *= 1 + infl;

//         const remainingMonths = n - month + 1;

//         const mp = r === 0
//           ? balance / remainingMonths
//           : (balance * r * Math.pow(1 + r, remainingMonths)) /
//             (Math.pow(1 + r, remainingMonths) - 1);

//         const interest = balance * r;
//         const principal = mp - interest;
//         const closingBalance = Math.max(balance - principal, 0);

//         schedule.push({
//           month,
//           payment: mp,
//           principal,
//           interest,
//           openingBalance, // 👈 עכשיו תמיד נכון: בחודש 1 זה סכום ההלוואה
//           closingBalance,
//         });

//         balance = closingBalance;
//         totalInterest += interest;
//         totalPaid += mp;
//         maxMonthlyPayment = Math.max(maxMonthlyPayment, mp);
//       }
//       monthlyPayment = schedule[0]?.payment || 0;
//       break;
//     }
// /* ─────────────── קרן שווה ─────────────── */
//     case 2: { // קרן שווה
//       const principalPerMonth = P / n;
//       let balance = P;
//       const mp = principalPerMonth + P * r; // חישוב ראשוני
//       for (let month = 1; month <= n; month++) {
//         const interest = balance * r;
//         const payment = principalPerMonth + interest;
//         const openingBalance = balance;
//         const closingBalance = Math.max(openingBalance - principalPerMonth, 0);

//         schedule.push({ month, payment, principal: principalPerMonth, interest, openingBalance, closingBalance });

//         balance = closingBalance;
//         totalInterest += interest;
//         totalPaid += payment;
//         maxMonthlyPayment = Math.max(maxMonthlyPayment, payment);
//       }
//       monthlyPayment = mp;
//       break;
//     }
// /* ─────────────── בלון חלקי ─────────────── */
//     case 3: { // בלון חלקי
//       let balance = P;
//       for (let month = 1; month <= n; month++) {
//         if (month > 1 && isIndexed) balance *= 1 + infl;

//         const interest = balance * r;
//         let principalPayment = 0;
//         let payment = interest;

//         if (month === n) {
//           principalPayment = balance;
//           payment += principalPayment;
//           balance = 0;
//         }

//         const openingBalance = month === 1 ? P : schedule[month - 2].closingBalance;
//         const closingBalance = balance;

//         schedule.push({ month, payment, principal: principalPayment, interest, openingBalance, closingBalance });

//         totalInterest += interest;
//         totalPaid += payment;
//         maxMonthlyPayment = Math.max(maxMonthlyPayment, payment);
//       }
//       monthlyPayment = schedule[0]?.payment || 0;
//       break;
//     }
// /* ─────────────── בלון מלא ─────────────── */
//     case 4: { // בלון מלא
//       let balance = P;
//       for (let month = 1; month <= n; month++) {
//         const openingBalance = month === 1 ? P : schedule[month - 2].closingBalance;
//         const interest = openingBalance * r;
//         const indexation = openingBalance * infl;

//         balance = openingBalance + interest + indexation;
//         let payment = 0;

//         if (month === n) {
//           payment = balance;
//           totalPaid += payment;
//           maxMonthlyPayment = payment;
//         }

//         totalInterest += interest;

//         schedule.push({
//           month,
//           payment,
//           principal: month === n ? P : 0,
//           interest,
//           openingBalance,
//           closingBalance: balance,
//         });
//       }
//       monthlyPayment = 0;
//       break;
//     }

//     default: {
//       schedule = [];
//       monthlyPayment = 0;
//       maxMonthlyPayment = 0;
//       totalInterest = 0;
//       totalPaid = 0;
//       break;
//     }
//   }

//   return {
//     amortization_schedule_id: loan.amortization_schedule_id,
//     monthlyPayment,
//     maxMonthlyPayment,
//     totalInterest,
//     totalPaid,
//     isIndexed,
//     schedule,
//   };
// }

























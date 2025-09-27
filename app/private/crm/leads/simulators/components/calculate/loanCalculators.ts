// loanCalculators.ts

// loanCalculators.ts

export type Loan = {
  id: string; // מזהה ייחודי להלוואה
  amount: number;
  rate: number; // ריבית שנתית באחוזים
  months: number;
  amortization_schedule_id: number; // 1=שפיצר, 2=קרן שווה, 3=בלון חלקי, 4=בלון מלא
  mix_id: string;
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
  monthlyPayment: number;    // תשלום חודשי התחלה
  maxMonthlyPayment: number; // תשלום חודשי בשיא
  totalInterest: number;     // סך ריבית
  totalPaid: number;         // סך תשלום כולל
  isIndexed: boolean;
  schedule: ScheduleRow[];
};

/**
 * מחשב את תוצאות ההלוואה לפי סוג לוח סילוקין
 */
export function calculateLoan(loan: Loan, isIndexed: boolean, annualInflation: number): LoanResult {
  const P = loan.amount;
  const n = loan.months;
  const r = loan.rate / 12 / 100;
  const infl = isIndexed ? annualInflation / 12 / 100 : 0;

  let schedule: ScheduleRow[] = [];
  let totalInterest = 0;
  let totalPaid = 0;
  let maxMonthlyPayment = 0;
  let monthlyPayment = 0;

  switch (loan.amortization_schedule_id) {
/* ─────────────── לוח שפיצר צמוד ──────── */
    case 1: { // שפיצר
      let balance = P;
      for (let month = 1; month <= n; month++) {
        if (month > 1 && isIndexed) balance *= 1 + infl;

        const remainingMonths = n - month + 1;
        const mp = r === 0
          ? balance / remainingMonths
          : (balance * r * Math.pow(1 + r, remainingMonths)) / (Math.pow(1 + r, remainingMonths) - 1);

        const interest = balance * r;
        const principal = mp - interest;
        const openingBalance = balance;
        const closingBalance = Math.max(openingBalance - principal, 0);

        schedule.push({ month, payment: mp, principal, interest, openingBalance, closingBalance });

        balance = closingBalance;
        totalInterest += interest;
        totalPaid += mp;
        maxMonthlyPayment = Math.max(maxMonthlyPayment, mp);
      }
      monthlyPayment = schedule[0]?.payment || 0;
      break;
    }
/* ─────────────── קרן שווה ─────────────── */
    case 2: { // קרן שווה
      const principalPerMonth = P / n;
      let balance = P;
      const mp = principalPerMonth + P * r; // חישוב ראשוני
      for (let month = 1; month <= n; month++) {
        const interest = balance * r;
        const payment = principalPerMonth + interest;
        const openingBalance = balance;
        const closingBalance = Math.max(openingBalance - principalPerMonth, 0);

        schedule.push({ month, payment, principal: principalPerMonth, interest, openingBalance, closingBalance });

        balance = closingBalance;
        totalInterest += interest;
        totalPaid += payment;
        maxMonthlyPayment = Math.max(maxMonthlyPayment, payment);
      }
      monthlyPayment = mp;
      break;
    }
/* ─────────────── בלון חלקי ─────────────── */
    case 3: { // בלון חלקי
      let balance = P;
      for (let month = 1; month <= n; month++) {
        if (month > 1 && isIndexed) balance *= 1 + infl;

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

        schedule.push({ month, payment, principal: principalPayment, interest, openingBalance, closingBalance });

        totalInterest += interest;
        totalPaid += payment;
        maxMonthlyPayment = Math.max(maxMonthlyPayment, payment);
      }
      monthlyPayment = schedule[0]?.payment || 0;
      break;
    }
/* ─────────────── בלון מלא ─────────────── */
    case 4: { // בלון מלא
      let balance = P;
      for (let month = 1; month <= n; month++) {
        const openingBalance = month === 1 ? P : schedule[month - 2].closingBalance;
        const interest = openingBalance * r;
        const indexation = openingBalance * infl;

        balance = openingBalance + interest + indexation;
        let payment = 0;

        if (month === n) {
          payment = balance;
          totalPaid += payment;
          maxMonthlyPayment = payment;
        }

        totalInterest += interest;

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
      totalInterest = 0;
      totalPaid = 0;
      break;
    }
  }

  return {
    amortization_schedule_id: loan.amortization_schedule_id,
    monthlyPayment,
    maxMonthlyPayment,
    totalInterest,
    totalPaid,
    isIndexed,
    schedule,
  };
}

















// export type Loan = {
//     id: string; // 👈 מזהה ייחודי להלוואה
//   amount: number;
//   rate: number; // ריבית שנתית באחוזים
//   months: number;
//   amortization_schedule_id: number; // 1=שפיצר, 2=קרן שווה, 3=בלון חלקי, 4=בלון מלא
//   mix_id: string;
// };

// export type LoanResult = {
//   amortization_schedule_id: number;
//   monthlyPayment: number; // תשלום חודשי
//   maxMonthlyPayment?: number; // תשלום חודשי בשיא
//   totalInterest?: number; // סה"כ ריבית
//   totalPaid?: number; // סה"כ תשלום כולל
//   isIndexed: boolean; // ✨ חדש
//   schedule?: ScheduleRow[]; // ✨ לוח סילוקין
// };

// export type ScheduleRow = {
//   month: number;
//   payment: number;
//   principal: number;
//   interest: number;
//   openingBalance: number; // יתרת פתיחה
//   closingBalance: number; // יתרת סגירה
// };



// /**
//  * מחשב את תוצאות ההלוואה לפי סוג לוח סילוקין
//  * @param loan - הלוואה
//  * @param isIndexed - האם הלוואה צמודה
//  */
// export function calculateLoan(loan: Loan, isIndexed: boolean,annualInflation: number ): LoanResult {
//   const P = loan.amount;
//   const n = loan.months;
//   const r = loan.rate / 12 / 100;
//   const infl = isIndexed ? annualInflation / 12 / 100 : 0; // הצמדה חודשית
 
 
//   switch (loan.amortization_schedule_id) {
 
  
//     /* ─────────────── לוח שפיצר צמוד ──────── */
//     case 1: {
//       let balance = P;
//       let totalInterest = 0;
//       let totalPaid = 0;
//       let maxMonthlyPayment = 0;

//       const schedule: ScheduleRow[] = [];

//       for (let month = 1; month <= n; month++) {
//         // ✨ הצמדת יתרה לפתיחת החודש
//         if (month > 1 && isIndexed) {
//           balance *= 1 + infl;
//         }

//         const remainingMonths = n - month + 1;

//         // ✨ חישוב תשלום שפיצר לפי היתרה החדשה
//         const monthlyPayment =
//           r === 0
//             ? balance / remainingMonths
//             : (balance * r * Math.pow(1 + r, remainingMonths)) /
//               (Math.pow(1 + r, remainingMonths) - 1);

//         const interest = balance * r;
//         const principal = monthlyPayment - interest;
//         const openingBalance = balance;
//         const closingBalance = openingBalance - principal;

//         schedule.push({
//           month,
//           payment: monthlyPayment,
//           principal,
//           interest,
//           openingBalance,
//           closingBalance: closingBalance > 0 ? closingBalance : 0,
//         });

//         balance = closingBalance;
//         totalInterest += interest;
//         totalPaid += monthlyPayment;
//         maxMonthlyPayment = Math.max(maxMonthlyPayment, monthlyPayment);
//       }

//       return {
//         amortization_schedule_id: 1,
//         monthlyPayment: schedule[0]?.payment || 0, // התשלום ההתחלתי (משתנה בהמשך)
//         maxMonthlyPayment,
//         totalInterest,
//         totalPaid,
//         isIndexed,
//         schedule,
//       };
//     }

//    /* ─────────────── קרן שווה ─────────────── */
//     case 2: {
//       // נשאר – תשלום חודשי חישובי (ממוצע גס או הערכה)
//       const monthlyPayment = P / n + P * r;

//       // נוסיף לוח סילוקין אמיתי
//       const principalPerMonth = P / n;
//       let balance = P;
//       let maxMonthlyPayment = 0;
//       let totalInterest = 0;
//       let totalPaid = 0;

//       const schedule: {
//         month: number;
//         payment: number;
//         principal: number;
//         interest: number;
//         openingBalance: number;
//         closingBalance: number;
//       }[] = [];

//       for (let month = 1; month <= n; month++) {
//         const interest = balance * r;
//         const payment = principalPerMonth + interest;

//         const openingBalance = balance;
//         const closingBalance = openingBalance - principalPerMonth;

//         schedule.push({
//           month,
//           payment,
//           principal: principalPerMonth,
//           interest,
//           openingBalance,
//           closingBalance: closingBalance > 0 ? closingBalance : 0,
//         });

//         balance = closingBalance;
//         maxMonthlyPayment = Math.max(maxMonthlyPayment, payment);
//         totalInterest += interest;
//         totalPaid += payment;
//       }

//       return {
//         amortization_schedule_id: 2,
//         monthlyPayment, // ✨ שומר על הקיים
//         maxMonthlyPayment,
//         totalInterest,
//         totalPaid,
//         isIndexed,
//         schedule, // ✨ לוח סילוקין אמיתי
//       };
//     }
   
//    /* ─────────────── בלון חלקי ─────────────── */
//     case 3: {
//       let balance = P;
//       let totalInterest = 0;
//       let totalPaid = 0;
//       let maxMonthlyPayment = 0;

//       const schedule: ScheduleRow[] = [];

//       for (let month = 1; month <= n; month++) {
//         // ✨ הצמדה לקרן
//         if (month > 1 && isIndexed) {
//           balance *= 1 + infl;
//         }

//         const interest = balance * r;
//         let principalPayment = 0;
//         let payment = interest;

//         // ✨ בחודש האחרון משלמים את כל הקרן
//         if (month === n) {
//           principalPayment = balance;
//           payment += principalPayment;
//           balance = 0;
//         }

//         const openingBalance = month === 1 ? P : schedule[month - 2].closingBalance;
//         const closingBalance = balance;

//         schedule.push({
//           month,
//           payment,
//           principal: principalPayment,
//           interest,
//           openingBalance,
//           closingBalance,
//         });

//         totalInterest += interest;
//         totalPaid += payment;
//         maxMonthlyPayment = Math.max(maxMonthlyPayment, payment);
//       }

//       return {
//         amortization_schedule_id: 3,
//         monthlyPayment: schedule[0]?.payment || 0, // תשלום ראשון (רק ריבית)
//         maxMonthlyPayment,
//         totalInterest,
//         totalPaid,
//         isIndexed,
//         schedule,
//       };
//     }

//     /* ─────────────── בלון מלא ─────────────── */
//      case 4: {
//       const monthlyPayment = 0; // תמיד 0 עבור הטבלה
//       let balance = P;
//       let maxMonthlyPayment = 0;
//       let totalInterest = 0;
//       let totalPaid = 0;

//       const schedule: ScheduleRow[] = [];

//       for (let month = 1; month <= n; month++) {
//         const openingBalance = month === 1 ? P : schedule[month - 2].closingBalance;

//         // חישוב ריבית חודשית
//         const interest = openingBalance * r;

//         // הצמדה חודשית (אם צמוד)
//         const indexation = openingBalance * infl;

//         balance = openingBalance + interest + indexation;

//         // תשלום חודשי 0 עד החודש האחרון
//         let payment = 0;

//         // חודש אחרון – מחזירים הכל
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

//       return {
//         amortization_schedule_id: 4,
//         monthlyPayment, // תמיד 0
//         maxMonthlyPayment,
//         totalInterest,
//         totalPaid,
//         isIndexed,
//         schedule,
//       };
//     }


//         default: {
//           return {
//             amortization_schedule_id: loan.amortization_schedule_id,
//             monthlyPayment: 0,
//             isIndexed,
//           };
//         }
//       }
//     }






















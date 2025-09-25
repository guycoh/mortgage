// loanCalculators.ts

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
 
  
    /* ─────────────── לוח שפיצר צמוד ──────── */
    case 1: {
      let balance = P;
      let totalInterest = 0;
      let totalPaid = 0;
      let maxMonthlyPayment = 0;

      const schedule: ScheduleRow[] = [];

      for (let month = 1; month <= n; month++) {
        // ✨ הצמדת יתרה לפתיחת החודש
        if (month > 1 && isIndexed) {
          balance *= 1 + infl;
        }

        const remainingMonths = n - month + 1;

        // ✨ חישוב תשלום שפיצר לפי היתרה החדשה
        const monthlyPayment =
          r === 0
            ? balance / remainingMonths
            : (balance * r * Math.pow(1 + r, remainingMonths)) /
              (Math.pow(1 + r, remainingMonths) - 1);

        const interest = balance * r;
        const principal = monthlyPayment - interest;
        const openingBalance = balance;
        const closingBalance = openingBalance - principal;

        schedule.push({
          month,
          payment: monthlyPayment,
          principal,
          interest,
          openingBalance,
          closingBalance: closingBalance > 0 ? closingBalance : 0,
        });

        balance = closingBalance;
        totalInterest += interest;
        totalPaid += monthlyPayment;
        maxMonthlyPayment = Math.max(maxMonthlyPayment, monthlyPayment);
      }

      return {
        amortization_schedule_id: 1,
        monthlyPayment: schedule[0]?.payment || 0, // התשלום ההתחלתי (משתנה בהמשך)
        maxMonthlyPayment,
        totalInterest,
        totalPaid,
        isIndexed,
        schedule,
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
      let balance = P;
      let totalInterest = 0;
      let totalPaid = 0;
      let maxMonthlyPayment = 0;

      const schedule: ScheduleRow[] = [];

      for (let month = 1; month <= n; month++) {
        // ✨ הצמדה לקרן
        if (month > 1 && isIndexed) {
          balance *= 1 + infl;
        }

        const interest = balance * r;
        let principalPayment = 0;
        let payment = interest;

        // ✨ בחודש האחרון משלמים את כל הקרן
        if (month === n) {
          principalPayment = balance;
          payment += principalPayment;
          balance = 0;
        }

        const openingBalance = month === 1 ? P : schedule[month - 2].closingBalance;
        const closingBalance = balance;

        schedule.push({
          month,
          payment,
          principal: principalPayment,
          interest,
          openingBalance,
          closingBalance,
        });

        totalInterest += interest;
        totalPaid += payment;
        maxMonthlyPayment = Math.max(maxMonthlyPayment, payment);
      }

      return {
        amortization_schedule_id: 3,
        monthlyPayment: schedule[0]?.payment || 0, // תשלום ראשון (רק ריבית)
        maxMonthlyPayment,
        totalInterest,
        totalPaid,
        isIndexed,
        schedule,
      };
    }

    /* ─────────────── בלון מלא ─────────────── */
     case 4: {
      const monthlyPayment = 0; // תמיד 0 עבור הטבלה
      let balance = P;
      let maxMonthlyPayment = 0;
      let totalInterest = 0;
      let totalPaid = 0;

      const schedule: ScheduleRow[] = [];

      for (let month = 1; month <= n; month++) {
        const openingBalance = month === 1 ? P : schedule[month - 2].closingBalance;

        // חישוב ריבית חודשית
        const interest = openingBalance * r;

        // הצמדה חודשית (אם צמוד)
        const indexation = openingBalance * infl;

        balance = openingBalance + interest + indexation;

        // תשלום חודשי 0 עד החודש האחרון
        let payment = 0;

        // חודש אחרון – מחזירים הכל
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

      return {
        amortization_schedule_id: 4,
        monthlyPayment, // תמיד 0
        maxMonthlyPayment,
        totalInterest,
        totalPaid,
        isIndexed,
        schedule,
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



























// // utils/amortizationCalculator.ts

// export type ScheduleRow = {
//   month: number;
//   payment: number;
//   principal: number;
//   interest: number;
//   openingBalance: number; // יתרת פתיחה
//   closingBalance: number; // יתרת סגירה
// };

// export type LoanParams = {
//   amount: number;
//   months: number;
//   rate: number; // אחוז שנתי
//   amortization_schedule_id: number; // 1=שפיצר, 2=קרן שווה, 3=בלון חלקי, 4=בלון מלא
//   annualInflation?: number;
//   isIndexed?: boolean;
//   monthlyPayment?: number; // במקרה של בלון חלקי
// };

// export type AmortizationResult = {
//   schedule: ScheduleRow[];
//   monthlyPayment: number;
// };

// // חישוב ריבית חודשית
// const monthlyRate = (rate: number) => rate / 100 / 12;


// /* ─────────────── לוח שפיצר ─────────────── */
// function calcSpitzer(params: LoanParams): ScheduleRow[] {
//   const { amount, months, rate } = params;
//   const r = monthlyRate(rate);

//   const annuityFactor = (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
//   const fixedPayment = amount * annuityFactor;

//   let balance = amount;
//   const rows: ScheduleRow[] = [];

//   for (let m = 1; m <= months; m++) {
//     const interest = balance * r;
//     const principal = fixedPayment - interest;
//     const closingBalance = balance - principal;

//     rows.push({
//       month: m,
//       payment: fixedPayment,
//       principal,
//       interest,
//       openingBalance: balance,
//       closingBalance,
//     });

//     balance = closingBalance;
//   }

//   return rows;
// }


// /* ─────────────── קרן שווה  ─────────────── */
// function calcEqualPrincipal(params: LoanParams): ScheduleRow[] {
//   const { amount, months, rate, annualInflation = 0, isIndexed } = params;
//   const r = monthlyRate(rate);

//   const fixedPrincipal = amount / months;
//   let balance = amount;
//   const rows: ScheduleRow[] = [];

//   const monthlyInflation = isIndexed ? annualInflation / 100 / 12 : 0;

//   for (let m = 1; m <= months; m++) {
//     const adjustedBalance = balance * (1 + monthlyInflation);
//     const interest = adjustedBalance * r;
//     const payment = fixedPrincipal + interest;
//     const closingBalance = adjustedBalance - fixedPrincipal;

//     rows.push({
//       month: m,
//       payment,
//       principal: fixedPrincipal,
//       interest,
//       openingBalance: adjustedBalance,
//       closingBalance,
//     });

//     balance = closingBalance;
//   }

//   return rows;
// }


// /* ─────────────── בלון חלקי ─────────────── */
// function calcPartialBalloon(params: LoanParams): ScheduleRow[] {
//   const { amount, months, rate, annualInflation = 0, isIndexed } = params;
//   const r = monthlyRate(rate);
//   const monthlyInflation = isIndexed ? annualInflation / 100 / 12 : 0;

//   let balance = amount;
//   const rows: ScheduleRow[] = [];

//   for (let m = 1; m <= months; m++) {
//     const interest = balance * r;
//     const indexation = balance * monthlyInflation;
//     let payment = interest + indexation;
//     let principal = 0;

//     if (m === months) {
//       principal = balance;
//       payment += principal;
//     }

//     const closingBalance = m === months ? 0 : balance;

//     rows.push({
//       month: m,
//       payment,
//       principal,
//       interest: interest + indexation,
//       openingBalance: balance,
//       closingBalance,
//     });
//   }

//   return rows;
// }


// /* ─────────────── בלון מלא ─────────────── */
// function calcFullBalloon(params: LoanParams): ScheduleRow[] {
//   const { amount, months, rate, annualInflation = 0, isIndexed } = params;
//   const r = monthlyRate(rate);
//   const monthlyInflation = isIndexed ? annualInflation / 100 / 12 : 0;

//   let balance = amount;
//   const rows: ScheduleRow[] = [];

//   for (let m = 1; m <= months; m++) {
//     const interest = balance * r;
//     const indexation = balance * monthlyInflation;
//     let payment = 0;
//     let principal = 0;

//     if (m === months) {
//       principal = amount;
//       payment = balance + interest + indexation;
//     }

//     const closingBalance = m === months ? 0 : balance + interest + indexation;

//     rows.push({
//       month: m,
//       payment,
//       principal,
//       interest: interest + indexation,
//       openingBalance: balance,
//       closingBalance,
//     });

//     balance = closingBalance;
//   }

//   return rows;
// }


// /* ─────────────── Router לפי amortization_schedule_id ─────────────── */
// export function calculateAmortization(params: LoanParams): AmortizationResult {
//   let schedule: ScheduleRow[] = [];

//   switch (params.amortization_schedule_id) {
//     case 1:
//       schedule = calcSpitzer(params);
//       break;
//     case 2:
//       schedule = calcEqualPrincipal(params);
//       break;
//     case 3:
//       schedule = calcPartialBalloon(params);
//       break;
//     case 4:
//       schedule = calcFullBalloon(params);
//       break;
//     default:
//       throw new Error("Unsupported amortization schedule type");
//   }

//   // החזר חודשי – לוקחים את הראשון (או 0 אם לא קיים)
//   const monthlyPayment = schedule[0]?.payment || 0;

//   return { schedule, monthlyPayment };
// }
















// export type ScheduleRow = {
//   month: number;
//   payment: number;
//   principal: number;
//   interest: number;
//   openingBalance: number; // יתרת פתיחה
//   closingBalance: number; // יתרת סגירה
// };

// type LoanParams = {
//   amount: number;
//   months: number;
//   rate: number; // אחוז שנתי
//   amortization_schedule_id: number; // 1=שפיצר, 2=קרן שווה, 3=בלון חלקי, 4=בלון מלא
//   annualInflation?: number;
//   isIndexed?: boolean;
//   monthlyPayment?: number; // במקרה של בלון חלקי
// };

// // חישוב חודשי ריבית
// const monthlyRate = (rate: number) => rate / 100 / 12;

// /* ─────────────── לוח שפיצר ─────────────── */
// function calcSpitzer(params: LoanParams): ScheduleRow[] {
//   const { amount, months, rate } = params;
//   const r = monthlyRate(rate);

//   const annuityFactor = (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
//   const fixedPayment = amount * annuityFactor;

//   let balance = amount;
//   const rows: ScheduleRow[] = [];

//   for (let m = 1; m <= months; m++) {
//     const interest = balance * r;
//     const principal = fixedPayment - interest;
//     const closingBalance = balance - principal;

//     rows.push({
//       month: m,
//       payment: fixedPayment,
//       principal,
//       interest,
//       openingBalance: balance,
//       closingBalance,
//     });

//     balance = closingBalance;
//   }

//   return rows;
// }

// //* ─────────────── קרן שווה עם הצמדה ─────────────── */
// function calcEqualPrincipal(params: LoanParams): ScheduleRow[] {
//   const { amount, months, rate, annualInflation = 0, isIndexed } = params;
//   const r = monthlyRate(rate);

//   const fixedPrincipal = amount / months;
//   let balance = amount;
//   const rows: ScheduleRow[] = [];

//   const monthlyInflation = isIndexed ? annualInflation / 100 / 12 : 0;

//   for (let m = 1; m <= months; m++) {
//     // הצמדה ליתרה לפני חישוב ריבית
//     const adjustedBalance = balance * (1 + monthlyInflation);

//     const interest = adjustedBalance * r;
//     const payment = fixedPrincipal + interest;

//     const closingBalance = adjustedBalance - fixedPrincipal;

//     rows.push({
//       month: m,
//       payment,
//       principal: fixedPrincipal,
//       interest,
//       openingBalance: adjustedBalance,
//       closingBalance,
//     });

//     balance = closingBalance;
//   }

//   return rows;
// }


// /* ─────────────── בלון חלקי (רק ריבית + הצמדה) ─────────────── */
// function calcPartialBalloon(params: LoanParams): ScheduleRow[] {
//   const { amount, months, rate, annualInflation = 0, isIndexed } = params;
//   const r = monthlyRate(rate);

//   // אינפלציה חודשית אם יש הצמדה
//   const monthlyInflation = isIndexed ? annualInflation / 100 / 12 : 0;

//   let balance = amount;
//   const rows: ScheduleRow[] = [];

//   for (let m = 1; m <= months; m++) {
//     // חישוב ריבית והצמדה
//     const interest = balance * r;
//     const indexation = balance * monthlyInflation;
//     const monthlyPayment = interest + indexation;

//     let principal = 0;
//     let payment = monthlyPayment;

//     // חודש אחרון: משלמים גם את הקרן
//     if (m === months) {
//       principal = balance;
//       payment += principal;
//     }

//     const closingBalance = m === months ? 0 : balance;

//     rows.push({
//       month: m,
//       payment,
//       principal,
//       interest: interest + indexation,
//       openingBalance: balance,
//       closingBalance,
//     });

//     // הקרן נשארת אותו דבר עד החודש האחרון
//     // balance = closingBalance; // ניתן להשאיר את זה ברירת מחדל
//   }

//   return rows;
// }


// /* ─────────────── בלון מלא ─────────────── */
// function calcFullBalloon(params: LoanParams): ScheduleRow[] {
//   const { amount, months, rate, annualInflation = 0, isIndexed } = params;
//   const r = monthlyRate(rate);

//   // אינפלציה חודשית אם יש הצמדה
//   const monthlyInflation = isIndexed ? annualInflation / 100 / 12 : 0;

//   let balance = amount;
//   const rows: ScheduleRow[] = [];

//   for (let m = 1; m <= months; m++) {
//     // חישוב ריבית + הצמדה
//     const interest = balance * r;
//     const indexation = balance * monthlyInflation;

//     let payment = 0;
//     let principal = 0;

//     // בחודש האחרון מחזירים הכל
//     if (m === months) {
//       principal = amount;
//       payment = balance + interest + indexation; // קרן + כל התוספות
//     }

//     const closingBalance =
//       m === months ? 0 : balance + interest + indexation;

//     rows.push({
//       month: m,
//       payment,
//       principal,
//       interest: interest + indexation,
//       openingBalance: balance,
//       closingBalance,
//     });

//     balance = closingBalance;
//   }

//   return rows;
// }






// /* ─────────────── Router לפי amortization_schedule_id ─────────────── */
// export function calculateAmortization(params: LoanParams): ScheduleRow[] {
//   switch (params.amortization_schedule_id) {
//     case 1:
//       return calcSpitzer(params);
//     case 2:
//       return calcEqualPrincipal(params);
//     case 3:
//       return calcPartialBalloon(params);
//     case 4:
//       return calcFullBalloon(params);
//     default:
//       throw new Error("Unsupported amortization schedule type");
//   }
// }

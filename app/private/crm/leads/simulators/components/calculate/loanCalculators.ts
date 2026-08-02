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
  /** 1=ללא, 2=חלקי (ריבית בלבד), 3=מלא (הריבית נצברת לקרן). אופציונלי —
   *  שורות ותיקות בלי השדות (או עם null מה־DB) מתנהגות כ"ללא", כמו קודם. */
  grace_type_id?: number | null;
  grace_months?: number | null;
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
  annualInflation: number = 0   // 👈 ברירת מחדל אפס
): LoanResult {
  const path = paths.find((p) => p.id === loan.path_id);
  const isIndexed = path?.indexed ?? false;

  const P = loan.amount;
  const n = loan.months;
  const r = loan.rate / 12 / 100;
  const infl = isIndexed ? annualInflation / 12 / 100 : 0;

  // גרייס — עד עכשיו השדות נערכו בממשק ונשמרו, אבל המנוע התעלם מהם לגמרי.
  // חלקי (2): בחודשי הגרייס משולמת ריבית בלבד והקרן קופאת.
  // מלא (3): לא משולם דבר והריבית נצברת לקרן (וגם ההצמדה, במסלול צמוד).
  // בלונים (3/4) הם ממילא צורת גרייס — השדות לא חלים עליהם.
  const graceType = loan.grace_type_id ?? 1;
  const g =
    (graceType === 2 || graceType === 3) && n > 1
      ? Math.min(Math.max(Math.floor(loan.grace_months ?? 0), 0), n - 1)
      : 0;

  let schedule: ScheduleRow[] = [];
  let totalPrincipal = 0;
  let totalInterest = 0;
  let totalPaid = 0;
  let maxMonthlyPayment = 0;
  let monthlyPayment = 0;

  switch (loan.amortization_schedule_id) {
   /* ─────────────── לוח שפיצר ─────────────── */
    case 1: {
      // נשמור את היתרה ברמות "ריאליות" (ללא הצמדה)
      let balanceReal = P;

      /* ── חודשי הגרייס, אם ישנם ─────────────────────────────────────
         בחלקי הקרן קופאת והריבית משולמת; במלא דבר לא משולם והריבית
         מצטרפת לקרן. בגרייס מלא הקרן ה"שלילית" בשורה שומרת על הזהות
         סך־תשלומים = סך־קרן + סך־ריבית: הריבית שנצברה נספרת פעם אחת
         כאן, ונפרעת אחר־כך דרך שורות הקרן של החודשים האמורטיים. */
      for (let month = 1; month <= g; month++) {
        const factorPrev = Math.pow(1 + infl, month - 1);
        const factorCurr = Math.pow(1 + infl, month);
        const openingReal = balanceReal;
        const openingDisplay = openingReal * factorPrev;

        const interestReal = openingReal * r;
        const interestNominal = isIndexed ? interestReal * factorCurr : interestReal;

        const full = graceType === 3;
        const paymentNominal = full ? 0 : interestNominal;
        const principalNominal = full ? -interestNominal : 0;
        const closingReal = full ? openingReal * (1 + r) : openingReal;
        const closingDisplay = isIndexed ? closingReal * factorCurr : closingReal;

        schedule.push({
          month,
          payment: paymentNominal,
          principal: principalNominal,
          interest: interestNominal,
          openingBalance: openingDisplay,
          closingBalance: closingDisplay,
        });

        balanceReal = closingReal;
        totalPrincipal += principalNominal;
        totalInterest += interestNominal;
        totalPaid += paymentNominal;
        maxMonthlyPayment = Math.max(maxMonthlyPayment, paymentNominal);
      }

      // תשלום חודשי בסיסי (ריאלי, ללא הצמדה) — על היתרה שאחרי הגרייס,
      // לאורך החודשים שנותרו. בלי גרייס זה בדיוק החישוב הקודם.
      const nAmort = n - g;
      const baseMp =
        r === 0
          ? balanceReal / nAmort
          : (balanceReal * r * Math.pow(1 + r, nAmort)) / (Math.pow(1 + r, nAmort) - 1);

      for (let month = g + 1; month <= n; month++) {
        // גורמי הצמדה
        const factorPrev = Math.pow(1 + infl, month - 1); // להצגת י.פ
        const factorCurr = Math.pow(1 + infl, month); // להצגת תשלום/ריבית/י.ס

        // י.פ ריאלי ונומינלי להצגה
        const openingReal = balanceReal;
        const openingDisplay = openingReal * factorPrev; // י.פ מוצג (בחודש 1 = P)

        // תשלום נומינלי (המשתמש משלם בתום החודש, לכן משתמשים ב-factorCurr)
        const paymentNominal = isIndexed ? baseMp * factorCurr : baseMp;

        // ריבית ריאלית על יתרת הפתיחה, וריבית נומינלית להצגה
        const interestReal = openingReal * r;
        const interestNominal = isIndexed ? interestReal * factorCurr : interestReal;

        // קרן (נומינלית) = תשלום נומינלי - ריבית נומינלית
        const principalNominal = paymentNominal - interestNominal;

        // המרה חזרה לריאלי כדי לעדכן יתרה
        const principalReal = isIndexed ? principalNominal / factorCurr : principalNominal;

        // יתרת סגירה ריאלית (לפני הצמדה)
        let closingReal = Math.max(openingReal - principalReal, 0);

        // יתרת סגירה להצגה (נומינלית) — מוכפלת ב-factorCurr (כי זה סוף חודש)
        const closingDisplay = isIndexed ? closingReal * factorCurr : closingReal;

        // הדוח — מציג ערכים נומינליים (כפי שהמשתמש רואה)
        schedule.push({
          month,
          payment: paymentNominal,
          principal: principalNominal,
          interest: interestNominal,
          openingBalance: openingDisplay,
          closingBalance: closingDisplay,
        });

        // לעבור לחודש הבא: היתרה הריאלית עוברת
        balanceReal = closingReal;

        // סכומים מצטברים — בסכומים נומינליים (מה שמשולם)
        totalPrincipal += principalNominal;
        totalInterest += interestNominal;
        totalPaid += paymentNominal;
        maxMonthlyPayment = Math.max(maxMonthlyPayment, paymentNominal);
      }

      monthlyPayment = schedule[0]?.payment || 0;
      break;
    }
    /* ─────────────── קרן שווה ─────────────── */
    case 2: {
      let balance = P;

      /* ── חודשי הגרייס, אם ישנם — אותם כללים כמו בשפיצר ── */
      for (let month = 1; month <= g; month++) {
        const openingBalance = balance;
        const interest = openingBalance * r;
        const full = graceType === 3;
        const payment = full ? 0 : interest;
        const principal = full ? -interest : 0;
        let closingBalance = full ? openingBalance + interest : openingBalance;
        if (isIndexed) closingBalance *= 1 + infl;

        schedule.push({ month, payment, principal, interest, openingBalance, closingBalance });
        balance = closingBalance;
        totalPrincipal += principal;
        totalInterest += interest;
        totalPaid += payment;
        maxMonthlyPayment = Math.max(maxMonthlyPayment, payment);
      }

      // הקרן החודשית — היתרה שאחרי הגרייס על פני החודשים שנותרו.
      const basePrincipal = balance / (n - g);

      for (let month = g + 1; month <= n; month++) {
        const openingBalance = balance;

        // קרן חודשית צמודה — ההצמדה נמדדת מסוף הגרייס, כי הבסיס כבר צמוד
        const principal = isIndexed
          ? basePrincipal * Math.pow(1 + infl, month - g)
          : basePrincipal;

        // ריבית חודשית צמודה
        const interest = openingBalance * r;

        const payment = principal + interest;

        // יתרת סגירה לפני הצמדה
        let closingBalance = Math.max(openingBalance - principal, 0);

        // הצמדה ליתרת סגירה
        if (isIndexed) {
          closingBalance *= 1 + infl;
        }

        schedule.push({
          month,
          payment,
          principal,
          interest,
          openingBalance,
          closingBalance,
        });

        balance = closingBalance;

        totalPrincipal += principal;
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
      const openingBalance = balance; // י.פ

      // ריבית חודשית
      const interest = openingBalance * r;

      // קרן חודשית
      let principalPayment = month === n ? balance : 0;

      const payment = interest + principalPayment;

      // יתרת סגירה
      let closingBalance = Math.max(openingBalance - principalPayment, 0);

      // הצמדה למדד בסוף החודש
      if (isIndexed) {
        closingBalance *= 1 + infl;
      }

      schedule.push({
        month,
        payment: payment,
        principal: principalPayment,
        interest,
        openingBalance,
        closingBalance,
      });

      balance = closingBalance;

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

        // עלות המימון נצברת בכל חודש — קודם totalInterest נשאר 0 לנצח,
        // וסרגל "סה"כ ריבית" והאקסל הציגו אפס ריבית על בלון מלא.
        // ההצמדה נספרת יחד עם הריבית, כך שסך־תשלום = קרן + ריבית.
        totalInterest += interest + indexation;

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


















// // loanCalculators.ts
// import { paths } from "@/app/data/paths"; 

// export type Loan = {
//   id: string; // מזהה ייחודי להלוואה
//   amount: number;
//   rate: number; // ריבית שנתית באחוזים
//   months: number;
//   amortization_schedule_id: number; // 1=שפיצר, 2=קרן שווה, 3=בלון חלקי, 4=בלון מלא
//   mix_id: string;
//   path_id: number;              // 👈 מקשר למסלול (Path)
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
//   totalPrincipal: number;    // סך קרן 🆕
//   totalInterest: number;     // סך ריבית
//   totalPaid: number;         // סך תשלום כולל
//   isIndexed: boolean;
//   schedule: ScheduleRow[];
// };






// /**
//  * מחשב את תוצאות ההלוואה לפי סוג לוח סילוקין
//  */
// export function calculateLoan(
//   loan: Loan,
//  annualInflation: number = 0

// ): LoanResult {
//   const path = paths.find((p) => p.id === loan.path_id);
//   const isIndexed = path?.indexed ?? false;
 
 
//   const P = loan.amount;
//   const n = loan.months;
//   const r = loan.rate / 12 / 100;
  
  
//   const infl = isIndexed ? annualInflation / 12 / 100 : 0;

//   let schedule: ScheduleRow[] = [];
//   let totalPrincipal = 0;
//   let totalInterest = 0;
//   let totalPaid = 0;
//   let maxMonthlyPayment = 0;
//   let monthlyPayment = 0;

//   switch (loan.amortization_schedule_id) {
//     /* ─────────────── לוח שפיצר ─────────────── */
//     case 1: {
//       let balance = P;
//       for (let month = 1; month <= n; month++) {
//         const openingBalance = balance;

//         if (isIndexed) balance *= 1 + infl;

//         const remainingMonths = n - month + 1;
//         const mp =
//           r === 0
//             ? balance / remainingMonths
//             : (balance * r * Math.pow(1 + r, remainingMonths)) /
//               (Math.pow(1 + r, remainingMonths) - 1);

//         const interest = balance * r;
//         const principal = mp - interest;
//         const closingBalance = Math.max(balance - principal, 0);

//         schedule.push({
//           month,
//           payment: mp,
//           principal,
//           interest,
//           openingBalance,
//           closingBalance,
//         });

//         balance = closingBalance;
//         totalPrincipal += principal;
//         totalInterest += interest;
//         totalPaid += mp;
//         maxMonthlyPayment = Math.max(maxMonthlyPayment, mp);
//       }
//       monthlyPayment = schedule[0]?.payment || 0;
//       break;
//     }

//     /* ─────────────── קרן שווה ─────────────── */
//     case 2: {
//       const principalPerMonth = P / n;
//       let balance = P;
//       const mp = principalPerMonth + P * r;

//       for (let month = 1; month <= n; month++) {
//         const interest = balance * r;
//         const payment = principalPerMonth + interest;
//         const openingBalance = balance;
//         const closingBalance = Math.max(openingBalance - principalPerMonth, 0);

//         schedule.push({
//           month,
//           payment,
//           principal: principalPerMonth,
//           interest,
//           openingBalance,
//           closingBalance,
//         });

//         balance = closingBalance;
//         totalPrincipal += principalPerMonth;
//         totalInterest += interest;
//         totalPaid += payment;
//         maxMonthlyPayment = Math.max(maxMonthlyPayment, payment);
//       }
//       monthlyPayment = mp;
//       break;
//     }

//     /* ─────────────── בלון חלקי ─────────────── */
//     case 3: {
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

//         const openingBalance =
//           month === 1 ? P : schedule[month - 2].closingBalance;
//         const closingBalance = balance;

//         schedule.push({
//           month,
//           payment,
//           principal: principalPayment,
//           interest,
//           openingBalance,
//           closingBalance,
//         });

//         totalPrincipal += principalPayment;
//         totalInterest += interest;
//         totalPaid += payment;
//         maxMonthlyPayment = Math.max(maxMonthlyPayment, payment);
//       }
//       monthlyPayment = schedule[0]?.payment || 0;
//       break;
//     }

//     /* ─────────────── בלון מלא ─────────────── */
//     case 4: {
//       let balance = P;
//       for (let month = 1; month <= n; month++) {
//         const openingBalance =
//           month === 1 ? P : schedule[month - 2].closingBalance;
//         const interest = openingBalance * r;
//         const indexation = openingBalance * infl;

//         balance = openingBalance + interest + indexation;
//         let payment = 0;

//         if (month === n) {
//           payment = balance;
//           totalPrincipal = P; // כל הקרן מוחזרת בסוף
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
//       totalPrincipal = 0;
//       totalInterest = 0;
//       totalPaid = 0;
//       break;
//     }
//   }

//   return {
//     amortization_schedule_id: loan.amortization_schedule_id,
//     monthlyPayment,
//     maxMonthlyPayment,
//     totalPrincipal,   // 🆕 מוחזר תמיד
//     totalInterest,
//     totalPaid,
//     isIndexed,
//     schedule,
//   };
// }





























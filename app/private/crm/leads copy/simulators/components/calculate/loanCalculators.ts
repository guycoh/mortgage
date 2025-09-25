// utils/amortizationCalculator.ts

export type ScheduleRow = {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  openingBalance: number; // יתרת פתיחה
  closingBalance: number; // יתרת סגירה
};

export type LoanParams = {
  amount: number;
  months: number;
  rate: number; // אחוז שנתי
  amortization_schedule_id: number; // 1=שפיצר, 2=קרן שווה, 3=בלון חלקי, 4=בלון מלא
  annualInflation?: number;
  isIndexed?: boolean;
  monthlyPayment?: number; // במקרה של בלון חלקי
};

export type AmortizationResult = {
  schedule: ScheduleRow[];
  monthlyPayment: number;
};

// חישוב ריבית חודשית
const monthlyRate = (rate: number) => rate / 100 / 12;


/* ─────────────── לוח שפיצר ─────────────── */
function calcSpitzer(params: LoanParams): ScheduleRow[] {
  const { amount, months, rate } = params;
  const r = monthlyRate(rate);

  const annuityFactor = (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  const fixedPayment = amount * annuityFactor;

  let balance = amount;
  const rows: ScheduleRow[] = [];

  for (let m = 1; m <= months; m++) {
    const interest = balance * r;
    const principal = fixedPayment - interest;
    const closingBalance = balance - principal;

    rows.push({
      month: m,
      payment: fixedPayment,
      principal,
      interest,
      openingBalance: balance,
      closingBalance,
    });

    balance = closingBalance;
  }

  return rows;
}


/* ─────────────── קרן שווה עם הצמדה ─────────────── */
function calcEqualPrincipal(params: LoanParams): ScheduleRow[] {
  const { amount, months, rate, annualInflation = 0, isIndexed } = params;
  const r = monthlyRate(rate);

  const fixedPrincipal = amount / months;
  let balance = amount;
  const rows: ScheduleRow[] = [];

  const monthlyInflation = isIndexed ? annualInflation / 100 / 12 : 0;

  for (let m = 1; m <= months; m++) {
    const adjustedBalance = balance * (1 + monthlyInflation);
    const interest = adjustedBalance * r;
    const payment = fixedPrincipal + interest;
    const closingBalance = adjustedBalance - fixedPrincipal;

    rows.push({
      month: m,
      payment,
      principal: fixedPrincipal,
      interest,
      openingBalance: adjustedBalance,
      closingBalance,
    });

    balance = closingBalance;
  }

  return rows;
}


/* ─────────────── בלון חלקי ─────────────── */
function calcPartialBalloon(params: LoanParams): ScheduleRow[] {
  const { amount, months, rate, annualInflation = 0, isIndexed } = params;
  const r = monthlyRate(rate);
  const monthlyInflation = isIndexed ? annualInflation / 100 / 12 : 0;

  let balance = amount;
  const rows: ScheduleRow[] = [];

  for (let m = 1; m <= months; m++) {
    const interest = balance * r;
    const indexation = balance * monthlyInflation;
    let payment = interest + indexation;
    let principal = 0;

    if (m === months) {
      principal = balance;
      payment += principal;
    }

    const closingBalance = m === months ? 0 : balance;

    rows.push({
      month: m,
      payment,
      principal,
      interest: interest + indexation,
      openingBalance: balance,
      closingBalance,
    });
  }

  return rows;
}


/* ─────────────── בלון מלא ─────────────── */
function calcFullBalloon(params: LoanParams): ScheduleRow[] {
  const { amount, months, rate, annualInflation = 0, isIndexed } = params;
  const r = monthlyRate(rate);
  const monthlyInflation = isIndexed ? annualInflation / 100 / 12 : 0;

  let balance = amount;
  const rows: ScheduleRow[] = [];

  for (let m = 1; m <= months; m++) {
    const interest = balance * r;
    const indexation = balance * monthlyInflation;
    let payment = 0;
    let principal = 0;

    if (m === months) {
      principal = amount;
      payment = balance + interest + indexation;
    }

    const closingBalance = m === months ? 0 : balance + interest + indexation;

    rows.push({
      month: m,
      payment,
      principal,
      interest: interest + indexation,
      openingBalance: balance,
      closingBalance,
    });

    balance = closingBalance;
  }

  return rows;
}


/* ─────────────── Router לפי amortization_schedule_id ─────────────── */
export function calculateAmortization(params: LoanParams): AmortizationResult {
  let schedule: ScheduleRow[] = [];

  switch (params.amortization_schedule_id) {
    case 1:
      schedule = calcSpitzer(params);
      break;
    case 2:
      schedule = calcEqualPrincipal(params);
      break;
    case 3:
      schedule = calcPartialBalloon(params);
      break;
    case 4:
      schedule = calcFullBalloon(params);
      break;
    default:
      throw new Error("Unsupported amortization schedule type");
  }

  // החזר חודשי – לוקחים את הראשון (או 0 אם לא קיים)
  const monthlyPayment = schedule[0]?.payment || 0;

  return { schedule, monthlyPayment };
}
















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

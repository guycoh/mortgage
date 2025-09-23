export type ScheduleRow = {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
};

export type Loan = {
  amount: number;
  rate: number;      // שנתית %
  months: number;    // מספר חודשים
};

// ===================
// לוח שפיצר (Annuitized)
// ===================
export function calculateSpitzer(loan: Loan): ScheduleRow[] {
  const monthlyRate = loan.rate / 100 / 12;
  const annuityFactor =
    (monthlyRate * Math.pow(1 + monthlyRate, loan.months)) /
    (Math.pow(1 + monthlyRate, loan.months) - 1);

  const monthlyPayment = loan.amount * annuityFactor;
  let balance = loan.amount;
  const schedule: ScheduleRow[] = [];

  for (let i = 1; i <= loan.months; i++) {
    const interest = balance * monthlyRate;
    const principal = monthlyPayment - interest;
    balance -= principal;

    schedule.push({
      month: i,
      payment: monthlyPayment,
      principal,
      interest,
      balance: Math.max(balance, 0),
    });
  }

  return schedule;
}

// ===================
// לוח קרן שווה (Equal Principal)
// ===================
export function calculateEqualPrincipal(loan: Loan): ScheduleRow[] {
  const monthlyPrincipal = loan.amount / loan.months;
  const monthlyRate = loan.rate / 100 / 12;

  let balance = loan.amount;
  const schedule: ScheduleRow[] = [];

  for (let i = 1; i <= loan.months; i++) {
    const interest = balance * monthlyRate;
    const payment = monthlyPrincipal + interest;
    balance -= monthlyPrincipal;

    schedule.push({
      month: i,
      payment,
      principal: monthlyPrincipal,
      interest,
      balance: Math.max(balance, 0),
    });
  }

  return schedule;
}

// ===================
// לוח בלון (Partial / Full)
// ===================
export function calculateBullet(loan: Loan): ScheduleRow[] {
  const monthlyRate = loan.rate / 100 / 12;
  const schedule: ScheduleRow[] = [];

  for (let i = 1; i <= loan.months; i++) {
    const interest = loan.amount * monthlyRate;
    const payment =
      i === loan.months
        ? loan.amount + interest // הסוף: קרן + ריבית
        : interest;             // לאורך הדרך: רק ריבית

    schedule.push({
      month: i,
      payment,
      principal: i === loan.months ? loan.amount : 0,
      interest,
      balance: i === loan.months ? 0 : loan.amount,
    });
  }

  return schedule;
}

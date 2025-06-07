'use client';


interface SpitzerProps {
  
  loanAmount: number;
  annualInterest: number;
  annualIndex: number;
  months: number;
  isLinkedToIndex: boolean;
}

export default function SpitzerScheduleModal({
  
  loanAmount,
  annualInterest,
  annualIndex,
  months,
  isLinkedToIndex,
}: SpitzerProps) {

  const monthlyInterest = annualInterest / 12 / 100;
  const monthlyIndex = isLinkedToIndex
    ? Math.pow(1 + annualIndex / 100, 1 / 12) - 1
    : 0;

  const monthlyPayment =
    (loanAmount * monthlyInterest) /
    (1 - Math.pow(1 + monthlyInterest, -months));

  const amortizationSchedule = Array.from({ length: months + 1 }, (_, i) => i);
  const rowlines = [];
  let remainingPrincipal = loanAmount;

  for (let month = 0; month <= months; month++) {
    if (month === 0) {
      rowlines.push({
        month,
        openingBalance: null,
        principal: null,
        interest: null,
        payment: null,
        closingBalance: +loanAmount.toFixed(2),
      });
    } else {
      const interestPayment = remainingPrincipal * monthlyInterest * (1 + monthlyIndex);
      const payment = monthlyPayment * Math.pow(1 + monthlyIndex, month);
      const principalPayment = payment - interestPayment;

      const openingBalance = remainingPrincipal;
      const closingBalance = (openingBalance * (1 + monthlyIndex)) - principalPayment;

      rowlines.push({
        month,
        openingBalance: +openingBalance.toFixed(2),
        principal: +principalPayment.toFixed(2),
        interest: +interestPayment.toFixed(2),
        payment: +payment.toFixed(2),
        closingBalance: +Math.max(closingBalance, 0).toFixed(2),
      });

      remainingPrincipal = closingBalance;
    }
  }

  const totalPrincipal = rowlines.reduce((sum, row) => sum + (row.principal || 0), 0);
  const totalInterest = rowlines.reduce((sum, row) => sum + (row.interest || 0), 0);
  const totalPayment = rowlines.reduce((sum, row) => sum + (row.payment || 0), 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
  
</div>

  );
}

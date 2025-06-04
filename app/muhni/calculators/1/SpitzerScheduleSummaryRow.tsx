//אמורה לסכם הכל

import { useEffect } from "react";

interface SpitzerScheduleSummaryRowProps {
  loanAmount: number;
  annualInterest: number;
  annualIndex: number;
  months: number;
  isLinkedToIndex: boolean;
  onCalculated: (rowIndex: number, result: {
    totalPrincipal: number;
    totalInterest: number;
    totalLinkage: number;
    totalPayment: number;
  }) => void;
  rowIndex: number;
}

export default function SpitzerScheduleSummaryRow({
  loanAmount,
  annualInterest,
  annualIndex,
  months,
  isLinkedToIndex,
  onCalculated,
  rowIndex
}: SpitzerScheduleSummaryRowProps) {
  const monthlyInterest = annualInterest / 12 / 100;
  const monthlyIndex = isLinkedToIndex
    ? Math.pow(1 + annualIndex / 100, 1 / 12) - 1
    : 0;

  const monthlyPayment =
    (loanAmount * monthlyInterest) /
    (1 - Math.pow(1 + monthlyInterest, -months));

  let remainingPrincipal = loanAmount;
  const rows = [];

  for (let month = 0; month <= months; month++) {
    if (month > 0) {
      const interestPayment = remainingPrincipal * monthlyInterest * (1 + monthlyIndex);
      const payment = monthlyPayment * Math.pow(1 + monthlyIndex, month);
      const principalPayment = payment - interestPayment;
      const closingBalance = (remainingPrincipal * (1 + monthlyIndex)) - principalPayment;

      rows.push({
        principal: principalPayment,
        interest: interestPayment,
        linkage: payment - (principalPayment + interestPayment),
        payment
      });

      remainingPrincipal = closingBalance;
    }
  }

  const totalPrincipal = rows.reduce((sum, row) => sum + row.principal, 0);
  const totalInterest = rows.reduce((sum, row) => sum + row.interest, 0);
  const totalPayment = rows.reduce((sum, row) => sum + row.payment, 0);
  const totalLinkage = totalPayment - (totalPrincipal + totalInterest);

  useEffect(() => {
    onCalculated(rowIndex, {
      totalPrincipal,
      totalInterest,
      totalLinkage,
      totalPayment
    });
  }, [rowIndex, totalPrincipal, totalInterest, totalLinkage, totalPayment]);

  return (
    <tr className="text-right">
      <td>{loanAmount.toLocaleString()} ₪</td>
      <td>{totalPrincipal.toFixed(0)} ₪</td>
      <td>{totalInterest.toFixed(0)} ₪</td>
      <td>{totalLinkage.toFixed(0)} ₪</td>
      <td>{totalPayment.toFixed(0)} ₪</td>
    </tr>
  );
}


'use client';

import React, { useMemo } from 'react';

type Props = {
  loanAmount: number;
  annualInterest: number;
  annualIndex: number;
  months: number;
  isLinkedToIndex: boolean;
};

export const SpitzerSummaryRow = ({
  loanAmount,
  annualInterest,
  annualIndex,
  months,
  isLinkedToIndex,
}: Props) => {
  const summary = useMemo(() => {
    const monthlyInterest = annualInterest / 12 / 100;
    const monthlyIndex = isLinkedToIndex
      ? Math.pow(1 + annualIndex / 100, 1 / 12) - 1
      : 0;

    const monthlyPayment =
      (loanAmount * monthlyInterest) /
      (1 - Math.pow(1 + monthlyInterest, -months));

    const rows = [];
    let remainingPrincipal = loanAmount;

    for (let month = 0; month <= months; month++) {
      if (month === 0) {
        rows.push({
          principal: null,
          interest: null,
          payment: null,
        });
      } else {
        const interestPayment =
          remainingPrincipal * monthlyInterest * (1 + monthlyIndex);
        const payment =
          monthlyPayment * Math.pow(1 + monthlyIndex, month);
        const principalPayment = payment - interestPayment;

        const closingBalance =
          remainingPrincipal * (1 + monthlyIndex) - principalPayment;

        rows.push({
          principal: +principalPayment.toFixed(2),
          interest: +interestPayment.toFixed(2),
          payment: +payment.toFixed(2),
        });

        remainingPrincipal = closingBalance;
      }
    }

    const totalPrincipal = rows.reduce(
      (sum, row) => sum + (row.principal || 0),
      0
    );
    const totalInterest = rows.reduce(
      (sum, row) => sum + (row.interest || 0),
      0
    );
    const totalPayment = rows.reduce(
      (sum, row) => sum + (row.payment || 0),
      0
    );

    const totalLinkage = totalPayment - totalPrincipal - totalInterest;

    return {
      monthlyPayment: +monthlyPayment.toFixed(2),
      totalPrincipal: +totalPrincipal.toFixed(2),
      totalInterest: +totalInterest.toFixed(2),
      totalLinkage: +totalLinkage.toFixed(2),
      totalPayment: +totalPayment.toFixed(2),
    };
  }, [loanAmount, annualInterest, annualIndex, months, isLinkedToIndex]);

  const formatCell = (label: string, value: number) => (
    <div className="flex flex-col text-xs leading-tight">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value.toLocaleString()} ₪</span>
    </div>
  );

  return (
    <tr className="bg-orange-50 text-right">
      <td>{formatCell('תשלום חודשי התחלתי', summary.monthlyPayment)}</td>
      <td>{formatCell('סה״כ קרן', summary.totalPrincipal)}</td>
      <td>{formatCell('סה״כ ריבית', summary.totalInterest)}</td>
      <td>{formatCell('סה״כ הצמדה', summary.totalLinkage)}</td>
      <td>{formatCell('סה״כ תשלום', summary.totalPayment)}</td>
    </tr>
  );
};

"use client"

type Payment = {
  month: number;
  principal: number;
  interest: number;
  total: number;
  balance: number;
  indexedBalance: number;
  monthlyIndexRate: number;
};

type LoanSummaryProps = {
  payments: Payment[];
  principal: number;
};

export default function LoanSummary({ payments, principal }: LoanSummaryProps) {
  if (!payments || payments.length === 0) return null;

  let interestSum = 0;
  let indexSum = 0;

  payments.forEach((p, idx) => {
    interestSum += p.interest;
    const prevBalance = idx === 0 ? principal : payments[idx - 1].balance;
    indexSum += p.indexedBalance - (prevBalance - p.principal);
  });

  const totalPayment = principal + interestSum + indexSum;

  return (
    <div className="mt-6 p-4 bg-gray-100 rounded">
      <p>
        סה״כ ריבית + הצמדה:{" "}
        <strong>{(interestSum + indexSum).toFixed(2)} ₪</strong>
      </p>
      <p>
        סה״כ לקרן: <strong>{principal.toFixed(2)} ₪</strong>
      </p>
      <p>
        סה״כ לתשלום כולל: <strong>{totalPayment.toFixed(2)} ₪</strong>
      </p>
    </div>
  );
}

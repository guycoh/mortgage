'use client';


interface SpitzerScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  loanAmount: number;
  annualInterest: number;
  annualIndex: number;
  months: number;
  isLinkedToIndex: boolean;
}

export default function SpitzerScheduleModal({
  isOpen,
  onClose,
  loanAmount,
  annualInterest,
  annualIndex,
  months,
  isLinkedToIndex,
}: SpitzerScheduleModalProps) {
  if (!isOpen) return null;

  const monthlyInterest = annualInterest / 12 / 100;
  const monthlyIndex = isLinkedToIndex
    ? Math.pow(1 + annualIndex / 100, 1 / 12) - 1
    : 0;

  const monthlyPayment =
    (loanAmount * monthlyInterest) /
    (1 - Math.pow(1 + monthlyInterest, -months));

  const amortizationSchedule = Array.from({ length: months + 1 }, (_, i) => i);
  const rows = [];
  let remainingPrincipal = loanAmount;

  for (let month = 0; month <= months; month++) {
    if (month === 0) {
      rows.push({
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

      rows.push({
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

  const totalPrincipal = rows.reduce((sum, row) => sum + (row.principal || 0), 0);
  const totalInterest = rows.reduce((sum, row) => sum + (row.interest || 0), 0);
  const totalPayment = rows.reduce((sum, row) => sum + (row.payment || 0), 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="relative bg-white rounded-2xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto border border-gray-300 p-6 md:p-10">
             <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-700 hover:text-red-600 text-3xl font-extrabold transition-colors duration-200"
              aria-label="סגור"
            >
              ✕
            </button>


        {/* פרטי הלוואה */}
        {/* <div className="space-y-3 text-gray-800 mb-8">
          <h2 className="text-xl font-bold text-center text-orange-600">📝 פרטי ההלוואה</h2>
          <p>💰 <span className="font-medium">סכום הלוואה:</span> {loanAmount.toLocaleString()} ₪</p>
          <p>📅 <span className="font-medium">תקופת הלוואה:</span> {months} חודשים</p>
          <p>📈 <span className="font-medium">ריבית שנתית:</span> {annualInterest}%</p>
          <p>📊 <span className="font-medium">מדד שנתי צפוי:</span> {annualIndex}%</p>
          <p>✅ <span className="font-medium">צמוד מדד:</span> {isLinkedToIndex ? 'כן' : 'לא'}</p>
          <p>📌 <span className="font-medium">ריבית חודשית:</span> {(monthlyInterest * 100).toFixed(4)}%</p>
          <p>📌 <span className="font-medium">מדד חודשי:</span> {(monthlyIndex * 100).toFixed(4)}%</p>
          <p>💸 <span className="font-medium">תשלום חודשי נומינלי (לפני מדד):</span> {monthlyPayment.toLocaleString(undefined, { maximumFractionDigits: 2 })} ₪</p>
        </div> */}

        {/* טבלת סילוקין */}
        <div>
          <h2 className="text-lg md:text-xl font-bold mb-4 text-center text-gray-800 border-b pb-2 border-orange-200">לוח סילוקין שפיצר</h2>
          <div className="overflow-x-auto rounded-xl border border-gray-300 shadow">
            <table className="min-w-full text-sm text-center border-collapse">
              <thead>
                <tr className="bg-orange-100 text-gray-700">
                  <th className="py-3 px-4 border">תקופה</th>
                  <th className="py-3 px-4 border">יתרה פתיחה</th>
                  <th className="py-3 px-4 border">קרן</th>
                  <th className="py-3 px-4 border">ריבית</th>
                  <th className="py-3 px-4 border">תשלום חודשי</th>
                  <th className="py-3 px-4 border">יתרה סגירה</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {rows.map((row, index) => (
                  <tr key={index} className="hover:bg-orange-50 transition-colors">
                    <td className="py-2 px-4 font-medium">{row.month}</td>
                    <td className="py-2 px-4">{row.openingBalance?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td className="py-2 px-4 text-green-700 font-semibold">{row.principal?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td className="py-2 px-4 text-red-600 font-semibold">{row.interest?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td className="py-2 px-4 text-gray-900 font-bold">{row.payment?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td className="py-2 px-4">{row.closingBalance?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
                <tr className="bg-yellow-100 font-bold text-black border-t-2 border-yellow-400">
                  <td className="py-3 px-4">סה"כ</td>
                  <td className="py-3 px-4"></td>
                  <td className="py-3 px-4 text-green-800">{totalPrincipal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  <td className="py-3 px-4 text-red-800">{totalInterest.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  <td className="py-3 px-4">{totalPayment.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  <td className="py-3 px-4"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

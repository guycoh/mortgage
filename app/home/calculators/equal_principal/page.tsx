"use client"

import { useState } from 'react'
import EqualPrincipalGraph from '@/components/graphs/EqualPrincipalGraph'

function calculateSpitzerPayments(amount: number, months: number, annualRate: number) {
  const monthlyRate = Math.pow(1 + annualRate / 100, 1 / 12) - 1
  const monthlyPayment = amount * (monthlyRate / (1 - Math.pow(1 + monthlyRate, -months)))

  const payments = []
  for (let i = 0; i < months; i++) {
    const interest = amount * monthlyRate
    const principal = monthlyPayment - interest
    amount -= principal
    payments.push({
      month: i + 1,
      principal,
      interest,
      total: monthlyPayment,
    })
  }

  return payments
}

export default function EqualPrincipalCalculator() {
  const [amount, setAmount] = useState(300000)
  const [months, setMonths] = useState(240)
  const [annualRate, setAnnualRate] = useState(5)

  const monthlyRate = Math.pow(1 + annualRate / 100, 1 / 12) - 1
  const principalPart = amount / months

  // קרן שווה
  const equalPrincipalPayments = Array.from({ length: months }, (_, i) => {
    const remaining = amount - principalPart * i
    const interest = remaining * monthlyRate
    const total = principalPart + interest
    return { month: i + 1, principal: principalPart, interest, total }
  })

  const totalEqualInterest = equalPrincipalPayments.reduce((sum, p) => sum + p.interest, 0)
  const equalMonthlyFirst = equalPrincipalPayments[0]?.total || 0
  const equalMonthlyLast = equalPrincipalPayments.at(-1)?.total || 0

  // שפיצר
  const spitzerPayments = calculateSpitzerPayments(amount, months, annualRate)
  const totalSpitzerInterest = spitzerPayments.reduce((sum, p) => sum + p.interest, 0)
  const spitzerMonthlyFirst = spitzerPayments[0]?.total || 0
  const spitzerMonthlyLast = spitzerPayments.at(-1)?.total || 0

  return (
 <div className="flex flex-col items-center bg-gradient-to-b from-[#f8fafc] to-[#e6eff3] min-h-screen py-10 px-4">
  {/* מחשבון */}
  <div className="relative w-full max-w-[900px] flex flex-col items-center">
    {/* גוף התיבה */}
    <div
      className="relative w-full rounded-xl overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #1d75a1 0%, #15516f 100%)",
        boxShadow:
          "0 20px 30px rgba(0,0,0,0.3), inset 0 2px 8px rgba(255,255,255,0.15)",
      }}
    >
      {/* קצה עליון */}
      <div className="absolute top-0 left-0 w-full h-[12px] bg-white/20"></div>

      {/* תוכן המחשבון */}
      <div className="flex flex-col items-center space-y-4 text-white p-6">
        <h1 className="text-2xl font-bold text-center mb-4 text-white drop-shadow-lg">
          מחשבון השוואה: קרן שווה מול שפיצר
        </h1>

        <form className="grid gap-4 grid-cols-1 sm:grid-cols-3 w-full">
          <div>
            <label className="block mb-1 font-medium text-white">סכום ההלוואה</label>
            <input
              type="text"
              inputMode="numeric"
              value={amount.toLocaleString("he-IL")}
              onChange={(e) => {
                const raw = e.target.value.replace(/,/g, "");
                const numericValue = parseInt(raw) || 0;
                setAmount(numericValue);
              }}
              className="w-full rounded-md p-2 text-gray-900 text-sm bg-white/95 shadow-inner focus:outline-none focus:ring-2 focus:ring-main focus:bg-orange-50"
            />
          </div>
          <div>
            <label className="block mb-1 font-medium text-white">מספר חודשים</label>
            <input
              type="number"
              value={months}
              onChange={(e) => setMonths(+e.target.value)}
              className="w-full rounded-md p-2 text-gray-900 text-sm bg-white/95 shadow-inner focus:outline-none focus:ring-2 focus:ring-main focus:bg-orange-50"
            />
          </div>
          <div>
            <label className="block mb-1 font-medium text-white">ריבית שנתית (%)</label>
            <input
              type="number"
              step="0.01"
              value={annualRate}
              onChange={(e) => setAnnualRate(+e.target.value)}
              className="w-full rounded-md p-2 text-gray-900 text-sm bg-white/95 shadow-inner focus:outline-none focus:ring-2 focus:ring-main focus:bg-orange-50"
            />
          </div>
        </form>

        {/* תוצאות */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm w-full">
          <div className="space-y-1 bg-white/10 p-4 rounded-lg shadow-inner">
            <h2 className="text-white font-bold text-lg">קרן שווה</h2>
            <p><strong>סה"כ ריבית:</strong> {totalEqualInterest.toLocaleString('he-IL', { maximumFractionDigits: 2 })} ₪</p>
            <p><strong>תשלום ראשון:</strong> {equalMonthlyFirst.toLocaleString('he-IL', { maximumFractionDigits: 2 })} ₪</p>
            <p><strong>תשלום אחרון:</strong> {equalMonthlyLast.toLocaleString('he-IL', { maximumFractionDigits: 2 })} ₪</p>
          </div>
          <div className="space-y-1 bg-white/10 p-4 rounded-lg shadow-inner">
            <h2 className="text-white font-bold text-lg">שפיצר</h2>
            <p><strong>סה"כ ריבית:</strong> {totalSpitzerInterest.toLocaleString('he-IL', { maximumFractionDigits: 2 })} ₪</p>
            <p><strong>תשלום ראשון:</strong> {spitzerMonthlyFirst.toLocaleString('he-IL', { maximumFractionDigits: 2 })} ₪</p>
            <p><strong>תשלום אחרון:</strong> {spitzerMonthlyLast.toLocaleString('he-IL', { maximumFractionDigits: 2 })} ₪</p>
          </div>
        </div>
      </div>

      {/* קצה תחתון */}
      <div className="absolute bottom-0 left-0 w-full h-[14px] bg-black/20 blur-[2px]"></div>
    </div>

    {/* בסיס/שולחן */}
    <div className="mt-4 w-full h-[12px] bg-gradient-to-b from-[#a9b7bf] to-[#6c7b84] rounded-b-xl shadow-md"></div>

    {/* צל רך מתחת */}
    <div className="mt-2 w-4/5 h-[20px] bg-black/20 blur-2xl rounded-full"></div>
  </div>

  {/* גרפים */}
  <section className="mt-12 w-full max-w-[900px]">
    <div className="bg-gray-50 rounded-2xl shadow-md p-6">
      <h2 className="text-xl font-bold text-main mb-2">גרף תשלומים - קרן שווה</h2>
      <EqualPrincipalGraph payments={equalPrincipalPayments} />

      <h2 className="text-xl font-bold text-main mt-8 mb-2">גרף תשלומים - שפיצר</h2>
      <EqualPrincipalGraph payments={spitzerPayments} />
    </div>
  </section>
</div>




  )
}





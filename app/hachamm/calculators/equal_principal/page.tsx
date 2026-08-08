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
 <div className="hm-page flex-col items-center">
  {/* מחשבון */}
  <div className="relative w-full max-w-225 flex flex-col items-center">
    {/* גוף התיבה */}
    <div className="hm-device w-full">
      <div className="hm-device-gloss" />

      {/* תוכן המחשבון */}
      <div className="relative flex flex-col items-center space-y-4 p-5 sm:p-6">
        <h1 className="text-xl sm:text-2xl font-bold text-center mb-2 drop-shadow-lg">
          מחשבון השוואה: קרן שווה מול שפיצר
        </h1>

        <form className="grid gap-4 grid-cols-1 sm:grid-cols-3 w-full">
          <div>
            <label className="block mb-1 font-medium">סכום ההלוואה</label>
            <input
              type="text"
              inputMode="numeric"
              value={amount.toLocaleString("he-IL")}
              onChange={(e) => {
                const raw = e.target.value.replace(/,/g, "");
                const numericValue = parseInt(raw) || 0;
                setAmount(numericValue);
              }}
              className="hm-field text-sm"
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">מספר חודשים</label>
            <input
              type="number"
              value={months}
              onChange={(e) => setMonths(+e.target.value)}
              className="hm-field text-sm"
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">ריבית שנתית (%)</label>
            <input
              type="number"
              step="0.01"
              value={annualRate}
              onChange={(e) => setAnnualRate(+e.target.value)}
              className="hm-field text-sm"
            />

             </div>
        </form>

        {/* תוצאות */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm w-full">
          <div className="space-y-1 bg-[rgba(255,250,226,0.12)] p-4 rounded-lg shadow-inner">
            <h2 className="font-bold text-lg">קרן שווה</h2>
            <p><strong>סה"כ ריבית:</strong> {totalEqualInterest.toLocaleString('he-IL', { maximumFractionDigits: 2 })} ₪</p>
            <p><strong>תשלום ראשון:</strong> {equalMonthlyFirst.toLocaleString('he-IL', { maximumFractionDigits: 2 })} ₪</p>
            <p><strong>תשלום אחרון:</strong> {equalMonthlyLast.toLocaleString('he-IL', { maximumFractionDigits: 2 })} ₪</p>
          </div>
          <div className="space-y-1 bg-[rgba(255,250,226,0.12)] p-4 rounded-lg shadow-inner">
            <h2 className="font-bold text-lg">שפיצר</h2>
            <p><strong>סה"כ ריבית:</strong> {totalSpitzerInterest.toLocaleString('he-IL', { maximumFractionDigits: 2 })} ₪</p>
            <p><strong>תשלום ראשון:</strong> {spitzerMonthlyFirst.toLocaleString('he-IL', { maximumFractionDigits: 2 })} ₪</p>
            <p><strong>תשלום אחרון:</strong> {spitzerMonthlyLast.toLocaleString('he-IL', { maximumFractionDigits: 2 })} ₪</p>
          </div>
        </div>
      </div>

      <div className="hm-device-shade" />
    </div>

    {/* בסיס/שולחן */}
    <div className="hm-device-base mt-4 w-full h-3 rounded-b-xl shadow-md"></div>

    {/* צל רך מתחת */}
    <div className="mt-2 w-4/5 h-5 bg-black/20 blur-2xl rounded-full"></div>
  </div>

  {/* גרפים */}
  <section className="mt-10 w-full max-w-225">
    <div className="rounded-2xl bg-[var(--hm-paper)] p-4 shadow-md ring-1 ring-[var(--hm-gold-100)] sm:p-6">
      <h2 className="mb-2 text-lg font-bold text-[var(--hm-gold-700)] sm:text-xl">
        גרף תשלומים - קרן שווה
      </h2>
      <div className="hm-scroll-x">
        <EqualPrincipalGraph payments={equalPrincipalPayments} />
      </div>

      <h2 className="mt-8 mb-2 text-lg font-bold text-[var(--hm-gold-700)] sm:text-xl">
        גרף תשלומים - שפיצר
      </h2>
      <div className="hm-scroll-x">
        <EqualPrincipalGraph payments={spitzerPayments} />
      </div>
    </div>
  </section>
</div>




  )
}





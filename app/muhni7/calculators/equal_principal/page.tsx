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
    <div className="max-w-5xl mx-auto p-4">
      <div className="bg-gray-50 rounded-2xl shadow-md p-6">
        <h1 className="text-2xl font-bold text-center mb-6 text-main">מחשבון השוואה: קרן שווה מול שפיצר</h1>

        <form className="grid gap-4 grid-cols-1 sm:grid-cols-3 mb-6">
          <div>
            <label className="block mb-1 font-medium">סכום ההלוואה</label>
            <input
              type="text"
              inputMode="numeric"
              value={amount.toLocaleString('he-IL')}
              onChange={(e) => {
                const raw = e.target.value.replace(/,/g, '')
                const numericValue = parseInt(raw) || 0
                setAmount(numericValue)
              }}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-main focus:bg-orange-50"
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">מספר חודשים</label>
            <input
              type="number"
              value={months}
              onChange={(e) => setMonths(+e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-main focus:bg-orange-50"
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">ריבית שנתית (%)</label>
            <input
              type="number"
              step="0.01"
              value={annualRate}
              onChange={(e) => setAnnualRate(+e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-main focus:bg-orange-50"
            />
          </div>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm mb-8">
          <div className="space-y-1">
            <h2 className="text-main font-bold">קרן שווה</h2>
            <p><strong>סה"כ ריבית:</strong> {totalEqualInterest.toLocaleString('he-IL', { maximumFractionDigits: 2 })} ₪</p>
            <p><strong>תשלום ראשון:</strong> {equalMonthlyFirst.toLocaleString('he-IL', { maximumFractionDigits: 2 })} ₪</p>
            <p><strong>תשלום אחרון:</strong> {equalMonthlyLast.toLocaleString('he-IL', { maximumFractionDigits: 2 })} ₪</p>
          </div>
          <div className="space-y-1">
            <h2 className="text-main font-bold">שפיצר</h2>
            <p><strong>סה"כ ריבית:</strong> {totalSpitzerInterest.toLocaleString('he-IL', { maximumFractionDigits: 2 })} ₪</p>
            <p><strong>תשלום ראשון:</strong> {spitzerMonthlyFirst.toLocaleString('he-IL', { maximumFractionDigits: 2 })} ₪</p>
            <p><strong>תשלום אחרון:</strong> {spitzerMonthlyLast.toLocaleString('he-IL', { maximumFractionDigits: 2 })} ₪</p>
          </div>
        </div>

        <h2 className="text-xl font-bold text-main mb-2">גרף תשלומים - קרן שווה</h2>
        <EqualPrincipalGraph payments={equalPrincipalPayments} />

        <h2 className="text-xl font-bold text-main mt-8 mb-2">גרף תשלומים - שפיצר</h2>
        <EqualPrincipalGraph payments={spitzerPayments} />
      
            
      </div>
    </div>
  )
}










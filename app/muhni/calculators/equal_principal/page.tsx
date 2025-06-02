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







// "use client"

// import { useState } from 'react'
// import EqualPrincipalGraph from '@/components/graphs/EqualPrincipalGraph'

// export default function EqualPrincipalCalculator() {
//   const [amount, setAmount] = useState(300000)
//   const [months, setMonths] = useState(240)
//   const [annualRate, setAnnualRate] = useState(5)

//   // ריבית חודשית מותאמת
//   const monthlyRate = Math.pow(1 + annualRate / 100, 1 / 12) - 1

//   // --- קרן שווה (Equal Principal) ---
//   const principalPart = months > 0 ? amount / months : 0

//   const paymentsEqualPrincipal = months > 0 && amount > 0
//     ? Array.from({ length: months }, (_, i) => {
//         const remaining = amount - principalPart * i
//         const interest = remaining * monthlyRate
//         const total = principalPart + interest
//         return { month: i + 1, principal: principalPart, interest, total }
//       })
//     : []

//   const totalInterestEqualPrincipal = paymentsEqualPrincipal.reduce((sum, p) => sum + p.interest, 0)
//   const monthlyTotalFirstEqualPrincipal = paymentsEqualPrincipal[0]?.total || 0
//   const monthlyTotalLastEqualPrincipal = paymentsEqualPrincipal[paymentsEqualPrincipal.length - 1]?.total || 0

//   // --- שפיצר (Equal Payment) ---
//   // נוסחת שפיצר לתשלום חודשי קבוע:
//   // M = P * r * (1 + r)^n / ((1 + r)^n - 1)
//   // P = amount, r = monthlyRate, n = months
//   const monthlyPaymentSpitzer = months > 0 && amount > 0
//     ? amount * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1)
//     : 0

//   // חישוב סה"כ ריבית שתשלם בשפיצר:
//   // סה"כ תשלום = תשלום חודשי * חודשים
//   // ריבית = סה"כ תשלום - קרן
//   const totalPaymentSpitzer = monthlyPaymentSpitzer * months
//   const totalInterestSpitzer = totalPaymentSpitzer - amount

//   return (
//     <div className="max-w-5xl mx-auto p-4">
//       <div className="bg-gray-50 rounded-2xl shadow-md p-6">
//         <h1 className="text-2xl font-bold text-center mb-6 text-main">מחשבון קרן שווה ושפיצר</h1>

//         <form className="grid gap-4 grid-cols-1 sm:grid-cols-3 mb-6">
//           <div>
//             <label className="block mb-1 font-medium">סכום ההלוואה</label>
//             <input
//               type="text"
//               inputMode="numeric"
//               value={amount.toLocaleString('he-IL')}
//               onChange={(e) => {
//                 const raw = e.target.value.replace(/[^\d]/g, '')
//                 const numericValue = Math.min(Math.max(parseInt(raw) || 0, 0), 10000000) // 0 עד 10 מיליון
//                 setAmount(numericValue)
//               }}
//               className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-main focus:bg-orange-50"
//             />
//           </div>
//           <div>
//             <label className="block mb-1 font-medium">מספר חודשים</label>
//             <input
//               type="number"
//               value={months}
//               min={1}
//               max={480}
//               onChange={(e) => {
//                 const val = Math.min(Math.max(+e.target.value, 1), 480)
//                 setMonths(val)
//               }}
//               className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-main focus:bg-orange-50"
//             />
//           </div>
//           <div>
//             <label className="block mb-1 font-medium">ריבית שנתית (%)</label>
//             <input
//               type="number"
//               step="0.01"
//               value={annualRate}
//               min={0}
//               max={100}
//               onChange={(e) => {
//                 const val = Math.min(Math.max(+e.target.value, 0), 100)
//                 setAnnualRate(val)
//               }}
//               className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-main focus:bg-orange-50"
//             />
//           </div>
//         </form>

//         {amount === 0 || months === 0 ? (
//           <p className="text-red-600 font-medium mb-6">אנא הזן סכום והמספר חודשים תקינים (מעל 0).</p>
//         ) : (
//           <>
//             {/* תוצאות קרן שווה */}
//             <div className="text-sm space-y-2 mb-6">
//               <h2 className="text-lg font-semibold mb-2">קרן שווה (Equal Principal)</h2>
//               <p><strong>סה"כ ריבית שתשולם:</strong> {totalInterestEqualPrincipal.toLocaleString('he-IL', { maximumFractionDigits: 2 })} ₪</p>
//               <p><strong>תשלום חודשי ראשון:</strong> {monthlyTotalFirstEqualPrincipal.toLocaleString('he-IL', { maximumFractionDigits: 2 })} ₪</p>
//               <p><strong>תשלום חודשי אחרון:</strong> {monthlyTotalLastEqualPrincipal.toLocaleString('he-IL', { maximumFractionDigits: 2 })} ₪</p>
//             </div>

//             {/* תוצאות שפיצר */}
//             <div className="text-sm space-y-2 mb-8">
//               <h2 className="text-lg font-semibold mb-2">שפיצר (Equal Payment)</h2>
//               <p><strong>סה"כ ריבית שתשולם:</strong> {totalInterestSpitzer.toLocaleString('he-IL', { maximumFractionDigits: 2 })} ₪</p>
//               <p><strong>תשלום חודשי קבוע:</strong> {monthlyPaymentSpitzer.toLocaleString('he-IL', { maximumFractionDigits: 2 })} ₪</p>
//             </div>
//           </>
//         )}

//         {/* גרף קרן שווה */}
//         <EqualPrincipalGraph payments={paymentsEqualPrincipal} />
//       </div>
//     </div>
//   )
// }







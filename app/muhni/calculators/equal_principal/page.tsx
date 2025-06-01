"use client"

import { useState } from 'react'
import EqualPrincipalGraph from '@/components/graphs/EqualPrincipalGraph'

export default function EqualPrincipalCalculator() {
  const [amount, setAmount] = useState(300000)
  const [months, setMonths] = useState(240)
  const [annualRate, setAnnualRate] = useState(5)

  const monthlyRate = Math.pow(1 + annualRate / 100, 1 / 12) - 1
  const principalPart = months > 0 ? amount / months : 0

  const payments = months > 0 && amount > 0
    ? Array.from({ length: months }, (_, i) => {
        const remaining = amount - principalPart * i
        const interest = remaining * monthlyRate
        const total = principalPart + interest
        return { month: i + 1, principal: principalPart, interest, total }
      })
    : []

  const totalInterest = payments.reduce((sum, p) => sum + p.interest, 0)
  const monthlyTotalFirst = payments[0]?.total || 0
  const monthlyTotalLast = payments[payments.length - 1]?.total || 0

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="bg-gray-50 rounded-2xl shadow-md p-6">
        <h1 className="text-2xl font-bold text-center mb-6 text-main">מחשבון קרן שווה</h1>

        <form className="grid gap-4 grid-cols-1 sm:grid-cols-3 mb-6">
          <div>
            <label className="block mb-1 font-medium">סכום ההלוואה</label>
            <input
              type="text"
              inputMode="numeric"
              value={amount.toLocaleString('he-IL')}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^\d]/g, '')
                const numericValue = Math.min(Math.max(parseInt(raw) || 0, 0), 10000000) // 0 עד 10 מיליון
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
              min={1}
              max={480}
              onChange={(e) => {
                const val = Math.min(Math.max(+e.target.value, 1), 480)
                setMonths(val)
              }}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-main focus:bg-orange-50"
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">ריבית שנתית (%)</label>
            <input
              type="number"
              step="0.01"
              value={annualRate}
              min={0}
              max={100}
              onChange={(e) => {
                const val = Math.min(Math.max(+e.target.value, 0), 100)
                setAnnualRate(val)
              }}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-main focus:bg-orange-50"
            />
          </div>
        </form>

        {amount === 0 || months === 0 ? (
          <p className="text-red-600 font-medium mb-6">אנא הזן סכום והמספר חודשים תקינים (מעל 0).</p>
        ) : (
          <div className="text-sm space-y-2 mb-8">
            <p><strong>סה"כ ריבית שתשולם:</strong> {totalInterest.toLocaleString('he-IL', { maximumFractionDigits: 2 })} ₪</p>
            <p><strong>תשלום חודשי ראשון:</strong> {monthlyTotalFirst.toLocaleString('he-IL', { maximumFractionDigits: 2 })} ₪</p>
            <p><strong>תשלום חודשי אחרון:</strong> {monthlyTotalLast.toLocaleString('he-IL', { maximumFractionDigits: 2 })} ₪</p>
          </div>
        )}

        <EqualPrincipalGraph payments={payments} />
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

//   const monthlyRate = Math.pow(1 + annualRate / 100, 1 / 12) - 1
//   const principalPart = amount / months

//   const payments = Array.from({ length: months }, (_, i) => {
//     const remaining = amount - principalPart * i
//     const interest = remaining * monthlyRate
//     const total = principalPart + interest
//     return { month: i + 1, principal: principalPart, interest, total }
//   })

//   const totalInterest = payments.reduce((sum, p) => sum + p.interest, 0)
//   const monthlyTotal = payments[0]?.total || 0

//   return (
//     <div className="max-w-5xl mx-auto p-4">
//       <div className="bg-gray-50 rounded-2xl shadow-md p-6">
//         <h1 className="text-2xl font-bold text-center mb-6 text-main">מחשבון קרן שווה</h1>

//         <form className="grid gap-4 grid-cols-1 sm:grid-cols-3 mb-6">
//           <div>
//             <label className="block mb-1 font-medium">סכום ההלוואה</label>
//             <input
//               type="text"
//               inputMode="numeric"
//               value={amount.toLocaleString('he-IL')}
//               onChange={(e) => {
//                 const raw = e.target.value.replace(/,/g, '')
//                 const numericValue = parseInt(raw) || 0
//                 setAmount(numericValue)
//               }}
//               className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-main  focus:bg-orange-50"
//             />
//           </div>
//           <div>
//             <label className="block mb-1 font-medium">מספר חודשים</label>
//             <input
//               type="number"
//               value={months}
//               onChange={(e) => setMonths(+e.target.value)}
//               className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-main focus:bg-orange-50 "
//             />
//           </div>
//           <div>
//             <label className="block mb-1 font-medium">ריבית שנתית (%)</label>
//             <input
//               type="number"
//               step="0.01"
//               value={annualRate}
//               onChange={(e) => setAnnualRate(+e.target.value)}
//               className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-main  focus:bg-orange-50"
//             />
//           </div>
//         </form>

//         <div className="text-sm space-y-2 mb-8">
//           <p><strong>סה"כ ריבית שתשולם:</strong> {totalInterest.toLocaleString('he-IL', { maximumFractionDigits: 2 })} ₪</p>
//           <p><strong>תשלום חודשי ראשון:</strong> {monthlyTotal.toLocaleString('he-IL', { maximumFractionDigits: 2 })} ₪</p>
//         </div>

//         <EqualPrincipalGraph payments={payments} />
//       </div>
//     </div>
//   )
// }


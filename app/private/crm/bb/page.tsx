'use client'
import { useState } from 'react'
import BankReportModal from '../components/BankReportModal'

type LoanPart = {
  id: string
  amount: number
  type: string
  interest: number
  linked: boolean
  endDate: string
  months: number
  monthlyPayment: number
  anchorValue?: number
  spread?: number
  calculatedRate?: number
  updatedAt?: string // תאריך שינוי
}


type Plan = {
  id: string
  name: string
  parts: LoanPart[]
}

export default function PlansTabs() {
 
  const [activeIndex, setActiveIndex] = useState(0)

// 🧩 פונקציה מחזירה חלק ריק
    const createEmptyLoanPart = (): LoanPart => ({
    id: crypto.randomUUID(),
    amount: 0,
    type: '',
    interest: 0,
    linked: false,
    endDate: '',
    months: 0,
    monthlyPayment: 0,
    anchorValue: 0,
    spread: 0,
    calculatedRate: 0,
    })

const [plans, setPlans] = useState<Plan[]>([
    {
      id: 'default',
      name: 'תמהיל ברירת מחדל',
      parts: [
        createEmptyLoanPart(),
        createEmptyLoanPart(),
        createEmptyLoanPart(),
      ],
    },
  ])


  const [isModalOpen, setIsModalOpen] = useState(false)



const addPlan = () => {
    const newPlan: Plan = {
      id: crypto.randomUUID(),
      name: `תמהיל חדש ${plans.length + 1}`,
      parts: [
        createEmptyLoanPart(),
        createEmptyLoanPart(),
        createEmptyLoanPart(),
      ],
    }
    setPlans([...plans, newPlan])
    setActiveIndex(plans.length)
  }

const updatePlanName = (index: number, newName: string) => {
  const updated = [...plans]
  updated[index].name = newName
  setPlans(updated)
}

const deleteLoanPart = (planIndex: number, partIndex: number) => {
  const updated = [...plans]
  updated[planIndex].parts.splice(partIndex, 1)
  setPlans(updated)
}


  const duplicatePlan = (index: number) => {
    const base = plans[index]
    const clone: Plan = {
      ...base,
      id: crypto.randomUUID(),
      name: `${base.name} (עותק)`,
      parts: base.parts.map((part) => ({ ...part, id: crypto.randomUUID() })),
    }
    setPlans([...plans, clone])
    setActiveIndex(plans.length)
  }

  const addLoanPart = (planIndex: number) => {
    const updated = [...plans]
    updated[planIndex].parts.push({
      id: crypto.randomUUID(),
      amount: 0,
      type: '',
      interest: 0,
      linked: false,
      endDate: '',
      months: 0,
      monthlyPayment: 0,
      anchorValue: 0,
      spread: 0,
      calculatedRate: 0,
    })
    setPlans(updated)
  }

  const updatePart = <K extends keyof LoanPart>(
    planIndex: number,
    partIndex: number,
    key: K,
    value: LoanPart[K]
  ) => {
    const updated = [...plans]
    updated[planIndex].parts[partIndex] = {
      ...updated[planIndex].parts[partIndex],
      [key]: value,
    }

    const part = updated[planIndex].parts[partIndex]

    if (key === 'anchorValue' || key === 'spread') {
      const rate = (part.anchorValue || 0) + (part.spread || 0)
      updated[planIndex].parts[partIndex].calculatedRate = +rate.toFixed(2)
    }

    if (key === 'amount' || key === 'interest' || key === 'months') {
      const { amount, interest, months } = part
      const r = interest / 100 / 12
      const pmt =
        r === 0 ? (months ? amount / months : 0) : (amount * r) / (1 - Math.pow(1 + r, -months || 1))
      updated[planIndex].parts[partIndex].monthlyPayment = +pmt.toFixed(2)
    }
    updated[planIndex].parts[partIndex].updatedAt = new Date().toISOString().slice(0, 10)
    setPlans(updated)
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 flex-wrap items-center">
        {plans.map((plan, idx) => (
        <div
  key={plan.id}
  className={`flex items-center px-2 py-1 rounded ${
    idx === activeIndex ? 'bg-orange-500 text-white' : 'bg-gray-200'
  }`}
>
  <button onClick={() => setActiveIndex(idx)} className="px-2 py-1 focus:outline-none">
    {idx === 0 ? (
      plan.name
    ) : (
      <input
        type="text"
        value={plan.name}
        onChange={(e) => updatePlanName(idx, e.target.value)}
        className="bg-transparent border-b border-gray-400 focus:outline-none focus:border-orange-600 px-1"
      />
    )}
  </button>
</div>

        ))}
       
       <button 
       onClick={() => setIsModalOpen(true)}
       className="px-3 py-2 rounded bg-green-500 text-white">
         טעינת דוח
        </button>
       
       
       
       
        <button onClick={addPlan} className="px-3 py-2 rounded bg-green-500 text-white">
          + הוסף תמהיל
        </button>
        <button
          onClick={() => duplicatePlan(activeIndex)}
          className="px-3 py-2 rounded bg-blue-500 text-white"
        >
          שכפל תמהיל
        </button>
     
     
     
     
     
      </div>

      {/* Table */}
    <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-200">
  <table className="w-full text-sm text-right border-collapse">
    <thead className="bg-orange-50 text-gray-800 font-semibold">
      <tr className="text-sm">
        <th className="p-2 px-3">סכום ההלוואה</th>
        <th className="p-2 px-3">מסלול</th>
        <th className="p-2 px-3">ריבית</th>
        <th className="p-2 px-3">עוגן</th>
        <th className="p-2 px-3">מרווח</th>
        <th className="p-2 px-3">ריבית מחושבת</th>
        <th className="p-2 px-3">צמוד?</th>
        <th className="p-2 px-3">תאריך סיום</th>
        <th className="p-2 px-3">חודשים</th>
        <th className="p-2 px-3">תשלום חודשי</th>
        <th className="p-2 px-3">עודכן</th>
        <th className="p-2 px-3 text-center">פעולות</th>
      </tr>
    </thead>
    <tbody>
      {plans[activeIndex].parts.map((part, i) => (
        <tr key={part.id} className="border-t text-sm hover:bg-orange-50 transition">
          <td className="p-1 px-3">
            <input
              type="number"
              value={part.amount}
              onChange={(e) => updatePart(activeIndex, i, 'amount', +e.target.value)}
              className="w-full p-1 border rounded text-sm"
            />
          </td>
          <td className="p-1 px-3">
            <input
              value={part.type}
              onChange={(e) => updatePart(activeIndex, i, 'type', e.target.value)}
              className="w-full p-1 border rounded text-sm"
            />
          </td>
          <td className="p-1 px-3">
            <input
              type="number"
              step="0.01"
              value={part.interest}
              onChange={(e) => updatePart(activeIndex, i, 'interest', +e.target.value)}
              className="w-full p-1 border rounded text-sm"
            />
          </td>
          <td className="p-1 px-3">
            <input
              type="number"
              step="0.01"
              value={part.anchorValue || 0}
              onChange={(e) => updatePart(activeIndex, i, 'anchorValue', +e.target.value)}
              className="w-full p-1 border rounded text-sm"
            />
          </td>
          <td className="p-1 px-3">
            <input
              type="number"
              step="0.01"
              value={part.spread || 0}
              onChange={(e) => updatePart(activeIndex, i, 'spread', +e.target.value)}
              className="w-full p-1 border rounded text-sm"
            />
          </td>
          <td className="p-1 px-3 text-center">
            <input
              type="number"
              value={part.calculatedRate?.toFixed(2) || ''}
              readOnly
              className="w-full p-1 border rounded bg-gray-100 text-center text-sm"
            />
          </td>
          <td className="p-1 px-3 text-center">
            <input
              type="checkbox"
              checked={part.linked}
              onChange={(e) => updatePart(activeIndex, i, 'linked', e.target.checked)}
            />
          </td>
          <td className="p-1 px-3">
            <input
              type="date"
              value={part.endDate}
              onChange={(e) => updatePart(activeIndex, i, 'endDate', e.target.value)}
              className="w-full p-1 border rounded text-sm"
            />
          </td>
          <td className="p-1 px-3">
            <input
              type="number"
              value={part.months}
              onChange={(e) => updatePart(activeIndex, i, 'months', +e.target.value)}
              className="w-full p-1 border rounded text-sm"
            />
          </td>
          <td className="p-1 px-3 text-center text-blue-600 font-semibold">
            {part.monthlyPayment.toLocaleString()}
          </td>
          <td className="p-1 px-3 text-gray-500 text-center text-xs">
            {part.updatedAt || ''}
          </td>
          <td className="p-1 px-3 text-center">
            <div className="flex justify-center gap-1">
              <button
                onClick={() => alert(`לוח סילוקין למסלול ${i + 1}`)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded w-20"
              >
                לוח
              </button>
              <button
                onClick={() => deleteLoanPart(activeIndex, i)}
                className="bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded w-20"
              >
                מחק
              </button>
            </div>
          </td>
        </tr>
      ))}
    </tbody>
    <tfoot>
      <tr className="bg-orange-100 font-bold border-t text-sm">
        <td className="px-3 py-2">סה"כ</td>
        <td colSpan={8}></td>
        <td className="text-blue-700 text-center px-3 py-2">
          ₪{plans[activeIndex].parts.reduce((sum, p) => sum + p.monthlyPayment, 0).toLocaleString()}
        </td>
        <td colSpan={2}></td>
      </tr>
    </tfoot>
  </table>

  <div className="flex justify-between items-center mt-4">
    <button
      onClick={() => addLoanPart(activeIndex)}
      className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded shadow-sm"
    >
      + הוסף מסלול
    </button>
  </div>
</div>
 {/* המודאל */}
      <BankReportModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />


    </div>
  )
}

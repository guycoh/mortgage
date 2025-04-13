"use client"
import { useState } from 'react'

export default function EligibilityCalculator() {
  const [form, setForm] = useState({
    marriageYears: '',
    children: '',
    husbandSiblings: '',
    wifeSiblings: '',
    husbandService: '',
    wifeService: '',
    law10Plus: false,
  })

  const [score, setScore] = useState<number | null>(null)
  const [result, setResult] = useState<string>('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const calculateScore = () => {
    const {
      marriageYears,
      children,
      husbandSiblings,
      wifeSiblings,
      husbandService,
      wifeService,
      law10Plus,
    } = form

    const score =
      Math.min(Number(marriageYears) * 2, 20) +
      Math.min(Number(children) * 10, 30) +
      Math.min((Number(husbandSiblings) + Number(wifeSiblings)) * 2, 10) +
      Number(husbandService) * 0.25 +
      Number(wifeService) * 0.25 +
      (law10Plus ? 10 : 0)

    setScore(score)

    let estimatedAmount = 0
    if (score >= 60) estimatedAmount = 100000
    else if (score >= 50) estimatedAmount = 85000
    else if (score >= 40) estimatedAmount = 70000
    else if (score >= 30) estimatedAmount = 50000
    else estimatedAmount = 0

    setResult(
      estimatedAmount > 0
        ? `הניקוד שלך הוא ${score.toFixed(
            2
          )}, ייתכן ואת/ה זכאי/ת לסיוע של כ-${estimatedAmount.toLocaleString()} ש"ח.`
        : `הניקוד שלך הוא ${score.toFixed(
            2
          )}. לא נמצאה זכאות על פי הנתונים שהוזנו.`
    )
  }

  return (
    <div className="max-w-xl mx-auto p-4 bg-white rounded-2xl shadow">
      <h2 className="text-2xl font-bold mb-4 text-center">מחשבון זכאות</h2>

      <div className="space-y-4">
        <Field
          label="שנות נישואין"
          name="marriageYears"
          value={form.marriageYears}
          onChange={handleChange}
        />
        <Field
          label="מספר ילדים"
          name="children"
          value={form.children}
          onChange={handleChange}
        />
        <Field
          label="מספר אחים לבעל"
          name="husbandSiblings"
          value={form.husbandSiblings}
          onChange={handleChange}
        />
        <Field
          label="מספר אחים לאישה"
          name="wifeSiblings"
          value={form.wifeSiblings}
          onChange={handleChange}
        />
        <Field
          label="חודשי שירות צבאי/לאומי לבעל"
          name="husbandService"
          value={form.husbandService}
          onChange={handleChange}
        />
        <Field
          label="חודשי שירות צבאי/לאומי לאישה"
          name="wifeService"
          value={form.wifeService}
          onChange={handleChange}
        />

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="law10Plus"
            checked={form.law10Plus}
            onChange={handleChange}
          />
          משתתף/ת בתוכנית 10+ (חוק הנגב)
        </label>

        <button
          onClick={calculateScore}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl w-full"
        >
          חשב זכאות
        </button>

        {result && (
          <div className="mt-4 p-3 bg-gray-100 rounded-xl text-center text-lg font-medium">
            {result}
          </div>
        )}
      </div>
    </div>
  )
}

function Field({
  label,
  name,
  value,
  onChange,
}: {
  label: string
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <label className="block">
      {label}:
      <input
        type="number"
        name={name}
        value={value}
        onChange={onChange}
        className="mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
      />
    </label>
  )
}

"use client"

import { useEffect, useState } from "react"
import DailyNutritionForm from "./DailyNutritionForm"

export default function DailyLogPage() {
  const [date, setDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  )
  const [data, setData] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)

 useEffect(() => {
  async function loadDay() {
    setLoading(true)
    try {
      const res = await fetch(`/daily-log/api?date=${date}`)
      const json = await res.json()
      setData(json ?? null)
    } catch (err) {
      console.error(err)
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  loadDay()
}, [date])


  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6">
      {/* בחירת תאריך */}
      <div className="bg-white p-4 rounded-xl shadow flex gap-4 items-center">
        <label className="font-semibold">בחר תאריך:</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="border rounded-lg px-3 py-2"
        />
      </div>

      {loading && <p className="text-center">טוען נתונים…</p>}

      {!loading && (
        <DailyNutritionForm
          logDate={date}
          initialData={data}
        />
      )}
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"

/* ---------- helpers ---------- */
function addTwoHours(time?: string) {
  if (!time) return ""
  const [h, m] = time.split(":").map(Number)
  const d = new Date()
  d.setHours(h + 2, m)
  return d.toTimeString().slice(0, 5)
}

/* ---------- types ---------- */
export type FormData = {
  id?: string
  fasting_sugar?: number
  fasting_measure_time?: string

  breakfast?: string
  breakfast_time?: string
  breakfast_sugar?: number
  breakfast_measure_time?: string

  morning_snack?: string
  morning_snack_time?: string

  lunch?: string
  lunch_time?: string
  lunch_sugar?: number
  lunch_measure_time?: string

  afternoon_snack?: string
  afternoon_snack_time?: string

  dinner?: string
  dinner_time?: string
  dinner_sugar?: number
  dinner_measure_time?: string

  night_snack?: string
  night_snack_time?: string
}

type DailyNutritionFormProps = {
  logDate: string
  initialData?: FormData
}

/* ---------- UI atoms ---------- */
const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className="w-full rounded-xl border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
  />
)

const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    {...props}
    className="w-full rounded-xl border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
  />
)

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-4">
    <h3 className="text-lg font-bold">{title}</h3>
    {children}
  </section>
)

/* ---------- component ---------- */
export default function DailyNutritionForm({ logDate, initialData }: DailyNutritionFormProps) {
  const [form, setForm] = useState<FormData>(initialData ?? {})

  useEffect(() => {
    setForm(initialData ?? {})
  }, [initialData])

  const setField = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const saveDay = async () => {
  try {
    const res = await fetch("/api/daily-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        log_date: logDate,
        ...form,
      }),
    })

    let data = null
    try {
      data = await res.json()
    } catch {}

    if (!res.ok) {
      console.error("STATUS:", res.status)
      console.error("API error:", data)
      alert(`שגיאה בשמירה (${res.status})`)
      return
    }

    alert("הנתונים נשמרו בהצלחה")
  } catch (err) {
    console.error(err)
    alert("אירעה שגיאה בשמירה")
  }
}


  const todayLabel = new Date(logDate).toLocaleDateString("he-IL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl shadow space-y-8">
      <header className="text-center">
        <h2 className="text-2xl font-extrabold">{todayLabel}</h2>
      </header>

      {/* צום */}
      <Section title="בדיקת צום">
        <Input
          type="time"
          value={form.fasting_measure_time || ""}
          onChange={e => setField("fasting_measure_time", e.target.value)}
        />
        <Input
          type="number"
          value={form.fasting_sugar ?? ""}
          onChange={e => setField("fasting_sugar", Number(e.target.value))}
          placeholder="ערך סוכר"
        />
      </Section>

      <div className="border-t" />

      {/* ארוחת בוקר */}
      <Section title="ארוחת בוקר">
        <Textarea
          rows={2}
          value={form.breakfast || ""}
          onChange={e => setField("breakfast", e.target.value)}
          placeholder="מה אכלתי"
        />
        <Input
          type="time"
          value={form.breakfast_time || ""}
          onChange={e => {
            const t = e.target.value
            setField("breakfast_time", t)
            setField("breakfast_measure_time", addTwoHours(t))
          }}
          placeholder="שעת ארוחה"
        />
        <Input
          type="time"
          value={form.breakfast_measure_time || ""}
          onChange={e => setField("breakfast_measure_time", e.target.value)}
        />
        <p className="text-xs text-gray-500">שעת מדידה (מוצע: שעתיים אחרי הארוחה)</p>
        <Input
          type="number"
          value={form.breakfast_sugar ?? ""}
          onChange={e => setField("breakfast_sugar", Number(e.target.value))}
          placeholder="ערך סוכר"
        />
      </Section>

      {/* ביניים בוקר */}
      <div className="border-t" />
      <Section title="ביניים בוקר">
        <Textarea
          rows={2}
          value={form.morning_snack || ""}
          onChange={e => setField("morning_snack", e.target.value)}
          placeholder="מה אכלתי"
        />
        <Input
          type="time"
          value={form.morning_snack_time || ""}
          onChange={e => setField("morning_snack_time", e.target.value)}
          placeholder="שעה"
        />
      </Section>

      {/* ארוחת צהריים */}
      <div className="border-t" />
      <Section title="ארוחת צהריים">
        <Textarea
          rows={2}
          value={form.lunch || ""}
          onChange={e => setField("lunch", e.target.value)}
          placeholder="מה אכלתי"
        />
        <Input
          type="time"
          value={form.lunch_time || ""}
          onChange={e => {
            const t = e.target.value
            setField("lunch_time", t)
            setField("lunch_measure_time", addTwoHours(t))
          }}
          placeholder="שעת ארוחה"
        />
        <Input
          type="time"
          value={form.lunch_measure_time || ""}
          onChange={e => setField("lunch_measure_time", e.target.value)}
        />
        <p className="text-xs text-gray-500">שעת מדידה (מוצע: שעתיים אחרי הארוחה)</p>
        <Input
          type="number"
          value={form.lunch_sugar ?? ""}
          onChange={e => setField("lunch_sugar", Number(e.target.value))}
          placeholder="ערך סוכר"
        />
      </Section>

      {/* ביניים צהריים */}
      <div className="border-t" />
      <Section title="ביניים צהריים">
        <Textarea
          rows={2}
          value={form.afternoon_snack || ""}
          onChange={e => setField("afternoon_snack", e.target.value)}
          placeholder="מה אכלתי"
        />
        <Input
          type="time"
          value={form.afternoon_snack_time || ""}
          onChange={e => setField("afternoon_snack_time", e.target.value)}
          placeholder="שעה"
        />
      </Section>

      {/* ארוחת ערב */}
      <div className="border-t" />
      <Section title="ארוחת ערב">
        <Textarea
          rows={2}
          value={form.dinner || ""}
          onChange={e => setField("dinner", e.target.value)}
          placeholder="מה אכלתי"
        />
        <Input
          type="time"
          value={form.dinner_time || ""}
          onChange={e => {
            const t = e.target.value
            setField("dinner_time", t)
            setField("dinner_measure_time", addTwoHours(t))
          }}
          placeholder="שעת ארוחה"
        />
        <Input
          type="time"
          value={form.dinner_measure_time || ""}
          onChange={e => setField("dinner_measure_time", e.target.value)}
        />
        <p className="text-xs text-gray-500">שעת מדידה (מוצע: שעתיים אחרי הארוחה)</p>
        <Input
          type="number"
          value={form.dinner_sugar ?? ""}
          onChange={e => setField("dinner_sugar", Number(e.target.value))}
          placeholder="ערך סוכר"
        />
      </Section>

      {/* לילה */}
      <div className="border-t" />
      <Section title="לילה">
        <Textarea
          rows={2}
          value={form.night_snack || ""}
          onChange={e => setField("night_snack", e.target.value)}
          placeholder="מה אכלתי"
        />
        <Input
          type="time"
          value={form.night_snack_time || ""}
          onChange={e => setField("night_snack_time", e.target.value)}
          placeholder="שעה"
        />
      </Section>

      <button
        onClick={saveDay}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold text-lg"
      >
        {form.id ? "עדכן יום" : "שמור יום"}
      </button>
    </div>
  )
}

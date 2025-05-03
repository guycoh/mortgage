'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

type Lead = {
  id: number
  lead_name: string
  zoom: number
  cell_phone: string
  email: string | null
  date: string
  hour: string
  done: number
}

export default function EditLeadPage() {
  const router = useRouter()
  const { id } = useParams()
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    const fetchLead = async () => {
      try {
        const res = await fetch(`/api/leadweb/${id}`)
        const data = await res.json()
        setLead(data)
      } catch (err) {
        setToast({ message: 'שגיאה בטעינת הליד', type: 'error' })
      } finally {
        setLoading(false)
      }
    }

    fetchLead()
  }, [id])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setLead((prev) => prev ? { ...prev, [name]: value } : prev)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const res = await fetch(`/api/leadweb/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead),
    })

    if (res.ok) {
      setToast({ message: 'השינויים נשמרו בהצלחה!', type: 'success' })
      setTimeout(() => {
        router.push('/leads')
      }, 1500)
    } else {
      setToast({ message: 'שגיאה בשמירת הנתונים', type: 'error' })
    }
  }

  if (loading) return <p className="text-center mt-10">טוען נתונים...</p>
  if (!lead) return <p className="text-center mt-10 text-red-600">לא נמצא ליד</p>

  return (
    <div className="max-w-2xl mx-auto p-6 mt-6 bg-white shadow-md rounded-lg relative">
      <h2 className="text-2xl font-bold mb-6 text-center text-blue-700">עריכת ליד</h2>

      {toast && (
        <div className={`absolute top-2 right-2 px-4 py-2 rounded-md shadow-lg text-white transition-opacity duration-300 ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        }`}>
          {toast.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* === Fields as before === */}
        <div>
          <label className="block mb-1 font-semibold">שם ליד</label>
          <input
            type="text"
            name="lead_name"
            value={lead.lead_name}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold">טלפון</label>
          <input
            type="text"
            name="cell_phone"
            value={lead.cell_phone}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold">אימייל</label>
          <input
            type="email"
            name="email"
            value={lead.email ?? ''}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold">תאריך פגישה</label>
          <input
            type="date"
            name="date"
            value={lead.date}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold">שעה</label>
          <input
            type="time"
            name="hour"
            value={lead.hour}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div className="flex space-x-4 rtl:space-x-reverse">
          <label className="flex items-center space-x-2 rtl:space-x-reverse">
            <span className="font-semibold">פגישה בזום:</span>
            <select
              name="zoom"
              value={lead.zoom}
              onChange={handleChange}
              className="border rounded px-2 py-1"
            >
              <option value={1}>כן</option>
              <option value={0}>לא</option>
            </select>
          </label>

          <label className="flex items-center space-x-2 rtl:space-x-reverse">
            <span className="font-semibold">בוצע:</span>
            <select
              name="done"
              value={lead.done}
              onChange={handleChange}
              className="border rounded px-2 py-1"
            >
              <option value={1}>כן</option>
              <option value={0}>לא</option>
            </select>
          </label>
        </div>

        <div className="flex gap-4 justify-between mt-6">
          <button
            type="submit"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-bold"
          >
            שמור שינויים
          </button>
          <button
            type="button"
            onClick={() => router.push('/leads')}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-black py-2 rounded-md font-bold"
          >
            חזרה לרשימת לידים
          </button>
        </div>
      </form>
    </div>
  )
}

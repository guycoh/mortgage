"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ModalDelete from './ModalDelete'

const formatHebrewDate = (isoDate: string) => {
  const date = new Date(isoDate)
  return date.toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

type Lead = {
  id: number
  created_at: string
  lead_name: string
  zoom: number
  cell_phone: string
  email: string | null
  date: string
  hour: string
  done: number
}

export default function LeadTable() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [leadToDelete, setLeadToDelete] = useState<number | null>(null)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)

  const router = useRouter()

  useEffect(() => {
    fetch('/api/leadweb')
      .then((res) => res.json())
      .then((data) => setLeads(data))
      .catch((err) => console.error('שגיאה בטעינת לידים:', err))
  }, [])

  const handleDelete = (id: number) => {
    setLeadToDelete(id)
    setIsModalOpen(true)
  }

  const confirmDelete = async () => {
    if (leadToDelete === null) return

    const res = await fetch(`/api/leadweb/${leadToDelete}`, {
      method: 'DELETE',
    })

    if (res.ok) {
      setLeads((prev) => prev.filter((lead) => lead.id !== leadToDelete))
      setToast({ message: 'הליד נמחק בהצלחה', type: 'success' })
    } else {
      setToast({ message: 'אירעה שגיאה במחיקה', type: 'error' })
    }

    setIsModalOpen(false)
    setLeadToDelete(null)

    setTimeout(() => setToast(null), 3000)
  }

  const cancelDelete = () => {
    setIsModalOpen(false)
    setLeadToDelete(null)
  }





  
  return (
    <div className="p-4 relative">
      <h2 className="text-2xl font-bold mb-4 text-center text-blue-700">לידים שהתקבלו מהאתר</h2>

      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded shadow-lg text-white ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        }`}>
          {toast.message}
        </div>
      )}

      {leads.length === 0 ? (
        <p className="text-center mt-10 text-gray-600">לא נמצאו לידים</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300 text-right text-sm">
            <thead className="bg-gray-100 text-gray-700 font-bold">
              <tr>
                <th className="px-4 py-2 border">#</th>
                <th className="px-4 py-2 border">שם ליד</th>
                <th className="px-4 py-2 border">טלפון</th>
                <th className="px-4 py-2 border">דוא״ל</th>
                <th className="px-4 py-2 border">זום</th>
                <th className="px-4 py-2 border">תאריך פגישה</th>
                <th className="px-4 py-2 border">שעה</th>
                <th className="px-4 py-2 border">בוצע</th>
                <th className="px-4 py-2 border">נוצר בתאריך</th>
                <th className="px-4 py-2 border">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead, index) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border">{index + 1}</td>
                  <td className="px-4 py-2 border">{lead.lead_name}</td>
                  <td className="px-4 py-2 border">{lead.cell_phone}</td>
                  <td className="px-4 py-2 border">{lead.email ?? '—'}</td>
                  <td className="px-4 py-2 border">{lead.zoom ? 'כן' : 'לא'}</td>
                  <td className="px-4 py-2 border">{lead.date}</td>
                  <td className="px-4 py-2 border">{lead.hour}</td>
                  <td className="px-4 py-2 border">{lead.done ? '✔️' : '❌'}</td>
                  <td className="px-4 py-2 border">{formatHebrewDate(lead.created_at)}</td>
                  <td className="px-4 py-2 border text-center space-x-2 rtl:space-x-reverse">
                    <button
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                      onClick={() => router.push(`/private/admin/leadweb/edit/${lead.id}`)}
                    >
                      ערוך
                    </button>
                    <button
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                      onClick={() => handleDelete(lead.id)}
                    >
                      מחק
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ModalDelete
        isOpen={isModalOpen}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
      />
    </div>
  )
}

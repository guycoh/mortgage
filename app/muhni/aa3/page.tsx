'use client'

import { useState, useEffect } from 'react'

export default function RemoteSignPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    idNumber: '',
    date: '',
    signature: '',
  })

  useEffect(() => {
    const today = new Date()
    const dateStr = today.toLocaleDateString('he-IL')
    setFormData((prev) => ({ ...prev, date: dateStr }))
  }, [])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = () => {
    console.table(formData)
    alert('הטופס נשמר בקונסול – החלף בלוגיקה משלך')
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 p-4">
      {/* Container של ה-PDF והטופס - רוחב מקסימום, יחס גובה-רוחב */}
      <div className="relative w-full max-w-[800px] aspect-[800/1126] bg-white shadow-lg rounded overflow-hidden">
        {/* PDF */}
        <iframe
          src="/ktav_asmach_acc.pdf"
          className="w-full h-full"
          style={{ border: 'none' }}
        />

        {/* השדות מעל ה-PDF */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-10">
          <input
            name="fullName"
            placeholder="שם מלא"
            value={formData.fullName}
            onChange={handleChange}
            className="absolute top-[72%] left-[20%] w-64 p-2 rounded border pointer-events-auto shadow bg-white text-right"
          />
          <input
            name="idNumber"
            placeholder="ת.ז."
            value={formData.idNumber}
            onChange={handleChange}
            className="absolute top-[72%] left-[55%] w-48 p-2 rounded border pointer-events-auto shadow bg-white text-right"
          />
          <input
            name="date"
            value={formData.date}
            readOnly
            className="absolute top-[76%] left-[20%] w-40 p-2 rounded border bg-gray-100 pointer-events-auto shadow text-center"
          />
          <input
            name="signature"
            placeholder="חתימה (שם מלא)"
            value={formData.signature}
            onChange={handleChange}
            className="absolute top-[82%] left-[20%] w-64 p-2 rounded border pointer-events-auto shadow bg-white text-right"
          />
          <button
            onClick={handleSubmit}
            className="absolute top-[88%] left-[20%] bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded pointer-events-auto shadow"
          >
            שלח טופס
          </button>
        </div>
      </div>
    </div>
  )
}


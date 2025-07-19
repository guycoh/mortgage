'use client'

import { useEffect, useState } from 'react'

type Note = {
  id: string
  note: string
  date: string
  hour: string
}

function formatDateToHebrew(dateStr: string) {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [newNote, setNewNote] = useState('')
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)

  const fetchNotes = async () => {
    const res = await fetch('/api/notes')
    const data = await res.json()
    const sorted = data.sort((a: Note, b: Note) => {
      const aTime = new Date(`${a.date}T${a.hour}`)
      const bTime = new Date(`${b.date}T${b.hour}`)
      return bTime.getTime() - aTime.getTime()
    })
    setNotes(sorted)
  }

  useEffect(() => {
    fetchNotes()
  }, [])

  const handleSubmit = async () => {
    if (!newNote.trim()) return
    const now = new Date()
    const date = now.toISOString().split('T')[0]
    const hour = now.toTimeString().split(' ')[0]

    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: newNote, date, hour }),
    })

    if (res.ok) {
      setNewNote('')
      fetchNotes()
    } else {
      alert('שגיאה בשליחת ההערה')
    }
  }

  return (
    <div
      dir="rtl"
      className="max-w-3xl mx-auto mt-10 p-4 font-sans bg-gray-50 border border-gray-300 rounded-xl shadow-sm"
    >
      <h1 className="text-2xl font-bold mb-4">הערות</h1>

      <div className="grid grid-cols-[auto_1fr] gap-2 mb-6">
        <button
          onClick={handleSubmit}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 w-fit"
        >
          שלח
        </button>
        <input
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="כתוב כאן את ההערה..."
          className="border border-gray-300 p-2 rounded text-right w-full"
        />
      </div>


        {/* טבלת ההערות עם גלילה אנכית אם יש יותר מ־5 שורות */}
        <div className="space-y-1 max-h-[210px] overflow-y-auto pr-1">
        {notes.map((note) => (
            <div
            key={note.id}
            onClick={() => setSelectedNote(note)}
            className="cursor-pointer border border-gray-200 bg-white hover:bg-gray-100 p-2 rounded flex justify-between items-center text-sm"
            >
            <div className="text-gray-500 min-w-[110px] whitespace-nowrap">
                {formatDateToHebrew(note.date)} | {note.hour}
            </div>
            <div className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-right px-2 text-gray-800">
                {note.note}
            </div>
            </div>
        ))}
        </div>

        {/* מודאל תצוגת טקסט מלא */}
        {selectedNote && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-2xl max-h-[90vh] relative overflow-hidden">
            <button
                onClick={() => setSelectedNote(null)}
                className="absolute top-2 left-2 text-gray-500 hover:text-red-600 text-xl"
                aria-label="סגור"
            >
                ✕
            </button>

            <div className="text-sm text-gray-600 mb-4">
                {formatDateToHebrew(selectedNote.date)} | {selectedNote.hour}
            </div>

            <textarea
                value={selectedNote.note}
                readOnly
                rows={7}
                className="w-full resize-none border border-gray-300 rounded-lg p-3 text-gray-800 bg-gray-100 overflow-y-auto"
            />
            </div>
        </div>
        )}


    </div>
  )
}

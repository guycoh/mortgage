"use client"

import { useState, useEffect } from "react"

interface EditConceptModalProps {
  item: {
    id: number
    concept: string
    commentary: string
  }
  onClose: () => void
  onSave: (updatedItem: { id: number; concept: string; commentary: string }) => void
}

const EditConceptModal: React.FC<EditConceptModalProps> = ({ item, onClose, onSave }) => {
  const [concept, setConcept] = useState(item.concept)
  const [commentary, setCommentary] = useState(item.commentary)

  useEffect(() => {
    setConcept(item.concept)
    setCommentary(item.commentary)
  }, [item])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ id: item.id, concept, commentary })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 w-full max-w-2xl">
        {/* כפתור סגירה */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-gray-500 hover:text-red-600 text-xl font-bold focus:outline-none"
          aria-label="סגור"
        >
          ×
        </button>

        <h2 className="text-xl font-semibold mb-6 text-center text-main">עריכת מושג</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block mb-1 text-sm font-medium">מושג</label>
            <input
              type="text"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              className="w-full p-3 border rounded-xl bg-gray-100 dark:bg-slate-700 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium">הסבר</label>
            <textarea
              value={commentary}
              onChange={(e) => setCommentary(e.target.value)}
              className="w-full p-3 border rounded-xl bg-gray-100 dark:bg-slate-700 dark:text-white"
              rows={5}
              required
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded bg-gray-300 dark:bg-slate-600 text-black dark:text-white"
            >
              ביטול
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              שמור שינויים
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditConceptModal

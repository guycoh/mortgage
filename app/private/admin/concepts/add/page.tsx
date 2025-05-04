"use client"

import { useState } from "react"

const AddConceptForm = () => {
  const [concept, setConcept] = useState("")
  const [commentary, setCommentary] = useState("")
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSuccessMessage("")
    setErrorMessage("")

    try {
      const res = await fetch("/api/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concept, commentary }),
      })

      if (!res.ok) throw new Error("שגיאה בהוספת המושג")

      setSuccessMessage("המושג נוסף בהצלחה!")
      setConcept("")
      setCommentary("")
    } catch (err: any) {
      setErrorMessage(err.message || "אירעה שגיאה")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800 shadow-xl rounded-3xl p-6 mt-10">
      <h2 className="text-2xl font-bold text-center mb-6 text-main dark:text-cyan-400">
        הוסף מושג חדש
      </h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
            מושג
          </label>
          <input
            type="text"
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            required
            className="w-full p-3 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:bg-orange-50"
            placeholder="למשל: ריבית פריים"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
            הסבר
          </label>
          <textarea
            value={commentary}
            onChange={(e) => setCommentary(e.target.value)}
            required
            rows={4}
            className="w-full p-3 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:bg-orange-50"
            placeholder="כתוב הסבר קצר וברור על המושג"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-main dark:bg-cyan-500 text-white font-semibold hover:bg-[#0e7490] transition-all"
        >
          {loading ? "מוסיף..." : "הוסף מושג"}
        </button>

        {successMessage && (
          <p className="text-green-600 text-center font-medium">{successMessage}</p>
        )}
        {errorMessage && (
          <p className="text-red-500 text-center font-medium">{errorMessage}</p>
        )}
      </form>
    </div>
  )
}

export default AddConceptForm

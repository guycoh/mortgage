"use client"

import { useState, useEffect } from "react"

import Spinner from "../components/spinner"
import Link from "next/link"



interface DataItem {
  id: number
  concept: string
  commentary: string
}

const GlossaryPage: React.FC = () => {
  const [data, setData] = useState<DataItem[] | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [sortAZ, setSortAZ] = useState<boolean>(false)
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false)
  const [suggestions, setSuggestions] = useState<string[]>([])

  const [currentPage, setCurrentPage] = useState<number>(1)
  const itemsPerPage = 10

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/concepts")
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        const jsonData: DataItem[] = await response.json()
        setData(jsonData)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, sortAZ])

  const handleScroll = () => {
    setShowScrollTop(window.scrollY > 300)
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    if (value.length === 0) {
      setSuggestions([])
      return
    }

    const terms = data
      ?.map((item) => item.concept)
      .filter((term) => term.toLowerCase().startsWith(value.toLowerCase()))
      .slice(0, 5)

    setSuggestions(terms || [])
  }

  const handleSuggestionClick = (suggestion: string) => {
    setSearchTerm(suggestion)
    setSuggestions([])
  }

  const filtered = data?.filter((item) =>
    item.concept.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.commentary.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const sorted = sortAZ && filtered
    ? [...filtered].sort((a, b) => a.concept.localeCompare(b.concept))
    : filtered

  const pageCount = sorted ? Math.ceil(sorted.length / itemsPerPage) : 0
  const paginatedData = sorted?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handleEdit = (id: number) => {
    alert(`עריכת מושג ID: ${id}`)
    // ניתוב או טופס עריכה כאן
  }

  const handleDelete = (id: number) => {
    const confirmDelete = confirm("האם אתה בטוח שברצונך למחוק את המושג?")
    if (confirmDelete) {
      // קריאה ל-API למחיקה (או עדכון ב-state)
      alert(`נמחק ID: ${id}`)
    }
  }

  if (loading) return <div><Spinner /></div>
  if (error) return <div className="text-red-500 text-center mt-10">שגיאה: {error}</div>
  if (!data) return <div className="text-center mt-10">אין נתונים להציג.</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f9ff] to-[#ffffff] dark:from-[#0f172a] dark:to-[#1e293b] text-gray-900 dark:text-white px-4 py-10">
      <div className="max-w-5xl mx-auto bg-white/90 dark:bg-slate-800/80 shadow-xl rounded-3xl px-6 py-8 relative overflow-hidden"> 
       
       
       
       
        <h1 className="text-4xl font-bold text-center text-main dark:text-[#00bcd4] mb-6">
          מושגים במשכנתא 🏦
        </h1>
       
        <Link
           href="/private/admin/concepts/add"
          className="mb-3 inline-block bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-xl shadow transition-all"
         >
        ➕ הוסף מושג חדש
        </Link>



        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 relative">
          <div className="w-full sm:w-1/2 relative">
            <input
              type="text"
              placeholder="חפש מושג..."
              className="w-full p-3 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff9800] focus:bg-orange-50"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            {suggestions.length > 0 && (
              <ul className="absolute z-10 w-full bg-white dark:bg-slate-700 shadow-md rounded-b-xl border-t border-gray-200 dark:border-slate-600 max-h-60 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <li
                    key={index}
                    className="px-4 py-2 hover:bg-orange-100 dark:hover:bg-slate-600 cursor-pointer text-sm"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            onClick={() => setSortAZ(!sortAZ)}
            className="px-4 py-2 rounded-xl bg-main text-white dark:bg-[#00bcd4] hover:bg-[#166089] transition-all"
          >
            מיון לפי א-ב {sortAZ ? "🔽" : "🔼"}
          </button>
        </div>

        <div className="space-y-6">
          {paginatedData && paginatedData.length > 0 ? (
            paginatedData.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl p-5 shadow-md hover:shadow-lg transition-all duration-300 relative"
              >
                <h2 className="text-xl font-semibold text-[#0d47a1] dark:text-[#4fc3f7] mb-2 underline decoration-[#00acc1] decoration-2">
                  {item.concept}
                </h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">{item.commentary}</p>

                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleEdit(item.id)}
                    className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
                  >
                    עריכה
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                  >
                    מחיקה
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400">לא נמצאו תוצאות.</p>
          )}
        </div>

        {/* Pagination */}
        {pageCount > 1 && (
          <div className="flex justify-center items-center gap-4 mt-10">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-slate-600 disabled:opacity-50"
            >
              ← הקודם
            </button>

            <span className="text-sm text-gray-600 dark:text-gray-300">
              עמוד {currentPage} מתוך {pageCount}
            </span>

            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, pageCount))}
              disabled={currentPage === pageCount}
              className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-slate-600 disabled:opacity-50"
            >
              הבא →
            </button>
          </div>
        )}

        {/* Scroll to Top */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 bg-main hover:bg-[#155c84] text-white px-4 py-2 rounded-full shadow-lg transition-opacity duration-300"
          >
            ⬆ חזור למעלה
          </button>
        )}
      </div>
    </div>
  )
}

export default GlossaryPage

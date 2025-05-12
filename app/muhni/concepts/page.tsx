"use client"

import { useState, useEffect } from "react"
import Spinner from "../components/spinner"

interface DataItem {
  id: number
  concept: string
  commentary: string
}

const ITEMS_PER_PAGE = 10

const GlossaryPage: React.FC = () => {
  const [data, setData] = useState<DataItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortAZ, setSortAZ] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [showScrollTop, setShowScrollTop] = useState(false)

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

  const handleScroll = () => {
    setShowScrollTop(window.scrollY > 300)
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1) // איפוס לעמוד ראשון עם חיפוש חדש

    if (value.length === 0) {
      setSuggestions([])
      return
    }

    const terms = data
      ?.map((item) => item.concept)
      .filter((term) =>
        term.toLowerCase().startsWith(value.toLowerCase())
      )
      .slice(0, 5)

    setSuggestions(terms || [])
  }

  const handleSuggestionClick = (suggestion: string) => {
    setSearchTerm(suggestion)
    setSuggestions([])
    setCurrentPage(1)
  }

  const filtered = data?.filter((item) =>
    item.concept.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.commentary.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const sorted = sortAZ ? [...filtered].sort((a, b) => a.concept.localeCompare(b.concept)) : filtered

  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE)
  const currentData = sorted.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  if (loading) return <Spinner />
  if (error) return <div className="text-red-500 text-center mt-10">שגיאה: {error}</div>
  if (!data || data.length === 0) return <div className="text-center mt-10">אין נתונים להציג.</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f9ff] to-[#ffffff] dark:from-[#0f172a] dark:to-[#1e293b] text-gray-900 dark:text-white px-4 py-10">
      <div className="max-w-5xl mx-auto bg-white/90 dark:bg-slate-800/80 shadow-xl rounded-3xl px-6 py-8 relative overflow-hidden">
        <h1 className="text-4xl font-bold text-center text-main dark:text-[#00bcd4] mb-6">
          מושגים במשכנתא 🏦
        </h1>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 relative">
          <div className="w-full sm:w-1/2 relative">
            <input
              type="text"
              placeholder="חפש מושג..."
              className="w-full p-3 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff9800] focus:bg-orange-50"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              aria-label="חיפוש מושג"
            />
            {suggestions.length > 0 && (
              <ul className="absolute z-10 w-full bg-white dark:bg-slate-700 shadow-md rounded-b-xl border-t border-gray-200 dark:border-slate-600 max-h-60 overflow-y-auto">
                {suggestions.map((suggestion) => (
                  <li
                    key={suggestion}
                    className="px-4 py-2 hover:bg-orange-100 dark:hover:bg-slate-600 cursor-pointer text-sm"
                    onClick={() => handleSuggestionClick(suggestion)}
                    role="option"
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
            aria-pressed={sortAZ}
          >
            מיון לפי א-ב {sortAZ ? "🔽" : "🔼"}
          </button>
        </div>

        <div className="space-y-6">
          {currentData.length > 0 ? (
            currentData.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl p-5 shadow-md hover:shadow-lg transition-all duration-300"
              >
                <h2 className="text-xl font-semibold text-[#0d47a1] dark:text-[#4fc3f7] mb-2 underline decoration-[#00acc1] decoration-2">
                  {item.concept}
                </h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{item.commentary}</p>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400">לא נמצאו תוצאות לחיפוש.</p>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-8 space-x-2 rtl:space-x-reverse">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i + 1}
                onClick={() => setCurrentPage(i + 1)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentPage === i + 1
                    ? "bg-main text-white"
                    : "bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-white hover:bg-gray-200"
                }`}
                aria-current={currentPage === i + 1 ? "page" : undefined}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}

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
























// "use client"

// import { useState, useEffect } from "react"
// import Spinner from "../components/spinner" 

// interface DataItem {
//   id: number
//   concept: string
//   commentary: string
// }

// const GlossaryPage: React.FC = () => {
//   const [data, setData] = useState<DataItem[] | null>(null)
//   const [loading, setLoading] = useState<boolean>(true)
//   const [error, setError] = useState<string | null>(null)
//   const [searchTerm, setSearchTerm] = useState<string>("")
//   const [sortAZ, setSortAZ] = useState<boolean>(false)
//   const [showScrollTop, setShowScrollTop] = useState<boolean>(false)
//   const [suggestions, setSuggestions] = useState<string[]>([])

//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         const response = await fetch("/api/concepts")
//         if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
//         const jsonData: DataItem[] = await response.json()
//         setData(jsonData)
//       } catch (err: any) {
//         setError(err.message)
//       } finally {
//         setLoading(false)
//       }
//     }

//     fetchData()
//     window.addEventListener("scroll", handleScroll)
//     return () => window.removeEventListener("scroll", handleScroll)
//   }, [])

//   const handleScroll = () => {
//     setShowScrollTop(window.scrollY > 300)
//   }

//   const scrollToTop = () => {
//     window.scrollTo({ top: 0, behavior: "smooth" })
//   }

//   const handleSearchChange = (value: string) => {
//     setSearchTerm(value)

//     if (value.length === 0) {
//       setSuggestions([])
//       return
//     }

//     const terms = data
//       ?.map((item) => item.concept)
//       .filter((term) =>
//         term.toLowerCase().startsWith(value.toLowerCase())
//       )
//       .slice(0, 5) // עד 5 הצעות

//     setSuggestions(terms || [])
//   }

//   const handleSuggestionClick = (suggestion: string) => {
//     setSearchTerm(suggestion)
//     setSuggestions([])
//   }

//   const filtered = data?.filter((item) =>
//     item.concept.toLowerCase().includes(searchTerm.toLowerCase()) ||
//     item.commentary.toLowerCase().includes(searchTerm.toLowerCase())
//   )

//   const sorted = sortAZ && filtered
//     ? [...filtered].sort((a, b) => a.concept.localeCompare(b.concept))
//     : filtered

//     if (loading)
//       return (
//         <div>
//           <Spinner />
//         </div>
//       );



//   if (error) return <div className="text-red-500 text-center mt-10">שגיאה: {error}</div>
//   if (!data) return <div className="text-center mt-10">אין נתונים להציג.</div>

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-[#f0f9ff] to-[#ffffff] dark:from-[#0f172a] dark:to-[#1e293b] text-gray-900 dark:text-white px-4 py-10">
//       <div className="max-w-5xl mx-auto bg-white/90 dark:bg-slate-800/80 shadow-xl rounded-3xl px-6 py-8 relative overflow-hidden">
//         <h1 className="text-4xl font-bold text-center text-main dark:text-[#00bcd4] mb-6">
//           מושגים במשכנתא 🏦
//         </h1>

//         <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 relative">
//           <div className="w-full sm:w-1/2 relative">
//             <input
//               type="text"
//               placeholder="חפש מושג..."
//               className="w-full p-3 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ff9800] focus:bg-orange-50"
//               value={searchTerm}
//               onChange={(e) => handleSearchChange(e.target.value)}
//             />
//             {suggestions.length > 0 && (
//               <ul className="absolute z-10 w-full bg-white dark:bg-slate-700 shadow-md rounded-b-xl border-t border-gray-200 dark:border-slate-600 max-h-60 overflow-y-auto">
//                 {suggestions.map((suggestion, index) => (
//                   <li
//                     key={index}
//                     className="px-4 py-2 hover:bg-orange-100 dark:hover:bg-slate-600 cursor-pointer text-sm"
//                     onClick={() => handleSuggestionClick(suggestion)}
//                   >
//                     {suggestion}
//                   </li>
//                 ))}
//               </ul>
//             )}
//           </div>

//           <button
//             onClick={() => setSortAZ(!sortAZ)}
//             className="px-4 py-2 rounded-xl bg-main text-white dark:bg-[#00bcd4] hover:bg-[#166089] transition-all"
//           >
//             מיון לפי א-ב {sortAZ ? "🔽" : "🔼"}
//           </button>
//         </div>

//         <div className="space-y-6">
//           {sorted && sorted.length > 0 ? (
//             sorted.map((item) => (
//               <div
//                 key={item.id}
//                 className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl p-5 shadow-md hover:shadow-lg transition-all duration-300"
//               >
//                 <h2 className="text-xl font-semibold text-[#0d47a1] dark:text-[#4fc3f7] mb-2 underline decoration-[#00acc1] decoration-2">
//                   {item.concept}
//                 </h2>
//                 <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{item.commentary}</p>
//               </div>
//             ))
//           ) : (
//             <p className="text-center text-gray-500 dark:text-gray-400">לא נמצאו תוצאות.</p>
//           )}
//         </div>

//         {showScrollTop && (
//           <button
//             onClick={scrollToTop}
//             className="fixed bottom-6 right-6 bg-main hover:bg-[#155c84] text-white px-4 py-2 rounded-full shadow-lg transition-opacity duration-300"
//           >
//             ⬆ חזור למעלה
//           </button>
//         )}
//       </div>
//     </div>
//   )
// }

// export default GlossaryPage


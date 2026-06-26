'use client'

import { useEffect, useState } from 'react'
import Spinner from '../../components/spinner'

type BankBranch = {
  [key: string]: any
}

type Props = {
  apiUrl: string
}

export default function BankBranchesTable({ apiUrl }: Props) {
  const [data, setData] = useState<BankBranch[]>([])
  const [filteredData, setFilteredData] = useState<BankBranch[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortAsc, setSortAsc] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 50






  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const res = await fetch(apiUrl)
        const json = await res.json()
        const records = json.records || []
        setData(records)
        setFilteredData(records)
        console.log('📌 Columns:', Object.keys(records[0])) // לבדיקה
      } catch (error) {
        console.error('❌ Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }
  

    fetchData()
  }, [apiUrl])

  // מיון וסינון
 useEffect(() => {
  const filtered = data.filter((row) => {
    const matchesSearch = Object.values(row).some((val) => {
      const str = val?.toString().toLowerCase() || ''
      const words = str.split(/\s+/)
      return words.some((word: string) =>
        word.includes(search.toLowerCase())
      )
    })
  
    const matchesCity = cityFilter ? row.City === cityFilter : true
  
    return matchesSearch && matchesCity
  })
  


  setFilteredData(filtered)
  setCurrentPage(1)
}, [search, data, cityFilter])

  



  
  const handleSort = (key: string) => {
    const asc = key === sortKey ? !sortAsc : true
    setSortKey(key)
    setSortAsc(asc)

    const sorted = [...filteredData].sort((a, b) => {
      const aVal = a[key] ?? ''
      const bVal = b[key] ?? ''
      return asc
        ? aVal.toString().localeCompare(bVal.toString())
        : bVal.toString().localeCompare(aVal.toString())
    })

    setFilteredData(sorted)
  }

  const startIdx = (currentPage - 1) * pageSize
  const paginatedData = filteredData.slice(startIdx, startIdx + pageSize)
  const totalPages = Math.ceil(filteredData.length / pageSize)

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  if (loading) return <Spinner />
  if (filteredData.length === 0) return <div className="text-center py-4">אין תוצאות</div>

  const columns = Object.keys(filteredData[0])
  const cities = Array.from(new Set(data.map((row) => row.City).filter(Boolean))).sort()

  return (
    <div className="overflow-x-auto mt-4">
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
        <input
          type="text"
          placeholder="חפש בטבלה..."
          className="px-4 py-2 border rounded w-full md:w-1/2"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="px-4 py-2 border rounded w-full md:w-1/3"
        >
          <option value="">כל הערים</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </div>

      <table className="min-w-full bg-white border rounded shadow text-sm">
        <thead>
          <tr className="bg-gray-100 text-right">
            {columns.map((key) => (
              <th
                key={key}
                onClick={() => handleSort(key)}
                className="px-4 py-2 border cursor-pointer hover:bg-gray-200 whitespace-nowrap"
              >
                {key} {sortKey === key && (sortAsc ? '▲' : '▼')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginatedData.map((row, idx) => (
            <tr key={idx} className="hover:bg-orange-50 transition duration-150">
              {columns.map((key) => (
                <td key={key} className="px-4 py-2 border text-right whitespace-nowrap">
                  {row[key]?.toString() || ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* פאגינציה */}
      <div className="flex justify-center items-center gap-2 mt-4">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          הקודם
        </button>

        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i + 1}
            onClick={() => handlePageChange(i + 1)}
            className={`px-3 py-1 border rounded ${
              currentPage === i + 1 ? 'bg-orange-200 font-bold' : ''
            }`}
          >
            {i + 1}
          </button>
        )).slice(Math.max(currentPage - 3, 0), Math.min(currentPage + 2, totalPages))}

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          הבא
        </button>
      </div>
    </div>
  )
}

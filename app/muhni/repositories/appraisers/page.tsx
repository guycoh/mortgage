// components/AppraisersTable.tsx

"use client"

import { useEffect, useMemo, useState } from 'react';

type Appraiser = {
  _id: number;
  'שם שמאי': string;
  'מספר רשיון': number;
  'מספר תיק': number;
  עיר: string;
};

const PAGE_SIZE = 20;

export default function AppraisersTable() {
  const [data, setData] = useState<Appraiser[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [sortAsc, setSortAsc] = useState(true);

  const fetchData = async (page: number) => {
    setLoading(true);
    const offset = page * PAGE_SIZE;
    const res = await fetch(
      `https://data.gov.il/api/3/action/datastore_search?resource_id=8540534a-eccd-4568-a677-652d589ed172&limit=${PAGE_SIZE}&offset=${offset}`
    );
    const json = await res.json();
    setData(json.result.records);
    setTotal(json.result.total);
    setLoading(false);
  };

  useEffect(() => {
    fetchData(page);
  }, [page]);

  const cities = useMemo(() => {
    const allCities = data.map((d) => d['עיר']).filter(Boolean);
    return Array.from(new Set(allCities)).sort();
  }, [data]);

  const filteredData = useMemo(() => {
    let result = [...data];
    if (search) {
      result = result.filter((r) =>
        r['שם שמאי'].toLowerCase().includes(search.toLowerCase())
      );
    }
    if (cityFilter) {
      result = result.filter((r) => r['עיר'] === cityFilter);
    }
    result.sort((a, b) =>
      sortAsc
        ? a['שם שמאי'].localeCompare(b['שם שמאי'])
        : b['שם שמאי'].localeCompare(a['שם שמאי'])
    );
    return result;
  }, [data, search, cityFilter, sortAsc]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-center text-orange-600">רשימת שמאי מקרקעין</h2>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
        <input
          type="text"
          placeholder="חפש לפי שם שמאי..."
          className="px-4 py-2 rounded border shadow focus:outline-none focus:ring-2 focus:ring-orange-400 w-full md:w-1/2"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="px-4 py-2 rounded border shadow focus:outline-none focus:ring-2 focus:ring-orange-400 w-full md:w-1/3"
        >
          <option value="">כל הערים</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded shadow-lg bg-white animate-fadeIn">
        <table className="min-w-full text-sm text-right">
          <thead className="bg-orange-100 text-gray-700">
            <tr>
              <th className="px-4 py-2">#</th>
              <th
                className="px-4 py-2 cursor-pointer hover:underline"
                onClick={() => setSortAsc(!sortAsc)}
              >
                שם שמאי {sortAsc ? '🔼' : '🔽'}
              </th>
              <th className="px-4 py-2">מס' רישיון</th>
              <th className="px-4 py-2">מס' תיק</th>
              <th className="px-4 py-2">עיר</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row) => (
              <tr key={row._id} className="border-b hover:bg-orange-50 transition duration-150">
                <td className="px-4 py-2">{row._id}</td>
                <td className="px-4 py-2 font-medium text-gray-800">{row['שם שמאי']}</td>
                <td className="px-4 py-2">{row['מספר רשיון']}</td>
                <td className="px-4 py-2">{row['מספר תיק']}</td>
                <td className="px-4 py-2">{row['עיר'] || '-'}</td>
              </tr>
            ))}
            {!filteredData.length && (
              <tr>
                <td colSpan={5} className="text-center py-6 text-gray-500">
                  לא נמצאו תוצאות
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-6">
        <button
          className="px-4 py-2 bg-orange-300 hover:bg-orange-400 text-white rounded disabled:opacity-50"
          onClick={() => setPage((p) => Math.max(p - 1, 0))}
          disabled={page === 0}
        >
          הקודם
        </button>
        <span className="text-sm">
          עמוד {page + 1} מתוך {totalPages}
        </span>
        <button
          className="px-4 py-2 bg-orange-300 hover:bg-orange-400 text-white rounded disabled:opacity-50"
          onClick={() => setPage((p) => p + 1)}
          disabled={(page + 1) * PAGE_SIZE >= total}
        >
          הבא
        </button>
      </div>
    </div>
  );
}

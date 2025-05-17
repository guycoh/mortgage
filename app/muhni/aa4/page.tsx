'use client'

import { useEffect, useState } from 'react';

import Pagination from '../components/Pagination';

type RecordType = Record<string, any>;
const PAGE_SIZE = 25;

export default function CkanTablePage() {
  const [records, setRecords] = useState<RecordType[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filterYeshuv, setFilterYeshuv] = useState(''); // היישוב שנבחר לסינון

  const resourceId = 'f65a0daf-f737-49c5-9424-d378d52104f5';

  useEffect(() => {
    const fetchAllData = async () => {
      let allRecords: RecordType[] = [];
      let limit = 100;
      let offset = 0;

      try {
        while (true) {
          const url = `https://data.gov.il/api/3/action/datastore_search?resource_id=${resourceId}&limit=${limit}&offset=${offset}`;
          const res = await fetch(url);
          const data = await res.json();

          if (!data.success) break;

          const batch = data.result.records;
          allRecords = [...allRecords, ...batch];

          if (batch.length < limit) break;
          offset += limit;
        }
        setRecords(allRecords);
      } catch (err) {
        console.error('API Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  const fieldTranslations: Record<string, string> = {
    MisparMitham: 'מספר מתחם',
    Yeshuv: 'יישוב',
    SemelYeshuv: 'סמל יישוב',
    ShemMitcham: 'שם מתחם',
    YachadKayam: 'יח"ד קיים',
    YachadTosafti: 'יח"ד תוספתי',
    YachadMutza: 'יח"ד מוצע',
    TaarichHachraza: 'תאריך הכרזה',
    MisparTochnit: 'מספר תוכנית',
    KishurLatar: 'קישור לאתר',
    SachHeterim: 'סך היתרים',
    KishurLaMapa: 'קישור למפה',
    Maslul: 'מסלול',
    ShnatMatanTokef: 'שנת מתן תוקף',
    Bebitzua: 'בביצוע',
    Status: 'סטטוס',
  };

  if (loading) return <div className="p-4 text-center text-gray-500">טוען נתונים...</div>;

  if (!records.length) return <div className="p-4 text-center text-red-500">לא נמצאו נתונים</div>;

  // שמירת סדר השדות לפי רשומה ראשונה
  const headers = Object.keys(records[0]);

  // יצירת רשימת יישובים ייחודיים למטרת הבחירה בסינון
  const uniqueYeshuvim = Array.from(new Set(records.map(r => r.Yeshuv))).sort();

  // מסננים את הרשומות לפי היישוב הנבחר, אם יש
  const filteredRecords = filterYeshuv
    ? records.filter((r) => r.Yeshuv === filterYeshuv)
    : records;

  const totalPages = Math.ceil(filteredRecords.length / PAGE_SIZE);
  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const visibleRecords = filteredRecords.slice(start, end);

  // אם שינוי בסינון - חוזרים לעמוד ראשון
  function onFilterChange(newYeshuv: string) {
    setFilterYeshuv(newYeshuv);
    setPage(1);
  }

  return (
    <div className="p-4 overflow-auto">
      <h1 className="text-xl font-bold mb-4">  מתחמי התחדשות עירונית</h1>

      <div className="mb-4 flex items-center space-x-2 justify-end">
        <label htmlFor="yeshuvFilter" className="font-semibold">
          סינון לפי יישוב:
        </label>
        <select
          id="yeshuvFilter"
          className="border border-gray-300 rounded px-2 py-1"
          value={filterYeshuv}
          onChange={(e) => onFilterChange(e.target.value)}
        >
          <option value="">הכל</option>
          {uniqueYeshuvim.map((yeshuv) => (
            <option key={yeshuv} value={yeshuv}>
              {yeshuv}
            </option>
          ))}
        </select>
      </div>

      <table className="min-w-full border border-gray-300 text-sm">
        <thead className="bg-gray-100 text-right">
          <tr>
            {headers.map((key) => (
              <th key={key} className="border px-2 py-1 whitespace-nowrap">
                {fieldTranslations[key] || key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
            {visibleRecords.map((record, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                {headers.map((key) => (
                    <td key={key} className="border px-2 py-1 whitespace-nowrap text-right">
                    {key === 'KishurLatar' && record[key] ? (
                        <a
                        href={record[key]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline"
                        >
                        קישור
                        </a>
                    ) : (
                        String(record[key] ?? '')
                    )}
                    </td>
                ))}
                </tr>
            ))}
         </tbody>

      </table>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={(newPage: number) => setPage(newPage)}
      />
    </div>
  );
}

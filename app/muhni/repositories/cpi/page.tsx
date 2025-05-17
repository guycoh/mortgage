'use client';

import { useEffect, useState } from 'react';

type IndexBase = {
  _: string; // הערך של המדד
  $: {
    base: string; // שם הבסיס, למשל "Average 2024"
    chaining_coefficient?: string;
  };
};

type Index = {
  $: {
    month: string;
    year: string;
    code: string;
  };
  index_name: string;
  percent: string;
  index_base: IndexBase | IndexBase[];
};

export default function CpiTable() {
  const [indicesList, setIndicesList] = useState<Index[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch('/api/cpi')
      .then((res) => {
        if (!res.ok) throw new Error('שגיאה בטעינת הנתונים');
        return res.json();
      })
      .then((json: any) => {
        try {
          const chapter = json.indices.chapter[0];
          let allIndices: Index[] = [];

          if (Array.isArray(chapter.month)) {
            allIndices = chapter.month.flatMap((m: any) => {
              if (Array.isArray(m.index)) return m.index;
              if (m.index) return [m.index];
              return [];
            });
          } else if (chapter.month) {
            if (Array.isArray(chapter.month.index)) {
              allIndices = chapter.month.index;
            } else if (chapter.month.index) {
              allIndices = [chapter.month.index];
            }
          }

          if (allIndices.length === 0) {
            setError('לא נמצאו אינדקסים בנתונים שהתקבלו');
          } else {
            setIndicesList(allIndices);
          }
        } catch (e) {
          console.error(e);
          setError('מבנה הנתונים שונה מהצפוי');
        }
      })
      .catch((e) => {
        console.error(e);
        setError('שגיאה בטעינת הנתונים');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>טוען נתונים...</div>;
  if (error) return <div className="text-red-600">שגיאה: {error}</div>;

  return (
    <div className="overflow-x-auto max-w-full">
      <table className="min-w-[600px] border-collapse border border-gray-300 text-right">
        <thead className="bg-gray-200">
          <tr>
            <th className="border border-gray-300 px-4 py-2">שנה</th>
            <th className="border border-gray-300 px-4 py-2">חודש</th>
            <th className="border border-gray-300 px-4 py-2">שם מדד</th>
            <th className="border border-gray-300 px-4 py-2">מדד ממוצע 2024</th>
          </tr>
        </thead>
        <tbody>
          {indicesList.map((idx, i) => {
            const indexBases = Array.isArray(idx.index_base) ? idx.index_base : [idx.index_base];

            const base2024 = indexBases.find((b) => b.$.base === 'Average 2024')?._ ?? '-';

            return (
              <tr key={i} className="odd:bg-white even:bg-gray-50">
                <td className="border border-gray-300 px-2 py-1">{idx.$.year}</td>
                <td className="border border-gray-300 px-2 py-1">{idx.$.month}</td>
                <td className="border border-gray-300 px-2 py-1">{idx.index_name}</td>
                <td className="border border-gray-300 px-2 py-1">{base2024}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

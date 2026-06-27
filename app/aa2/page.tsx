'use client';

import  { useState, useEffect } from 'react';

interface IndexPoint {
  date: string;
  displayDate: string;
  value: number;
}

export default function ConstructionIndexChart() {
  const [rawData, setRawData] = useState<IndexPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/construction-index');
        if (!res.ok) {
          throw new Error(`תגובת השרת נכשלה עם סטטוס ${res.status}`);
        }
        
        const resData = await res.json();

        // הדפסה ל-Console לדיבאג של המבנה המלא
        console.log("ה-JSON המלא שהתקבל מה-API:", resData);

        if (!resData.success || !resData.data) {
          throw new Error(resData.error || 'ה-API החזיר תשובה שלילית או שדה data חסר');
        }

        const payload = resData.data;
        let monthsRaw: any[] | null = null;

        // פונקציה חכמה שסורקת את ה-JSON ומחפשת שדה בשם 'date' שהוא מערך
        const findDateArray = (obj: any): any[] | null => {
          if (!obj || typeof obj !== 'object') return null;
          
          // אם מצאנו אובייקט שיש לו שדה בשם date והוא מערך
          if (obj.date && Array.isArray(obj.date)) {
            return obj.date;
          }
          
          // אם האובייקט עצמו הוא מערך, נסרוק את האיברים שלו
          if (Array.isArray(obj)) {
            for (const item of obj) {
              const found = findDateArray(item);
              if (found) return found;
            }
          } else {
            // אם זה אובייקט רגיל, נסרוק את כל המפתחות שלו
            for (const key in obj) {
              const found = findDateArray(obj[key]);
              if (found) return found;
            }
          }
          return null;
        };

        // הרצת הסורק האוטומטי
        monthsRaw = findDateArray(payload);

        // גיבוי אחרון: אם payload בעצמו הוא המערך
        if (!monthsRaw && Array.isArray(payload)) {
          monthsRaw = payload;
        }

        if (!monthsRaw || !Array.isArray(monthsRaw) || monthsRaw.length === 0) {
          // אם בכל זאת לא מצאנו, נציג למסך מה כן קיבלנו כדי לפתור את זה בשנייה
          throw new Error(`הסורק לא מצא שדה בשם date שמכיל מערך. מבנה ה-JSON שחזר: ${JSON.stringify(payload).substring(0, 200)}...`);
        }

        // מיפוי הנתונים
        const formatted: IndexPoint[] = monthsRaw
          .map((item: any) => {
            if (!item) return null;

            const year = item.year;
            const month = item.month;
            const value = item.currBase?.value; 

            if (!year || !month || value === undefined || value === null) return null;

            return {
              date: `${year}-${String(month).padStart(2, '0')}`,
              displayDate: `${String(month).padStart(2, '0')}/${year}`,
              value: parseFloat(value),
            };
          })
          .filter((item): item is IndexPoint => item !== null && !isNaN(item.value))
          // מיון מהחדש לישן
          .sort((a, b) => b.date.localeCompare(a.date));

        if (formatted.length === 0) {
          throw new Error(`נמצא מערך התאריכים, אך האיברים בתוכו לא מכילים שנה, חודש או ערך מדד. איבר לדוגמה: ${JSON.stringify(monthsRaw[0])}`);
        }

        setRawData(formatted);
        setLoading(false);
      } catch (err: any) {
        console.error("שגיאה ברכיב:", err);
        setError(err.message || 'שגיאה בעיבוד הנתונים');
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center bg-white p-6 dir-rtl">
        <p className="text-gray-500 animate-pulse font-medium text-lg">סורק את מבנה הנתונים ומזרים מידע...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-6 text-red-600 shadow-sm dir-rtl max-w-3xl mx-auto my-4">
        <p className="font-bold text-lg">סטטוס סריקת נתונים:</p>
        <p className="text-sm mt-1 font-mono text-left dir-ltr bg-white p-3 rounded border border-red-200 overflow-x-auto">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white shadow-md rounded-2xl my-6 dir-rtl">
      <div className="border-b border-gray-200 pb-4 mb-4">
        <h2 className="text-xl font-bold text-gray-800">הזרמת נתונים חסינת תקלות</h2>
        <p className="text-xs text-gray-500 mt-1">הסורק מצא בהצלחה {rawData.length} חודשים.</p>
      </div>

      <div className="overflow-hidden border border-gray-200 rounded-xl">
        <table className="min-w-full divide-y divide-gray-200 text-right">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-sm font-bold text-gray-700">חודש / שנה</th>
              <th className="px-6 py-3 text-sm font-bold text-gray-700">ערך המדד</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 text-gray-800 font-medium text-sm">
            {rawData.map((item) => (
              <tr key={item.date} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-3 border-b">{item.displayDate}</td>
                <td className="px-6 py-3 border-b text-[#1d75a1] font-bold">{item.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
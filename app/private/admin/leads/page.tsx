'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PlusIcon from '@/public/assets/images/svg/general/PlusIcon';
import EditIcon from '@/public/assets/images/svg/general/EditIcon';
import TrashIcon from '@/public/assets/images/svg/general/TrashIcon';
import Link from 'next/link';

type Lead = {
  id: number;
  name: string;
  email: string;
  cell: string;
  last_call: string | null;
  status_call_id: number | null;
  reason_not_intrested_id: number | null;
  follow_up_date: string | null;
  follow_up_hour: string | null;
};

export default function LeadsTable() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const response = await fetch('/api/leads');
        const data = await response.json();
        setLeads(data);
      } catch (error) {
        console.error('Failed to fetch leads:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, []);

  const handleEdit = (id: number) => {
   // alert(`עריכת ליד ${id}`);
    router.push(`/private/crm/leads/${id}`);
    // ניתוב לדף עריכה או פתיחת מודאל
  };

  const handleDelete = (id: number) => {
    if (confirm('האם אתה בטוח שברצונך למחוק את הליד?')) {
      alert(`נמחק ליד ${id}`);
      // שליחת קריאה ל־API למחיקה
    }
  };

  if (loading) return <p className="text-center py-10 text-slate-500">טוען נתונים...</p>;

  return (
<div className="space-y-6">
  {/* כותרת מרכזית */}
  <div className="flex items-center justify-between">
    <h2 className="text-2xl font-bold text-slate-800 text-center flex-1 -ml-8">
      טבלת לידים
    </h2>
  </div>

  {/* כפתור הוספה */}
  <div className="flex justify-start">
    <Link
      href="/private/crm/leads/add"
      className="group relative h-12 w-32 sm:w-28 rounded-lg border border-green-500 bg-white p-1.5 text-base text-green-500 duration-500 hover:bg-green-700"
    >
      <p className="absolute top-2.5 left-5 m-0 p-0 duration-500 group-hover:left-2 group-hover:text-white text-lg">
        הוסף
      </p>
      <span className="absolute top-3.5 right-2 m-0 h-6 p-0 opacity-0 duration-500 group-hover:text-white group-hover:opacity-100">
        <PlusIcon color="white" className="w-4 h-4" />
      </span>
    </Link>
  </div>

  {/* טבלה */}
<div className="overflow-x-auto m-6">
  <table className="min-w-full text-sm text-right text-slate-800 border border-slate-700 rounded-xl overflow-hidden border-separate border-spacing-0">
    <thead className="bg-slate-100">
      <tr>
        {[
          "מס'",
          "שם",
          "אימייל",
          "נייד",
          "שיחה אחרונה",
          "סטטוס",
          "סיבת אי עניין",
          "תאריך מעקב",
          "שעת מעקב",
          "פעולות",
        ].map((title, index) => (
          <th
            key={index}
            className="px-4 py-2 border-b border-slate-700 whitespace-nowrap bg-slate-100"
          >
            {title}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {leads.map((lead) => (
        <tr key={lead.id} className="hover:bg-slate-50">
          <td className="px-4 py-2 border-b border-slate-700">{lead.id}</td>
          <td className="px-4 py-2 border-b border-slate-700">{lead.name}</td>
          <td className="px-4 py-2 border-b border-slate-700">{lead.email}</td>
          <td className="px-4 py-2 border-b border-slate-700">{lead.cell}</td>
          <td className="px-4 py-2 border-b border-slate-700">{lead.last_call ?? '-'}</td>
          <td className="px-4 py-2 border-b border-slate-700">{lead.status_call_id ?? '-'}</td>
          <td className="px-4 py-2 border-b border-slate-700">{lead.reason_not_intrested_id ?? '-'}</td>
          <td className="px-4 py-2 border-b border-slate-700">{lead.follow_up_date ?? '-'}</td>
          <td className="px-4 py-2 border-b border-slate-700">{lead.follow_up_hour ?? '-'}</td>
          <td className="px-4 py-0 border-b border-slate-700">
            <div className="flex items-stretch justify-center gap-2 h-full">
              <button
                onClick={() => handleEdit(lead.id)}
                className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-md text-xs h-full w-10 flex items-center justify-center"
                title="ערוך"
              >
                <EditIcon color="white" />
              </button>
              <button
                onClick={() => handleDelete(lead.id)}
                className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-md text-xs h-full w-10 flex items-center justify-center"
                title="מחק"
              >
                <TrashIcon color="white" />
              </button>
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>


</div>

  );
}

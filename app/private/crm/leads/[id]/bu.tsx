'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

type Lead = {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  status: string;
};

export default function EditLeadPage() {
  const router = useRouter();
  const { id } = useParams(); // קבלת מזהה הליד מה-URL
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLead = async () => {
      try {
        const res = await fetch(`/api/leads/${id}`);
        if (!res.ok) throw new Error('בעיה בטעינת הנתונים');
        const data = await res.json();
        setLead(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchLead();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!lead) return;
    setLead({ ...lead, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
      });

      if (!res.ok) throw new Error('שגיאה בעדכון הליד');
      router.push('/private/crm/leads');
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div className="p-4">טוען...</div>;
  if (error) return <div className="p-4 text-red-600">שגיאה: {error}</div>;
  if (!lead) return null;

  return (
    <div className="max-w-xl mx-auto mt-10 bg-white p-6 rounded-xl shadow-lg border border-slate-300 space-y-6">
      <h1 className="text-2xl font-bold text-center text-slate-800">עריכת ליד</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">שם מלא</label>
          <input
            type="text"
            name="full_name"
            value={lead.full_name}
            onChange={handleChange}
            className="w-full border border-slate-400 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">אימייל</label>
          <input
            type="email"
            name="email"
            value={lead.email}
            onChange={handleChange}
            className="w-full border border-slate-400 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">נייד</label>
          <input
            type="tel"
            name="phone"
            value={lead.phone}
            onChange={handleChange}
            className="w-full border border-slate-400 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">סטטוס</label>
          <select
            name="status"
            value={lead.status}
            onChange={handleChange}
            className="w-full border border-slate-400 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <option value="">בחר סטטוס</option>
            <option value="חדש">חדש</option>
            <option value="בטיפול">בטיפול</option>
            <option value="סגור">סגור</option>
          </select>
        </div>

        <div className="flex justify-between mt-6">
          <button
            type="submit"
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-md transition"
          >
            שמור שינויים
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-slate-600 hover:text-slate-800 underline"
          >
            ביטול
          </button>
        </div>
      </form>
    </div>
  );
}

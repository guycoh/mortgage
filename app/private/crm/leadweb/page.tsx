'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LeadsTable() {
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async () => {
        setLoading(true);
        const response = await fetch('/api/leadweb');
        const data = await response.json();
        setLeads(data);
        setLoading(false);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('האם אתה בטוח שברצונך למחוק את הליד הזה?')) return;
    
        try {
            const response = await fetch(`/api/leadweb/${id}`, { method: 'DELETE' });
    
            if (!response.ok) {
                const errorText = await response.text();
                alert(`שגיאה במחיקה: ${errorText}`);
                return;
            }
    
            // הסרה של הליד מהסטייט במקום למשוך מחדש
            setLeads((prevLeads) => prevLeads.filter((lead) => lead.id !== id));
        } catch (error) {
            console.error('שגיאה בעת מחיקת ליד:', error);
            alert('שגיאה בלתי צפויה במחיקה');
        }
    };
    
    
    return (
        <div className="max-w-6xl my-6 mx-2 p-6 bg-white shadow-lg rounded-lg ">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">לידים</h2>
                <button
                   onClick={() => router.push('/private/crm/leadweb/add')}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                    + הוסף ליד
                </button>
            </div>
            {loading ? (
                <p>טוען נתונים...</p>
            ) : (
                <table className="w-full border-collapse border border-gray-200 text-right">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border p-2">שם</th>
                            <th className="border p-2">טלפון</th>
                            <th className="border p-2">אימייל</th>
                            <th className="border p-2">תאריך</th>
                            <th className="border p-2">שעה</th>
                            <th className="border p-2">זום</th>
                            <th className="border p-2">בוצע</th>
                            <th className="border p-2">פעולות</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leads.map((lead) => (
                            <tr key={lead.id} className="border">
                                <td className="border p-2">{lead.lead_name}</td>
                                <td className="border p-2">{lead.cell_phone}</td>
                                <td className="border p-2">{lead.email}</td>
                                <td className="border p-2">{lead.date}</td>
                                <td className="border p-2">{lead.hour}</td>
                                <td className="border p-2">
                                    <input type="checkbox" checked={lead.zoom} disabled />
                                </td>
                                <td className="border p-2">
                                    <input type="checkbox" checked={lead.done} disabled />
                                </td>
                                <td className="border p-2 flex gap-2">
                                    <button                                       
                                        onClick={() => router.push(`/private/crm/leadweb/${lead.id}`)}
                                        className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                                    >
                                        עריכה
                                    </button>
                                    <button
                                        onClick={() => handleDelete(lead.id)}
                                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                                    >
                                        מחיקה
                                    </button>
                                 

                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

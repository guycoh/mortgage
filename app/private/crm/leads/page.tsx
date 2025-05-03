"use client"
import { useEffect, useState } from "react";
import Link from "next/link";

interface Lead {
  id: number;
  name: string;
  cell: string;
  data_source: string | null;
  intrested_in: string | null;
  spouse_name: string | null;
  spouse_phone: string | null;
  lead_first_status: string | null;
  last_call: string | null;
  status_call_id: string | null;
  reason_not_intrested_id: string | null;
  follow_up_date: string | null;
  follow_up_hour: string | null;
  realtor: string | null;
}

export default function LeadsTable() {
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    fetch("/api/leads")
      .then((res) => res.json())
      .then((data) => setLeads(data))
      .catch((error) => console.error("Error fetching leads:", error));
  }, []);

  return (
    <div className="p-4">
      <button className="mb-4 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600">
        הוספת ליד
      </button>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-2 px-4 border-b text-right">שם</th>
              <th className="py-2 px-4 border-b text-right">טלפון</th>
              <th className="py-2 px-4 border-b text-right">מקור נתונים</th>
              <th className="py-2 px-4 border-b text-right">מתעניין ב</th>
              <th className="py-2 px-4 border-b text-right">שם בן/בת זוג</th>
              <th className="py-2 px-4 border-b text-right">טלפון בן/בת זוג</th>
              <th className="py-2 px-4 border-b text-right">סטטוס ליד ראשוני</th>
              <th className="py-2 px-4 border-b text-right">שיחת אחרונה</th>
              <th className="py-2 px-4 border-b text-right">סטטוס שיחה</th>
              <th className="py-2 px-4 border-b text-right">סיבת אי התעניינות</th>
              <th className="py-2 px-4 border-b text-right">תאריך מעקב</th>
              <th className="py-2 px-4 border-b text-right">שעת מעקב</th>
              <th className="py-2 px-4 border-b text-right">מתווך</th>
              <th className="py-2 px-4 border-b text-right">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b hover:bg-gray-50">
                <td className="py-2 px-4 text-right">{lead.name}</td>
                <td className="py-2 px-4 text-right">{lead.cell}</td>
                <td className="py-2 px-4 text-right">{lead.data_source || "-"}</td>
                <td className="py-2 px-4 text-right">{lead.intrested_in || "-"}</td>
                <td className="py-2 px-4 text-right">{lead.spouse_name || "-"}</td>
                <td className="py-2 px-4 text-right">{lead.spouse_phone || "-"}</td>
                <td className="py-2 px-4 text-right">{lead.lead_first_status || "-"}</td>
                <td className="py-2 px-4 text-right">{lead.last_call || "-"}</td>
                <td className="py-2 px-4 text-right">{lead.status_call_id || "-"}</td>
                <td className="py-2 px-4 text-right">{lead.reason_not_intrested_id || "-"}</td>
                <td className="py-2 px-4 text-right">{lead.follow_up_date || "-"}</td>
                <td className="py-2 px-4 text-right">{lead.follow_up_hour || "-"}</td>
                <td className="py-2 px-4 text-right">{lead.realtor || "-"}</td>
                <td className="py-2 px-4 text-right">
                  <Link href={`/private/crm/leads/${lead.id}`}>
                    <button className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600">
                      כרטיס לקוח
                    </button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import EditIcon from "@/public/assets/images/svg/general/EditIcon";
import TrashIcon from "@/public/assets/images/svg/general/TrashIcon";
import { Lead } from "@/app/data/hooks/useLeads";

type Props = {
  leads: Lead[];
  loading: boolean;
  onEdit: (lead: Lead) => void;
  onDelete: (id: number) => Promise<void>;
};

export default function LeadsTable({ leads, loading, onEdit, onDelete }: Props) {
  if (loading) return <p className="text-center py-10 text-slate-500">טוען נתונים...</p>;

  return (
    <div className="overflow-x-auto m-6">
      <table className="min-w-full text-sm text-right text-slate-700 border border-slate-200 rounded-2xl overflow-hidden shadow-md">
        <thead className="bg-gradient-to-l from-slate-100 to-slate-200 text-slate-800 text-sm font-semibold">
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
                className="px-4 py-3 border-b border-slate-300 whitespace-nowrap text-center"
              >
                {title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {leads.map((lead, index) => (
            <tr
              key={lead.id ?? `temp-${index}`}
              className="hover:bg-slate-50 transition-colors duration-150"
            >
              <td className="px-4 py-3 text-center font-medium text-slate-800">{lead.id}</td>
              <td className="px-4 py-3">{lead.name}</td>
              <td className="px-4 py-3 text-slate-600">{lead.email}</td>
              <td className="px-4 py-3">{lead.cell}</td>
              <td className="px-4 py-3">{lead.last_call ?? "-"}</td>
              <td className="px-4 py-3">
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  {lead.status_call_id ?? "-"}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-500">{lead.reason_not_intrested_id ?? "-"}</td>
              <td className="px-4 py-3">{lead.follow_up_date ?? "-"}</td>
              <td className="px-4 py-3">{lead.follow_up_hour ?? "-"}</td>
              <td className="px-4 py-2">
                <div className="flex items-center justify-center gap-2">
                  {/* Edit */}
                  <button
                    onClick={() => onEdit(lead)}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg shadow-sm transition-transform transform hover:scale-105"
                    title="ערוך"
                  >
                    <EditIcon color="white" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={async () => {
                      if (confirm("האם אתה בטוח שברצונך למחוק את הליד?")) {
                        await onDelete(lead.id);
                      }
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg shadow-sm transition-transform transform hover:scale-105"
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
  );
}


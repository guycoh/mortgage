"use client"

import EditIcon from "@/public/assets/images/svg/general/EditIcon";
import TrashIcon from "@/public/assets/images/svg/general/TrashIcon";
import { Lead } from "@/app/data/hooks/useLeads";

type Props = {
  leads: Lead[];
  loading: boolean;
  onEdit: (lead: Lead) => void;
  onDelete: (id: number) => Promise<void>;
  setIsEditModalOpen: React.Dispatch<React.SetStateAction<boolean>>;

};

export default function LeadsTable({ leads, loading, onEdit, onDelete, setIsEditModalOpen }: Props) {
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
                  <button
                  
                   onClick={() => {
                   onEdit(lead);
                   setIsEditModalOpen(true);
                }}
                   
                   
                    className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg shadow-sm transition-transform transform hover:scale-105"
                    title="ערוך"
                  >
                    <EditIcon color="white" />
                  </button>
                 <button
                      onClick={() => {
                        if (confirm("האם אתה בטוח שברצונך למחוק את הליד?")) {
                          onDelete(lead.id);
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













// 'use client';

// import { useEffect, useState } from 'react';
// import { useRouter } from 'next/navigation';
// import PlusIcon from '@/public/assets/images/svg/general/PlusIcon';
// import EditIcon from '@/public/assets/images/svg/general/EditIcon';
// import TrashIcon from '@/public/assets/images/svg/general/TrashIcon';
// import Link from 'next/link';

// type Lead = {
//   id: number;
//   name: string;
//   email: string;
//   cell: string;
//   last_call: string | null;
//   status_call_id: number | null;
//   reason_not_intrested_id: number | null;
//   follow_up_date: string | null;
//   follow_up_hour: string | null;
// };

// export default function LeadsTable() {
//   const [leads, setLeads] = useState<Lead[]>([]);
//   const [loading, setLoading] = useState(true);
//   const router = useRouter();

//   useEffect(() => {
//     const fetchLeads = async () => {
//       try {
//         const response = await fetch('/api/leads');
//         const data = await response.json();
//         setLeads(data);
//       } catch (error) {
//         console.error('Failed to fetch leads:', error);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchLeads();
//   }, []);

//   const handleEdit = (id: number) => {
//    // alert(`עריכת ליד ${id}`);
//     router.push(`/private/crm/leads/${id}`);
//     // ניתוב לדף עריכה או פתיחת מודאל
//   };

//   const handleDelete = (id: number) => {
//     if (confirm('האם אתה בטוח שברצונך למחוק את הליד?')) {
//       alert(`נמחק ליד ${id}`);
//       // שליחת קריאה ל־API למחיקה
//     }
//   };

//   if (loading) return <p className="text-center py-10 text-slate-500">טוען נתונים...</p>;

//   return (
// <div className="space-y-6">
//   {/* כותרת מרכזית */}
//   <div className="flex items-center justify-between">
//     <h2 className="text-2xl font-bold text-slate-800 text-center flex-1 -ml-8">
//       טבלת לידים
//     </h2>
//   </div>



//   {/* טבלה */}
// {/* טבלה */}
// <div className="overflow-x-auto m-6">
//   <table className="min-w-full text-sm text-right text-slate-700 border border-slate-200 rounded-2xl overflow-hidden shadow-md">
//     <thead className="bg-gradient-to-l from-slate-100 to-slate-200 text-slate-800 text-sm font-semibold">
//       <tr>
//         {[
//           "מס'",
//           "שם",
//           "אימייל",
//           "נייד",
//           "שיחה אחרונה",
//           "סטטוס",
//           "סיבת אי עניין",
//           "תאריך מעקב",
//           "שעת מעקב",
//           "פעולות",
//         ].map((title, index) => (
//           <th
//             key={index}
//             className="px-4 py-3 border-b border-slate-300 whitespace-nowrap text-center"
//           >
//             {title}
//           </th>
//         ))}
//       </tr>
//     </thead>
//     <tbody className="divide-y divide-slate-200">
//       {leads.map((lead) => (
//         <tr
//           key={lead.id}
//           className="hover:bg-slate-50 transition-colors duration-150"
//         >
//           <td className="px-4 py-3 text-center font-medium text-slate-800">{lead.id}</td>
//           <td className="px-4 py-3">{lead.name}</td>
//           <td className="px-4 py-3 text-slate-600">{lead.email}</td>
//           <td className="px-4 py-3">{lead.cell}</td>
//           <td className="px-4 py-3">{lead.last_call ?? '-'}</td>
//           <td className="px-4 py-3">
//             <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
//               {lead.status_call_id ?? '-'}
//             </span>
//           </td>
//           <td className="px-4 py-3 text-slate-500">
//             {lead.reason_not_intrested_id ?? '-'}
//           </td>
//           <td className="px-4 py-3">{lead.follow_up_date ?? '-'}</td>
//           <td className="px-4 py-3">{lead.follow_up_hour ?? '-'}</td>
//           <td className="px-4 py-2">
//             <div className="flex items-center justify-center gap-2">
//               <button
//                 onClick={() => handleEdit(lead.id)}
//                 className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg shadow-sm transition-transform transform hover:scale-105"
//                 title="ערוך"
//               >
//                 <EditIcon color="white" />
//               </button>
//               <button
//                 onClick={() => handleDelete(lead.id)}
//                 className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg shadow-sm transition-transform transform hover:scale-105"
//                 title="מחק"
//               >
//                 <TrashIcon color="white" />
//               </button>
//             </div>
//           </td>
//         </tr>
//       ))}
//     </tbody>
//   </table>
// </div>



// </div>

//   );
// }

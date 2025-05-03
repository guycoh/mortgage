"use client"
// import { useEffect, useState } from "react";
// import Link from "next/link";

// interface Lead {
//   id: number;
//   name: string;
//   cell: string;
//   data_source: string | null;
//   intrested_in: string | null;
//   spouse_name: string | null;
//   spouse_phone: string | null;
//   lead_first_status: string | null;
//   last_call: string | null;
//   status_call_id: string | null;
//   reason_not_intrested_id: string | null;
//   follow_up_date: string | null;
//   follow_up_hour: string | null;
//   realtor: string | null;
// }

// export default function LeadsTable() {
//   const [leads, setLeads] = useState<Lead[]>([]);

//   useEffect(() => {
//     fetch("/api/leads")
//       .then((res) => res.json())
//       .then((data) => setLeads(data))
//       .catch((error) => console.error("Error fetching leads:", error));
//   }, []);

//   return (
//     <div className="p-4">
//       <button className="mb-4 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600">
//         הוספת ליד
//       </button>
//       <div className="overflow-x-auto">
//         <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
//           <thead className="bg-gray-100">
//             <tr>
//               <th className="py-2 px-4 border-b text-right">שם</th>
//               <th className="py-2 px-4 border-b text-right">טלפון</th>
//               <th className="py-2 px-4 border-b text-right">מקור נתונים</th>
//               <th className="py-2 px-4 border-b text-right">מתעניין ב</th>
//               <th className="py-2 px-4 border-b text-right">שם בן/בת זוג</th>
//               <th className="py-2 px-4 border-b text-right">טלפון בן/בת זוג</th>
//               <th className="py-2 px-4 border-b text-right">סטטוס ליד ראשוני</th>
//               <th className="py-2 px-4 border-b text-right">שיחת אחרונה</th>
//               <th className="py-2 px-4 border-b text-right">סטטוס שיחה</th>
//               <th className="py-2 px-4 border-b text-right">סיבת אי התעניינות</th>
//               <th className="py-2 px-4 border-b text-right">תאריך מעקב</th>
//               <th className="py-2 px-4 border-b text-right">שעת מעקב</th>
//               <th className="py-2 px-4 border-b text-right">מתווך</th>
//               <th className="py-2 px-4 border-b text-right">פעולות</th>
//             </tr>
//           </thead>
//           <tbody>
//             {leads.map((lead) => (
//               <tr key={lead.id} className="border-b hover:bg-gray-50">
//                 <td className="py-2 px-4 text-right">{lead.name}</td>
//                 <td className="py-2 px-4 text-right">{lead.cell}</td>
//                 <td className="py-2 px-4 text-right">{lead.data_source || "-"}</td>
//                 <td className="py-2 px-4 text-right">{lead.intrested_in || "-"}</td>
//                 <td className="py-2 px-4 text-right">{lead.spouse_name || "-"}</td>
//                 <td className="py-2 px-4 text-right">{lead.spouse_phone || "-"}</td>
//                 <td className="py-2 px-4 text-right">{lead.lead_first_status || "-"}</td>
//                 <td className="py-2 px-4 text-right">{lead.last_call || "-"}</td>
//                 <td className="py-2 px-4 text-right">{lead.status_call_id || "-"}</td>
//                 <td className="py-2 px-4 text-right">{lead.reason_not_intrested_id || "-"}</td>
//                 <td className="py-2 px-4 text-right">{lead.follow_up_date || "-"}</td>
//                 <td className="py-2 px-4 text-right">{lead.follow_up_hour || "-"}</td>
//                 <td className="py-2 px-4 text-right">{lead.realtor || "-"}</td>
//                 <td className="py-2 px-4 text-right">
//                   <Link href={`/private/crm/leads/${lead.id}`}>
//                     <button className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600">
//                       כרטיס לקוח
//                     </button>
//                   </Link>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }























// "use client";

// import { use, useEffect, useState } from "react";

// interface Lead {
//   id: number;
//   created_at: string;
//   name: string;
//   email: string;
//   cell: string;
//   addess: string;
//   status_call_id?: number | null;
//   reason_not_intrested_id?: number | null;
//   follow_up_date?: string | null;
//   follow_up_hour?: string | null;
// }

// interface Option {
//   id: number;
//   status: string;
// }

// const fieldLabels: Record<keyof Lead, string> = {
//   id: "מזהה",
//   created_at: "תאריך יצירה",
//   name: "שם",
//   email: "אימייל",
//   cell: "טלפון",
//   addess: "כתובת",
//   status_call_id: "סטטוס שיחה",
//   reason_not_intrested_id: "סיבה לאי התעניינות",
//   follow_up_date: "תאריך מעקב",
//   follow_up_hour: "שעת מעקב",
// };

// export default function LeadPage({ params }: { params: Promise<{ id: string }> }) {
//   const { id } = use(params);
//   const [lead, setLead] = useState<Lead | null>(null);
//   const [reasons, setReasons] = useState<Option[]>([]);
//   const [statuses, setStatuses] = useState<Option[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [statusCall, setStatusCall] = useState<number | null>(null);

//   useEffect(() => {
//     async function fetchLead() {
//       const response = await fetch(`/api/leads/${id}`);
//       const data: Lead = await response.json();
//       setLead(data);
//       setStatusCall(data.status_call_id ?? null); // שמירת סטטוס השיחה
//     }

//     async function fetchOptions(url: string, setOptions: (data: Option[]) => void) {
//       const response = await fetch(url);
//       const data: Option[] = await response.json();
//       setOptions(data);
//     }

//     fetchLead();
//     fetchOptions("/api/reason_not_interested", setReasons);
//     fetchOptions("/api/status_call", setStatuses);
//   }, [id]);

//   const handleChange = (field: keyof Lead, value: string | number | null) => {
//     setLead((prev) => (prev ? { ...prev, [field]: value } : prev));

//     if (field === "status_call_id") {
//       setStatusCall(value as number);
//     }
//   };

//   if (loading) return <div className="text-center p-4">טוען...</div>;
//   if (!lead) return <div className="text-center p-4">לא נמצא מידע</div>;

//   const showReasonNotInterested = statusCall === 2;
//   const showFollowUpFields = statusCall === 3;

//   return (
//     <div className="w-screen h-screen p-2 md:p-4 bg-gray-100">
//       <div className="w-full h-full bg-white shadow-md rounded-lg p-2 md:p-4 overflow-auto">
//         <h1 className="text-xl font-bold mb-4 text-center">עריכת ליד</h1>

//         {/* טופס ראשי */}
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
//           {Object.entries(lead)
//             .filter(([key]) => !["status_call_id", "reason_not_intrested_id", "follow_up_date", "follow_up_hour"].includes(key))
//             .map(([key, value]) => (
//               <div key={key} className="flex flex-col">
//                 <label className="font-semibold text-gray-700 text-sm">{fieldLabels[key as keyof Lead]}</label>
//                 <input
//                   className="border rounded p-2 text-sm transition focus:bg-orange-100"
//                   value={value ?? ""}
//                   onChange={(e) => handleChange(key as keyof Lead, e.target.value)}
//                 />
//               </div>
//             ))}
//         </div>

//         {/* מסגרת עם שדות מיוחדים */}
//         <div className="border rounded-lg p-4 mt-6 bg-gray-50 shadow-sm">
//           <h2 className="text-lg font-semibold mb-3">מעקב וסטטוס</h2>
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
//             {/* סטטוס שיחה */}
//             <div className="flex flex-col">
//               <label className="font-semibold text-gray-700 text-sm">סטטוס שיחה</label>
//               <select
//                 className="border rounded p-2 text-sm transition focus:bg-orange-100"
//                 value={lead.status_call_id ?? ""}
//                 onChange={(e) => handleChange("status_call_id", Number(e.target.value))}
//               >
//                 <option value="">בחר סטטוס</option>
//                 {statuses.map((status) => (
//                   <option key={status.id} value={status.id}>
//                     {status.status}
//                   </option>
//                 ))}
//               </select>
//             </div>

//             {/* סיבה לאי התעניינות - תופיע רק אם סטטוס = 2 */}
//             {showReasonNotInterested && (
//               <div className="flex flex-col">
//                 <label className="font-semibold text-gray-700 text-sm">סיבה לאי התעניינות</label>
//                 <select
//                   className="border rounded p-2 text-sm transition focus:bg-orange-100"
//                   value={lead.reason_not_intrested_id ?? ""}
//                   onChange={(e) => handleChange("reason_not_intrested_id", Number(e.target.value))}
//                 >
//                   <option value="">בחר סיבה</option>
//                   {reasons.map((reason) => (
//                     <option key={reason.id} value={reason.id}>
//                       {reason.status}
//                     </option>
//                   ))}
//                 </select>
//               </div>
//             )}

//             {/* תאריך ושעת מעקב - יוצגו רק אם סטטוס = 3 */}
//             {showFollowUpFields && (
//               <>
//                 <div className="flex flex-col">
//                   <label className="font-semibold text-gray-700 text-sm">תאריך מעקב</label>
//                   <input
//                     type="date"
//                     className="border rounded p-2 text-sm transition focus:bg-orange-100"
//                     value={lead.follow_up_date ?? ""}
//                     onChange={(e) => handleChange("follow_up_date", e.target.value)}
//                   />
//                 </div>

//                 <div className="flex flex-col">
//                   <label className="font-semibold text-gray-700 text-sm">שעת מעקב</label>
//                   <input
//                     type="time"
//                     className="border rounded p-2 text-sm transition focus:bg-orange-100"
//                     value={lead.follow_up_hour ?? ""}
//                     onChange={(e) => handleChange("follow_up_hour", e.target.value)}
//                   />
//                 </div>
//               </>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

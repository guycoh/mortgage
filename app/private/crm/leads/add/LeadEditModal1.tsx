// "use client";
// import { useEffect, useState } from "react";
// import type { Lead } from "@/app/data/hooks/useLeads";

// import { banks } from "@/app/data/banks";
// import { statusCall } from "@/app/data/status_call";
// import { useEmployees } from "@/app/data/hooks/useEmployees";
// import { useReasonNotInterested } from "@/app/data/hooks/useReasonNotInterested";
// import { useLeadSource } from "@/app/data/hooks/useLeadSource"; 






// type Props = {
//   isOpen: boolean;
//   onClose: () => void;
//   lead: Lead | null;
//   onSave: (updated: Lead) => void;
//   sources: { id: number; source: string }[];
//   statusCall: { id: number; name: string }[];
//   reasons: { id: number; status: string }[];
//   banks: { id: number; name: string }[];
//   employees: { id: number; full_name: string }[];
// };

// export default function LeadEditModal({
//   isOpen,
//   onClose,
//   lead,
//   onSave,
  
//   statusCall,

//   banks,

// }: Props) {
//   const [editLead, setEditLead] = useState<Partial<Lead>>({});
//   const [statusCallValue, setStatusCallValue] = useState<string>("");



//   const { employees } = useEmployees();
//   const { reasons } = useReasonNotInterested();
//   const { sources } = useLeadSource();


//   useEffect(() => {
//     if (lead) {
//       setEditLead(lead);
//       setStatusCallValue(lead.status_call_id ? String(lead.status_call_id) : "");
//     }
//   }, [lead]);

//   if (!isOpen || !lead) return null;

//   const handleChange = (field: keyof Lead, value: any) => {
//     setEditLead((prev) => ({ ...prev, [field]: value }));
//   };

//   const handleSave = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (editLead) onSave(editLead as Lead);
//     onClose();
//   };

//   return (
//     <div
//       className={`fixed inset-0 z-50 transition-opacity duration-300 ${
//         isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
//       }`}
//     >
//       <div className="absolute inset-0 bg-black/40" onClick={onClose} />

//       <div
//         className={`fixed left-0 top-0 bg-white h-full w-3/4 shadow-xl transform transition-transform duration-300 flex flex-col ${
//           isOpen ? "translate-x-0" : "-translate-x-full"
//         }`}
//       >
//         {/* Header */}
//         <div className="flex justify-between items-center p-4 bg-blue-600 text-white">
//           <h2 className="text-lg font-bold">עריכת ליד</h2>
//           <button
//             onClick={onClose}
//             className="text-xl font-bold hover:text-red-300"
//           >
//             ✕
//           </button>
//         </div>


//         {/* Form */}
//         <div className="flex-1 overflow-y-auto p-6 pb-32">
//           <form id="editLeadForm" onSubmit={handleSave} className="grid grid-cols-2 md:grid-cols-3 gap-6">
//             {/* שם מלא */}
//             <div className="flex flex-col">
//               <label className="mb-1 text-gray-700 font-medium">שם מלא</label>
//               <input
//                 value={editLead.name ?? ""}
//                 onChange={(e) => handleChange("name", e.target.value)}
//                 required
//                 className="border rounded-md p-2 focus:ring-2 focus:ring-orange-200 focus:bg-orange-50"
//               />
//             </div>
//             {/* טלפון */}
//             <div className="flex flex-col">
//               <label className="mb-1 text-gray-700 font-medium">טלפון</label>
//               <input
//                 type="tel"
//                 value={editLead.cell ?? ""}
//                 onChange={(e) => handleChange("cell", e.target.value)}
//                 required
//                 className="border rounded-md p-2 focus:ring-2 focus:ring-orange-200 focus:bg-orange-50"
//               />
//             </div>
//             {/* אימייל */}
//             <div className="flex flex-col">
//               <label className="mb-1 text-gray-700 font-medium">אימייל</label>
//               <input
//                 type="email"
//                 value={editLead.email ?? ""}
//                 onChange={(e) => handleChange("email", e.target.value)}
//                 className="border rounded-md p-2 focus:ring-2 focus:ring-orange-200 focus:bg-orange-50"
//               />
//             </div>

//             {/* בן/בת זוג */}
//             <div className="flex flex-col">
//               <label className="mb-1 text-gray-700 font-medium">שם בן/בת זוג</label>
//               <input
//                 value={editLead.spouse_name ?? ""}
//                 onChange={(e) => handleChange("spouse_name", e.target.value)}
//                 className="border rounded-md p-2 focus:ring-2 focus:ring-orange-200 focus:bg-orange-50"
//               />
//             </div>
//             <div className="flex flex-col">
//               <label className="mb-1 text-gray-700 font-medium">טלפון בן/בת זוג</label>
//               <input
//                 value={editLead.spouse_phone ?? ""}
//                 onChange={(e) => handleChange("spouse_phone", e.target.value)}
//                 className="border rounded-md p-2 focus:ring-2 focus:ring-orange-200 focus:bg-orange-50"
//               />
//             </div>

//             {/* מקור ליד */}
//             {/* <div className="flex flex-col">
//               <label className="mb-1 text-gray-700 font-medium">מקור ליד</label>
//               <select
//                 value={editLead.data_source ?? ""}
//                 onChange={(e) => handleChange("data_source", e.target.value)}
//                 className="border rounded-md p-2 focus:ring-2 focus:ring-orange-200 focus:bg-orange-50"
//               >
//                 <option value="">בחר מקור ליד</option>
//                 {sources.map((so) => (
//                   <option key={so.id} value={so.id}>
//                     {so.source}
//                   </option>
//                 ))}
//               </select>
//             </div> */}


//            {/* שורה של 4 השדות עם מסגרת */}
//           <div className="col-span-2 md:col-span-3 border border-gray-300 rounded-md p-4 flex flex-wrap gap-4">

//             {/* סטטוס שיחה */}
//             <div className="flex flex-col w-[180px]">
//               <label htmlFor="status_call_id" className="mb-1 text-gray-700 font-medium">סטטוס שיחה</label>
//               <select
//                 id="status_call_id"              
//                 value={statusCallValue}
//                 onChange={(e) => setStatusCallValue(e.target.value)}
//                 className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:bg-orange-50 transition-colors"
//               >
//                 <option value="">בחר סטטוס</option>
//                 {statusCall.map((s) => (
//                   <option key={s.id} value={s.id}>{s.name}</option>
//                 ))}
//               </select>
//             </div>

//             {/* סיבה לא מעוניין */}
//             <div className={`flex flex-col w-[180px] ${statusCallValue === "2" ? "" : "hidden"}`}>
//               <label htmlFor="reason_not_intrested_id" className="mb-1 text-gray-700 font-medium">סיבה לא מעוניין</label>
//               <select
//                 id="reason_not_intrested_id"                
//                 className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:bg-orange-50 transition-colors"
//               >
//                 <option value="">בחר סיבה</option>
//                 {reasons.map((r) => (
//                   <option key={r.id} value={r.id}>{r.status}</option>
//                 ))}
//               </select>
//             </div>

//             {/* תאריך מעקב */}
//             <div className={`flex flex-col w-[140px] ${statusCallValue === "3" ? "" : "hidden"}`}>
//               <label htmlFor="follow_up_date" className="mb-1 text-gray-700 font-medium">תאריך מעקב</label>
//               <input
//                 id="follow_up_date"
//                 type="date"                
//                 className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:bg-orange-50 transition-colors"
//               />
//             </div>

//             {/* שעה מעקב */}
//             <div className={`flex flex-col w-[120px] ${statusCallValue === "3" ? "" : "hidden"}`}>
//               <label htmlFor="follow_up_hour" className="mb-1 text-gray-700 font-medium">שעה מעקב</label>
//               <input
//                 id="follow_up_hour"
//                 type="time"              
//                 className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:bg-orange-50 transition-colors"
//               />
//             </div>

//           </div>


















//             {/* צ'קבוקסים */}
//             <div className="col-span-2 md:col-span-3 border rounded-md p-4 flex flex-wrap gap-4">
//               <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black text-white">
//                 <input
//                   type="checkbox"
//                   checked={!!editLead.black_list}
//                   onChange={(e) => handleChange("black_list", e.target.checked)}
//                   className="w-4 h-4 accent-orange-400"
//                 />
//                 רשימה שחורה
//               </label>
//               <label className="flex items-center gap-2">
//                 <input
//                   type="checkbox"
//                   checked={!!editLead.realtor}
//                   onChange={(e) => handleChange("realtor", e.target.checked)}
//                   className="w-4 h-4 accent-orange-400"
//                 />
//                 מתווך
//               </label>
//               <label className="flex items-center gap-2">
//                 <input
//                   type="checkbox"
//                   checked={!!editLead.mailing_list}
//                   onChange={(e) => handleChange("mailing_list", e.target.checked)}
//                   className="w-4 h-4 accent-orange-400"
//                 />
//                 רשימת דיוור
//               </label>
//               <label className="flex items-center gap-2">
//                 <input
//                   type="checkbox"
//                   checked={!!editLead.investors_list}
//                   onChange={(e) => handleChange("investors_list", e.target.checked)}
//                   className="w-4 h-4 accent-orange-400"
//                 />
//                 משקיעים
//               </label>
//             </div>

//             {/* כתובת */}
//             <div className="flex flex-col">
//               <label className="mb-1 text-gray-700 font-medium">כתובת</label>
//               <input
//                 value={editLead.address ?? ""}
//                 onChange={(e) => handleChange("address", e.target.value)}
//                 className="border rounded-md p-2 focus:ring-2 focus:ring-orange-200 focus:bg-orange-50"
//               />
//             </div>

//             {/* סטטוס ראשוני */}
//             <div className="flex flex-col">
//               <label className="mb-1 text-gray-700 font-medium">סטטוס ראשוני</label>
//               <input
//                 value={editLead.lead_first_status ?? ""}
//                 onChange={(e) => handleChange("lead_first_status", e.target.value)}
//                 className="border rounded-md p-2 focus:ring-2 focus:ring-orange-200 focus:bg-orange-50"
//               />
//             </div>

//             {/* הערות */}
//             <div className="flex flex-col col-span-2 md:col-span-3">
//               <label className="mb-1 text-gray-700 font-medium">הערות</label>
//               <textarea
//                 value={editLead.comment ?? ""}
//                 onChange={(e) => handleChange("comment", e.target.value)}
//                 rows={3}
//                 className="border rounded-md p-2 focus:ring-2 focus:ring-orange-200 focus:bg-orange-50"
//               />
//             </div>

//             {/* שיחה אחרונה */}
//             <div className="flex flex-col">
//               <label className="mb-1 text-gray-700 font-medium">שיחה אחרונה</label>
//               <input
//                 type="date"
//                 value={editLead.last_call ?? ""}
//                 onChange={(e) => handleChange("last_call", e.target.value)}
//                 className="border rounded-md p-2 focus:ring-2 focus:ring-orange-200 focus:bg-orange-50"
//               />
//             </div>

//             {/* דף יתרות */}
//             <div className="flex flex-col">
//               <label className="mb-1 text-gray-700 font-medium">דף יתרות</label>
//               <input
//                 value={editLead.balance_statement ?? ""}
//                 onChange={(e) => handleChange("balance_statement", e.target.value)}
//                 className="border rounded-md p-2 focus:ring-2 focus:ring-orange-200 focus:bg-orange-50"
//               />
//             </div>

//             {/* בנק */}
//             <div className="flex flex-col">
//               <label className="mb-1 text-gray-700 font-medium">בנק</label>
//               <select
//                 value={editLead.bank_id ?? ""}
//                 onChange={(e) => handleChange("bank_id", Number(e.target.value))}
//                 className="border rounded-md p-2 focus:ring-2 focus:ring-orange-200 focus:bg-orange-50"
//               >
//                 <option value="">בחר בנק</option>
//                 {banks.map((b) => (
//                   <option key={b.id} value={b.id}>
//                     {b.name}
//                   </option>
//                 ))}
//               </select>
//             </div>

//             {/* אחראי */}
//             <div className="flex flex-col">
//               <label className="mb-1 text-gray-700 font-medium">אחראי</label>
//               <select
//                 value={editLead.profile_id ?? ""}
//                 onChange={(e) => handleChange("profile_id", Number(e.target.value))}
//                 className="border rounded-md p-2 focus:ring-2 focus:ring-orange-200 focus:bg-orange-50"
//               >
//                 <option value="">בחר עובד</option>
//                 {employees.map((emp) => (
//                   <option key={emp.id} value={emp.id}>
//                     {emp.full_name}
//                   </option>
//                 ))}
//               </select>
//             </div>
//           </form>
//         </div>

//         {/* Footer */}
//         <div className="sticky bottom-0 w-full bg-gray-100 p-4 flex justify-end gap-3 shadow-inner">
//           <button
//             onClick={onClose}
//             type="button"
//             className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
//           >
//             ביטול
//           </button>
//           <button
//             type="submit"
//             form="editLeadForm"
//             className="px-4 py-2 bg-sky-500 text-white rounded hover:bg-sky-600"
//           >
//             שמירה
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

























// "use client";
// import { useEffect, useState } from "react";
// import type { Lead } from "@/app/data/hooks/useLeads";


// type Props = {
//   isOpen: boolean;
//   onClose: () => void;
//   lead: Lead | null;
//   onSave: (updated: Lead) => void;
//   sources: { id: number; source: string }[];
//   statusCall: { id: number; name: string }[];
//   reasons: { id: number; status: string }[];
//   banks: { id: number; name: string }[];
//   employees: { id: number; full_name: string }[];
// };

// export default function LeadEditModal({
//   isOpen,
//   onClose,
//   lead,
//   onSave,
//   sources,
//   statusCall,
//   reasons,
//   banks,
//   employees,
// }: Props) {
//   const [editLead, setEditLead] = useState<Partial<Lead>>({});
//   const [statusCallValue, setStatusCallValue] = useState<string>("");










//   useEffect(() => {
//     if (lead) {
//       setEditLead(lead);
//       setStatusCallValue(lead.status_call_id ? String(lead.status_call_id) : "");
//     }
//   }, [lead]);

//   if (!isOpen || !lead) return null;

//   const handleChange = (field: keyof Lead, value: any) => {
//     setEditLead((prev) => ({ ...prev, [field]: value }));
//   };

//   const handleSave = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (editLead) onSave(editLead as Lead);
//     onClose();
//   };

//   return (
//     <div
//       className={`fixed inset-0 z-50 transition-opacity duration-300 ${
//         isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
//       }`}
//     >
//       <div className="absolute inset-0 bg-black/40" onClick={onClose} />

//       <div
//         className={`fixed left-0 top-0 bg-white h-full w-3/4 shadow-xl transform transition-transform duration-300 flex flex-col ${
//           isOpen ? "translate-x-0" : "-translate-x-full"
//         }`}
//       >
//         {/* Header */}
//         <div className="flex justify-between items-center p-4 bg-green-400">
//           <h2 className="text-lg font-bold">עריכת ליד</h2>
//           <button
//             onClick={onClose}
//             className="text-xl font-bold text-gray-700 hover:text-red-500"
//           >
//             ✕
//           </button>
//         </div>

//         {/* Form */}
//         <div className="flex-1 overflow-y-auto p-6 pb-32">
//           <form id="editLeadForm" onSubmit={handleSave} className="grid grid-cols-2 md:grid-cols-3 gap-6">
//             {/* שם מלא */}
//             <div className="flex flex-col">
//               <label className="mb-1 text-gray-700 font-medium">שם מלא</label>
//               <input
//                 value={editLead.name ?? ""}
//                 onChange={(e) => handleChange("name", e.target.value)}
//                 required
//                 className="border rounded-md p-2 focus:ring-2 focus:ring-orange-200 focus:bg-orange-50"
//               />
//             </div>
//             {/* טלפון */}
//             <div className="flex flex-col">
//               <label className="mb-1 text-gray-700 font-medium">טלפון</label>
//               <input
//                 type="tel"
//                 value={editLead.cell ?? ""}
//                 onChange={(e) => handleChange("cell", e.target.value)}
//                 required
//                 className="border rounded-md p-2 focus:ring-2 focus:ring-orange-200 focus:bg-orange-50"
//               />
//             </div>
//             {/* אימייל */}
//             <div className="flex flex-col">
//               <label className="mb-1 text-gray-700 font-medium">אימייל</label>
//               <input
//                 type="email"
//                 value={editLead.email ?? ""}
//                 onChange={(e) => handleChange("email", e.target.value)}
//                 className="border rounded-md p-2 focus:ring-2 focus:ring-orange-200 focus:bg-orange-50"
//               />
//             </div>

//             {/* בן/בת זוג */}
//             <div className="flex flex-col">
//               <label className="mb-1 text-gray-700 font-medium">שם בן/בת זוג</label>
//               <input
//                 value={editLead.spouse_name ?? ""}
//                 onChange={(e) => handleChange("spouse_name", e.target.value)}
//                 className="border rounded-md p-2 focus:ring-2 focus:ring-orange-200 focus:bg-orange-50"
//               />
//             </div>
//             <div className="flex flex-col">
//               <label className="mb-1 text-gray-700 font-medium">טלפון בן/בת זוג</label>
//               <input
//                 value={editLead.spouse_phone ?? ""}
//                 onChange={(e) => handleChange("spouse_phone", e.target.value)}
//                 className="border rounded-md p-2 focus:ring-2 focus:ring-orange-200 focus:bg-orange-50"
//               />
//             </div>

//             {/* מקור ליד */}
//             {/* <div className="flex flex-col">
//               <label className="mb-1 text-gray-700 font-medium">מקור ליד</label>
//               <select
//                 value={editLead.data_source ?? ""}
//                 onChange={(e) => handleChange("data_source", e.target.value)}
//                 className="border rounded-md p-2 focus:ring-2 focus:ring-orange-200 focus:bg-orange-50"
//               >
//                 <option value="">בחר מקור ליד</option>
//                 {sources.map((so) => (
//                   <option key={so.id} value={so.id}>
//                     {so.source}
//                   </option>
//                 ))}
//               </select>
//             </div> */}

//             {/* צ'קבוקסים */}
//             <div className="col-span-2 md:col-span-3 border rounded-md p-4 flex flex-wrap gap-4">
//               <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black text-white">
//                 <input
//                   type="checkbox"
//                   checked={!!editLead.black_list}
//                   onChange={(e) => handleChange("black_list", e.target.checked)}
//                   className="w-4 h-4 accent-orange-400"
//                 />
//                 רשימה שחורה
//               </label>
//               <label className="flex items-center gap-2">
//                 <input
//                   type="checkbox"
//                   checked={!!editLead.realtor}
//                   onChange={(e) => handleChange("realtor", e.target.checked)}
//                   className="w-4 h-4 accent-orange-400"
//                 />
//                 מתווך
//               </label>
//               <label className="flex items-center gap-2">
//                 <input
//                   type="checkbox"
//                   checked={!!editLead.mailing_list}
//                   onChange={(e) => handleChange("mailing_list", e.target.checked)}
//                   className="w-4 h-4 accent-orange-400"
//                 />
//                 רשימת דיוור
//               </label>
//               <label className="flex items-center gap-2">
//                 <input
//                   type="checkbox"
//                   checked={!!editLead.investors_list}
//                   onChange={(e) => handleChange("investors_list", e.target.checked)}
//                   className="w-4 h-4 accent-orange-400"
//                 />
//                 משקיעים
//               </label>
//             </div>

//             {/* כתובת */}
//             <div className="flex flex-col">
//               <label className="mb-1 text-gray-700 font-medium">כתובת</label>
//               <input
//                 value={editLead.address ?? ""}
//                 onChange={(e) => handleChange("address", e.target.value)}
//                 className="border rounded-md p-2 focus:ring-2 focus:ring-orange-200 focus:bg-orange-50"
//               />
//             </div>

          

//             {/* סטטוס ראשוני */}
//             <div className="flex flex-col">
//               <label className="mb-1 text-gray-700 font-medium">סטטוס ראשוני</label>
//               <input
//                 value={editLead.lead_first_status ?? ""}
//                 onChange={(e) => handleChange("lead_first_status", e.target.value)}
//                 className="border rounded-md p-2 focus:ring-2 focus:ring-orange-200 focus:bg-orange-50"
//               />
//             </div>

//             {/* הערות */}
//             <div className="flex flex-col col-span-2 md:col-span-3">
//               <label className="mb-1 text-gray-700 font-medium">הערות</label>
//               <textarea
//                 value={editLead.comment ?? ""}
//                 onChange={(e) => handleChange("comment", e.target.value)}
//                 rows={3}
//                 className="border rounded-md p-2 focus:ring-2 focus:ring-orange-200 focus:bg-orange-50"
//               />
//             </div>

//             {/* שיחה אחרונה */}
//             <div className="flex flex-col">
//               <label className="mb-1 text-gray-700 font-medium">שיחה אחרונה</label>
//               <input
//                 type="date"
//                 value={editLead.last_call ?? ""}
//                 onChange={(e) => handleChange("last_call", e.target.value)}
//                 className="border rounded-md p-2 focus:ring-2 focus:ring-orange-200 focus:bg-orange-50"
//               />
//             </div>

//             {/* דף יתרות */}
//             <div className="flex flex-col">
//               <label className="mb-1 text-gray-700 font-medium">דף יתרות</label>
//               <input
//                 value={editLead.balance_statement ?? ""}
//                 onChange={(e) => handleChange("balance_statement", e.target.value)}
//                 className="border rounded-md p-2 focus:ring-2 focus:ring-orange-200 focus:bg-orange-50"
//               />
//             </div>

//             {/* בנק */}
//             {/* <div className="flex flex-col">
//               <label className="mb-1 text-gray-700 font-medium">בנק</label>
//               <select
//                 value={editLead.bank_id ?? ""}
//                 onChange={(e) => handleChange("bank_id", Number(e.target.value))}
//                 className="border rounded-md p-2 focus:ring-2 focus:ring-orange-200 focus:bg-orange-50"
//               >
//                 <option value="">בחר בנק</option>
//                 {banks.map((b) => (
//                   <option key={b.id} value={b.id}>
//                     {b.name}
//                   </option>
//                 ))}
//               </select>
//             </div> */}

//             {/* אחראי */}
//             {/* <div className="flex flex-col">
//               <label className="mb-1 text-gray-700 font-medium">אחראי</label>
//               <select
//                 value={editLead.profile_id ?? ""}
//                 onChange={(e) => handleChange("profile_id", Number(e.target.value))}
//                 className="border rounded-md p-2 focus:ring-2 focus:ring-orange-200 focus:bg-orange-50"
//               >
//                 <option value="">בחר עובד</option>
//                 {employees.map((emp) => (
//                   <option key={emp.id} value={emp.id}>
//                     {emp.full_name}
//                   </option>
//                 ))}
//               </select>
//             </div> */}
//           </form>
//         </div>

//         {/* Footer */}
//         <div className="sticky bottom-0 w-full bg-gray-100 p-4 flex justify-end gap-3 shadow-inner">
//           <button
//             onClick={onClose}
//             type="button"
//             className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
//           >
//             ביטול
//           </button>
//           <button
//             type="submit"
//             form="editLeadForm"
//             className="px-4 py-2 bg-sky-500 text-white rounded hover:bg-sky-600"
//           >
//             שמירה
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

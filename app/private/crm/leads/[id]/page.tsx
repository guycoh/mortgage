"use client"
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';

interface Lead {
  id: number;
  name: string | null;
  cell: string | null;
  email: string | null;
  address: string | null;
  spouse_name: string | null;
  spouse_phone: string | null;
  black_list: boolean;
  realtor: string | null;
  mailing_list: boolean;
  investors_list: boolean;
  balance_statement: boolean;
  bank_id: string | null;
  status_call_id: string | null;
  reason_not_intrested_id: string | null;
  follow_up_date: string | null;
  follow_up_hour: string | null;
  created_at: string;
}

interface Bank {
  id: string;
  bank: string;
}

interface StatusCall {
  id: string;
  status: string;
}

interface ReasonNotInterested {
  id: string;
  status: string;
}

export default function LeadPage() {
  const params = useParams();
  const [lead, setLead] = useState<Lead | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);

  const [statusCalls, setStatusCalls] = useState<StatusCall[]>([]);
  const [reasonsNotInterested, setReasonsNotInterested] = useState<ReasonNotInterested[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);  // עדכון ה-state שהקוד רץ בצד הלקוח
  }, []);

  useEffect(() => {
    async function fetchLead() {
      if (!params.id) return;
      try {
        const res = await fetch(`/api/leads/${params.id}`);
        if (!res.ok) throw new Error('Failed to fetch lead');
        const data: Lead = await res.json();
        setLead(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchLead();
  }, [params.id]);

  useEffect(() => {
    async function fetchBanks() {
      try {
        const res = await fetch('/api/banks');
        if (!res.ok) throw new Error('Failed to fetch banks');
        const data: Bank[] = await res.json();
        setBanks(data);
      } catch (error) {
        console.error(error);
      }
    }
    fetchBanks();
  }, []);

  useEffect(() => {
    async function fetchStatusCalls() {
      try {
        const res = await fetch('/api/status_call');
        if (!res.ok) throw new Error('Failed to fetch status calls');
        const data: StatusCall[] = await res.json();
        setStatusCalls(data);
      } catch (error) {
        console.error(error);
      }
    }
    fetchStatusCalls();
  }, []);

  useEffect(() => {
    async function fetchReasonsNotInterested() {
      try {
        const res = await fetch('/api/reason_not_interested');
        if (!res.ok) throw new Error('Failed to fetch reasons not interested');
        const data: ReasonNotInterested[] = await res.json();
        setReasonsNotInterested(data);
      } catch (error) {
        console.error(error);
      }
    }
    fetchReasonsNotInterested();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (lead) {
      const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      setLead({ ...lead, [e.target.name]: value });
    }
  };

  const isReasonNotInterestedVisible = lead?.status_call_id === '2';
  const isFollowUpVisible = lead?.status_call_id === '3';

  if (!isClient) return null;

  if (loading) return <p className="text-center text-gray-500">טוען נתונים...</p>;
  if (!lead) return <p className="text-center text-red-500">ליד לא נמצא</p>;

  return (
    <div className="container mx-auto p-6">
      <div className="shadow-lg rounded-xl p-6 bg-white">
        <h2 className="text-2xl font-semibold mb-4">פרטי ליד #{lead.id}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* טור ראשון */}
          <div className="p-4 border rounded-lg">
            <label className="block text-gray-700">שם</label>
            <input className="w-full p-2 border rounded-lg focus:bg-orange-100" name="name" value={lead.name ?? ''} onChange={handleChange} />
            <label className="block text-gray-700 mt-2">טלפון</label>
            <input className="w-full p-2 border rounded-lg focus:bg-orange-100" name="cell" value={lead.cell ?? ''} onChange={handleChange} />
            <label className="block text-gray-700 mt-2">אימייל</label>
            <input className="w-full p-2 border rounded-lg focus:bg-orange-100" name="email" value={lead.email ?? ''} onChange={handleChange} />
            <label className="block text-gray-700 mt-2">כתובת</label>
            <input className="w-full p-2 border rounded-lg focus:bg-orange-100" name="address" value={lead.address ?? ''} onChange={handleChange} />
          </div>
          {/* טור שני */}
          <div className="p-4 border rounded-lg">
            <label className="block text-gray-700">שם בן/בת הזוג</label>
            <input className="w-full p-2 border rounded-lg focus:bg-orange-100" name="spouse_name" value={lead.spouse_name ?? ''} onChange={handleChange} />
            <label className="block text-gray-700 mt-2">טלפון בן/בת הזוג</label>
            <input className="w-full p-2 border rounded-lg focus:bg-orange-100" name="spouse_phone" value={lead.spouse_phone ?? ''} onChange={handleChange} />
          </div>
          {/* טור שלישי */}
          <div className="p-4 border rounded-lg">
            <label className="block text-gray-700">מתווך</label>
            <input className="w-full p-2 border rounded-lg focus:bg-orange-100" name="realtor" value={lead.realtor ?? ''} onChange={handleChange} />
            <div className="mt-2 flex items-center">
              <input type="checkbox" className="mr-2" name="black_list" checked={lead.black_list} onChange={handleChange} />
              <label className="text-gray-700">רשימה שחורה</label>
            </div>
            <div className="mt-2 flex items-center">
              <input type="checkbox" className="mr-2" name="mailing_list" checked={lead.mailing_list} onChange={handleChange} />
              <label className="text-gray-700">רשימת דיוור</label>
            </div>
            <div className="mt-2 flex items-center">
              <input type="checkbox" className="mr-2" name="investors_list" checked={lead.investors_list} onChange={handleChange} />
              <label className="text-gray-700">רשימת משקיעים</label>
            </div>
            <div className="mt-2 flex items-center">
              <input type="checkbox" className="mr-2" name="balance_statement" checked={lead.balance_statement} onChange={handleChange} />
              <label className="text-gray-700">דוח יתרות</label>
            </div>
            <label className="block text-gray-700 mt-2">בנק</label>
            <select
              className="w-full p-2 border rounded-lg focus:bg-orange-100"
              name="bank_id"
              value={lead.bank_id ?? ''}
              onChange={handleChange}
            >
              <option value="">בחר בנק</option>
              {banks.map((bank) => (
                <option key={bank.id} value={bank.id}>
                  {bank.bank}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* מסגרת עם שדה status_call_id */}
        <div className="mt-6 p-6 border rounded-lg bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="col-span-1">
              <label className="block text-gray-700">סטטוס קריאה</label>
              <select
                className="w-full p-2 border rounded-lg focus:bg-orange-100"
                name="status_call_id"
                value={lead.status_call_id ?? ''}
                onChange={handleChange}
              >
                <option value="">בחר סטטוס</option>
                {statusCalls.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.status}
                  </option>
                ))}
              </select>
            </div>

            {isReasonNotInterestedVisible && (
              <div className="col-span-1">
                <label className="block text-gray-700">סיבה לא התעניינות</label>
                <select
                  className="w-full p-2 border rounded-lg focus:bg-orange-100"
                  name="reason_not_intrested_id"
                  value={lead.reason_not_intrested_id ?? ''}
                  onChange={handleChange}
                >
                  <option value="">בחר סיבה</option>
                  {reasonsNotInterested.map((reason) => (
                    <option key={reason.id} value={reason.id}>
                      {reason.status}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isFollowUpVisible && (
              <>
                <div className="col-span-1">
                  <label className="block text-gray-700">תאריך מעקב</label>
                  <input
                    type="date"
                    className="w-full p-2 border rounded-lg focus:bg-orange-100"
                    name="follow_up_date"
                    value={lead.follow_up_date ?? ''}
                    onChange={handleChange}
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-gray-700">שעת מעקב</label>
                  <input
                    type="time"
                    className="w-full p-2 border rounded-lg focus:bg-orange-100"
                    name="follow_up_hour"
                    value={lead.follow_up_hour ?? ''}
                    onChange={handleChange}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-6">
          <button 
            onClick={() => router.push('/leads')}
            className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg"
          >
            חזרה לרשימת הלידים
          </button>
        </div>
      </div>
    </div>
  );
}



// "use client";

// import { use, useEffect, useState } from "react";

// interface Lead {
//   id: number;
//   created_at: string;
//   name: string;
//   email: string;
//   cell: string;
//   addess: string;
//   data_source?: string | null;
//   intrested_in?: string | null;
//   spouse_name?: string | null;
//   spouse_phone?: string | null;
//   lead_first_status?: string | null;
//   comment?: string | null;
//   zoom?: string | null;
//   date_zoom?: string | null;
//   hour_zoom?: string | null;
//   last_call?: string | null;
//   status_call_id?: number | null;
//   reason_not_intrested_id?: number | null;
//   follow_up_date?: string | null;
//   follow_up_hour?: string | null;
//   black_list?: number; // משתנה שיהיה 1 או 0
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
//   data_source: "מקור נתונים",
//   intrested_in: "מתעניין ב",
//   spouse_name: "שם בן/בת זוג",
//   spouse_phone: "טלפון בן/בת זוג",
//   lead_first_status: "סטטוס ראשוני",
//   comment: "הערה",
//   zoom: "שיחת זום",
//   date_zoom: "תאריך זום",
//   hour_zoom: "שעת זום",
//   last_call: "שיחה אחרונה",
//   status_call_id: "סטטוס שיחה",
//   reason_not_intrested_id: "סיבה לאי התעניינות",
//   follow_up_date: "תאריך מעקב",
//   follow_up_hour: "שעת מעקב",
//   black_list: "רשימה שחורה",
// };

// export default function LeadPage({ params }: { params: Promise<{ id: string }> }) {
//   const { id } = use(params);
//   const [lead, setLead] = useState<Lead | null>(null);
//   const [reasons, setReasons] = useState<Option[]>([]);
//   const [statuses, setStatuses] = useState<Option[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [saving, setSaving] = useState(false);

//   useEffect(() => {
//     async function fetchLead() {
//       try {
//         const response = await fetch(`/api/leads/${id}`);
//         if (!response.ok) throw new Error("Failed to fetch lead data");
//         const data: Lead = await response.json();
//         setLead(data);
//       } catch (err) {
//         setError("לא ניתן לטעון את הנתונים");
//       } finally {
//         setLoading(false);
//       }
//     }

//     async function fetchOptions(url: string, setOptions: (data: Option[]) => void) {
//       try {
//         const response = await fetch(url);
//         if (!response.ok) throw new Error(`Failed to fetch ${url}`);
//         const data: Option[] = await response.json();
//         setOptions(data);
//       } catch (err) {
//         console.error("Error fetching options:", err);
//       }
//     }

//     fetchLead();
//     fetchOptions("/api/reason_not_interested", setReasons);
//     fetchOptions("/api/status_call", setStatuses);
//   }, [id]);

//   const handleChange = (field: keyof Lead, value: string | number | null) => {
//     setLead((prev) => (prev ? { ...prev, [field]: value } : prev));
//   };

//   const handleSave = async () => {
//     if (!lead) return;
//     setSaving(true);
//     try {
//       const response = await fetch(`/api/leads/${id}`, {
//         method: "PUT",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(lead),
//       });
//       if (!response.ok) throw new Error("Failed to save changes");
//     } catch (err) {
//       alert("שגיאה בשמירת הנתונים");
//     } finally {
//       setSaving(false);
//     }
//   };

//   if (loading) return <div className="text-center p-4">טוען...</div>;
//   if (error) return <div className="text-center p-4 text-red-500">{error}</div>;
//   if (!lead) return <div className="text-center p-4">לא נמצא מידע</div>;

//   const isStatusCall2 = lead.status_call_id === 2;
//   const isStatusCall3 = lead.status_call_id === 3;

//   return (
//     <div className="w-screen h-screen p-2 md:p-4 bg-gray-100">
//       <div className="w-full h-full bg-white shadow-md rounded-lg p-2 md:p-4 overflow-auto">
//         <h1 className="text-xl font-bold mb-4 text-center">עריכת ליד</h1>

//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
//           {Object.entries(lead)
//             .filter(([key]) => !["status_call_id", "reason_not_intrested_id", "follow_up_date", "follow_up_hour", "black_list", "id", "created_at"].includes(key))
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

//         <div className="flex items-center gap-2 mt-4">
//           <input
//             type="checkbox"
//             id="blacklist"
//             checked={lead.black_list === 1}
//             onChange={(e) => handleChange("black_list", e.target.checked ? 1 : 0)}
//             className="w-5 h-5"
//           />
//           <label htmlFor="blacklist" className="font-semibold text-gray-700 text-sm">רשימה שחורה</label>
//         </div>

//         <div className="border rounded-lg p-4 mt-6 bg-gray-50 shadow-sm">
//           <h2 className="text-lg font-semibold mb-3">מעקב וסטטוס</h2>
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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

//             {isStatusCall2 && (
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

//             {isStatusCall3 && (
//               <>
//                 <input type="date" value={lead.follow_up_date ?? ""} onChange={(e) => handleChange("follow_up_date", e.target.value)} />
//                 <input type="time" value={lead.follow_up_hour ?? ""} onChange={(e) => handleChange("follow_up_hour", e.target.value)} />
//               </>
//             )}
//           </div>
//         </div>

//         {/* הצגת מזהה ותאריך יצירה בתחתית הדף */}
//         <div className="flex justify-between mt-6 border-t pt-4">
//           <div className="flex flex-col">
//             <label className="font-semibold text-gray-700 text-sm">{fieldLabels.id}</label>
//             <input
//               className="border rounded p-2 text-sm transition focus:bg-orange-100"
//               value={lead.id}
//               disabled
//             />
//           </div>
//           <div className="flex flex-col">
//             <label className="font-semibold text-gray-700 text-sm">{fieldLabels.created_at}</label>
//             <input
//               className="border rounded p-2 text-sm transition focus:bg-orange-100"
//               value={lead.created_at}
//               disabled
//             />
//           </div>
//         </div>

//         <div className="flex justify-center mt-6">
//           <button
//             onClick={handleSave}
//             disabled={saving}
//             className="px-6 py-2 bg-blue-500 text-white rounded-lg disabled:bg-gray-400"
//           >
//             {saving ? "שומר..." : "שמור שינויים"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

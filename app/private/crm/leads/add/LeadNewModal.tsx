"use client";
import { useEffect, useRef,useState  } from "react";
import { banks } from "@/app/data/banks";
import { statusCall } from "@/app/data/status_call";
import { useEmployees } from "@/app/data/hooks/useEmployees";
import { useReasonNotInterested } from "@/app/data/hooks/useReasonNotInterested";
import { useLeadSource } from "@/app/data/hooks/useLeadSource"; 


interface LeadNewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
}

export default function LeadNewModal({ isOpen, onClose, title }: LeadNewModalProps) {
  const { employees } = useEmployees();
  const { reasons } = useReasonNotInterested();
  const { sources } = useLeadSource();

  const [statusCallValue, setStatusCallValue] = useState("");
 



  const refs = {
    name: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    cell: useRef<HTMLInputElement>(null),
    address: useRef<HTMLInputElement>(null),
    data_source: useRef<HTMLSelectElement>(null),
    intrested_in: useRef<HTMLInputElement>(null),
    spouse_name: useRef<HTMLInputElement>(null),
    spouse_phone: useRef<HTMLInputElement>(null),
    lead_first_status: useRef<HTMLInputElement>(null),
    comment: useRef<HTMLTextAreaElement>(null),
    zoom: useRef<HTMLInputElement>(null),
    hour_zoom: useRef<HTMLInputElement>(null),
    last_call: useRef<HTMLInputElement>(null),
    status_call_id: useRef<HTMLSelectElement>(null),
    reason_not_intrested_id: useRef<HTMLSelectElement>(null),
    follow_up_date: useRef<HTMLInputElement>(null),
    follow_up_hour: useRef<HTMLInputElement>(null),
    balance_statement: useRef<HTMLInputElement>(null),
    bank_id: useRef<HTMLSelectElement>(null),
    profile_id: useRef<HTMLSelectElement>(null),
    black_list: useRef<HTMLInputElement>(null),
    realtor: useRef<HTMLInputElement>(null),
    mailing_list: useRef<HTMLInputElement>(null),
    investors_list: useRef<HTMLInputElement>(null),
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const lead = {
      name: refs.name.current?.value || "",
      email: refs.email.current?.value || "",
      cell: refs.cell.current?.value || "",
      address: refs.address.current?.value || null,
      data_source: refs.data_source.current?.value || null,
      intrested_in: refs.intrested_in.current?.value || null,
      spouse_name: refs.spouse_name.current?.value || null,
      spouse_phone: refs.spouse_phone.current?.value || null,
      lead_first_status: refs.lead_first_status.current?.value || null,
      comment: refs.comment.current?.value || null,
      zoom: refs.zoom.current?.value || null,
      hour_zoom: refs.hour_zoom.current?.value || null,
      last_call: refs.last_call.current?.value || null,
      status_call_id: refs.status_call_id.current?.value || null,
      reason_not_intrested_id: refs.reason_not_intrested_id.current?.value || null,
      follow_up_date: refs.follow_up_date.current?.value || null,
      follow_up_hour: refs.follow_up_hour.current?.value || null,
      black_list: refs.black_list.current?.checked ? 1 : 0,
      realtor: refs.realtor.current?.checked ? 1 : 0,
      mailing_list: refs.mailing_list.current?.checked ? 1 : 0,
      investors_list: refs.investors_list.current?.checked ? 1 : 0,
      balance_statement: refs.balance_statement.current?.value || null,
      bank_id: refs.bank_id.current?.value || null,
      profile_id: refs.profile_id.current?.value || null,
    };

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead),
      });
      if (!response.ok) throw new Error(`Error ${response.status}`);
      const data = await response.json();
      console.log("Lead created:", data);
      onClose();
    } catch (error) {
      console.error("Failed to create lead:", error);
    }
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${
        isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div
        className={`fixed left-0 top-0 bg-white h-full w-3/4 shadow-xl transform transition-transform duration-300 flex flex-col ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 bg-green-600">
          <h2 className="text-lg text- font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="text-xl font-bold text-white hover:text-red-500"
          >
            ✕
          </button>
        </div>

      
       {/* Form with scroll */}
        <div className="flex-1 overflow-y-auto p-6 pb-32">
          <form id="leadForm" onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-3 gap-6">
            
            {/* שם מלא */}
            <div className="flex flex-col">
              <label htmlFor="name" className="mb-1 text-gray-700 font-medium">שם מלא</label>
              <input
                id="name"
                ref={refs.name}
                required
                className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:bg-orange-50 transition-colors"
              />
            </div>
            {/* טלפון */}
            <div className="flex flex-col">
              <label htmlFor="cell" className="mb-1 text-gray-700 font-medium">טלפון</label>
              <input
                id="cell"
                type="tel"
                ref={refs.cell}
                required
                className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:bg-orange-50 transition-colors"
              />
            </div>
            {/* אימייל */}
            <div className="flex flex-col">
              <label htmlFor="email" className="mb-1 text-gray-700 font-medium">אימייל</label>
              <input
                id="email"
                type="email"
                ref={refs.email}
                className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:bg-orange-50 transition-colors"
              />
            </div>
           {/* שם בן/בת זוג */}
            <div className="flex flex-col">
              <label htmlFor="spouse_name" className="mb-1 text-gray-700 font-medium">שם בן/בת זוג</label>
              <input
                id="spouse_name"
                ref={refs.spouse_name}
                className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:bg-orange-50 transition-colors"
              />
            </div>
            {/* טלפון בן/בת זוג */}
            <div className="flex flex-col">
              <label htmlFor="spouse_phone" className="mb-1 text-gray-700 font-medium">טלפון בן/בת זוג</label>
              <input
                id="spouse_phone"
                ref={refs.spouse_phone}
                className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:bg-orange-50 transition-colors"
              />
            </div>        

           {/* מקור ליד */}
            <div className="flex flex-col">
              <label htmlFor="data_source" className="mb-1 text-gray-700 font-medium">מקור ליד</label>
              <select
                id="data_source"
                ref={refs.data_source}
                className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:bg-orange-50 transition-colors"
              >
                <option value="">בחר מקור ליד</option>
                { sources.map((so) => (
                  <option key={so.id} value={so.id}>{so.source}</option>
                ))}
              </select>
            </div>

           {/* שורה של 4 השדות עם מסגרת */}
          <div className="col-span-2 md:col-span-3 border border-gray-300 rounded-md p-4 flex flex-wrap gap-4">

            {/* סטטוס שיחה */}
            <div className="flex flex-col w-[180px]">
              <label htmlFor="status_call_id" className="mb-1 text-gray-700 font-medium">סטטוס שיחה</label>
              <select
                id="status_call_id"
                ref={refs.status_call_id}
                value={statusCallValue}
                onChange={(e) => setStatusCallValue(e.target.value)}
                className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:bg-orange-50 transition-colors"
              >
                <option value="">בחר סטטוס</option>
                {statusCall.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* סיבה לא מעוניין */}
            <div className={`flex flex-col w-[180px] ${statusCallValue === "2" ? "" : "hidden"}`}>
              <label htmlFor="reason_not_intrested_id" className="mb-1 text-gray-700 font-medium">סיבה לא מעוניין</label>
              <select
                id="reason_not_intrested_id"
                ref={refs.reason_not_intrested_id}
                className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:bg-orange-50 transition-colors"
              >
                <option value="">בחר סיבה</option>
                {reasons.map((r) => (
                  <option key={r.id} value={r.id}>{r.status}</option>
                ))}
              </select>
            </div>

            {/* תאריך מעקב */}
            <div className={`flex flex-col w-[140px] ${statusCallValue === "3" ? "" : "hidden"}`}>
              <label htmlFor="follow_up_date" className="mb-1 text-gray-700 font-medium">תאריך מעקב</label>
              <input
                id="follow_up_date"
                type="date"
                ref={refs.follow_up_date}
                className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:bg-orange-50 transition-colors"
              />
            </div>

            {/* שעה מעקב */}
            <div className={`flex flex-col w-[120px] ${statusCallValue === "3" ? "" : "hidden"}`}>
              <label htmlFor="follow_up_hour" className="mb-1 text-gray-700 font-medium">שעה מעקב</label>
              <input
                id="follow_up_hour"
                type="time"
                ref={refs.follow_up_hour}
                className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:bg-orange-50 transition-colors"
              />
            </div>

          </div>
          {/* צ'קבוקסים */}
          <div className="col-span-2 md:col-span-3 border border-gray-300 rounded-md p-4 flex flex-wrap gap-4">
            {/* רשימה שחורה */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black">
              <input
                ref={refs.black_list}
                type="checkbox"
                className="w-4 h-4 accent-orange-400"
              />
              <label className="text-white font-semibold">רשימה שחורה</label>
            </div>

            {/* מתווך */}
            <div className="flex items-center gap-2">
              <input
                ref={refs.realtor}
                type="checkbox"
                className="w-4 h-4 accent-orange-400"
              />
              <label className="text-gray-700 font-medium">מתווך</label>
            </div>

            {/* רשימת דיוור */}
            <div className="flex items-center gap-2">
              <input
                ref={refs.mailing_list}
                type="checkbox"
                className="w-4 h-4 accent-orange-400"
              />
              <label className="text-gray-700 font-medium">רשימת דיוור</label>
            </div>

            {/* משקיעים */}
            <div className="flex items-center gap-2">
              <input
                ref={refs.investors_list}
                type="checkbox"
                className="w-4 h-4 accent-orange-400"
              />
              <label className="text-gray-700 font-medium">משקיעים</label>
            </div>
          </div>
        

            {/* כתובת */}
            <div className="flex flex-col">
              <label htmlFor="address" className="mb-1 text-gray-700 font-medium">כתובת</label>
              <input
                id="address"
                ref={refs.address}
                className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:bg-orange-50 transition-colors"
              />
            </div>

           

            {/* תחום עניין */}
            <div className="flex flex-col">
              <label htmlFor="intrested_in" className="mb-1 text-gray-700 font-medium">תחום עניין</label>
              <input
                id="intrested_in"
                ref={refs.intrested_in}
                className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:bg-orange-50 transition-colors"
              />
            </div>

           

            {/* סטטוס ראשוני */}
            <div className="flex flex-col">
              <label htmlFor="lead_first_status" className="mb-1 text-gray-700 font-medium">סטטוס ראשוני</label>
              <input
                id="lead_first_status"
                ref={refs.lead_first_status}
                className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:bg-orange-50 transition-colors"
              />
            </div>

            {/* הערות */}
            <div className="flex flex-col col-span-2 md:col-span-3">
              <label htmlFor="comment" className="mb-1 text-gray-700 font-medium">הערות</label>
              <textarea
                id="comment"
                ref={refs.comment}
                rows={3}
                className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:bg-orange-50 transition-colors"
              />
            </div>

          

            {/* שיחה אחרונה */}
            <div className="flex flex-col">
              <label htmlFor="last_call" className="mb-1 text-gray-700 font-medium">שיחה אחרונה</label>
              <input
                id="last_call"
                type="date"
                ref={refs.last_call}
                className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:bg-orange-50 transition-colors"
              />
            </div>

          
            {/* דף יתרות */}
            <div className="flex flex-col">
              <label htmlFor="balance_statement" className="mb-1 text-gray-700 font-medium">דף יתרות</label>
              <input
                id="balance_statement"
                ref={refs.balance_statement}
                className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:bg-orange-50 transition-colors"
              />
            </div>

            {/* בנק */}
            <div className="flex flex-col">
              <label htmlFor="bank_id" className="mb-1 text-gray-700 font-medium">בנק</label>
              <select
                id="bank_id"
                ref={refs.bank_id}
                className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:bg-orange-50 transition-colors"
              >
                <option value="">בחר בנק</option>
                {banks.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* אחראי */}
            <div className="flex flex-col">
              <label htmlFor="profile_id" className="mb-1 text-gray-700 font-medium">אחראי</label>
              <select
                id="profile_id"
                ref={refs.profile_id}
                className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:bg-orange-50 transition-colors"
              >
                <option value="">בחר עובד</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.full_name}</option>
                ))}
              </select>
            </div>

           
          </form>
        </div>
        {/* Footer */}
        <div className="sticky bottom-0 left-0 w-full bg-gray-100 p-4 flex justify-end gap-3 shadow-inner">
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition"
          >
            ביטול
          </button>
          <button
            type="submit"
            form="leadForm"
            className="px-4 py-2 bg-sky-500 text-white rounded hover:bg-sky-600 transition"
          >
            שמירה
          </button>
        </div>


      
      </div>

      
    </div>
  );
}

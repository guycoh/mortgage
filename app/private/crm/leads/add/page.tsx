"use client"

import React, { useRef } from 'react'

import { banks } from '@/app/data/banks'
import { statusCall } from '@/app/data/status_call'
import { useEmployees } from '@/app/data/hooks/useEmployees'
import { useReasonNotInterested } from '@/app/data/hooks/useReasonNotInterested'


export default function LeadForm() {
 const { employees } = useEmployees();
 const {reasons }=useReasonNotInterested();

 
  const refs = {
    name: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    cell: useRef<HTMLInputElement>(null),
    address: useRef<HTMLInputElement>(null),
    data_source: useRef<HTMLInputElement>(null),
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
  }

 const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  const lead = {
    name: refs.name.current?.value || '',
    email: refs.email.current?.value || '',
    cell: refs.cell.current?.value || '',
    addess: refs.address.current?.value || null,
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
    const response = await fetch('/api/leads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(lead),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('Lead created:', data);

    // אופציונלי: נקה את הטופס או הצג הודעת הצלחה
    // e.target.reset(); או setState כלשהו

  } catch (error) {
    console.error('Failed to create lead:', error);
    // הצג הודעת שגיאה למשתמש
  }
};

 

  return (


<form
  onSubmit={handleSubmit}
  className="w-full max-w-7xl mx-auto p-6 lg:p-8 bg-white rounded-xl shadow space-y-6"
>
  <h2 className="text-2xl font-bold">הוספת ליד חדש</h2>

  {/* רשת המסגרות */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

    {/* מסגרת 1 – פרטי לידים בסיסיים */}
    <fieldset className="space-y-4 p-4 border rounded-xl">
      <legend className="text-sm font-semibold px-2">פרטי ליד</legend>

      <div className="space-y-2">
        
        <label className="block text-sm font-medium">שם מלא
          <input ref={refs.name} id="name" name="name" className="w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-500 rounded-md px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow focus:bg-orange-50" />
        </label>

        <label className="block text-sm font-medium">טלפון נייד
          <input ref={refs.cell} id="cell" name="cell" className="w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-500 rounded-md px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow focus:bg-orange-50" />
        </label>

        <label className="block text-sm font-medium">אימייל
          <input ref={refs.email} id="email" name="email" className="w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-500 rounded-md px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow focus:bg-orange-50"  />
        </label>

        <label className="block text-sm font-medium">כתובת
          <input ref={refs.address} id="address" name="address" className="w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-500 rounded-md px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow focus:bg-orange-50"  />
        </label>

        <label className="block text-sm font-medium">מעוניין ב…
          <input ref={refs.intrested_in} id="intrested_in" name="intrested_in" className="w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-500 rounded-md px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow focus:bg-orange-50"  />
        </label>
      </div>
    </fieldset>

    {/* מסגרת 2 – פרטי בן/בת זוג */}
    <fieldset className="space-y-4 p-4 border rounded-xl">
      <legend className="text-sm font-semibold px-2">פרטי בן/בת זוג</legend>

      <div className="space-y-2">
        <label className="block text-sm font-medium">שם בן/בת זוג
          <input ref={refs.spouse_name} id="spouse_name" name="spouse_name" className="w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-500 rounded-md px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow focus:bg-orange-50"  />
        </label>

        <label className="block text-sm font-medium">טלפון בן/בת זוג
          <input ref={refs.spouse_phone} id="spouse_phone" name="spouse_phone" className="w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-500 rounded-md px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow focus:bg-orange-50"  />
        </label>
      </div>
    </fieldset>

    {/* מסגרת 3 – סיווגים ורשימות */}
    <fieldset className="space-y-4 p-4 border rounded-xl">
      <legend className="text-sm font-semibold px-2">סיווגים</legend>

      <label className="flex items-center gap-2 text-sm">
        <input ref={refs.black_list} type="checkbox" name="black_list" className="accent-orange-500" />
        רשימה שחורה
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input ref={refs.mailing_list} type="checkbox" name="mailing_list" className="accent-orange-500" />
        רשימת דיוור
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input ref={refs.investors_list} type="checkbox" name="investors_list" className="accent-orange-500" />
        רשימת משקיעים
      </label>

      <div className="space-y-2">
        <label className="block text-sm font-medium">דוח יתרות
          <input ref={refs.balance_statement} id="balance_statement" name="balance_statement" className="input-base" />
        </label>


{/* <label className="cursor-pointer">
  <input type="checkbox" className="absolute opacity-0 h-0 w-0 peer" />
    <span
      className="relative inline-block rounded w-8 h-8 transition-all duration-700 bg-[#1e1e1e] peer-checked:bg-[#1e1e1e] peer-checked:shadow-[-10px_-10px_30px_0px_#696969cc,0_-10px_30px_0px_#808080cc,10px_-10px_30px_0px_#a9a9a9cc,10px_0_30px_0px_#808080cc,10px_10px_30px_0px_#808080cc,0_10px_30px_0px_#ffaa00cc,-10px_10px_30px_0px_#a9a9a9cc] after:absolute after:hidden after:top-1.5 after:w-2 after:h-4 after:rotate-45 after:content-[''] after:left-3 after:border-solid after:border-white after:border-t-0 after:border-r-[3px] after:border-b-4 after:border-l-0 peer-checked:after:block"
  ></span>
</label> */}





         {/* בנק */}
        <label className="block text-sm font-medium">
          בחר בנק
            <select
                    ref={refs.bank_id}
                    id="bank"
                    name="bank"
                    className="w-full bg-transparent text-slate-700 text-sm border border-slate-500 rounded-md px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow focus:bg-orange-50"
                    defaultValue=""
                  >
                    <option value="" disabled hidden>
                      -- בחר בנק --
                    </option>

                    {banks.map(({ id, name }) => (
                      <option key={id} value={id} className="text-slate-700">
                        {name}
                      </option>
                    ))}
            </select>

        </label>

        <label className="block text-sm font-medium">
          בטיפול עובד
            <select
                    ref={refs.profile_id}
                    id="profile_id"
                    name="profile_id"
                    className="w-full bg-transparent text-slate-700 text-sm border border-slate-500 rounded-md px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow focus:bg-orange-50"
                    defaultValue=""
                  >
                    <option value="" disabled hidden>
                      -- בחר עובד --
                    </option>

                    {employees.map(({ id, full_name }) => (
                      <option key={id} value={id} className="text-slate-700">
                        {full_name}
                      </option>
                    ))}
            </select>

        </label>









      </div>

      <label className="flex items-center gap-2 text-sm">
        <input ref={refs.realtor} type="checkbox" name="realtor" className="accent-orange-500" />
        מתווך
      </label>
    </fieldset>

    {/* מסגרת 4 – הערות */}
    <fieldset className="space-y-4 p-4 border rounded-xl">
      <legend className="text-sm font-semibold px-2">הערות</legend>
       <label className="block text-sm font-medium">מקור ליד
          <input ref={refs.data_source} id="data_source" name="data_source" className="w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-500 rounded-md px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow focus:bg-orange-50"  />
        </label>
      
        <label className="block text-sm font-medium" htmlFor="comment">הערות
          <textarea
            ref={refs.comment}
            id="comment"
            name="comment"
            className="w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-500 rounded-md px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow focus:bg-orange-50" 
          />
        </label>
    </fieldset>


  </div>
    {/* מסגרת 5 – מעקב ושיחות */}
    <fieldset className="w-full p-4 border rounded-2xl shadow-sm bg-white">
      <legend className="text-sm font-semibold px-2 text-gray-700">שיחות ומעקב</legend>

      <div className="flex flex-col md:flex-row flex-wrap gap-4 mt-4">
        {/* שיחה אחרונה */}
        <label className="flex flex-col text-sm font-medium text-gray-800 w-full md:w-auto">
          שיחה אחרונה
          <input
            ref={refs.last_call}
            type="date"
            id="last_call"
            name="last_call"
            className="w-full md:w-36 bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-500 rounded-md px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow focus:bg-orange-50"
          />
        </label>

        {/* סטטוס שיחה */}
        <label className="flex flex-col text-sm font-medium text-gray-800 w-full md:w-auto">
          סטטוס שיחה
          <select
            ref={refs.status_call_id}
            id="status_call_id"
            name="status_call_id"
            defaultValue=""
            className="w-full md:w-44 bg-transparent text-slate-700 text-sm border border-slate-500 rounded-md px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow focus:bg-orange-50"
          >
            <option value="" disabled hidden>-- סטטוס שיחה --</option>
            {statusCall.map(({ id, name }) => (
              <option key={id} value={id} className="text-slate-700">
                {name}
              </option>
            ))}
          </select>
        </label>

        {/* סיבת אי עניין */}
        <label className="flex flex-col text-sm font-medium text-gray-800 w-full md:w-auto">
          סיבת לא נסגר 
          <select
           ref={refs.reason_not_intrested_id}
            id="reason_not_intrested_id"
            name="reason_not_intrested_id"
            defaultValue=""
            className="w-full md:w-44 bg-transparent text-slate-700 text-sm border border-slate-500 rounded-md px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow focus:bg-orange-50"
          >
            <option value="" disabled hidden>-- סיבת לא נסגר --</option>
            {reasons.map(({ id,  }) => (
              <option key={id} value={id} className="text-slate-700">
                {status}
              </option>
            ))}
          </select>
        </label>


        {/* תאריך מעקב */}
        <label className="flex flex-col text-sm font-medium text-gray-800 w-full md:w-auto">
          תאריך מעקב
          <input
            ref={refs.follow_up_date}
            type="date"
            id="follow_up_date"
            name="follow_up_date"
            className="w-full md:w-36 bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-500 rounded-md px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow focus:bg-orange-50"
          />
        </label>

        {/* שעת מעקב */}
        <label className="flex flex-col text-sm font-medium text-gray-800 w-full md:w-auto">
          שעת מעקב
          <input
            ref={refs.follow_up_hour}
            type="time"
            id="follow_up_hour"
            name="follow_up_hour"
            className="w-full md:w-28 bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-500 rounded-md px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow focus:bg-orange-50"
          />
        </label>
      </div>
    </fieldset>


    {/* מסגרת 6 – זום וסטטוסים */}
    {/* <fieldset className="space-y-4 p-4 border rounded-xl">
      <legend className="text-sm font-semibold px-2">פגישות זום</legend>

      <div className="space-y-2">
        <label className="block text-sm font-medium">סטטוס ראשוני
          <input ref={refs.lead_first_status} id="lead_first_status" name="lead_first_status" className="input-base" />
        </label>

        <label className="block text-sm font-medium">קישור זום
          <input ref={refs.zoom} id="zoom" name="zoom" className="input-base" />
        </label>


        <label className="block text-sm font-medium">שעת זום
          <input ref={refs.hour_zoom} type="time" id="hour_zoom" name="hour_zoom" className="input-base" />
        </label>
      </div>
    </fieldset> */}

  <button
    type="submit"
    className="w-full lg:w-auto bg-orange-500 hover:bg-orange-600 text-white py-2 px-6 rounded-xl"
  >
    שמור ליד
  </button>
</form>


  )
}


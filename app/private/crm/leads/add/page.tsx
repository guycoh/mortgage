"use client"

import React, { useRef } from 'react'

export default function LeadForm() {
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
    comment: useRef<HTMLInputElement>(null),
    zoom: useRef<HTMLInputElement>(null),
    hour_zoom: useRef<HTMLInputElement>(null),
    last_call: useRef<HTMLInputElement>(null),
    status_call_id: useRef<HTMLInputElement>(null),
    reason_not_intrested_id: useRef<HTMLInputElement>(null),
    follow_up_date: useRef<HTMLInputElement>(null),
    follow_up_hour: useRef<HTMLInputElement>(null),
    balance_statement: useRef<HTMLInputElement>(null),
    bank_id: useRef<HTMLInputElement>(null),
    profile_id: useRef<HTMLInputElement>(null),
    black_list: useRef<HTMLInputElement>(null),
    realtor: useRef<HTMLInputElement>(null),
    mailing_list: useRef<HTMLInputElement>(null),
    investors_list: useRef<HTMLInputElement>(null),
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

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
      black_list: refs.black_list.current?.checked || false,
      realtor: refs.realtor.current?.checked || false,
      mailing_list: refs.mailing_list.current?.checked || false,
      investors_list: refs.investors_list.current?.checked || false,
      balance_statement: refs.balance_statement.current?.value || null,
      bank_id: refs.bank_id.current?.value || null,
      profile_id: refs.profile_id.current?.value || null,
    }

    console.log('📝 New Lead:', lead)
    // TODO: send to server or Supabase here
  }

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
        <label className="block text-sm font-medium">מקור ליד
          <input ref={refs.data_source} id="data_source" name="data_source" className="w-full bg-transparent placeholder:text-slate-400 text-slate-700 text-sm border border-slate-500 rounded-md px-3 py-2 transition duration-300 ease focus:outline-none focus:border-slate-400 hover:border-slate-300 shadow-sm focus:shadow focus:bg-orange-50"  />
        </label>

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

        <label className="block text-sm font-medium">בנק
          <input ref={refs.bank_id} id="bank_id" name="bank_id" className="input-base" />
        </label>

        <label className="block text-sm font-medium">פרופיל
          <input ref={refs.profile_id} id="profile_id" name="profile_id" className="input-base" />
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

      <label className="block text-sm font-medium">הערות
        <input ref={refs.comment} id="comment" name="comment" className="input-base" />
      </label>
    </fieldset>

    {/* מסגרת 5 – מעקב ושיחות */}
    <fieldset className="space-y-4 p-4 border rounded-xl">
      <legend className="text-sm font-semibold px-2">שיחות ומעקב</legend>

      <div className="space-y-2">
        <label className="block text-sm font-medium">שיחה אחרונה
          <input ref={refs.last_call} type="date" id="last_call" name="last_call" className="input-base" />
        </label>

        <label className="block text-sm font-medium">סטטוס שיחה
          <input ref={refs.status_call_id} id="status_call_id" name="status_call_id" className="input-base" />
        </label>

        <label className="block text-sm font-medium">סיבת אי עניין
          <input ref={refs.reason_not_intrested_id} id="reason_not_intrested_id" name="reason_not_intrested_id" className="input-base" />
        </label>

        <label className="block text-sm font-medium">תאריך מעקב
          <input ref={refs.follow_up_date} type="date" id="follow_up_date" name="follow_up_date" className="input-base" />
        </label>

        <label className="block text-sm font-medium">שעת מעקב
          <input ref={refs.follow_up_hour} type="time" id="follow_up_hour" name="follow_up_hour" className="input-base" />
        </label>
      </div>
    </fieldset>

    {/* מסגרת 6 – זום וסטטוסים */}
    <fieldset className="space-y-4 p-4 border rounded-xl">
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
    </fieldset>
  </div>

  <button
    type="submit"
    className="w-full lg:w-auto bg-orange-500 hover:bg-orange-600 text-white py-2 px-6 rounded-xl"
  >
    שמור ליד
  </button>
</form>


  )
}


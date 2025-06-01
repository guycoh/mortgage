'use client'

import React from 'react'

export default function LeadForm() {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const lead = {
      name: formData.get('name')?.toString() || '',
      email: formData.get('email')?.toString() || '',
      cell: formData.get('cell')?.toString() || '',
      addess: formData.get('addess')?.toString() || null,
      data_source: formData.get('data_source')?.toString() || null,
      intrested_in: formData.get('intrested_in')?.toString() || null,
      spouse_name: formData.get('spouse_name')?.toString() || null,
      spouse_phone: formData.get('spouse_phone')?.toString() || null,
      lead_first_status: formData.get('lead_first_status')?.toString() || null,
      comment: formData.get('comment')?.toString() || null,
      zoom: formData.get('zoom')?.toString() || null,
      hour_zoom: formData.get('hour_zoom')?.toString() || null,
      last_call: formData.get('last_call')?.toString() || null,
      status_call_id: formData.get('status_call_id')?.toString() || null,
      reason_not_intrested_id: formData.get('reason_not_intrested_id')?.toString() || null,
      follow_up_date: formData.get('follow_up_date')?.toString() || null,
      follow_up_hour: formData.get('follow_up_hour')?.toString() || null,
      black_list: formData.get('black_list') === 'on',
      realtor: formData.get('realtor')?.toString() || null,
      mailing_list: formData.get('mailing_list') === 'on',
      investors_list: formData.get('investors_list') === 'on',
      balance_statement: formData.get('balance_statement')?.toString() || null,
      bank_id: formData.get('bank_id')?.toString() || null,
      profile_id: formData.get('profile_id')?.toString() || null,
    }

    console.log('📝 New Lead:', lead)

    // TODO: send to server or Supabase here
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6 bg-white rounded-xl shadow max-w-xl mx-auto">
      <h2 className="text-xl font-bold mb-4">הוספת ליד חדש</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input name="name" placeholder="שם מלא" className="input" />
        <input name="email" placeholder="אימייל" className="input" />
        <input name="cell" placeholder="טלפון נייד" className="input" />
        <input name="addess" placeholder="כתובת" className="input" />
        <input name="data_source" placeholder="מקור ליד" className="input" />
        <input name="intrested_in" placeholder="מעוניין ב..." className="input" />
        <input name="spouse_name" placeholder="שם בן/בת זוג" className="input" />
        <input name="spouse_phone" placeholder="טלפון בן/בת זוג" className="input" />
        <input name="lead_first_status" placeholder="סטטוס ראשוני" className="input" />
        <input name="comment" placeholder="הערות" className="input" />
        <input name="zoom" placeholder="זום (קישור)" className="input" />
        <input name="hour_zoom" type="time" placeholder="שעת זום" className="input" />
        <input name="last_call" type="date" placeholder="שיחה אחרונה" className="input" />
        <input name="status_call_id" placeholder="סטטוס שיחה" className="input" />
        <input name="reason_not_intrested_id" placeholder="סיבת אי עניין" className="input" />
        <input name="follow_up_date" type="date" placeholder="תאריך מעקב" className="input" />
        <input name="follow_up_hour" type="time" placeholder="שעת מעקב" className="input" />
        <input name="balance_statement" placeholder="דוח יתרות" className="input" />
        <input name="bank_id" placeholder="בנק" className="input" />
        <input name="profile_id" placeholder="פרופיל" className="input" />
      </div>

      <div className="flex flex-wrap gap-4 mt-4">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="black_list" /> רשימה שחורה
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="realtor" /> מתווך
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="mailing_list" /> רשימת דיוור
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="investors_list" /> רשימת משקיעים
        </label>
      </div>

      <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-xl">
        שמור ליד
      </button>
    </form>
  )
}

"use client"

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

export default function SiteSettingsForm() {
  const supabase = createClient();

  const [form, setForm] = useState({
    whatsapp_number: "",
    email_to_send: "",
    phone_display: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Load existing settings
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("*")
        .eq("id", 1)
        .single();

      if (data) setForm(data);
    };
    load();
  }, []);

 const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setForm({ ...form, [e.target.name]: e.target.value });
};

const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setLoading(true);
  setMessage("");

  const { error } = await supabase.from("site_settings").upsert({
    id: 1,
    ...form,
    updated_at: new Date().toISOString(),
  });

  if (error) setMessage("שגיאה בשמירה");
  else setMessage("נשמר בהצלחה ✔");

  setLoading(false);
};

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-2xl shadow-lg border mt-10">
      <h2 className="text-2xl font-bold mb-6 text-center text-main">הגדרות אתר</h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="font-semibold">מספר ווצאפ</label>
          <input
            type="text"
            name="whatsapp_number"
            value={form.whatsapp_number}
            onChange={handleChange}
            className="w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-main"
          />
        </div>

        <div>
          <label className="font-semibold">אימייל לקבלת פניות</label>
          <input
            type="email"
            name="email_to_send"
            value={form.email_to_send}
            onChange={handleChange}
            className="w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-main"
          />
        </div>

        <div>
          <label className="font-semibold">טלפון לתצוגה באתר</label>
          <input
            type="text"
            name="phone_display"
            value={form.phone_display}
            onChange={handleChange}
            className="w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-main"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-main text-white p-3 rounded-xl hover:bg-main/90 transition font-bold"
        >
          {loading ? "שומר..." : "שמירה"}
        </button>

        {message && (
          <p className="text-center text-green-600 font-semibold mt-2">{message}</p>
        )}
      </form>
    </div>
  );
}

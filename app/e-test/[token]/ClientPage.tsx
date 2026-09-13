"use client";

import React, { useState, useEffect } from "react";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function MinimalTestClient({ token }: { token: string }) {
  const [status, setStatus] = useState<string>("טוען...");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setErrorMsg("חסר טוקן בקישור");
      return;
    }
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      setStatus("מתחבר ל-Supabase...");
      
      const { data, error } = await supabase
        .from("sign_documents")
        .select("*, sign_templates(*, sign_files(*))")
        .eq("sign_token", token)
        .single();

      if (error) throw new Error(error.message);
      if (!data) throw new Error("מסמך לא נמצא במסד הנתונים");
      if (!data.sign_templates) throw new Error("תבנית חסרה או חסומה");

      setCustomerName(data.customer_name || "לקוח ללא שם");
      
      const files = data.sign_templates.sign_files;
      const url = files?.public_url || (Array.isArray(files) && files[0]?.public_url) || null;
      
      if (!url) throw new Error("אין קישור URL לקובץ במסד הנתונים");

      setPdfUrl(url);
      setStatus("הנתונים נמשכו בהצלחה!");
      
    } catch (err: any) {
      setErrorMsg(`שגיאה: ${err.message}`);
    }
  };

  if (errorMsg) {
    return (
      <div className="p-8 text-center text-red-600 bg-red-50 min-h-screen dir-rtl" dir="rtl">
        <h1 className="text-2xl font-bold mb-4">שגיאת נתונים</h1>
        <p>{errorMsg}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-2 md:p-4 dir-rtl flex flex-col items-center" dir="rtl">
      <div className="w-full max-w-3xl bg-white p-4 md:p-6 rounded-xl shadow-md text-center flex flex-col flex-grow">
        <h1 className="text-xl md:text-2xl font-bold mb-2">סביבת בדיקה מבודדת</h1>
        <p className="text-gray-600 mb-2">סטטוס: <span className="font-bold text-blue-600">{status}</span></p>
        
        {customerName && (
          <p className="text-md md:text-lg font-medium text-green-700 mb-4">
            זיהוי לקוח עובד: {customerName}
          </p>
        )}

        {pdfUrl ? (
          <div className="w-full flex-grow mt-2">
            <div className="w-full h-[70vh] min-h-[500px] border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-50 shadow-inner">
              <iframe 
                src={`https://docs.google.com/gview?url=${encodeURIComponent(pdfUrl)}&embedded=true`} 
                className="w-full h-full"
                title="PDF Viewer"
                style={{ border: 'none' }}
              />
            </div>
          </div>
        ) : (
          <div className="animate-pulse text-gray-400 mt-8 font-bold">טוען קובץ...</div>
        )}
      </div>
    </div>
  );
}
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
      
      if (!url) throw new Error("אין קישור URL לקובץ במסד הנתונים (file_id חסר או שגוי)");

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
    <div className="min-h-screen bg-gray-100 p-4 dir-rtl flex flex-col items-center" dir="rtl">
      <div className="w-full max-w-3xl bg-white p-6 rounded-xl shadow-md text-center">
        <h1 className="text-2xl font-bold mb-2">סביבת בדיקה מבודדת</h1>
        <p className="text-gray-600 mb-4">סטטוס: <span className="font-bold text-blue-600">{status}</span></p>
        
        {customerName && (
          <p className="text-lg font-medium text-green-700 mb-6">
            זיהוי לקוח עובד: {customerName}
          </p>
        )}

        {pdfUrl ? (
          <div className="flex flex-col items-center w-full gap-4">
            <a 
              href={pdfUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-bold shadow transition-colors w-full max-w-xs"
            >
              פתח PDF בנייד
            </a>
            
            {/* תצוגה מקדימה למחשב */}
            <div className="hidden md:block w-full h-[600px] border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50 mt-4">
              <iframe 
                src={pdfUrl} 
                className="w-full h-full"
                title="PDF Viewer"
              />
            </div>
          </div>
        ) : (
          <div className="animate-pulse text-gray-400 mt-8">טוען קובץ...</div>
        )}
      </div>
    </div>
  );
}
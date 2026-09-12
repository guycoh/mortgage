"use client";

import React, { useState, useEffect } from "react";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DocumentsTracker() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setIsLoading(true);
    // משיכת המסמכים כולל חיבור לטבלת התבניות כדי לקבל את שם התבנית
    const { data, error } = await supabase
      .from("sign_documents")
      .select(`
        *,
        sign_templates ( name )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching documents:", error);
    } else {
      setDocuments(data || []);
    }
    setIsLoading(false);
  };

  const copySignLink = (token: string) => {
    // יצירת הקישור הפומבי לחתימה בהתבסס על הכתובת הנוכחית של המערכת
    const url = `${window.location.origin}/sign/${token}`;
    navigator.clipboard.writeText(url);
    alert("קישור לחתימה הועתק ללוח!");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'signed': 
        return <span style={{ background: "#d1fae5", color: "#065f46", padding: "4px 8px", borderRadius: "12px", fontSize: "0.85rem" }}>נחתם</span>;
      case 'viewed': 
        return <span style={{ background: "#fef3c7", color: "#92400e", padding: "4px 8px", borderRadius: "12px", fontSize: "0.85rem" }}>נצפה</span>;
      case 'sent': 
        return <span style={{ background: "#dbeafe", color: "#1e40af", padding: "4px 8px", borderRadius: "12px", fontSize: "0.85rem" }}>נשלח</span>;
      default: 
        return <span style={{ background: "#f3f4f6", color: "#374151", padding: "4px 8px", borderRadius: "12px", fontSize: "0.85rem" }}>טיוטה</span>;
    }
  };

  if (isLoading) return <div style={{ padding: "20px", textAlign: "center" }}>טוען נתונים...</div>;

  return (
    <div style={{ direction: "rtl" }}>
      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: "bold" }}>מעקב מסמכים וחתימות</h2>
        <button onClick={fetchDocuments} style={{ padding: "8px 16px", backgroundColor: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "6px", cursor: "pointer" }}>
          רענן נתונים
        </button>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", borderRadius: "8px", overflow: "hidden" }}>
        <thead style={{ backgroundColor: "#f3f4f6", borderBottom: "1px solid #e5e7eb" }}>
          <tr>
            <th style={{ padding: "12px", textAlign: "right", width: "15%" }}>תאריך שליחה</th>
            <th style={{ padding: "12px", textAlign: "right", width: "20%" }}>לקוח</th>
            <th style={{ padding: "12px", textAlign: "right", width: "20%" }}>תבנית</th>
            <th style={{ padding: "12px", textAlign: "right", width: "15%" }}>סטטוס</th>
            <th style={{ padding: "12px", textAlign: "right", width: "30%" }}>פעולות</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr key={doc.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "12px" }}>{new Date(doc.created_at).toLocaleDateString("he-IL")}</td>
              <td style={{ padding: "12px" }}>
                <div style={{ fontWeight: "bold" }}>{doc.customer_name}</div>
                <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>{doc.customer_email}</div>
              </td>
              <td style={{ padding: "12px" }}>{doc.sign_templates?.name || 'תבנית לא ידועה'}</td>
              <td style={{ padding: "12px" }}>{getStatusBadge(doc.status)}</td>
              <td style={{ padding: "12px" }}>
                <div style={{ display: "flex", gap: "10px" }}>
                  {doc.status === 'signed' ? (
                    <a 
                      href={doc.signed_pdf_url} 
                      target="_blank" 
                      rel="noreferrer"
                      style={{ padding: "6px 12px", backgroundColor: "#10b981", color: "white", borderRadius: "4px", textDecoration: "none", fontSize: "0.9rem" }}
                    >
                      הורד מסמך חתום
                    </a>
                  ) : (
                    <button 
                      onClick={() => copySignLink(doc.sign_token)}
                      style={{ padding: "6px 12px", backgroundColor: "#4f46e5", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.9rem" }}
                    >
                      העתק קישור לחתימה
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {documents.length === 0 && (
            <tr>
              <td colSpan={5} style={{ padding: "30px", textAlign: "center", color: "#6b7280" }}>
                עדיין לא נשלחו מסמכים לחתימה.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
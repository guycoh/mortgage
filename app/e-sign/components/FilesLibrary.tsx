"use client";

import React, { useState, useEffect } from "react";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function FilesLibrary() {
  const [files, setFiles] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    const { data, error } = await supabase.from("sign_files").select("*").order("created_at", { ascending: false });
    if (!error && data) setFiles(data);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") return alert("אנא העלה קובץ PDF");

    setIsUploading(true);
    try {
      // חילוץ סיומת הקובץ ויצירת שם רנדומלי בטוח לחלוטין באנגלית/מספרים
      const fileExt = file.name.split('.').pop();
      const safeStorageName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      // 1. העלאה ל-Storage עם השם הבטוח
      const { error: uploadError } = await supabase.storage
        .from("sign-templates")
        .upload(safeStorageName, file);
        
      if (uploadError) throw uploadError;

      // 2. קבלת URL ציבורי (משתמשים בשם הבטוח)
      const { data: { publicUrl } } = supabase.storage
        .from("sign-templates")
        .getPublicUrl(safeStorageName);

      // 3. שמירה במסד הנתונים - כאן אנחנו שומרים את file.name המקורי בעברית לתצוגה!
      const { error: dbError } = await supabase
        .from("sign_files")
        .insert([{ file_name: file.name, public_url: publicUrl }]);
        
      if (dbError) throw dbError;

      alert("הקובץ הועלה בהצלחה!");
      fetchFiles();
    } catch (error) {
      console.error("Upload error:", error);
      alert("שגיאה בהעלאת הקובץ. בדוק את הקונסול.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{ direction: "rtl" }}>
      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: "bold" }}>ספריית מסמכי בסיס</h2>
        <div>
          <label style={{ backgroundColor: "#4f46e5", color: "white", padding: "10px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
            {isUploading ? "מעלה..." : "העלה קובץ חדש"}
            <input type="file" accept=".pdf" onChange={handleFileUpload} style={{ display: "none" }} disabled={isUploading} />
          </label>
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", borderRadius: "8px", overflow: "hidden" }}>
        <thead style={{ backgroundColor: "#f3f4f6", borderBottom: "1px solid #e5e7eb" }}>
          <tr>
            <th style={{ padding: "12px", textAlign: "right" }}>שם קובץ</th>
            <th style={{ padding: "12px", textAlign: "right" }}>תאריך העלאה</th>
            <th style={{ padding: "12px", textAlign: "right" }}>קישור למקור</th>
          </tr>
        </thead>
        <tbody>
          {files.map(file => (
            <tr key={file.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={{ padding: "12px" }}>{file.file_name}</td>
              <td style={{ padding: "12px" }}>{new Date(file.created_at).toLocaleDateString("he-IL")}</td>
              <td style={{ padding: "12px" }}>
                <a href={file.public_url} target="_blank" rel="noreferrer" style={{ color: "#4f46e5" }}>צפה בקובץ</a>
              </td>
            </tr>
          ))}
          {files.length === 0 && <tr><td colSpan={3} style={{ padding: "20px", textAlign: "center" }}>אין קבצים בספרייה. העלה קובץ ראשון.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
// @ts-ignore
import 'react-pdf/dist/Page/AnnotationLayer.css';
// @ts-ignore
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function SignDocumentClient({ token }: { token: string }) {
  const [documentData, setDocumentData] = useState<any>(null);
  const [template, setTemplate] = useState<any>(null);
  const [fields, setFields] = useState<any[]>([]);
  const [fieldValues, setFieldValues] = useState<{ [key: string]: string }>({});
  
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [pdfWidth, setPdfWidth] = useState<number>(800);

  useEffect(() => {
    fetchDocumentData();
  }, [token]);

  useEffect(() => {
      const handleResize = () => {
        setPdfWidth(Math.min(window.innerWidth - 48, 800));
      };
      
      // קריאה ראשונה בעת טעינת העמוד
      handleResize();
      
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, []);


  const fetchDocumentData = async () => {
    // 1. הבאת פרטי המסמך והתבנית
    const { data: docData, error: docError } = await supabase
      .from("sign_documents")
      .select("*, sign_templates(*, sign_files(*))")
      .eq("sign_token", token)
      .single();

    if (docError || !docData) return alert("מסמך לא נמצא או שהקישור פג תוקף.");
    
    setDocumentData(docData);
    setTemplate(docData.sign_templates);

    // 2. הבאת השדות של התבנית
    const { data: fieldsData } = await supabase
      .from("sign_template_fields")
      .select("*")
      .eq("template_id", docData.template_id);

    if (fieldsData) setFields(fieldsData);
    
    // אם המסמך כבר נחתם, נציג מסך סיום מיד
    if (docData.status === 'signed') {
      setIsDone(true);
    }
  };

  const handleFieldChange = (fieldId: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // 1. שמירת הערכים שהלקוח מילא
      const valuesToInsert = fields.map(field => ({
        document_id: documentData.id,
        field_id: field.id,
        value: fieldValues[field.id] || ""
      }));

      await supabase.from("sign_document_field_values").insert(valuesToInsert);

      // 2. עדכון סטטוס המסמך ל"נחתם" + חותמת זמן
      await supabase
        .from("sign_documents")
        .update({ 
          status: 'signed', 
          signed_at: new Date().toISOString() 
        })
        .eq("id", documentData.id);

      setIsDone(true);
    } catch (error) {
      console.error(error);
      alert("אירעה שגיאה בעת שמירת החתימה.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isDone) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 dir-rtl" dir="rtl">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center border border-emerald-100">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">המסמך נחתם בהצלחה!</h2>
          <p className="text-gray-500">תודה רבה, {documentData?.customer_name}. פרטי החתימה נקלטו במערכת והועברו להמשך טיפול.</p>
        </div>
      </div>
    );
  }

  if (!documentData || !template) return null;

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 dir-rtl flex flex-col items-center" dir="rtl">
      
      {/* פאנל עליון להנחיות ופעולות */}
      <div className="w-full max-w-4xl bg-white p-6 rounded-t-xl shadow-sm border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 z-10">
        <div>
          <h1 className="text-xl font-bold text-gray-800">שלום, {documentData.customer_name}</h1>
          <p className="text-sm text-gray-500">אנא עיין במסמך, מלא את השדות הנדרשים ולחץ על אישור וחתימה בסיום.</p>
        </div>
        <button 
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg shadow transition-colors disabled:opacity-50"
        >
          {isSubmitting ? "שומר..." : "אני מאשר וחותם על המסמך"}
        </button>
      </div>

      {/* אזור ה-PDF */}
      <div className="w-full max-w-4xl bg-gray-50 p-6 flex flex-col items-center shadow-lg rounded-b-xl overflow-hidden">
        
        <div className="flex gap-4 mb-4 items-center">
          <button 
            onClick={() => setPageNumber(p => p - 1)} disabled={pageNumber <= 1}
            className="px-4 py-2 border border-gray-300 rounded bg-white hover:bg-gray-100 disabled:opacity-50"
          >הקודם</button>
          <span className="font-semibold text-gray-700">עמוד {pageNumber} מתוך {numPages || '-'}</span>
          <button 
            onClick={() => setPageNumber(p => p + 1)} disabled={numPages !== null && pageNumber >= numPages}
            className="px-4 py-2 border border-gray-300 rounded bg-white hover:bg-gray-100 disabled:opacity-50"
          >הבא</button>
        </div>

        <div className="relative inline-block shadow-md border border-gray-300 bg-white">
          <Document 
            file={template.sign_files?.public_url} 
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          >
            
            <Page 
              pageNumber={pageNumber} 
              width={pdfWidth} 
              renderTextLayer={false} 
              renderAnnotationLayer={false} 
            />
         
          </Document>

          {/* רינדור השדות כאינפוטים פעילים על גבי המסמך */}
          {fields.filter(f => f.page_number === pageNumber).map(field => (
            <div 
              key={field.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${field.position_x}%`, top: `${field.position_y}%` }}
            >
              {field.field_type === 'signature' ? (
                <input 
                  type="text" 
                  placeholder="הקלד שם מלא לחתימה..." 
                  value={fieldValues[field.id] || ""}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  className="px-2 py-1 bg-yellow-100 border border-yellow-400 text-indigo-900 placeholder-indigo-300 font-bold text-center shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none w-48 rounded"
                />
              ) : (
                <input 
                  type="text" 
                  placeholder={field.field_name}
                  value={fieldValues[field.id] || ""}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  className="px-2 py-1 bg-blue-50 border border-blue-200 text-gray-800 text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none w-32 rounded"
                />
              )}
            </div>
          ))}
        </div>

        {/* הצגת נספח ה-HTML אם קיים בתבנית */}
        {template.html_appendix && pageNumber === numPages && (
          <div className="mt-8 w-full max-w-[800px] bg-white border border-gray-300 p-8 shadow-md">
            <div dangerouslySetInnerHTML={{ __html: template.html_appendix }} className="prose prose-indigo max-w-none text-right" dir="rtl" />
          </div>
        )}

      </div>
    </div>
  );
}
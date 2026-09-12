"use client";

import React, { useState, useEffect } from "react";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);


export default function SendDocumentPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  
  // פרטי הלקוח שהאיש מכירות ממלא
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [crmId, setCrmId] = useState(""); 
  
  // מצב שליחה וקישור שנוצר
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    // מושך רק תבניות פעילות
    const { data } = await supabase
      .from("sign_templates")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
      
    if (data) setTemplates(data);
  };

  const handleGenerateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate || !customerName || !customerEmail) {
      return alert("נא למלא את כל שדות החובה ולבחור תבנית");
    }

    setIsGenerating(true);
    setGeneratedLink(null);

    try {
      // 1. יצירת טוקן ייחודי וקשה לניחוש עבור הקישור
      const signToken = crypto.randomUUID(); 

      // 2. יצירת רשומה חדשה בטבלת המסמכים (שממנה עמוד המעקב שואב נתונים)
      const { data: documentData, error: documentError } = await supabase
        .from('sign_documents')
        .insert([{
          template_id: selectedTemplate.id,
          crm_entity_id: crmId || "manual-entry",
          customer_name: customerName,
          customer_email: customerEmail,
          status: 'sent', // הסטטוס ההתחלתי
          sign_token: signToken
        }])
        .select()
        .single();

      if (documentError) throw documentError;

      // 3. יצירת הקישור הסופי (מבוסס על הדומיין הנוכחי)
    const link = `${window.location.origin}/e-signature/${signToken}`;
      setGeneratedLink(link);

    } catch (error) {
      console.error("Error generating document:", error);
      alert("אירעה שגיאה ביצירת המסמך");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      alert("הקישור הועתק! אפשר לשלוח ללקוח.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 dir-rtl" dir="rtl">
      <div className="max-w-4xl mx-auto">
        
        <h1 className="text-3xl font-bold text-gray-800 mb-2">יצירת מסמך לחתימה</h1>
        <p className="text-gray-500 mb-8">בחר תבנית, הזן את פרטי הלקוח וקבל קישור מאובטח להחתמה.</p>

        <div className="flex gap-8">
          
          {/* צד ימין: רשימת התבניות */}
          <div className="w-1/2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">1. בחר תבנית</h2>
            <div className="flex flex-col gap-3">
              {templates.map(template => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`p-4 text-right border rounded-lg transition-all ${
                    selectedTemplate?.id === template.id 
                      ? "border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600" 
                      : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="font-bold text-gray-800">{template.name}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    נוצר ב: {new Date(template.created_at).toLocaleDateString('he-IL')}
                  </div>
                </button>
              ))}
              {templates.length === 0 && (
                <div className="text-gray-500 text-center p-4">לא נמצאו תבניות פעילות</div>
              )}
            </div>
          </div>

          {/* צד שמאל: טופס פרטי הלקוח ויצירת הקישור */}
          <div className="w-1/2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">2. פרטי הלקוח</h2>
            
            {!selectedTemplate ? (
              <div className="h-48 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                אנא בחר תבנית מהרשימה כדי להמשיך
              </div>
            ) : (
              <form onSubmit={handleGenerateLink} className="flex flex-col gap-4">
                <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm mb-2">
                  תבנית נבחרת: <span className="font-bold">{selectedTemplate.name}</span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">שם הלקוח *</label>
                  <input 
                    type="text" required value={customerName} onChange={e => setCustomerName(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="למשל: ישראל ישראלי"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">אימייל הלקוח *</label>
                  <input 
                    type="email" required value={customerEmail} onChange={e => setCustomerEmail(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="israel@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">מזהה לקוח ב-CRM (אופציונלי)</label>
                  <input 
                    type="text" value={crmId} onChange={e => setCrmId(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="ID מהמערכת..."
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={isGenerating}
                  className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isGenerating ? "מייצר מסמך..." : "ייצר קישור לחתימה"}
                </button>
              </form>
            )}

            {/* אזור הצגת הקישור לאחר היצירה */}
            {generatedLink && (
              <div className="mt-6 p-5 bg-emerald-50 border border-emerald-200 rounded-lg">
                <h3 className="text-emerald-800 font-bold mb-2 flex items-center gap-2">
                  <span>✅</span> המסמך מוכן!
                </h3>
                <p className="text-sm text-emerald-700 mb-3">
                  הקישור הבא ייחודי ללקוח זה. שלח לו אותו כדי שיחתום.
                </p>
                <div className="flex gap-2">
                  <input 
                    readOnly 
                    value={generatedLink} 
                    className="flex-1 p-2 border border-emerald-200 rounded bg-white text-gray-600 text-sm dir-ltr text-left outline-none"
                  />
                  <button 
                    onClick={copyToClipboard}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded font-bold transition-colors"
                  >
                    העתק
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
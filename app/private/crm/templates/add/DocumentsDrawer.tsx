"use client"
import { useState } from "react";

type Doc = {
  id: number;
  name: string;
  file: string; // נתיב ל-PDF מתוך public/
};

const documents: Doc[] = [
  { id: 1, name: "טופס בקשת משכנתא", file: "/docs/mortgage-request.pdf" },
  { id: 2, name: "אישור זכאות", file: "/docs/eligibility.pdf" },
  { id: 3, name: "טופס ויתור סודיות", file: "/docs/confidentiality.pdf" },
  { id: 4, name: "עצמאים ", file: "/assets/pdf/עצמאי עוסק מורשה או פטור.pdf" },
];

export default function DocumentsList() {
  const [phone, setPhone] = useState("");

  const sendViaWhatsapp = (file: string) => {
    if (!phone) {
      alert("אנא הזן מספר טלפון");
      return;
    }
    const url = `https://wa.me/${phone}?text=שלום, מצורף המסמך שביקשת: ${window.location.origin}${file}`;
    window.open(url, "_blank");
  };

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white shadow-lg rounded-2xl">
      <h1 className="text-2xl font-bold mb-6 text-center">רשימת מסמכים לשליחה</h1>

      {/* שדה להזנת מספר טלפון */}
      <div className="flex gap-2 mb-6">
        <input
          type="tel"
          placeholder="מספר טלפון (ללא 0, לדוג' 9725...)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-orange-400 focus:outline-none"
        />
      </div>

      {/* טבלה */}
      <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
        <thead className="bg-gray-100">
          <tr>
            <th className="text-right p-3 border-b">שם מסמך</th>
            <th className="text-center p-3 border-b">פעולות</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr key={doc.id} className="hover:bg-orange-50 transition">
              <td className="p-3 border-b">{doc.name}</td>
              <td className="p-3 border-b text-center">
                <div className="flex justify-center gap-2">
                  <a
                    href={doc.file}
                    target="_blank"
                    className="px-3 py-1 bg-gray-200 rounded-lg text-sm hover:bg-gray-300"
                  >
                    צפייה
                  </a>
                  <button
                    onClick={() => sendViaWhatsapp(doc.file)}
                    className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                  >
                    שלח בוואטסאפ
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

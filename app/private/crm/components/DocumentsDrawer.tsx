"use client";
import { useState } from "react";

type Doc = {
  id: number;
  name: string;
  file: string;
};

const documents: Doc[] = [
  { id: 1, name: "טופס בקשת משכנתא", file: "/docs/mortgage-request.pdf" },
  { id: 2, name: "אישור זכאות", file: "/docs/eligibility.pdf" },
  { id: 3, name: "טופס ויתור סודיות", file: "/docs/confidentiality.pdf" },
  { id: 4, name: "עצמאים ", file: "/assets/pdf/עצמאי עוסק מורשה או פטור.pdf" },
];

export default function DocumentsDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
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
    <>
      {/* רקע כהה */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black bg-opacity-40 z-40"
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 h-full w-1/2 bg-white shadow-xl z-50 transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold">שליחת מסמכים</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-500 text-xl font-bold"
          >
            ✕
          </button>
        </div>

        {/* תוכן */}
        <div className="p-6 overflow-y-auto h-[calc(100%-120px)]">
          {/* שדה טלפון */}
          <div className="flex gap-2 mb-6">
            <input
              type="tel"
              placeholder="מספר טלפון (9725...)"
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

        {/* Footer */}
        <div className="p-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
          >
            סגור
          </button>
        </div>
      </div>
    </>
  );
}

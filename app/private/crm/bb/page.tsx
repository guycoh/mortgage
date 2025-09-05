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
  { id: 4, name: "עצמאים", file: "/assets/pdf/עצמאי עוסק מורשה או פטור.pdf" },
];

export default function DocumentsFolder() {
  const [dragging, setDragging] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, doc: Doc) => {
    // מגדירים שהקובץ יהיה לינק (מה שהדפדפן מאפשר)
    e.dataTransfer.setData("text/uri-list", window.location.origin + doc.file);
    setDragging(doc.name);
  };

  const handleDragEnd = () => {
    setDragging(null);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-center">📂 תיקיית מסמכים</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {documents.map((doc) => (
          <div
            key={doc.id}
            draggable
            onDragStart={(e) => handleDragStart(e, doc)}
            onDragEnd={handleDragEnd}
            className="flex flex-col items-center p-4 border rounded-xl shadow hover:shadow-lg transition bg-white cursor-grab active:cursor-grabbing"
          >
            <span className="text-5xl">📄</span>
            <p className="mt-2 text-sm text-center font-medium">{doc.name}</p>

            <div className="flex gap-2 mt-3">
              <a
                href={doc.file}
                target="_blank"
                className="px-3 py-1 text-sm bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                צפייה
              </a>
              <a
                href={doc.file}
                download
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                הורדה
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* חיווי גרירה */}
      {dragging && (
        <div className="fixed bottom-5 right-5 bg-orange-500 text-white px-4 py-2 rounded-lg shadow-lg">
          גורר את: {dragging}
        </div>
      )}
    </div>
  );
}

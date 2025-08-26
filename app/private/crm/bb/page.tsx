"use client";

import { useState } from "react";

import DocumentsDrawer from "../components/DocumentsDrawer";


export default function HomePage() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">דף ראשי</h1>
      <p className="mb-6 text-gray-600">
        כאן יש תוכן רגיל של האתר. כשלוחצים על הכפתור – נפתח המודל מצד שמאל.
      </p>

      {/* כפתור פתיחת המודל */}
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
      >
        מסמכים
      </button>

      {/* הקומפוננטה של המודל */}
      <DocumentsDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
}

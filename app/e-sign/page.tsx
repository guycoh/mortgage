"use client";

import React, { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const FilesLibrary = dynamic(() => import("./components/FilesLibrary"), { ssr: false });
const TemplateBuilder = dynamic(() => import("./components/TemplateBuilder"), { ssr: false });
const DocumentsTracker = dynamic(() => import("./components/DocumentsTracker"), { ssr: false });

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"files" | "templates" | "tracking">("files");

  const getTabClass = (isActive: boolean) => 
    `px-4 py-2 text-base transition-colors duration-200 border-b-4 ${
      isActive 
        ? "font-bold border-indigo-600 text-indigo-700" 
        : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
    }`;

  return (
    <div className="p-6 min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-7xl mx-auto">
        
        {/* אזור הכותרת וכפתור השליחה */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">מערכת חתימות מרחוק</h1>
          <Link 
            href="/e-sign/send-document"
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-bold transition-colors shadow-sm flex items-center gap-2"
          >
            <span>+</span> שליחת מסמך ללקוח
          </Link>
        </div>
        
        <div className="flex gap-4 mb-6 border-b-2 border-gray-200 pb-0">
          <button onClick={() => setActiveTab("files")} className={getTabClass(activeTab === "files")}>
            ספריית קבצים
          </button>
          <button onClick={() => setActiveTab("templates")} className={getTabClass(activeTab === "templates")}>
            עורך תבניות
          </button>
          <button onClick={() => setActiveTab("tracking")} className={getTabClass(activeTab === "tracking")}>
            מעקב מסמכים
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          {activeTab === "files" && <FilesLibrary />}
          {activeTab === "templates" && <TemplateBuilder />}
          {activeTab === "tracking" && <DocumentsTracker />}
        </div>

      </div>
    </div>
  );
}
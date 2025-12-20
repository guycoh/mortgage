"use client";

import { useEffect, useState } from "react";
import PdfIframe from "@/app/sign/components/PdfIframe";

type Template = {
  id: string;
  name: string;
};

export default function NewTemplatePage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");

  // שליפת כל התבניות
  useEffect(() => {
    const loadTemplates = async () => {
      const res = await fetch("/sign/api/templates");
      const data = await res.json();
      setTemplates(data);
    };
    loadTemplates();
  }, []);

  // שליפת PDF לפי בחירה
  useEffect(() => {
    if (!selectedId) return;

    const loadPdf = async () => {
      const res = await fetch(`/sign/api/templates/${selectedId}`);
      const data = await res.json();
      setPdfUrl(data.url);
    };

    loadPdf();
  }, [selectedId]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">בחירת תבנית</h1>

      {/* בחירת תבנית */}
      <select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="border rounded px-3 py-2 w-full max-w-md"
      >
        <option value="">בחר תבנית</option>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>

      {/* תצוגת PDF */}
      {pdfUrl && <PdfIframe url={pdfUrl} />}
    </div>
  );
}

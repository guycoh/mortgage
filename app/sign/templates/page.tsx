"use client";

import { useState, useRef } from "react";

type FieldType = "name" | "tz" | "email" | "signature";

interface TemplateField {
  id: string;
  type: FieldType;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  required: boolean;
}

export default function NewTemplatePage() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [templateName, setTemplateName] = useState("");
  const pdfRef = useRef<HTMLDivElement>(null);

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setPdfFile(e.target.files[0]);
  };

  const addField = (type: FieldType) => {
    // מוסיף שדה חדש באמצע PDF
    setFields([
      ...fields,
      {
        id: crypto.randomUUID(),
        type,
        x: 40,
        y: 40,
        width: 20,
        height: 5,
        page: 1,
        required: true,
      },
    ]);
  };

  const handleDrag = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;

    const field = fields.find((f) => f.id === id);
    if (!field) return;

    const mouseMove = (moveEvent: MouseEvent) => {
      const dx = ((moveEvent.clientX - startX) / 500) * 100; // אחוזים
      const dy = ((moveEvent.clientY - startY) / 700) * 100;
      setFields((prev) =>
        prev.map((f) =>
          f.id === id
            ? { ...f, x: f.x + dx, y: f.y + dy }
            : f
        )
      );
    };

    const mouseUp = () => {
      window.removeEventListener("mousemove", mouseMove);
      window.removeEventListener("mouseup", mouseUp);
    };

    window.addEventListener("mousemove", mouseMove);
    window.addEventListener("mouseup", mouseUp);
  };

  const saveTemplate = async () => {
    if (!templateName || !pdfFile) {
      alert("בחר שם לתבנית וPDF");
      return;
    }

    const formData = new FormData();
    formData.append("name", templateName);
    formData.append("file", pdfFile);
    formData.append("fields", JSON.stringify(fields));

    const res = await fetch("/sign/templates/api/create", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      alert("תבנית נשמרה בהצלחה!");
      setPdfFile(null);
      setFields([]);
      setTemplateName("");
    } else {
      alert("שגיאה בשמירה");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">צור תבנית חדשה</h1>

      <input
        type="text"
        placeholder="שם התבנית"
        value={templateName}
        onChange={(e) => setTemplateName(e.target.value)}
        className="border p-2 mb-4 w-full"
      />

      <input type="file" accept="application/pdf" onChange={handlePdfUpload} />

      {pdfFile && (
        <div
          ref={pdfRef}
          className="relative border mt-4 w-[500px] h-[700px] bg-gray-100"
        >
          {/* PDF מוצג כאן – אפשר לשים iframe או pdf.js */}
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            {pdfFile.name}
          </div>

          {/* Overlay שדות */}
          {fields.map((field) => (
            <div
              key={field.id}
              onMouseDown={(e) => handleDrag(field.id, e)}
              className={`absolute border-2 ${
                field.type === "signature"
                  ? "border-green-600 bg-green-100"
                  : "border-blue-600 bg-blue-50"
              } flex items-center justify-center text-xs cursor-move`}
              style={{
                left: `${field.x}%`,
                top: `${field.y}%`,
                width: `${field.width}%`,
                height: `${field.height}%`,
              }}
            >
              {field.type}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => addField("name")}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          שם
        </button>
        <button
          onClick={() => addField("tz")}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          ת"ז
        </button>
        <button
          onClick={() => addField("email")}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          מייל
        </button>
        <button
          onClick={() => addField("signature")}
          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
        >
          חתימה
        </button>
      </div>

      <button
        onClick={saveTemplate}
        className="mt-4 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
      >
        שמור תבנית
      </button>
    </div>
  );
}

// app/sign/[token]/SignViewer.tsx
"use client";

import { useState, useEffect } from "react";
import PdfIframe from "@/app/sign/components/PdfIframe";
import FieldsOverlay from "./FieldsOverlay";


type SignViewerProps = {
  doc: {
    id: string;
    title: string;
    file_path: string;
    fields: Array<{
      id: string;
      type: "name" | "id" | "email" | "signature";
      page: number;
      x: number;
      y: number;
    }>;
    total_pages: number;
  };
  onComplete: () => void;
};

export default function SignViewer({ doc, onComplete }: SignViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);

  const pdfUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/forms/${doc.file_path}`;

  const nextPage = () => {
    if (currentPage < doc.total_pages) setCurrentPage(currentPage + 1);
  };

  const prevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const currentFields = doc.fields.filter((f) => f.page === currentPage);

  return (
    <div className="flex flex-col items-center space-y-4 p-4">
      <h2 className="text-lg font-bold">{doc.title}</h2>

      <div className="flex gap-2 items-center">
        <button
          onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}
          className="px-2 py-1 border rounded"
        >
          ➖
        </button>
        <span>{Math.round(scale * 100)}%</span>
        <button
          onClick={() => setScale((s) => Math.min(2, s + 0.1))}
          className="px-2 py-1 border rounded"
        >
          ➕
        </button>
      </div>

      <div
        className="relative border w-full max-w-3xl"
        style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}
      >
        <PdfIframe url={pdfUrl} page={currentPage} />
        <FieldsOverlay fields={currentFields} readonly />
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={prevPage}
          disabled={currentPage === 1}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
        >
          הקודם
        </button>
        {currentPage < doc.total_pages ? (
          <button
            onClick={nextPage}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            הבא
          </button>
        ) : (
          <button
            onClick={onComplete}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            סיום חתימה
          </button>
        )}
      </div>
    </div>
  );
}

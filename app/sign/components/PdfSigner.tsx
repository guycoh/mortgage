"use client";

import { useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";

export default function PdfSigner() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const startDrawing = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = "black";

    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);

    const draw = (ev: MouseEvent) => {
      ctx.lineTo(ev.offsetX, ev.offsetY);
      ctx.stroke();
    };

    const stop = () => {
      window.removeEventListener("mousemove", draw);
      window.removeEventListener("mouseup", stop);
    };

    window.addEventListener("mousemove", draw);
    window.addEventListener("mouseup", stop);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setPdfFile(e.target.files[0]);
  };

  const saveSignedPdf = async () => {
    if (!pdfFile) {
      alert("אנא העלה PDF");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const signatureBase64 = canvas.toDataURL("image/png");

    // PDF Load
    const existingPdfBytes = await pdfFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    const pngImage = await pdfDoc.embedPng(signatureBase64);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    firstPage.drawImage(pngImage, {
      x: 50,       // כאן אתה יכול לבחור מיקום מדויק
      y: 50,
      width: 150,
      height: 70,
    });

    const pdfBytes = await pdfDoc.save();

    // תיקון ה-TypeScript: שימוש ב-buffer
    const arrayBuffer = pdfBytes.slice().buffer;
    const blob = new Blob([arrayBuffer], { type: "application/pdf" });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "signed.pdf";
    a.click();
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">מערכת חתימה על PDF</h1>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handlePdfUpload}
        className="mb-4"
      />

      <div className="border p-3 rounded-lg bg-white shadow-md">
        <p className="font-semibold mb-2">חתימה:</p>

        <canvas
          ref={canvasRef}
          width={300}
          height={150}
          className="border rounded cursor-crosshair bg-gray-100"
          onMouseDown={startDrawing}
        ></canvas>

        <div className="flex gap-2 mt-3">
          <button
            className="px-4 py-2 bg-red-500 text-white rounded"
            onClick={clearCanvas}
          >
            ניקוי
          </button>
        </div>
      </div>

      <button
        className="mt-5 px-6 py-3 bg-blue-600 text-white rounded-lg shadow"
        onClick={saveSignedPdf}
      >
        הורד PDF חתום
      </button>
    </div>
  );
}

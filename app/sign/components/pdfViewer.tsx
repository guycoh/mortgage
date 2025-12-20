
// app/sign/components/PdfViewer.tsx
"use client";

interface PdfViewerProps {
  pdfUrl: string;
}

export default function PdfViewer({ pdfUrl }: PdfViewerProps) {
  if (!pdfUrl) return null;

  return (
    <iframe
      src={pdfUrl}
      className="w-full h-[85vh] border rounded"
      title="PDF Viewer"
    />
  );
}

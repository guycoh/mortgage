"use client";


// PdfIframe.tsx
interface PdfIframeProps {
  url: string;
  page?: number; // <-- הוספה
}

export default function PdfIframe({ url, page }: PdfIframeProps) {
  // שימוש ב-page כאן אם רוצים לקפוץ לעמוד ספציפי
  return (
    <iframe
      src={page ? `${url}#page=${page}` : url}
      width="100%"
      height="800px"
    />
  );
}

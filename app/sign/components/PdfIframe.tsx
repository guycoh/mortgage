"use client";

interface PdfIframeProps {
  url: string;
}

export default function PdfIframe({ url }: PdfIframeProps) {
  if (!url) return null;

  return (
    <iframe
      src={url}
      className="w-full h-[80vh] border rounded"
    />
  );
}

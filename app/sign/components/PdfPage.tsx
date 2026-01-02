"use client";

import { useEffect, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.entry";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js";

type Props = {
  url: string;
  page: number;
  scale?: number;
  onPageSize?: (w: number, h: number) => void;
};

export default function PdfPage({
  url,
  page,
  scale = 1,
  onPageSize,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      const pdf = await pdfjsLib.getDocument(url).promise;
      const pdfPage = await pdf.getPage(page);

      const viewport = pdfPage.getViewport({ scale });
      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;

      const context = canvas.getContext("2d")!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      onPageSize?.(viewport.width, viewport.height);

      await pdfPage.render({
        canvasContext: context,
        viewport,
      }).promise;
    };

    render();

    return () => {
      cancelled = true;
    };
  }, [url, page, scale]);

  return <canvas ref={canvasRef} className="block mx-auto" />;
}

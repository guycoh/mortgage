// app/sign/components/TemplateField.tsx
"use client";

import { useState } from "react";
import { TemplateFieldData } from "./TemplateOverlay";

type Props = {
  field: TemplateFieldData;
  onMove: (id: string, x: number, y: number) => void;
  containerRef: React.RefObject<HTMLDivElement | null>; // ✅ הוספת | null
  scale: number;
};



export default function TemplateField({
  field,
  onMove,
  containerRef,
  scale,
}: Props) {
  const [dragging, setDragging] = useState(false);

  const onMouseDown = () => setDragging(true);
  const onMouseUp = () => setDragging(false);

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();

    const x =
      ((e.clientX - rect.left) / rect.width) * 100 / scale;
    const y =
      ((e.clientY - rect.top) / rect.height) * 100 / scale;

    onMove(field.id, x, y);
  };

  return (
    <div
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      className="absolute inset-0"
    >
      <div
        onMouseDown={onMouseDown}
        style={{
          left: `${field.x}%`,
          top: `${field.y}%`,
        }}
        className="absolute bg-white border px-2 py-1 rounded shadow cursor-move"
      >
        {field.type}
      </div>
    </div>
  );
}

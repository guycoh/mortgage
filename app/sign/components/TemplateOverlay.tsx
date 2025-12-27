// app/sign/components/TemplateOverlay.tsx
"use client";

import { useRef } from "react";
import { useState } from "react";



export type FieldType = "name" | "id" | "email" | "signature";


export type TemplateFieldData = {
  id: string;
  type: FieldType;
  page: number; // ← מספר עמוד
  x: number;    // באחוזים
  y: number;    // באחוזים
};
type Props = {
  fields: TemplateFieldData[];
  setFields: React.Dispatch<React.SetStateAction<TemplateFieldData[]>>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  scale: number;
  currentPage: number;
};


export default function TemplateOverlay({
  fields,
  setFields,
  containerRef,
  scale,
  currentPage, 
}: Props) {
  const dragFieldRef = useRef<string | null>(null);

  const handleMouseDown = (fieldId: string) => {
    dragFieldRef.current = fieldId;
  };

  const handleMouseUp = () => {
    dragFieldRef.current = null;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragFieldRef.current || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((e.clientY - rect.top) / rect.height) * 100;

    setFields((prev) =>
      prev.map((f) =>
        f.id === dragFieldRef.current
          ? { ...f, x: xPercent, y: yPercent }
          : f
      )
    );
  };

 // ✅ כאן בדיוק – לפני ה־return
  const visibleFields = fields.filter(
    (f) => f.page === currentPage
  );


  return (
    <div
      className="absolute inset-0"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
   

      {fields.map((field) => (
        <div
          key={field.id}
          onMouseDown={() => handleMouseDown(field.id)}
          className="absolute bg-orange-500 text-white px-2 py-1 rounded cursor-move select-none"
          style={{
            left: `${field.x}%`,
            top: `${field.y}%`,
            transform: "translate(-50%, -50%)",
            fontSize: `${14 * scale}px`,
          }}
        >
          {field.type}
        </div>
      ))}
    </div>
  );
}















// // app/sign/components/TemplateOverlay.tsx
// "use client";

// import TemplateField from "./TemplateField";

// export type FieldType = "name" | "id" | "email" | "signature";

// export type TemplateFieldData = {
//   id: string;
//   type: FieldType;
//   x: number; // %
//   y: number; // %
// };

// type Props = {
//   fields: TemplateFieldData[];
//   setFields: React.Dispatch<React.SetStateAction<TemplateFieldData[]>>;
//    containerRef: React.RefObject<HTMLDivElement | null>; // ✅ הוספת | null
//   scale: number;
// };

// export default function TemplateOverlay({
//   fields,
//   setFields,
//   containerRef,
//   scale,
// }: Props) {
//   const updatePosition = (id: string, x: number, y: number) => {
//     setFields((prev) =>
//       prev.map((f) => (f.id === id ? { ...f, x, y } : f))
//     );
//   };

//   return (
//     <div className="absolute inset-0">
//       {fields.map((field) => (
//         <TemplateField
//           key={field.id}
//           field={field}
//           onMove={updatePosition}
//           containerRef={containerRef}
//           scale={scale}
//         />
//       ))}
//     </div>
//   );
// }

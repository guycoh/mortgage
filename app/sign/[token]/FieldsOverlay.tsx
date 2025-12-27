// app/sign/components/FieldsOverlay.tsx
"use client";

import { useState } from "react";
import SignatureModal from "./SignatureModal";


export type FieldType = "name" | "id" | "email" | "signature";

export type Field = {
  id: string;
  type: FieldType;
  x: number; // באחוזים
  y: number;
  value?: string;
};

type FieldsOverlayProps = {
  fields: Field[];
  readonly?: boolean; // אם true – לא ניתן לערוך
  onChange?: (updatedFields: Field[]) => void;
};

export default function FieldsOverlay({
  fields,
  readonly = false,
  onChange,
}: FieldsOverlayProps) {
  const [activeSigField, setActiveSigField] = useState<Field | null>(null);

  const handleSignatureSave = (sigDataUrl: string) => {
    if (!activeSigField) return;
    const updated = fields.map((f) =>
      f.id === activeSigField.id ? { ...f, value: sigDataUrl } : f
    );
    onChange?.(updated);
    setActiveSigField(null);
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {fields.map((f) => (
        <div
          key={f.id}
          className={`absolute border rounded px-1 py-0.5 text-sm bg-white bg-opacity-70 text-black ${
            f.type === "signature" ? "cursor-pointer pointer-events-auto" : ""
          }`}
          style={{
            left: `${f.x}%`,
            top: `${f.y}%`,
            minWidth: f.type === "signature" ? "100px" : "50px",
            minHeight: f.type === "signature" ? "40px" : "auto",
          }}
          onClick={() => {
            if (!readonly && f.type === "signature") setActiveSigField(f);
          }}
        >
          {f.value || (f.type === "signature" ? "חתום כאן" : f.type)}
        </div>
      ))}

      {activeSigField && (
        <SignatureModal
          onSave={handleSignatureSave}
          onClose={() => setActiveSigField(null)}
        />
      )}
    </div>
  );
}

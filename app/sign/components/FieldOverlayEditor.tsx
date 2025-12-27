// app/sign/components/FieldOverlayEditor.tsx
"use client";

import { useState } from "react";

type FieldType = "name" | "id" | "email" | "signature";

type Field = {
  id: string;
  type: FieldType;
  x: number;
  y: number;
  width?: number;
  height?: number;
};





export default function FieldOverlayEditor({ templateId }: { templateId: string }) {
  const [fields, setFields] = useState<Field[]>([]);

  const addField = (type: FieldType) => {
    const newField: Field = {
      id: crypto.randomUUID(),
      type,
      x: 50,
      y: 50,
      width: 120,
      height: 30,
    };
    setFields([...fields, newField]);
  };

  const saveFields = async () => {
    const res = await fetch("/sign/api/templates/fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template_id: templateId, fields }),
    });
    if (res.ok) alert("שדות נשמרו בהצלחה!");
    else alert("שגיאה בשמירה");
  };

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
      <div className="absolute top-0 left-0 p-2 bg-white/80 flex gap-2 pointer-events-auto z-10">
        <button onClick={() => addField("name")} className="bg-blue-600 text-white px-2 py-1 rounded">שם</button>
        <button onClick={() => addField("id")} className="bg-blue-600 text-white px-2 py-1 rounded">ת"ז</button>
        <button onClick={() => addField("email")} className="bg-blue-600 text-white px-2 py-1 rounded">מייל</button>
        <button onClick={() => addField("signature")} className="bg-blue-600 text-white px-2 py-1 rounded">חתימה</button>
        <button onClick={saveFields} className="bg-green-600 text-white px-2 py-1 rounded">שמירה</button>
      </div>

      {fields.map((f) => (
        <div
          key={f.id}
          className="absolute border border-red-500 bg-red-100/50 cursor-move pointer-events-auto"
          style={{ top: f.y, left: f.x, width: f.width, height: f.height }}
        >
          {f.type}
        </div>
      ))}
    </div>
  );
}

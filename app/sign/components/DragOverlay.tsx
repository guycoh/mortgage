// app/sign/components/DragOverlay.tsx
"use client";

import { useState } from "react";
import DragField from "./DragField";

export default function DragOverlay() {
  const [isDragEnabled, setIsDragEnabled] = useState(true);

  return (
    <div className="relative w-full h-full pointer-events-auto">
      {/* כפתור נעילה */}
      <div className="absolute top-2 left-2 z-50">
        <button
          onClick={() => setIsDragEnabled((prev) => !prev)}
          className={`px-4 py-1 rounded text-sm font-medium ${
            isDragEnabled
              ? "bg-red-500 text-white"
              : "bg-green-500 text-white"
          }`}
        >
          {isDragEnabled ? "נעל גרירה" : "אפשר גרירה"}
        </button>
      </div>

      {/* שדות */}
      <DragField label="✍️ חתימה" isDragEnabled={isDragEnabled} />
      <DragField label="📅 תאריך" isDragEnabled={isDragEnabled} />
    </div>
  );
}

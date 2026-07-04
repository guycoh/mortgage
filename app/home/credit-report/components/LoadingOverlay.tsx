"use client";

export default function LoadingOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-[320px] rounded-2xl shadow-xl p-6 text-center space-y-4">

        {/* אנימציית טעינה */}
        <div className="flex justify-center">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-4 border-orange-200"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-orange-500 animate-spin"></div>
          </div>
        </div>

        {/* טקסט */}
        <div className="text-lg font-bold text-gray-800">
          מעבד דוח חיווי אשראי
        </div>

        <div className="text-sm text-gray-500">
          קורא נתוני PDF ומנתח מידע פיננסי...
        </div>

        {/* שלבי תהליך (UX קטן שנותן תחושת מוצר) */}
        <div className="text-xs text-gray-400 space-y-1 pt-2">
          <p>✔ העלאת קובץ</p>
          <p>⏳ חילוץ טקסט מה־PDF</p>
          <p>⏳ ניתוח נתונים פיננסיים</p>
        </div>

      </div>
    </div>
  );
}
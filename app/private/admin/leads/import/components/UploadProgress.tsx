"use client";

type Props = {
  progress: number; // 0 - 100
  status?: "idle" | "uploading" | "done" | "error";
};

export default function UploadProgress({
  progress,
  status = "idle",
}: Props) {
  return (
    <div className="w-full bg-white border rounded-2xl p-4 shadow-sm space-y-3">

      {/* סטטוס */}
      <div className="flex justify-between items-center">
        <p className="font-semibold text-gray-700">
          {status === "uploading" && "מעלה לידים..."}
          {status === "done" && "העלאה הושלמה 🎉"}
          {status === "error" && "שגיאה בהעלאה"}
          {status === "idle" && "מוכן להעלאה"}
        </p>

        <span className="text-sm text-gray-500">
          {progress}%
        </span>
      </div>

      {/* בר */}
      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            status === "error"
              ? "bg-red-500"
              : "bg-orange-500"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* אנימציה קטנה */}
      {status === "uploading" && (
        <div className="text-xs text-gray-400 animate-pulse">
          מעבד נתונים ושולח לשרת...
        </div>
      )}
    </div>
  );
}
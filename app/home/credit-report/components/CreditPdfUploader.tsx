"use client";

export default function CreditPdfUploader({
  onUpload,
}: {
  onUpload: (file: File) => void;
}) {
  return (
    <label className="block border-2 border-dashed border-orange-400 p-10 text-center rounded-xl cursor-pointer bg-white hover:bg-orange-50">
      <input
        type="file"
        accept="application/pdf"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
        }}
      />

      <div className="text-5xl">📄</div>
      <div className="mt-2 font-semibold">העלה דוח חיווי אשראי</div>
    </label>
  );
}
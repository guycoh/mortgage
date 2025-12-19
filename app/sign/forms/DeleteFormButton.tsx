"use client";

export default function DeleteFormButton({ formId }: { formId: string }) {
  const handleDelete = async () => {
    const ok = confirm("הטופס והקובץ יימחקו לצמיתות. להמשיך?");
    if (!ok) return;

    const res = await fetch("/sign/forms/api/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formId }),
    });

    if (!res.ok) {
      alert("שגיאה במחיקה");
      return;
    }

    window.location.reload();
  };

  return (
    <button
      onClick={handleDelete}
      className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition"
    >
      מחק
    </button>
  );
}

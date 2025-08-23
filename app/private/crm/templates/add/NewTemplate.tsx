"use client";
import { useState } from "react";
import type { Template } from "../page";

interface NewTemplateProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (template: Template) => void;
}

export default function NewTemplate({ isOpen, onClose, onCreated }: NewTemplateProps) {
  const [formData, setFormData] = useState({
    name: "",
    content: "",
    inactive: false,
    rank: null as number | null,
  });
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.target;
    const { name } = target;

    if (target instanceof HTMLInputElement && target.type === "checkbox") {
      setFormData((p) => ({ ...p, [name]: target.checked }));
      return;
    }

    if (name === "rank") {
      const v = (target as HTMLInputElement).value;
      setFormData((p) => ({ ...p, rank: v === "" ? null : Number(v) }));
      return;
    }

    setFormData((p) => ({ ...p, [name]: (target as HTMLInputElement | HTMLTextAreaElement).value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("שגיאה בהוספת התבנית");
      const created = (await res.json()) as Template;
      onCreated(created);
      onClose();
      setFormData({ name: "", content: "", inactive: false, rank: null });
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="relative bg-white p-8 rounded shadow-lg w-full max-w-2xl h-full flex flex-col">
        {/* איקס סגירה */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-2xl font-bold text-gray-600 
                     hover:text-red-500 transition-transform duration-200 hover:rotate-90"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold mb-6 pr-2">הוסף תבנית חדשה</h2>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 space-y-4 overflow-y-auto">
          <input
            type="text"
            name="name"
            placeholder="שם"
            value={formData.name}
            onChange={handleChange}
            className="border p-3 w-full rounded focus:bg-orange-50 outline-none"
            required
          />
          <textarea
            name="content"
            placeholder="תוכן"
            value={formData.content}
            onChange={handleChange}
            className="border p-3 w-full rounded flex-1 min-h-[300px] focus:bg-orange-50 outline-none resize-none"
            required
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="inactive"
              checked={formData.inactive}
              onChange={handleChange}
            />
            לא פעיל
          </label>
          <input
            type="number"
            name="rank"
            placeholder="דירוג"
            value={formData.rank ?? ""}
            onChange={handleChange}
            className="border p-3 w-full rounded focus:bg-orange-50 outline-none"
          />

          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="px-5 py-2 bg-gray-300 rounded">
              ביטול
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-orange-500 text-white rounded"
            >
              {submitting ? "שומר..." : "שמור"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}















// "use client";
// import { useState } from "react";
// import type { Template } from "../page";

// interface NewTemplateProps {
//   isOpen: boolean;
//   onClose: () => void;
//   onCreated: (template: Template) => void;
// }

// export default function NewTemplate({ isOpen, onClose, onCreated }: NewTemplateProps) {
//   const [formData, setFormData] = useState({
//     name: "",
//     content: "",
//     inactive: false,
//     rank: null as number | null,
//   });
//   const [submitting, setSubmitting] = useState(false);

//   if (!isOpen) return null;

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
//     const target = e.target;
//     const { name } = target;

//     if (target instanceof HTMLInputElement && target.type === "checkbox") {
//       setFormData((p) => ({ ...p, [name]: target.checked }));
//       return;
//     }

//     if (name === "rank") {
//       const v = (target as HTMLInputElement).value;
//       setFormData((p) => ({ ...p, rank: v === "" ? null : Number(v) }));
//       return;
//     }

//     setFormData((p) => ({ ...p, [name]: (target as HTMLInputElement | HTMLTextAreaElement).value }));
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (submitting) return;
//     setSubmitting(true);
//     try {
//       const res = await fetch("/api/templates", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         // חשוב: לשלוח בדיוק את השדות שה־API מצפה להם
//         body: JSON.stringify(formData),
//       });
//       if (!res.ok) throw new Error("שגיאה בהוספת התבנית");
//       const created = (await res.json()) as Template; // חייב לכלול id
//       onCreated(created); // הוספה מיידית + רענון שקט בצד ההורה
//       onClose();
//       setFormData({ name: "", content: "", inactive: false, rank: null });
//     } catch (err) {
//       console.error(err);
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   return (
//     <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
//       <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
//         <h2 className="text-lg font-bold mb-4">הוסף תבנית חדשה</h2>
//         <form onSubmit={handleSubmit} className="space-y-3">
//           <input
//             type="text"
//             name="name"
//             placeholder="שם"
//             value={formData.name}
//             onChange={handleChange}
//             className="border p-2 w-full"
//             required
//           />
//           <textarea
//             name="content"
//             placeholder="תוכן"
//             value={formData.content}
//             onChange={handleChange}
//             className="border p-2 w-full h-32"
//             required
//           />
//           <label className="flex items-center gap-2">
//             <input
//               type="checkbox"
//               name="inactive"
//               checked={formData.inactive}
//               onChange={handleChange}
//             />
//             לא פעיל
//           </label>
//           <input
//             type="number"
//             name="rank"
//             placeholder="דירוג"
//             value={formData.rank ?? ""}
//             onChange={handleChange}
//             className="border p-2 w-full"
//           />

//           <div className="flex justify-end gap-2 pt-2">
//             <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 rounded">
//               ביטול
//             </button>
//             <button
//               type="submit"
//               disabled={submitting}
//               className="px-4 py-2 bg-orange-500 text-white rounded"
//             >
//               {submitting ? "שומר..." : "שמור"}
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }

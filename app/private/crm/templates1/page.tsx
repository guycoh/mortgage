"use client";

import { useState } from "react";
import { useTemplates, Template } from "@/app/data/hooks/useTemplates";
import NewTemplate from "./NewTemplate";
import EditTemplate from "./EditTemplate";

export default function TemplatesPage() {
  const {
    templates,
    loading,
    error,
    addTemplate,
    updateTemplate,
    deleteTemplate,
  } = useTemplates();

  const [showNew, setShowNew] = useState(false);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("למחוק את התבנית?")) return;
    await deleteTemplate(id);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">ניהול תבניות הודעה</h1>
        <button
          onClick={() => setShowNew(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-1 px-4 rounded"
        >
          הוספת תבנית
        </button>
      </div>

      {loading && <div>טוען נתונים...</div>}
      {error && <div className="text-red-500">{error}</div>}

      {!loading && !error && (
        <table className="w-full border border-gray-300 rounded text-right">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">שם</th>
              <th className="p-2">תוכן</th>
              <th className="p-2">דירוג</th>
              <th className="p-2">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((template) => (
              <tr
                key={template.id}
                className="border-t border-gray-200 hover:bg-gray-50"
              >
                <td className="p-2 font-medium">{template.name}</td>
                <td className="p-2 whitespace-pre-line max-w-[400px] truncate">
                  {template.content}
                </td>
                <td className="p-2">{template.rank ?? "-"}</td>
                <td className="p-2 space-x-2 space-x-reverse">
                  <button
                    onClick={() => setEditTemplate(template)}
                    className="text-blue-600 hover:underline"
                  >
                    עריכה
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="text-red-600 hover:underline"
                  >
                    מחיקה
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(template.content);
                      alert("התוכן הועתק");
                    }}
                    className="text-green-600 hover:underline"
                  >
                    העתקה
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showNew && (
        <NewTemplate
          onClose={() => setShowNew(false)}
        />
      )}

      {editTemplate && (
        <EditTemplate
          template={editTemplate}
          onClose={() => setEditTemplate(null)}
        />
      )}
    </div>
  );
}


















// "use client";

// import { useTemplates, Template } from "@/app/data/hooks/useTemplates";
// import { useState, useEffect } from "react";
// import NewTemplate from "./NewTemplate";
// import EditTemplate from "./EditTemplate";

// export default function TemplatesPage() {
//   const { templates: initialTemplates, loading, error } = useTemplates();
//   const [templates, setTemplates] = useState<Template[]>([]);
//   const [showNew, setShowNew] = useState(false);
//   const [editTemplate, setEditTemplate] = useState<Template | null>(null);

//   // שמירה ראשונית של הנתונים בצורה בטוחה
//   useEffect(() => {
//     if (Array.isArray(initialTemplates)) {
//       setTemplates(initialTemplates.filter(Boolean));
//     }
//   }, [initialTemplates]);

//   const handleAddTemplate = (newTemplate: Template) => {
//     if (newTemplate && newTemplate.id) {
//       setTemplates((prev) => [...prev, newTemplate]);
//     }
//   };

//   const handleUpdateTemplate = (updatedTemplate: Template) => {
//     if (updatedTemplate && updatedTemplate.id) {
//       setTemplates((prev) =>
//         prev.map((t) => (t.id === updatedTemplate.id ? updatedTemplate : t))
//       );
//     }
//   };

//   const handleDeleteTemplate = async (id: string) => {
//     if (!confirm("למחוק את התבנית?")) return;
//     await fetch(`/api/templates/${id}`, { method: "DELETE" });
//     setTemplates((prev) => prev.filter((t) => t.id !== id));
//   };

//   const handleCopy = (content: string) => {
//     navigator.clipboard.writeText(content);
//     alert("התוכן הועתק");
//   };

//   return (
//     <div className="max-w-6xl mx-auto p-6">
//       <div className="flex justify-between items-center mb-4">
//         <h1 className="text-2xl font-bold">ניהול תבניות הודעה</h1>
//         <button
//           onClick={() => setShowNew(true)}
//           className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-1 px-4 rounded"
//         >
//           הוספת תבנית
//         </button>
//       </div>

//       {loading && <div>טוען נתונים...</div>}
//       {error && <div className="text-red-500">{error}</div>}

//       {!loading && !error && (
//         <table className="w-full border border-gray-300 rounded text-right">
//           <thead className="bg-gray-100">
//             <tr>
//               <th className="p-2">שם</th>
//               <th className="p-2">תוכן</th>
//               <th className="p-2">דירוג</th>
//               <th className="p-2">פעולות</th>
//             </tr>
//           </thead>
//           <tbody>
//             {templates
//               .filter((t): t is Template => Boolean(t))
//               .map((template) => (
//                 <tr
//                   key={template.id}
//                   className="border-t border-gray-200 hover:bg-gray-50"
//                 >
//                   <td className="p-2 font-medium">{template.name}</td>
//                   <td className="p-2 whitespace-pre-line max-w-[400px] truncate">
//                     {template.content}
//                   </td>
//                   <td className="p-2">{template.rank ?? "-"}</td>
//                   <td className="p-2 space-x-2 space-x-reverse">
//                     <button
//                       onClick={() => setEditTemplate(template)}
//                       className="text-blue-600 hover:underline"
//                     >
//                       עריכה
//                     </button>
//                     <button
//                       onClick={() => handleDeleteTemplate(template.id)}
//                       className="text-red-600 hover:underline"
//                     >
//                       מחיקה
//                     </button>
//                     <button
//                       onClick={() => handleCopy(template.content)}
//                       className="text-green-600 hover:underline"
//                     >
//                       העתקה
//                     </button>
//                   </td>
//                 </tr>
//               ))}
//           </tbody>
//         </table>
//       )}

//       {showNew && (
//         <NewTemplate
//           onClose={() => setShowNew(false)}
//           onSuccess={(newTemplate) => {
//             handleAddTemplate(newTemplate);
//             setShowNew(false);
//           }}
//         />
//       )}

//       {editTemplate && (
//         <EditTemplate
//           template={editTemplate}
//           onClose={() => setEditTemplate(null)}
//         //   onSuccess={(updated) => {
//         //     handleUpdateTemplate(updated);
//         //     setEditTemplate(null);
//         //   }}
//         />
//       )}
//     </div>
//   );
// }

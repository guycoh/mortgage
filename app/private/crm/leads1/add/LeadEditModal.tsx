"use client"

import type { Lead } from "@/app/data/hooks/useLeads";
import { useLeadSource } from "@/app/data/hooks/useLeadSource"; 

type Props = {
  isOpen: boolean;
  editLead: Lead | null;
  setEditLead: React.Dispatch<React.SetStateAction<Lead | null>>;
  onClose: () => void;
  setIsEditModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onSave: (updatedLead: Lead) => void;
};

export default function LeadEditModal({
  isOpen,
  onClose,
  editLead,
  setEditLead,
  onSave,
  setIsEditModalOpen
}: Props) {

  const { sources } = useLeadSource();
  if (!editLead) return null;

  const handleChange = (field: keyof Lead, value: any) => {
    setEditLead(prev => prev ? { ...prev, [field]: value } : prev);
  }

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div
        className={`fixed left-0 top-0 bg-white h-full w-[90%] shadow-xl transform transition-transform duration-300 flex flex-col ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 bg-blue-600">
          <h2 className="text-lg text-white font-bold">עריכת ליד #{editLead.id}</h2>
          <button
            onClick={onClose}
            className="text-xl font-bold text-white hover:text-red-500"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6 pb-32">
          <form id="leadForm" className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {/* שם מלא */}
            <div className="flex flex-col">
              <label htmlFor="name" className="mb-1 text-gray-700 font-medium">שם מלא</label>
              <input
                id="name"
                value={editLead.name}
                onChange={e => handleChange("name", e.target.value)}
                required
                className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:bg-orange-50 transition-colors"
              />
            </div>

            {/* טלפון */}
            <div className="flex flex-col">
              <label htmlFor="cell" className="mb-1 text-gray-700 font-medium">טלפון</label>
              <input
                id="cell"
                type="tel"
                value={editLead.cell}
                onChange={e => handleChange("cell", e.target.value)}
                required
                className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:bg-orange-50 transition-colors"
              />
            </div>

            {/* אימייל */}
            <div className="flex flex-col">
              <label htmlFor="email" className="mb-1 text-gray-700 font-medium">אימייל</label>
              <input
                id="email"
                type="email"
                value={editLead.email}
                onChange={e => handleChange("email", e.target.value)}
                className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:bg-orange-50 transition-colors"
              />
            </div>

            {/* שם בן/בת זוג */}
            <div className="flex flex-col">
              <label htmlFor="spouse_name" className="mb-1 text-gray-700 font-medium">שם בן/בת זוג</label>
              <input
                id="spouse_name"
                value={editLead.spouse_name || ""}
                onChange={e => handleChange("spouse_name", e.target.value)}
                className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:bg-orange-50 transition-colors"
              />
            </div>

            {/* טלפון בן/בת זוג */}
            <div className="flex flex-col">
              <label htmlFor="spouse_phone" className="mb-1 text-gray-700 font-medium">טלפון בן/בת זוג</label>
              <input
                id="spouse_phone"
                value={editLead.spouse_phone || ""}
                onChange={e => handleChange("spouse_phone", e.target.value)}
                className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:bg-orange-50 transition-colors"
              />
            </div>

            {/* מקור ליד */}
            <div className="flex flex-col">
              <label htmlFor="data_source" className="mb-1 text-gray-700 font-medium">מקור ליד</label>
              <select
                id="data_source"
                value={editLead.data_source || ""}
                onChange={e => handleChange("data_source", Number(e.target.value))}
                className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:bg-orange-50 transition-colors"
              >
                <option value="">בחר מקור ליד</option>
                {sources.map((so) => (
                  <option key={so.id} value={so.id}>{so.source}</option>
                ))}
              </select>
            </div>

            {/* צ'קבוקסים */}
            <div className="col-span-2 md:col-span-3 border border-gray-300 rounded-md p-4 flex flex-wrap gap-4">
              {["black_list", "realtor", "mailing_list", "investors_list"].map((field) => (
                <div key={field} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${field === "black_list" ? "bg-black" : ""}`}>
                  <input
                    type="checkbox"
                    checked={!!editLead[field as keyof Lead]}
                    onChange={e => handleChange(field as keyof Lead, e.target.checked)}
                    className="w-4 h-4 accent-orange-400"
                  />
                  <label className={`font-medium ${field === "black_list" ? "text-white" : "text-gray-700"}`}>
                    {field === "black_list" ? "רשימה שחורה" :
                     field === "realtor" ? "מתווך" :
                     field === "mailing_list" ? "רשימת דיוור" :
                     "משקיעים"}
                  </label>
                </div>
              ))}
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 left-0 w-full bg-gray-100 p-4 flex justify-end gap-3 shadow-inner">
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition"
          >
            סגור
          </button>

          <button
            onClick={() => editLead && onSave(editLead)}
            type="button"
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
          >
            שמור
          </button>
        </div>
      </div>
    </div>
  );
}

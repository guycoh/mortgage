"use client"

import { useState } from "react";
import { useLeads, Lead } from "@/app/data/hooks/useLeads";

import LeadNewModal from "./add/LeadNewModal";
import LeadsTable from "./add/LeadsTable";
import LeadEditModal from "./add/LeadEditModal";

import PlusIcon from "@/public/assets/images/svg/general/PlusIcon";

export default function Page() {
  const { leads, loading, addLead, updateLead, deleteLead } = useLeads();

  // מצב מודאלים
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // ליד שנבחר לעריכה
  const [editLead, setEditLead] = useState<Lead | null>(null);

  // שמירה של ליד חדש
  const handleAddLead = async (newLead: Partial<Lead>) => {
    const added = await addLead(newLead);
    if (added) {
      console.log("Added lead ID:", added.id);
      setIsNewModalOpen(false);
    }
  };


  // שמירה של עריכה
  const handleSaveEdit = async (updatedLead: Lead) => {
    const updated = await updateLead(updatedLead.id, updatedLead);
    if (updated) {
      console.log("Updated lead ID:", updated.id);
      setEditLead(null);
      setIsEditModalOpen(false);
    }
  };

  // מחיקה
  const handleDelete = async (id: number) => {
    await deleteLead(id);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100 p-6">
      {/* כפתור הוספת ליד */}
      <div className="flex justify-end mb-6">
        <button
          onClick={() => setIsNewModalOpen(true)}
          className="group relative h-12 w-32 sm:w-28 rounded-lg border border-green-500 bg-green-600 p-1.5 text-base text-white duration-500 hover:bg-white hover:text-green-600"
        >
          <p className="absolute top-2.5 left-5 m-0 p-0 duration-500 group-hover:left-2 text-lg">
            הוסף ליד
          </p>
          <span className="absolute top-3.5 right-2 m-0 h-6 p-0 opacity-0 duration-500 group-hover:opacity-100">
            <PlusIcon className="w-4 h-4" />
          </span>
        </button>
      </div>

      {/* טבלה */}
      <LeadsTable
        leads={leads}
        loading={loading}
        onEdit={(lead: Lead) => {
          setEditLead(lead);
          setIsEditModalOpen(true);
        }}
        onDelete={handleDelete}
      />

      {/* מודאל הוספה */}
      <LeadNewModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSave={handleAddLead}
        title="הוספת ליד חדש"
      />


      {/* מודאל עריכה */}
      {editLead && (
        <LeadEditModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditLead(null);
          }}
          onSave={handleSaveEdit}
          editLead={editLead}
          setEditLead={setEditLead}              // 👈 חייב לשלוח
          setIsEditModalOpen={setIsEditModalOpen} // 👈 חייב לשלוח
        />
      )}
    </div>
  );
}

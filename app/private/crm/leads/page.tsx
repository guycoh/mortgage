"use client"

import { useState } from "react";
import { useLeads, Lead } from "@/app/data/hooks/useLeads";

import LeadNewModal from "./add/LeadNewModal";
import LeadsTable from "./add/LeadsTable";
import LeadEditModal from "./add/LeadEditModal";

import PlusIcon from "@/public/assets/images/svg/general/PlusIcon";


export default function Page() {
  const { leads, loading,setLeads, addLead, updateLead, deleteLead } = useLeads();
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const [editLead, setEditLead] = useState<Lead | null>(null);


  
// שמירה של עריכה
//   const handleSaveEdit = async (updatedLead: Lead) => {
//     const res = await updateLead(updatedLead.id, updatedLead);
//     setLeads((prev) =>
//       prev.map((lead) =>
//       lead.id === updatedLead.id ? updatedLead : lead
//   )
// );

//     setEditLead(null);
//   };

const handleSaveEdit = async (updatedLead: Lead) => {
  const res = await updateLead(updatedLead.id, updatedLead); // מחזיר lead מה־DB עם id אמיתי
  if (!res) return;

  setLeads((prev) =>
    prev.map((lead) =>
      lead.id === res.id ? res : lead
    )
  );









  console.log("עודכן lead עם id:", res.id);
  setEditLead(null);
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
          onEdit={(lead: Lead) => setEditLead(lead)}
          onDelete={deleteLead} 
          setIsEditModalOpen={setIsEditModalOpen}
                
       />


      {/* מודאל הוספה */}      
      <LeadNewModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="הוספת ליד חדש"
      />
      {/* מודאל עריכה */}
      <LeadEditModal
            isOpen={isEditModalOpen}          
            onClose={() => setIsEditModalOpen(false)}
            setIsEditModalOpen={setIsEditModalOpen}
            onSave={handleSaveEdit}                  
            editLead={editLead}   // זה מה שהכנת עם useState
            setEditLead={setEditLead}
      />

    </div>
  );
}



    





"use client"
import { useState } from "react";
import LeadNewModal from "./add/LeadNewModal";
import LeadsTable from "./add/LeadsTable";
import PlusIcon from '@/public/assets/images/svg/general/PlusIcon';




export default function Page() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
     <div className="h-screen flex flex-col bg-gray-100 p-6">
     {/* כפתור בצד שמאל למעלה */}
        <div className="flex justify-end mb-6">
            <button
                onClick={() => setIsModalOpen(true)}
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
      <LeadsTable />

      {/* מודאל */}
      <LeadNewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="הוספת ליד חדש"
      />
    </div>
  );
}


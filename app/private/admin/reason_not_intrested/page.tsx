"use client";
import ModalDelete from './ModalDelete';
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Reason {
  id: number;
  status: string;
}

export default function ReasonNotClosedTable() {
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [newReason, setNewReason] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);



  useEffect(() => {
    fetchReasons();
  }, []);

  const fetchReasons = async () => {
    try {
      const res = await fetch("/api/reason_not_interested");
      const data = await res.json();
      setReasons(data);
    } catch (error) {
      console.error("Failed to fetch reasons", error);
    }
  };

  const addReason = async () => {
    if (!newReason.trim()) return;
    try {
      const res = await fetch("/api/reason_not_interested", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newReason }),
      });
      if (res.ok) {
        setNewReason("");
        fetchReasons();
      }
    } catch (error) {
      console.error("Failed to add reason", error);
    }
  };

 // פונקציות למחיקה
 const handleDelete = (id: string) => {
    setIdToDelete(id);
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    if (idToDelete === null) return;

    const res = await fetch(`/api/reason_not_interested/${idToDelete}`, {
      method: 'DELETE',
    });

    if (res.ok) {
        setReasons(reasons.filter((reason) => String(reason.id) !== idToDelete));
      
    } else {
      alert('לא הצליח למחוק');
    }

    setIsModalOpen(false);
  };
  const cancelDelete = () => {
    setIsModalOpen(false);
    setIdToDelete(null);
  };




  return (
    <div className="p-4 max-w-lg mx-auto">
      <h2 className="text-xl font-bold mb-4 text-center">סיבת לא נסגר</h2>
      <div className="flex gap-2 mb-4">
        <Input
          value={newReason}
          onChange={(e) => setNewReason(e.target.value)}
          placeholder="סיבה לא נסגר"
        />
        <Button className="bg-green-500" onClick={addReason}>
          הוספה
        </Button>
      </div>
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-200">
            <th className="border p-2 w-16 text-center">ID</th>
            <th className="border p-2 text-center">סיבת לא מעוניין</th>
            <th className="border p-2 w-24 text-center">פעולות</th>
          </tr>
        </thead>
        <tbody>
          {reasons.map((reason) => (
            <tr key={reason.id} className="border">
              <td className="border p-2 text-center">{reason.id}</td>
              <td className="border p-2 text-center">{reason.status}</td>
              <td className="border p-2 flex justify-center gap-1 w-24">
                <Button className="bg-blue-500 px-2 text-sm">✏️</Button>
                <Button className="bg-red-500 px-2 text-sm" onClick={() => handleDelete(String(reason.id))}>
                  🗑️
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ModalDelete
        isOpen={isModalOpen}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
      />


    </div>
  );
}

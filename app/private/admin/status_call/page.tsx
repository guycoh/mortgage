"use client"
import ModalDelete from './ModalDelete';
import { useEffect, useState } from "react";
import Image from "next/image";


interface CallStatus {
  id: number;
  status: string;
}

export default function StatusCallTable() {
  const [data, setData] = useState<CallStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [id, setId] = useState("");
  const [status, setStatus] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusCallToDelete, setStatusCallToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    fetch("/api/status_call")
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleAddStatus = () => {
    if (!id || !status) return;

    const newStatus: CallStatus = { id: Number(id), status };

    fetch("/api/status_call", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newStatus),
    })
      .then((res) => res.json())
      .then(() => {
        setData((prev) => [...prev, newStatus]);
        setId("");
        setStatus("");
      })
      .catch((err) => console.error("Error adding status:", err));
  };

  // פונקציות למחיקה
  const handleDelete = (id: string) => {
    setStatusCallToDelete(id);
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    if (statusCallToDelete === null) return;

    const res = await fetch(`/api/status_call/${statusCallToDelete}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      setData(data.filter((item) => String(item.id) !== statusCallToDelete));
      
    } else {
      alert('לא הצליח למחוק');
    }

    setIsModalOpen(false);
  };
  const cancelDelete = () => {
    setIsModalOpen(false);
    setStatusCallToDelete(null);
  };




  const handleEdit = (id: number, newStatus: string) => {
    fetch(`/api/status_call/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: newStatus }),
    })
      .then(() => {
        setData((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
        );
      })
      .catch((err) => console.error("Error updating status:", err));
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4 text-center">סטטוס שיחות</h2>
      <div className="grid grid-cols-3 gap-2 mb-4 w-full">
        <input
          type="number"
          placeholder="ID"
          value={id}
          onChange={(e) => setId(e.target.value)}
          className="border px-4 py-2 text-center w-full"
        />
        <input
          type="text"
          placeholder="סטטוס"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border px-4 py-2 text-center w-full"
        />
        <button
          onClick={handleAddStatus}
          className="bg-green-500 text-white px-4 py-2 rounded w-full"
        >
          הוסף
        </button>
      </div>

      {loading ? (
        <p className="text-center">טוען נתונים...</p>
      ) : (
        <table className="w-full border border-collapse border-gray-300">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-gray-300 px-8 py-2">ID</th>
              <th className="border border-gray-300 px-28 py-2">סטטוס</th>
              <th className="border border-gray-300 px-6 py-2">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.id} className="text-center">
                <td className="border border-gray-300 px-8 py-2">{item.id}</td>
                <td className="border border-gray-300 px-28 py-2 whitespace-nowrap overflow-hidden">{item.status}</td>
                <td className="border border-gray-300  flex justify-center gap-2">
                  <button
                    onClick={() => handleEdit(item.id, prompt("ערוך סטטוס:", item.status) || item.status)}
                    className="bg-blue-500 text-white px-2 py-1 rounded"
                  >
                  <Image
                    src="/assets/images/svg/pen.svg"
                    alt="trash"
                    width={25}
                    height={25}
                    className="rounded-xl mx-auto"
                  />
                  </button>
                  <button
                   onClick={() => handleDelete(String(item.id))}
                    className="bg-red-500 text-white px-2 py-1 rounded"
                  >
                   <Image
                        src="/assets/images/svg/trash.svg"
                        alt="trash"
                        width={25}
                        height={25}
                        className="rounded-xl mx-auto"
                  />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <ModalDelete
        isOpen={isModalOpen}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
      />

    </div>
  );
}


// "use client"
// import ModalDelete from './ModalDelete';
// import { useEffect, useState } from "react";
// import Image from "next/image";


// interface CallStatus {
//   id: number;
//   status: string;
// }

// export default function StatusCallTable() {
//   const [data, setData] = useState<CallStatus[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [id, setId] = useState("");
//   const [status, setStatus] = useState("");
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [statusCallToDelete, setStatusCallToDelete] = useState<string | null>(null);

//   useEffect(() => {
//     fetchData();
//   }, []);

//   const fetchData = () => {
//     fetch("/api/status_call")
//       .then((res) => res.json())
//       .then((data) => {
//         setData(data);
//         setLoading(false);
//       })
//       .catch(() => setLoading(false));
//   };

//   const handleAddStatus = () => {
//     if (!id || !status) return;

//     const newStatus: CallStatus = { id: Number(id), status };

//     fetch("/api/status_call", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(newStatus),
//     })
//       .then((res) => res.json())
//       .then(() => {
//         setData((prev) => [...prev, newStatus]);
//         setId("");
//         setStatus("");
//       })
//       .catch((err) => console.error("Error adding status:", err));
//   };

  
//   const handleDelete = (id: string) => {
//     setStatusCallToDelete(id);
//     setIsModalOpen(true);
//   };

//   const confirmDelete = async () => {
//     if (statusCallToDelete === null) return;

//     const res = await fetch(`/api/status_call/${statusCallToDelete}`, {
//       method: 'DELETE',
//     });

//     if (res.ok) {
//       setData(data.filter((item) => String(item.id) !== statusCallToDelete));
      
//     } else {
//       alert('לא הצליח למחוק');
//     }

//     setIsModalOpen(false);
//   };
//   const cancelDelete = () => {
//     setIsModalOpen(false);
//     setStatusCallToDelete(null);
//   };

//   const handleEdit = (id: number, newStatus: string) => {
//     fetch(`/api/status_call/${id}`, {
//       method: "PUT",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({ status: newStatus }),
//     })
//       .then(() => {
//         setData((prev) =>
//           prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
//         );
//       })
//       .catch((err) => console.error("Error updating status:", err));
//   };

//   return (
//     <div className="p-4 max-w-md mx-auto">
//       <h2 className="text-xl font-bold mb-4 text-center">סטטוס שיחות</h2>
//       <div className="grid grid-cols-3 gap-2 mb-4 w-full">
//         <input
//           type="number"
//           placeholder="ID"
//           value={id}
//           onChange={(e) => setId(e.target.value)}
//           className="border px-8 py-2 text-center"
//         />
//         <input
//           type="text"
//           placeholder="סטטוס"
//           value={status}
//           onChange={(e) => setStatus(e.target.value)}
//           className="border px-28 py-2 text-center whitespace-nowrap overflow-hidden"
//         />
//         <button
//           onClick={handleAddStatus}
//           className="bg-green-500 text-white px-6 py-2 rounded"
//         >
//           הוסף
//         </button>
//       </div>
//       {loading ? (
//         <p className="text-center">טוען נתונים...</p>
//       ) : (
//         <table className="w-full border border-collapse border-gray-300">
//           <thead>
//             <tr className="bg-gray-200">
//               <th className="border border-gray-300 px-8 py-2">ID</th>
//               <th className="border border-gray-300 px-28 py-2">סטטוס</th>
//               <th className="border border-gray-300 px-6 py-2">פעולות</th>
//             </tr>
//           </thead>
//           <tbody>
//             {data.map((item) => (
//               <tr key={item.id} className="text-center">
//                 <td className="border border-gray-300 px-8 py-2">{item.id}</td>
//                 <td className="border border-gray-300 px-28 py-2 whitespace-nowrap overflow-hidden">{item.status}</td>
//                 <td className="border border-gray-300  flex justify-center gap-2">
//                   <button
//                     onClick={() => handleEdit(item.id, prompt("ערוך סטטוס:", item.status) || item.status)}
//                     className="bg-blue-500 text-white px-2 py-1 rounded"
//                   >
//                   <Image
//                     src="/assets/images/svg/pen.svg"
//                     alt="trash"
//                     width={25}
//                     height={25}
//                     className="rounded-xl mx-auto"
//                   />
//                   </button>
//                   <button
//                    onClick={() => handleDelete(String(item.id))}
//                     className="bg-red-500 text-white px-2 py-1 rounded"
//                   >
//                    <Image
//                         src="/assets/images/svg/trash.svg"
//                         alt="trash"
//                         width={25}
//                         height={25}
//                         className="rounded-xl mx-auto"
//                   />
//                   </button>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       )}
//       <ModalDelete
//         isOpen={isModalOpen}
//         onClose={cancelDelete}
//         onConfirm={confirmDelete}
//       />

//     </div>
//   );
// }

"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import ModalDelete from './ModalDelete';
import Image from "next/image";


const RolesTable = () => {
  const [roles, setRoles] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<number | null>(null);

  useEffect(() => {
    const fetchRoles = async () => {
      const res = await fetch('/api/roles');
      const data = await res.json();
      setRoles(data);
    };
    fetchRoles();
  }, []);

  const handleEdit = (id: number) => {
    alert(`Editing role with id: ${id}`);
  };

  const handleDelete = (id: number) => {
    setRoleToDelete(id);
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    if (roleToDelete === null) return;

    const res = await fetch(`/api/roles/${roleToDelete}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      setRoles(roles.filter((role) => role.id !== roleToDelete));
    } else {
      alert('לא הצליח למחוק');
    }

    setIsModalOpen(false);
  };

  const cancelDelete = () => {
    setIsModalOpen(false);
    setRoleToDelete(null);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between mb-4">
        <h2 className="text-2xl font-semibold">טבלת רמות הרשאה/ תפקידים</h2>
        <Link
          href="/private/admin/premissions/add"
          className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition"
        >
          הוסף רמת הרשאה
        </Link>
      </div>

               <Image
                src="/assets/images/svg/trash.svg"
                alt="trash"
                width={25}
                height={25}
                className="rounded-xl mx-auto"
              />

      <div className="overflow-x-auto max-w-screen-sm mx-auto">
        <table className="min-w-full table-auto border-collapse border border-gray-300 rounded-lg shadow-md">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-3 text-left text-lg font-bold text-gray-700 border-b border-gray-300">ID</th>
              <th className="px-4 py-3 text-left text-lg font-bold text-gray-700 border-b border-gray-300">Role</th>
              <th className="px-4 py-3 text-left text-lg font-bold text-gray-700 border-b border-gray-300">Comment</th>
              <th className="px-4 py-3 text-left text-lg font-bold text-gray-700 border-b border-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-sm text-gray-700 border-r border-b border-gray-300">{role.id}</td>
                <td className="px-4 py-2 text-sm text-gray-700 border-r border-b border-gray-300">{role.role}</td>
                <td className="px-4 py-2 text-sm text-gray-700 border-r border-b border-gray-300">{role.comment}</td>
                <td className="px-4 py-2 text-sm border-b border-gray-300">
                  <button
                    onClick={() => handleEdit(role.id)}
                    className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 mr-2 transition"
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
                    onClick={() => handleDelete(role.id)}
                    className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition"
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
      </div>

      {/* Modal Component */}
      <ModalDelete
        isOpen={isModalOpen}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default RolesTable;


// "use client";
// import { useEffect, useState } from 'react';
// import Link from 'next/link';
// import ModalDelete from './ModalDelete'; // ייבוא של הקומפוננטה Modal

// const RolesTable = () => {
//   const [roles, setRoles] = useState<any[]>([]);
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [roleToDelete, setRoleToDelete] = useState<number | null>(null);

//   useEffect(() => {
//     const fetchRoles = async () => {
//       const res = await fetch('/api/roles');
//       const data = await res.json();
//       setRoles(data);
//     };
//     fetchRoles();
//   }, []);

//   const handleEdit = (id: number) => {
//     // פונקציה לעריכה
//     alert(`Editing role with id: ${id}`);
//   };

//   const handleDelete = (id: number) => {
//     setRoleToDelete(id);
//     setIsModalOpen(true);
//   };

//   const confirmDelete = async () => {
//     if (roleToDelete === null) return;

//     const res = await fetch(`/api/roles/${roleToDelete}`, {
//       method: 'DELETE',
//     });

//     if (res.ok) {
      
//       setRoles(roles.filter((role) => role.id !== roleToDelete));
//     } else {
//       alert('לא הצליח למחוק');
//     }

//     setIsModalOpen(false);
//   };

//   const cancelDelete = () => {
//     setIsModalOpen(false);
//     setRoleToDelete(null);
//   };

//   return (
//     <div className="container mx-auto p-4">
//       <div className="flex justify-between mb-4">
//         <h2 className="text-2xl font-semibold">טבלת רמות הרשאה/ תפקידים</h2>
//         <Link
//           href="/private/admin/premissions/add"
//           className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition"
//         >
//           הוסף רמת הרשאה
//         </Link>
//       </div>

//       <table className="min-w-full table-auto border-collapse border border-gray-300 rounded-lg shadow-md">
//         <thead>
//           <tr className="bg-gray-100">
//             <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">ID</th>
//             <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Role</th>
//             <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Comment</th>
//             <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Actions</th>
//           </tr>
//         </thead>
//         <tbody>
//           {roles.map((role) => (
//             <tr key={role.id} className="border-b border-gray-200 hover:bg-gray-50">
//               <td className="px-4 py-2 text-sm text-gray-700">{role.id}</td>
//               <td className="px-4 py-2 text-sm text-gray-700">{role.role}</td>
//               <td className="px-4 py-2 text-sm text-gray-700">{role.comment}</td>
//               <td className="px-4 py-2 text-sm">
//                 <button
//                   onClick={() => handleEdit(role.id)}
//                   className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 mr-2 transition"
//                 >
//                   Edit
//                 </button>
//                 <button
//                   onClick={() => handleDelete(role.id)}
//                   className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition"
//                 >
//                   Delete
//                 </button>
//               </td>
//             </tr>
//           ))}
//         </tbody>
//       </table>

//       {/* Modal Component */}
//       <ModalDelete
//         isOpen={isModalOpen}
//         onClose={cancelDelete}
//         onConfirm={confirmDelete}
//       />
//     </div>
//   );
// };

// export default RolesTable;

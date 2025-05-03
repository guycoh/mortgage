"use client"
import { useEffect, useState } from "react";
import Image from "next/image";
import ModalDelete from './ModalDelete';

interface User {
  id: string;
  name: string;
  email: string;
  role_id: number;
}

export default function UsersTable() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);


  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await fetch("/api/users");
        if (!response.ok) {
          throw new Error("Failed to fetch users");
        }
        const data: User[] = await response.json();
        setUsers(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, []);

  const handleAddUser = () => {
    alert("Add user functionality to be implemented");
  };

  const handleEditUser = (id: string) => {
    alert(`Edit user with ID: ${id}`);
  };

  
  const handleDeleteUser = (id: string) => {
    setUserToDelete(id);
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    if (userToDelete === null) return;

    const res = await fetch(`/api/users/${userToDelete}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      setUsers(users.filter((user) => user.id !== userToDelete));
    } else {
      alert('לא הצליח למחוק');
    }

    setIsModalOpen(false);
  };

  const cancelDelete = () => {
    setIsModalOpen(false);
    setUserToDelete(null);
  };









  if (loading) return <p className="text-center p-4">Loading...</p>;
  if (error) return <p className="text-center p-4 text-red-500">Error: {error}</p>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">משתמשים</h2>
        <button 
          className="bg-green-500 text-white px-4 py-2 rounded-lg shadow hover:bg-green-600"
          onClick={handleAddUser}
        >
          + Add User
        </button>
      </div>
      <div className="overflow-x-auto rounded-lg shadow-lg">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="px-6 py-3 text-left">ID</th>
              <th className="px-6 py-3 text-left">שם</th>
              <th className="px-6 py-3 text-left">מייל</th>
              <th className="px-6 py-3 text-left">הרשאה</th>
              <th className="px-6 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-3">{user.id}</td>
                <td className="px-6 py-3">{user.name}</td>
                <td className="px-6 py-3">{user.email}</td>
                <td className="px-6 py-3">{user.role_id}</td>
                <td className="px-6 py-3 flex justify-center gap-2">
                  <button 
                    className="bg-blue-500 text-white px-3 py-2 rounded-lg shadow hover:bg-blue-600"
                    onClick={() => handleEditUser(user.id)}
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
                    className="bg-red-500 text-white px-3 py-2 rounded-lg shadow hover:bg-red-600"
                    onClick={() => handleDeleteUser(user.id)}
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
}


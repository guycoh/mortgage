"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation"; // Use useParams to access dynamic segments

type User = {
  id: string;
  email: string;
  role_id: number;
  name: string;
};

const roles = {
  1: "Admin",
  2: "Editor",
  3: "Viewer", // Example roles
};

export default function UserCard() {
  const { id } = useParams(); // Get the dynamic parameter 'id'
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    fetch(`/api/users/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch user");
        return res.json();
      })
      .then((data) => {
        setUser(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <p className="text-center text-gray-500">טוען...</p>;
  if (error) return <p className="text-center text-red-500">{`שגיאה: ${error}`}</p>;
  if (!user) return <p className="text-center text-red-500">המשתמש לא נמצא</p>;

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl shadow-xl">
      <h2 className="text-2xl font-bold mb-4 text-center">כרטיס משתמש</h2>
      <div className="space-y-4">
        <div className="flex flex-col">
          <label className="font-semibold">מזהה</label>
          <input className="bg-white text-gray-800 p-2 rounded-md" value={user.id} disabled />
        </div>
        <div className="flex flex-col">
          <label className="font-semibold">שם</label>
          <input className="bg-white text-gray-800 p-2 rounded-md" value={user.name} disabled />
        </div>
        <div className="flex flex-col">
          <label className="font-semibold">אימייל</label>
          <input className="bg-white text-gray-800 p-2 rounded-md" value={user.email} disabled />
        </div>
        <div className="flex flex-col">
          <label className="font-semibold">תפקיד</label>
          <input
            className="bg-white text-gray-800 p-2 rounded-md"
            value={roles[user.role_id as keyof typeof roles] || 'לא ידוע'}
            disabled
          />
        </div>
        <button className="w-full mt-4 bg-white text-indigo-600 font-bold py-2 rounded-md hover:bg-gray-200 transition">ערוך משתמש</button>
      </div>
    </div>
  );
}

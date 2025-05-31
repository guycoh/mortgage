'use client';

import { useUser } from "@/app/context/UserContext";


export default function UserRoleInfo() {
  const { role, isLoading } = useUser();

  if (isLoading) {
    return <p>טוען מידע...</p>;
  }

  if (!role) {
    return <p>לא מחובר</p>;
  }

  return (
    <div className="text-sm p-4 bg-gray-100 rounded-lg">
      <p>הרשאה נוכחית: <strong>{role}</strong></p>

      {role === 'admin' && (
        <p className="text-green-600">יש לך גישת ניהול מלאה.</p>
      )}

      {role === 'modifier' && (
        <p className="text-blue-600">יש לך הרשאת עריכה.</p>
      )}

      {role === 'user' && (
        <p className="text-gray-700">אתה משתמש רגיל.</p>
      )}
    </div>
  );
}

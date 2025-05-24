"use client"
import { useEffect, useState } from 'react';

type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  created_at: string;
  address: string | null;
  city: string | null;
};

type EditUserModalProps = {
  profile: Profile | null;
  onClose: () => void;
  onSave: (updatedProfile: Profile) => void;
};



export function EditUserModal({ profile, onClose, onSave }: EditUserModalProps) {
  const [formData, setFormData] = useState<Profile>(
    profile || {
      id: '',
      full_name: '',
      email: '',
      phone: '',
      role: 'user',
      created_at: new Date().toISOString(),
      address: '',
      city: '',
    }
  );












  if (!profile) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

 // הוסף את זה בתוך ה-modal במקום הפונקציה onSubmit הנוכחית
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  const res = await fetch(`/api/profiles/${formData.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });

  if (res.ok) {
    const updated = await res.json();
    onSave(updated); // שולח את הפרופיל המעודכן להורה
    onClose();       // סוגר את המודאל
  } else {
    alert('אירעה שגיאה בעת השמירה');
  }
};





  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-xl p-6 space-y-4">
        <h3 className="text-xl font-bold text-gray-800">✏️ עריכת משתמש</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            placeholder="שם מלא"
            required
            className="w-full border border-gray-300 px-4 py-2 rounded"
          />
          <input
            name="email"
            value={formData.email}
            onChange={handleChange}
            type="email"
            placeholder="אימייל"
            required
            className="w-full border border-gray-300 px-4 py-2 rounded"
          />
          <input
            name="phone"
            value={formData.phone || ''}
            onChange={handleChange}
            placeholder="טלפון"
            className="w-full border border-gray-300 px-4 py-2 rounded"
          />
          <input
            name="address"
            value={formData.address || ''}
            onChange={handleChange}
            placeholder="כתובת"
            className="w-full border border-gray-300 px-4 py-2 rounded"
          />
          <input
            name="city"
            value={formData.city || ''}
            onChange={handleChange}
            placeholder="עיר"
            className="w-full border border-gray-300 px-4 py-2 rounded"
          />
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full border border-gray-300 px-4 py-2 rounded"
          >
            <option value="user">user</option>
            <option value="modifier">modifier</option>
            <option value="admin">admin</option>
          </select>

          <div className="text-sm text-gray-500">
            נוצר בתאריך: {new Date(formData.created_at).toLocaleString('he-IL')}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
            >
              ביטול
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-blue-500 hover:bg-blue-600 text-white"
            >
              שמור שינויים
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

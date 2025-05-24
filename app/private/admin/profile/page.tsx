'use client';

import { useEffect, useState } from 'react';
import { EditUserModal } from './EditUserModal'; // תוודא שזה הנתיב הנכון


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

type SortField = 'full_name' | 'email' | 'created_at';
type SortOrder = 'asc' | 'desc';

export default function ProfileTable() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);



  useEffect(() => {
    fetch('/api/profiles')
      .then((res) => res.json())
      .then((data) => setProfiles(data));
  }, []);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filtered = profiles.filter((profile) => {
    const q = search.toLowerCase();
    return (
      profile.full_name.toLowerCase().includes(q) ||
      profile.email.toLowerCase().includes(q) ||
      (profile.phone ?? '').includes(q)
    );
  });

  const sortedProfiles = [...filtered].sort((a, b) => {
    const aValue = a[sortField] ?? '';
    const bValue = b[sortField] ?? '';
    if (sortField === 'created_at') {
      return sortOrder === 'asc'
        ? new Date(aValue).getTime() - new Date(bValue).getTime()
        : new Date(bValue).getTime() - new Date(aValue).getTime();
    }
    return sortOrder === 'asc'
      ? String(aValue).localeCompare(String(bValue))
      : String(bValue).localeCompare(String(aValue));
  });



const handleSave = (updatedProfile: Profile) => {
  setProfiles(prev =>
    prev.map(profile =>
      profile.id === updatedProfile.id ? updatedProfile : profile
    )
  );
};


  return (
    <div className="overflow-x-auto w-full p-4">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">🧑‍💻 טבלת משתמשים</h2>

      <div className="relative mb-4 w-full max-w-md">
        <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500">
          🔍
        </span>
        <input
          type="text"
          placeholder="חפש לפי שם, אימייל או טלפון..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-300 pl-4 pr-10 py-2 rounded-md text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
      </div>

      <table className="min-w-full text-base text-left rtl:text-right border border-gray-300">
        <thead className="text-white bg-gray-800 text-sm md:text-base">
          <tr>
            <th
              className="px-4 py-3 border border-gray-300 cursor-pointer hover:underline"
              onClick={() => handleSort('full_name')}
            >
              שם מלא {sortField === 'full_name' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
            </th>
            <th
              className="px-4 py-3 border border-gray-300 cursor-pointer hover:underline"
              onClick={() => handleSort('email')}
            >
              אימייל {sortField === 'email' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
            </th>
            <th className="px-4 py-3 border border-gray-300">טלפון</th>
            <th className="px-4 py-3 border border-gray-300">תפקיד</th>
            <th
              className="px-4 py-3 border border-gray-300 cursor-pointer hover:underline"
              onClick={() => handleSort('created_at')}
            >
              נוצר בתאריך {sortField === 'created_at' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
            </th>
            <th className="px-4 py-3 border border-gray-300 text-center">פעולות</th>
          </tr>
        </thead>
        <tbody className="text-base md:text-lg">
          {sortedProfiles.map((profile) => (
            <tr key={profile.id} className="border-t border-gray-300">
              <td className="px-4 py-3 border border-gray-300 whitespace-nowrap truncate max-w-[200px]">
                {profile.full_name}
              </td>
              <td className="px-4 py-3 border border-gray-300 whitespace-nowrap truncate max-w-[250px]">
                {profile.email}
              </td>
              <td className="px-4 py-3 border border-gray-300 whitespace-nowrap">
                {profile.phone || '-'}
              </td>
              <td className="px-4 py-3 border border-gray-300 capitalize">
                {profile.role}
              </td>
              <td className="px-4 py-3 border border-gray-300">
                {new Date(profile.created_at).toLocaleDateString('he-IL')}
              </td>
              <td className="px-4 py-3 border border-gray-300 text-center">
                <div className="flex justify-center gap-3 flex-wrap">
                  <button
                  onClick={() => setEditingProfile(profile)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 text-sm rounded"
                >
                  ערוך
                </button>
                  <button className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 text-sm rounded">
                    מחק
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editingProfile && (
        <EditUserModal
          profile={editingProfile}
          onClose={() => setEditingProfile(null)}
          onSave={handleSave}
        />        
      )}




    </div>
  );
}

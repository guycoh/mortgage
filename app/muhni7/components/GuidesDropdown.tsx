// components/GuidesDropdown.tsx
'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function GuidesDropdown() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block text-right">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg shadow flex items-center gap-2 transition"
      >
        <span>מדריכים</span>
        <span
          className={`transform transition-transform duration-300 ${
            isOpen ? 'rotate-180' : 'rotate-0'
          }`}
        >
          ▼
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10 animate-fade-slide-down">
          <Link
            href="/muhni7/guide"
            className="block px-4 py-3 text-right text-gray-700 hover:bg-orange-100 transition"
            onClick={() => setIsOpen(false)}
          >
            מדריך לקיחת משכנתא
          </Link>
          <Link
            href="/muhni7/bb"
            className="block px-4 py-3 text-right text-gray-700 hover:bg-orange-100 transition"
            onClick={() => setIsOpen(false)}
          >
            מדריך הוצאת דוח יתרות לסילוק
          </Link>
        </div>
      )}
    </div>
  );
}

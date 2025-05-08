'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

export default function DropdownMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-right" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition"
      >
        הודעות ווצאפ ▼
      </button>

      {isOpen && (
        <ul className="absolute right-0 mt-2 w-52 bg-white border rounded shadow-lg z-10 text-right">
          <li>
            <Link href="/mortgage-calculator" className="block px-4 py-2 hover:bg-orange-50">
             דוח יתרות לסילוק
            </Link>
          </li>
          <li>
            <Link href="/eligibility" className="block px-4 py-2 hover:bg-orange-50">
            כרטיס ביקור
            </Link>
          </li>
          <li>
            <Link href="/refinance" className="block px-4 py-2 hover:bg-orange-50">
            תאום פגישה
            </Link>
          </li>
          <li>
            <Link href="/refinance" className="block px-4 py-2 hover:bg-orange-50">
          תזכורת פגישה 
            </Link>
          </li>
        
        
        
        </ul>
      )}
    </div>
  );
}

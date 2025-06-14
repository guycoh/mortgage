// components/LeadDropdown.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function LeadDropdown() {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative inline-block text-right text-lg">
      <button
        onClick={() => setOpen(!open)}
        className="px-4 py-2 text-white  transition"
      >
        לידים
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
        <Link
            href="/private/crm/leads/add"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => setOpen(false)}
          >
           ליד חדש
          </Link>
        
          <Link
            href="/private/crm/leads"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => setOpen(false)}
          >
            כל הלידים
          </Link>
          <Link
            href="/leads/mine"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => setOpen(false)}
          >
            לידים בטיפולי
          </Link>
        </div>
      )}
    </div>
  )
}

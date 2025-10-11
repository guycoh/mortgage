"use client"

import Link from 'next/link'
import { useState } from 'react'
import UserInfo from "./logoutButton"

export default function SideMenu({ triggerButton }: { triggerButton: (onClick: () => void, isOpen: boolean) => React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* כפתור פתיחה – נשלח כ־prop */}
      {triggerButton(setIsOpen.bind(null, true), isOpen)}

      {/* רקע כהה */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* תפריט צד מימין */}
      <aside
        className={`fixed top-4 right-0 z-50 h-full bg-white w-72 max-w-full shadow-md p-6 transform transition-transform duration-300 ease-in-out 
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* כפתור סגירה */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 left-4 text-gray-500 hover:text-[#1d75a1] text-5xl"
          aria-label="סגור תפריט"
        >
          &times;
        </button>

        {/* קישורים */}
        <ul className="space-y-4 mt-12 text-right">
          {[
            ['בית', '/home'],
            ['אודות', '/home/about'],
            ['מחשבונים', '/home/calculators'],
            ['מושגים במשכנתא', '/home/concepts'],
            ['צור קשר', '/home/contact'],
          ].map(([text, href]) => (
            <li key={href}>
              <Link
                href={href}
                onClick={() => setIsOpen(false)}
                className="block text-gray-500 hover:text-[#007bff] font-bold text-[20px]"
              >
                {text}
              </Link>
            </li>
          ))}
        </ul>

        <ul className="space-y-4 mt-12 text-right">

            <li >
                  <Link
                    href="/home/schedule"                
                    className="block text-[#1d75a1] hover:text-[#007bff] font-bold text-[20px]"             
                    onClick={() => setIsOpen(false)}
                    >
                  
                   קביעת זום
                  </Link>
            </li>
            
            
            <li >
            <UserInfo />

            </li>
           
      
            <li >
              <Link
                href="/private/crm"                
                className="block text-[#1d75a1] hover:text-[#007bff] font-bold text-[20px]"
                onClick={() => setIsOpen(false)}
                >
               CRM
              </Link>
            </li>
            <li >
              <Link
                href="/private/admin"                
                className="block text-[#1d75a1] hover:text-[#007bff] font-bold text-[20px]"
                onClick={() => setIsOpen(false)}
                >
              ADMIN
              </Link>
            </li>

         
        </ul>

      </aside>
    </>
  )
}



















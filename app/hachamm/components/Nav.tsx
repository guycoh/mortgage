

import React from 'react';
import Image from 'next/image';

export default function Navbar() {
  return (
    <header className="w-full">
      <nav className="w-full h-24 bg-[#F9F8F3] shadow-sm flex items-center justify-between px-4">
        
        {/* אזור הלוגו */}
        <div className="flex items-center">
          <Image 
            src="/hachamm/logo.svg" 
            alt="לוגו חכם - חיסכון כספי במשכנתא" 
            width={160} // ניתן לשנות את הרוחב בהתאם לצורך
            height={60} // ניתן לשנות את הגובה בהתאם לצורך
            className="object-contain cursor-pointer"
            priority // טוען את הלוגו מהר יותר כי זה חלק מה-Header
          />
        </div>

        {/* אזור שמאלי (כפתורים / תפריט) */}
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm">כאן ייכנסו הכפתורים...</span>
        </div>

      </nav>
    </header>
  );
}
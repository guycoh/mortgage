
"use client"
import Image from 'next/image';

export default function Navbar() {
  return (
    <header className="w-full">
      <nav className="w-full h-24 bg-[#F9F8F3] shadow-sm flex items-center justify-between px-4">
        
        {/* אזור ימני (כפתורים / תפריט) */}
        <div className="flex items-center gap-4">
          {/* הכפתורים ייכנסו כאן בעתיד */}
        </div>

        {/* אזור הלוגו (יופיע בצד שמאל בגלל ה-justify-between והסדר בקוד) */}
        <div className="flex items-center">
          <Image 
            src="/hachamm/logo.svg" 
            alt="לוגו חכם - חיסכון כספי במשכנתא" 
            width={160} 
            height={60} 
            className="object-contain cursor-pointer"
            priority 
          />
        </div>

      </nav>
    </header>
  );
}
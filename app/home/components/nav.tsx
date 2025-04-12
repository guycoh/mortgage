"use client"
import Link from "next/link"

export const Nav = ({ onOpenMenu, isMenuOpen }: { onOpenMenu: () => void, isMenuOpen: boolean }) => {
  return (
    <div>
      <header className="shadow-md font-sans tracking-wide relative z-50">

        {/* פס עליון */}
        <section className="py-2 bg-[#1d75a1] text-[#e5e4e3] text-right px-10">
          <p className="text-sm">
            <strong className="mx-3">מורגי - המרכז הישראלי למשכנתא ופיננסים</strong>
          </p>
        </section>

        {/* אזור תפריט */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-10 py-4 bg-[#e5e4e3] min-h-[70px] relative">

          {/* כפתור המבורגר */}
          <button
            onClick={onOpenMenu}
            className={`md:hidden absolute top-4 right-4 z-[60] bg-white rounded-full p-4 shadow-md transition-all duration-200
              ${isMenuOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}
            `}
            aria-label="פתח תפריט"
          >
            <div className="space-y-1">
              <span className="block w-6 h-0.5 bg-[#1d75a1]"></span>
              <span className="block w-6 h-0.5 bg-[#1d75a1]"></span>
              <span className="block w-6 h-0.5 bg-[#1d75a1]"></span>
            </div>
          </button>

          {/* תפריט ניווט */}
          <div className="max-lg:hidden lg:!block">
            <ul className="flex gap-x-6">
              <li><Link href="/home" className="text-[#1d75a1] font-bold text-[15px]">בית</Link></li>
              <li><Link href="/home/about" className="text-[#1d75a1] font-bold text-[15px]">אודות</Link></li>
              <li><Link href="/home/calculators" className="text-[#1d75a1] font-bold text-[15px]">מחשבונים</Link></li>
              <li><Link href="/home/concepts" className="text-[#1d75a1] font-bold text-[15px]">מושגים במשכנתא</Link></li>
              <li><Link href="/home/contact" className="text-[#1d75a1] font-bold text-[15px]">צור קשר</Link></li>
              <li>
                <Link href="/home/schedule" className="text-white bg-[#1d75a1] rounded-lg text-sm px-5 py-2.5">קבע פגישה</Link>
              </li>
              <li>
                <Link href="/login" className="text-white bg-[#1d75a1] rounded-lg text-sm px-5 py-2.5">אזור אישי</Link>
              </li>
              <li>
                <Link href="/signup" className="text-white bg-[#1d75a1] rounded-lg text-sm px-5 py-2.5">הרשמה</Link>
              </li>
            </ul>
          </div>
        </div>
      </header>
    </div>
  )
}









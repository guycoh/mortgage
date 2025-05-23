"use client"
import Link from "next/link"
import UserInfo from "./logoutButton"
import Image from "next/image";
import GuidesDropdown from "./GuidesDropdown";

export const Nav = ({ onOpenMenu, isMenuOpen }: { onOpenMenu: () => void, isMenuOpen: boolean }) => {
  return (
    <div>
      <header className="shadow-md font-sans tracking-wide relative z-50">

       {/* פס עליון */}
        <section className="py-2 bg-main text-white px-10 flex justify-center items-center">
          <p className="text-sm text-center">
            <strong >משה מוסיוב-יועץ המשכנתא שלך 050-2453345</strong>
          
          </p>
        </section>

        {/* אזור תפריט */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-10 py-4 bg-white min-h-[70px] relative">

      <div className="absolute top-1 left-1 w-36 h-auto">
        <Link href="/muhni" >
            <Image
              src="/assets/images/svg/muhni_logo.svg"
              alt="Logo"
              width={224}
              height={90}
              className="object-contain"              
            />
        </Link>
      </div>
      <div className="max-lg:hidden lg:!block absolute top-4 left-52 w-auto h-auto   3">
      <UserInfo />
    
      </div>
      <div className="max-lg:hidden lg:!block absolute top-4 right-[480px] w-auto h-auto   3">
           <GuidesDropdown />    
      </div>
      <div className="max-lg:hidden lg:!block absolute top-5.2 left-[520px] w-auto h-auto   3">
           <Link href="/muhni7/schedule" className="text-white bg-main rounded-lg text-sm px-5 py-2.5">קבע פגישה</Link>
      </div>





     
          {/* כפתור המבורגר */}
          <button
            onClick={onOpenMenu}
            className={`md:hidden absolute top-4 right-4 z-[60] bg-white rounded-full p-4 shadow-md transition-all duration-200
              ${isMenuOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}
            `}
            aria-label="פתח תפריט"
          >
            <div className="space-y-1">
              <span className="block w-6 h-0.5 bg-main"></span>
              <span className="block w-6 h-0.5 bg-main"></span>
              <span className="block w-6 h-0.5 bg-main"></span>
            </div>
          </button>

          {/* תפריט ניווט */}
          <div className="max-lg:hidden lg:!block">
            <ul className="flex gap-x-6">
              <li><Link href="/muhni7" className="text-main font-bold text-[15px]">בית</Link></li>             
              <li><Link href="/muhni7/calculators" className="text-main font-bold text-[15px]">מחשבונים</Link></li>
              <li><Link href="/muhni7/concepts" className="text-main font-bold text-[15px]">מושגים במשכנתא</Link></li>
              <li><Link href="/muhni7/contact" className="text-main font-bold text-[15px]">צור קשר</Link></li>
             <li><Link href="/muhni7/about" className="text-main font-bold text-[15px]">אודות</Link></li>
              
            
            
            </ul>
          </div>
        </div>
      </header>
    </div>
  )
}









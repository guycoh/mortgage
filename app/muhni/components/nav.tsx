"use client"
import Link from "next/link"
import UserInfo from "./logoutButton"
import Image from "next/image";
import GuidesDropdown from "./GuidesDropdown";
import { usePathname } from "next/navigation";


export const Nav = ({ onOpenMenu, isMenuOpen }: { onOpenMenu: () => void, isMenuOpen: boolean }) => {
  
   
  const pathname = usePathname();

  const links = [
    { href: "/muhni", label: "בית" },
    { href: "/muhni/calculators", label: "מחשבונים" },
    { href: "/muhni/concepts", label: "מושגים במשכנתא" },
    { href: "/muhni/contact", label: "צור קשר" },
    { href: "/muhni/about", label: "אודות" },
  ];
  
  
  
  return (
    <div>
        
      <header className="shadow-md font-sans tracking-wide relative z-50">
          {/* לוגו צמוד לשמאל בתוך ה-header */}
  <div className="absolute top-0.2 left-0 z-50">
    <Link href="/muhni">
      <Image
        src="/assets/images/imgFiles/prime.jpg"
        alt="Logo"
        width={105}
        height={42}
        className="object-contain"
      />
    </Link>
  </div>


       {/* פס עליון */}
        <section className="py-2 bg-white border-2 border-b-main text-main px-10 flex justify-center items-center">
          <p className="text-sm text-center">
            <strong className="mx-3">PRIME MORTGAGE </strong>
          </p>
        </section>

        {/* אזור תפריט */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-10 py-4 bg-white min-h-[70px] relative">

      {/* <div className="absolute top-1 left-1 w-36 h-auto">
        <Link href="/muhni" >            
            <Image
              src="/assets/images/imgFiles/prime.jpg"
              alt="Logo"
              width={112}
              height={45}
              className="object-contain"              
            />
        </Link>
      </div> */}
      <div className="max-lg:hidden lg:!block absolute top-4 left-52 w-auto h-auto   3">
         <UserInfo />
    
      </div>
      <div className="max-lg:hidden lg:!block absolute top-4 right-[500px] w-auto h-auto   3">
           <GuidesDropdown />    
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
              <ul className="flex gap-x-2">
                {links.map(({ href, label }) => {
                  const isActive =
                    href === "/muhni"
                      ? pathname === href
                      : pathname.startsWith(href);

                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        className={`
                          relative font-bold text-[15px] px-2 py-1 rounded-md transition-all duration-300
                          ${isActive
                            ? "bg-main text-white"
                            : "text-main hover:underline hover:underline-offset-4 hover:scale-105 hover:shadow-sm"
                          }
                        `}
                      >
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
        </div>

        </div>
      </header>
    </div>
  )
}





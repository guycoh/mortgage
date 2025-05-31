"use client"
import Link from "next/link"
import UserInfo from "./logoutButton"
import Image from "next/image";
import GuidesDropdown from "./GuidesDropdown";
import { usePathname } from "next/navigation";


export const Nav = ({ onOpenMenu, isMenuOpen }: { onOpenMenu: () => void, isMenuOpen: boolean }) => {

  const pathname = usePathname();


 const links = [
    { href: "/muhni7", label: "בית" },
    { href: "/muhni7/calculators", label: "מחשבונים" },
    { href: "/muhni7/concepts", label: "מושגים במשכנתא" },
    { href: "/muhni7/contact", label: "צור קשר" },
    { href: "/muhni7/about", label: "אודות" },
  ];







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
      <div className="max-lg:hidden lg:!block absolute top-4 right-[500px] w-auto h-auto   3">
           <GuidesDropdown />    
      </div>
     
     
      {/* <div className="max-lg:hidden lg:!block absolute top-5.2 left-[520px] w-auto h-auto   3">
           <Link href="/muhni7/schedule" className="text-white bg-main rounded-lg text-sm px-5 py-2.5">קבע פגישה</Link>
      </div> */}





     
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
                        href === "/muhni7"
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









"use client"
import Link from "next/link";


export const Footer = () => {
 
  return (
      <>
      <footer className="hidden md:block bg-[#0f3b52] text-white  font-sans pt-12 pb-8 px-12 tracking-wide relative overflow-hidden">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 text-white">
        {/* עמודה 1 */}
        <div>
          <h4 className="underline text-lg font-semibold mb-1">האתר</h4>
          <ul className="space-y-1">
            <li>
              <Link href="/home/about" className="hover:underline hover:font-bold transition duration-200">
                אודותינו
              </Link>
            </li>
            <li>
              <Link href="/home/calculators" className="hover:underline hover:font-bold transition duration-200">
                מחשבונים
              </Link>
            </li>
            <li>
              <Link href="/home/concepts" className="hover:underline hover:font-bold transition duration-200">
                מושגים במשכנתא
              </Link>
            </li>
          </ul>
        </div>
      
        {/* עמודה 2 */}
        <div>
          <h4 className="underline text-lg font-semibold mb-1">מיחזור משכנתא</h4>
          <ul className="space-y-1">
            <li>
              <Link href="/home/mortgage_refinancing" className="hover:underline hover:font-bold transition duration-200">
                מיחזור משכנתא
              </Link>
            </li>
            <li>
              <Link href="/home/bb" className="hover:underline hover:font-bold transition duration-200">
                מדריכים הוצאת דוח יתרות לסילוק
              </Link>
            </li>
          </ul>
        </div>
       {/* עמודה 3 */}
        <div>
          <h4 className="underline text-lg font-semibold mb-1">יצירת קשר</h4>
          <ul className="space-y-1">
            <li>
              <Link href="/home/contact" className="hover:underline hover:font-bold transition duration-200">
                טופס יצירת קשר
              </Link>
            </li>
            <li>
              <a href="tel:0503466591" className="hover:underline hover:font-bold transition duration-200">
                050-3466591
              </a>
            </li>
            <li>
              <a href="mailto:guy.c@primeinv.co.il" className="hover:underline hover:font-bold transition duration-200">
                guy.c@primeinv.co.il
              </a>
            </li>
          </ul>
        </div>

        {/* עמודה 4 */}
        {/* זכויות יוצרים */}
        <div className="text-xs text-gray-300 mt-4 md:mt-0">
          &copy; {new Date().getFullYear()} מורגי. כל הזכויות שמורות.
        </div>
      </div>
      
      
      
          </footer>

      
      </>     

  )
}


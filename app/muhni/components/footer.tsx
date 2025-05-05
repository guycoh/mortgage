import Link from "next/link";

export const Footer = () => {
  return (
    <footer className="bg-footer font-sans pt-12 pb-8 px-12 tracking-wide relative overflow-hidden">
      {/* הסתרה במסכים קטנים */}
      <div className="hidden md:block">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 text-white">
          
          {/* עמודה 1 */}
          <div>
            <h4 className="underline text-lg font-semibold mb-1">האתר</h4>
            <ul className="space-y-1">
              <li>
                <Link
                  href="/muhni/about"
                  className="hover:underline hover:font-bold transition duration-200"
                >
                  אודותינו
                </Link>
              </li>
              <li>
                <Link
                  href="/muhni/calculators"
                  className="hover:underline hover:font-bold transition duration-200"
                >
                מחשבונים 
                </Link>
              </li>

              <li>
                <Link
                  href="/muhni/concepts"
                  className="hover:underline hover:font-bold transition duration-200"
                >
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
                    <Link
                      href="/muhni/mortgage_refinancing"
                      className="hover:underline hover:font-bold transition duration-200"
                    >
                  מיחזור משכנתא
                    </Link>
                    </li>
                  
                    <li>
                        <Link
                          href="/muhni/bb"
                          className="hover:underline hover:font-bold transition duration-200"
                        >
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
                    <Link
                        href="/muhni/contact"
                        className="hover:underline hover:font-bold transition duration-200"
                      >
                        טופס יצירת קשר
                    </Link>
                    </li>
                  
                    <li>
                      <a
                        href="tel:0523684844"
                        className="hover:underline hover:font-bold transition duration-200"
                      >
                        052-3684844
                      </a>
                    </li>
                    <li>
                      <a
                        href="guycoh@outlook.co.il"
                        className="hover:underline hover:font-bold transition duration-200"                >
                        guycoh@outlook.co.il
                      </a>
                    </li> 
                </ul>        
                
          </div>
          {/* עמודה 4 */}
          <div>
          <h4 className="underline text-lg font-semibold mb-1">כתובת</h4>
            <ul className="space-y-1">
              <li>
                <a
                  href="https://www.google.com/maps/search/?api=1&query=הרצל+92,+רמלה"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline hover:font-bold transition duration-200"
                >
                  הרצל 92, רמלה
                </a>
              </li>
              <li>
                <a
                  href="https://www.google.com/maps/search/?api=1&query=שדרות+דוד+המלך+2,+לוד"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline hover:font-bold transition duration-200"
                >
                  שד' דוד המלך 2, לוד
                </a>
              </li>
              <li>
                <a
                  href="https://www.google.com/maps/search/?api=1&query=הלוחמים+1,+תל+אביב"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline hover:font-bold transition duration-200"
                >
                  הלוחמים 1, תל אביב
                </a>
              </li>
            </ul>
          
            <ul className="space-y-4 mt-4">
              <li>
              <Link
                  href="/private/crm"
                  className="w-32 border border-white px-4 py-2 rounded-lg hover:underline hover:font-bold transition duration-200 inline-block"
                >
                 CRM
               </Link>
              </li>
             
                <Link
                  href="/private/admin"
                  className="w-32 border border-white px-4 py-2 rounded-lg hover:underline hover:font-bold transition duration-200 inline-block"
                >
                 ADMIN
                </Link>
             
            </ul>
          </div>

        </div>
      </div>
    </footer>
  );
};













// import Link from "next/link";


// export const Footer = () => {
 
//   return (
//     <footer className="bg-footer font-sans pt-12 pb-8 px-12 tracking-wide relative overflow-hidden">
//     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
//       <div className="text-white">עמודה 1
//        <Link href="/about" className="text-white hover:text-orange-400 transition-colors duration-300">
//          אודותינו
//         </Link>
//         <Link href="/muhni/bb" className="text-white relative hover:underline underline-offset-4 decoration-orange-400 transition duration-300">
//           מדריך להוצאת דוח יתרות  
//         </Link>
//         <Link href="/blog" className="text-white border border-white px-4 py-2 rounded-lg hover:bg-white hover:text-footer transition duration-300">
//         בלוג
//       </Link>
          
//       </div>
//       <div>עמודה 2</div>
//       <div>עמודה 3</div>
//       <div>עמודה 4</div>
//     </div>
//   </footer>
//   )
// }


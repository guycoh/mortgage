import Link from "next/link";

export const Footer = () => {
  return (
    <footer className="bg-footer font-sans pt-12 pb-8 px-12 tracking-wide relative overflow-hidden">
      {/* הסתרה במסכים קטנים */}
      <div className="hidden md:block">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 text-white">
          
          {/* עמודה 1 */}
          <div>
            <h4 className="text-lg font-semibold mb-4">האתר</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/about"
                  className="hover:underline hover:font-bold transition duration-200"
                >
                  אודותינו
                </Link>
              </li>
              <li>
                <Link
                  href="/muhni/bb"
                  className="hover:underline hover:font-bold transition duration-200"
                >
                  מדריך להוצאת דוח יתרות
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="border border-white px-4 py-2 rounded-lg hover:underline hover:font-bold transition duration-200 inline-block"
                >
                  בלוג
                </Link>
              </li>
            </ul>
          </div>

          {/* עמודה 2 */}
          <div>
            <h4 className="text-lg font-semibold mb-4">מיחזור משכנתא</h4>
            <ul className="space-y-2">
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
                  href="/muhni/mortgage_refinancing"
                  className="hover:underline hover:font-bold transition duration-200"
                >
               מדריכים הוצאת דוח יתרות לסילוק
                </Link>
              </li>
            </ul>
          </div>

          {/* עמודה 3 */}
          <div>
            <h4 className="text-lg font-semibold mb-4">משאבים</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/guides"
                  className="hover:underline hover:font-bold transition duration-200"
                >
                  מדריכים
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="hover:underline hover:font-bold transition duration-200"
                >
                  שאלות נפוצות
                </Link>
              </li>
            </ul>
          </div>

          {/* עמודה 4 */}
          <div>
          <h4 className="text-lg font-semibold mb-4">כתובת</h4>
            <ul className="space-y-2">
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




            <h4 className="text-lg font-semibold mb-4">יצירת קשר</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/contact"
                  className="hover:underline hover:font-bold transition duration-200"
                >
                  טופס יצירת קשר
                </Link>
              </li>
              <li>
                <a
                  href="tel:0521234567"
                  className="hover:underline hover:font-bold transition duration-200"
                >
                  052-1234567
                </a>
              </li>
              <li>
                <a
                  href="mailto:info@example.com"
                  className="hover:underline hover:font-bold transition duration-200"
                >
                  info@example.com
                </a>
              </li>
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


"use client";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-[#e6f3f8] flex items-center justify-center p-6">
      <div className="max-w-5xl w-full bg-white/80 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Left: Illustration */}
        <div className="p-8 flex flex-col items-center justify-center gap-6 bg-gradient-to-tr from-[#e6f3f8] to-white">
          <ContactSVG className="w-56 h-56 md:w-72 md:h-72" />

          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800">בואו נדבר</h1>
            <p className="mt-2 text-sm text-gray-600">
              שלחו הודעה ונחזור אליכם במהירות עם פתרון מותאם
            </p>
          </div>

          <div className="mt-2 flex gap-3">
            <a
              href="tel:+972501234567"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg shadow-sm bg-white text-[#1d75a1] font-semibold hover:scale-105 transition"
            >
              <PhoneIcon className="w-5 h-5" />
              התקשרו עכשיו
            </a>
            <a
              href="mailto:hello@morgi.co.il"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg shadow-sm bg-[#1d75a1] text-white font-semibold hover:scale-105 transition"
            >
              <MailIcon className="w-5 h-5" />
              שלחו מייל
            </a>
          </div>
        </div>

        {/* Right: Contact details & form */}
        <div className="p-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-800">פרטי יצירת קשר</h2>
              <p className="text-sm text-gray-600 mt-1">
                מוזמנים ליצור קשר בכל שאלה — אנחנו כאן בשבילכם.
              </p>
            </div>
            <div className="text-right text-sm text-gray-500">
              זמני פעילות: א'-ה' 09:00-18:00
            </div>
          </div>

          {/* Contact form */}
          <form className="mt-6 grid grid-cols-1 gap-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                aria-label="שם"
                placeholder="שם מלא"
                className="px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1d75a1]/30"
              />
              <input
                aria-label="מייל"
                placeholder="מייל"
                className="px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1d75a1]/30"
              />
            </div>

            <input
              aria-label="טלפון"
              placeholder="טלפון"
              className="px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1d75a1]/30"
            />

            <textarea
              aria-label="הודעה"
              placeholder="איך נוכל לעזור?"
              rows={5}
              className="px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1d75a1]/30"
            />

            <div className="flex items-center justify-between gap-3">
              <button
                type="submit"
                className="flex-1 py-3 rounded-lg bg-[#1d75a1] text-white font-semibold shadow hover:brightness-105 transition"
              >
                שלחו הודעה
              </button>
              <a
                href="https://wa.me/972501234567"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-3 rounded-lg border border-gray-200 hover:border-[#1d75a1] hover:text-[#1d75a1] transition"
              >
                <WhatsAppIcon className="w-5 h-5" />
                דברו בווטסאפ
              </a>
            </div>
          </form>

          <p className="mt-4 text-xs text-gray-400">
            אנו מעריכים את פרטיותכם — לא נשתף את הפרטים שלכם עם צד שלישי.
          </p>
        </div>
      </div>
    </main>
  );
}

/* ---------- SVG components ---------- */
function ContactSVG({ className = "w-64 h-64" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 512"
      className={className}
      fill="none"
    >
      <rect
        x="0"
        y="0"
        width="640"
        height="512"
        rx="32"
        fill="url(#g)"
        opacity="0.06"
      />
      <g transform="translate(80 56)">
        <circle cx="200" cy="120" r="80" fill="#d4ecf6" />
        <path
          d="M120 240c0-44 88-44 120-44s120 0 120 44v8H120v-8z"
          fill="#F3F4F6"
        />
        <path
          d="M270 160c0 6-4 12-10 12s-10-6-10-12v-20c0-6 4-12 10-12s10 6 10 12v20z"
          fill="#a4d1e4"
        />
        <rect
          x="60"
          y="96"
          width="280"
          height="12"
          rx="6"
          fill="#a4d1e4"
          opacity="0.7"
          transform="rotate(-12 60 96)"
        />
        <path
          d="M0 340c60-40 140-40 200 0s140 40 200 0"
          stroke="#d6edf7"
          strokeWidth="10"
          strokeLinecap="round"
          fill="none"
          opacity="0.9"
        />
        <path d="M20 60h70v48H68l-12 12V60z" fill="#fff" stroke="#D1D5DB" />
      </g>
    </svg>
  );
}

/* ---------- Icons ---------- */
function PhoneIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none">
      <path
        d="M3 5c0 9.4 7.6 17 17 17"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19 5a2 2 0 00-2-2h-3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MailIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none">
      <path
        d="M3 8.5l9 6 9-6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 6H3v12h18V6z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WhatsAppIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none">
      <path
        d="M21 12c0 5-4 9-9 9a9 9 0 01-7.9-4.7L3 21l1.7-1.1A9 9 0 013 12c0-5 4-9 9-9s9 4 9 9z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 11.2c.3-.2 1-.4 1.6-.4s.8.1 1 .4c.2.2.5.6.8 1 .3.5.3.7.2.9-.1.3-.4.5-.8.8-.4.3-1 .5-1.5.6-.5.1-.9 0-1.2-.2-.3-.2-.6-.6-1-1-.4-.4-.5-1-.1-1.6.3-.5.5-.6.8-.9z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}



















// "use client"
// import Image from "next/image";

// const ContactPage = () => {
//   return (
//     <div className="min-h-screen bg-gradient-to-br from-purple-700 via-indigo-500 to-pink-400 py-16 px-6">
//       <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
//         {/* תוכן וטופס */}
//         <div className="space-y-8">
//           <h1 className="text-5xl font-bold text-white leading-snug">
//             צור קשר <span className="text-[#f57c00]"></span>
//           </h1>
//           <p className="text-white text-lg leading-relaxed">
//             אנחנו כאן כדי להקשיב, לייעץ וללוות אותך בדרך לחופש פיננסי. יש לך שאלה, התלבטות או פשוט רוצה לדבר? נשמח לשמוע ממך.
//           </p>

//           <div className="space-y-4 text-white">
//             <div className="flex items-center gap-3">
//               <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
//                 <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.21c1.2.5 2.5.77 3.85.77a1 1 0 011 1V20a1 1 0 01-1 1C10.07 21 3 13.93 3 5a1 1 0 011-1h3.25a1 1 0 011 1c0 1.35.26 2.65.77 3.85a1 1 0 01-.21 1.11l-2.2 2.2z" />
//               </svg>
//               <a href="tel:0523684844" className="text-[#f57c00] font-medium hover:underline">052-3684844</a>
//             </div>
//             <div className="flex items-center gap-3">
//               <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-white" viewBox="0 0 32 32" fill="currentColor">
//                 <path d="M16 2C8.28 2 2 8.28 2 16c0 2.84.75 5.49 2.07 7.79L2 30l6.41-2.01C10.52 29.25 13.16 30 16 30c7.72 0 14-6.28 14-14S23.72 2 16 2zm0 26c-2.44 0-4.69-.73-6.56-1.97l-.47-.31-3.8 1.19 1.24-3.7-.31-.47C5.73 20.69 5 18.44 5 16c0-6.07 4.93-11 11-11s11 4.93 11 11-4.93 11-11 11zm6.15-8.85l-2.58-.73a1.06 1.06 0 00-1 .27l-.55.57c-.28.29-.73.37-1.1.21-1.17-.48-4.12-3.49-4.54-4.61a.88.88 0 01.21-1.03l.48-.48a.99.99 0 00.27-.96l-.78-2.7A1.01 1.01 0 0011.13 8h-.67c-.55 0-1 .45-1 1 0 5.45 4.42 10.87 10.86 10.87.55 0 1-.45 1-1v-.67c0-.46-.31-.86-.77-.95z" />
//               </svg>
//               <a href="https://wa.me/972523684844" target="_blank" className="text-[#f57c00] font-medium hover:underline">שלח הודעה עכשיו</a>
//             </div>
//             <div className="flex items-center gap-3">
//               <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
//                 <path d="M4 4h16v2l-8 5-8-5V4zm0 4.25l8 5 8-5V20H4V8.25z" />
//               </svg>
//               <a href="mailto:guycoh@outlook.co.il" className="text-[#f57c00] font-medium hover:underline">guycoh@outlook.co.il</a>
//             </div>
//           </div>

//           <form className="mt-8 grid grid-cols-1 gap-4">
//             <input type="text" placeholder="שם מלא" className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#f57c00] focus:bg-orange-100/40 transition duration-200" required />
//             <input type="email" placeholder="אימייל" className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#f57c00] focus:bg-orange-100/40 transition duration-200" required />
//             <input type="tel" placeholder="טלפון" className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#f57c00] focus:bg-orange-100/40 transition duration-200" required />
//             <textarea placeholder="איך נוכל לעזור לך?" rows={5} className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#f57c00] focus:bg-orange-100/40 transition duration-200" required />
//             <button
//               type="submit"
//               onClick={(e) => {
//                 e.preventDefault();
//                 alert("ההודעה נשלחה בהצלחה! נחזור אליך בהקדם 🙏");
//               }}
//               className="bg-[#1d75a1] text-white font-semibold py-3 rounded-xl hover:bg-[#155a81] transition duration-300"
//             >
//               שלח הודעה
//             </button>
//           </form>
//         </div>

//         {/* תמונה */}
//         <div className="hidden md:block">
//           <img
//             src="/assets/images/imgFiles/contactus.jpg"
//             alt="צור קשר"
//             className="rounded-3xl shadow-2xl w-full animate-fade-in"
//           />
//         </div>
//       </div>

//       {/* אנימציה */}
//       <style jsx>{`
//         .animate-fade-in {
//           opacity: 0;
//           animation: fadeIn 1.2s ease-out forwards;
//         }

//         @keyframes fadeIn {
//           from {
//             opacity: 0;
//             transform: translateY(20px);
//           }
//           to {
//             opacity: 1;
//             transform: translateY(0);
//           }
//         }
//       `}</style>
//     </div>
//   );
// };

// export default ContactPage;





// "use client"
// import Image from "next/image";


// const ContactPage = () => {
//   return (
//     <div className="min-h-screen bg-gradient-to-b from-[#f9fafb] to-[#e3f2fd] py-16 px-6">
//       <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
//         {/* תוכן וטופס */}
//         <div className="space-y-8">
//           <h1 className="text-5xl font-bold text-[#1d75a1] leading-snug">
//             צור קשר עם <span className="text-[#f57c00]">מורגי</span>
//           </h1>
//           <p className="text-gray-700 text-lg leading-relaxed">
//             אנחנו כאן כדי להקשיב, לייעץ וללוות אותך בדרך לחופש פיננסי. יש לך שאלה, התלבטות או פשוט רוצה לדבר? נשמח לשמוע ממך.
//           </p>

//           <div className="space-y-4">
//             <div>
//               <span className="font-semibold text-[#1d75a1]">טלפון:</span> <a href="tel:0548881122" className="text-[#f57c00] font-medium hover:underline">052-3684844</a>
//             </div>
//             <div>
//               <span className="font-semibold text-[#1d75a1]">וואטסאפ:</span> <a href="https://wa.me/972523684844" target="_blank" className="text-[#25D366] font-medium hover:underline">שלח הודעה עכשיו</a>
//             </div>
//             <div>
//               <span className="font-semibold text-[#1d75a1]">אימייל:</span> <a href="mailto:info@morgi.co.il" className="text-[#f57c00] font-medium hover:underline">info@morgi.co.il</a>
//             </div>
//           </div>

//           <form className="mt-8 grid grid-cols-1 gap-4">
//             <input type="text" placeholder="שם מלא" className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#f57c00]" required />
//             <input type="email" placeholder="אימייל" className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#f57c00]" required />
//             <input type="tel" placeholder="טלפון" className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#f57c00]" required />
//             <textarea placeholder="איך נוכל לעזור לך?" rows={5} className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#f57c00]" required />
//             <button type="submit" className="bg-[#1d75a1] text-white font-semibold py-3 rounded-xl hover:bg-[#155a81] transition duration-300">
//               שלח הודעה
//             </button>
//           </form>
//         </div>

//         {/* תמונה */}
//         <div className="hidden md:block">
//           <img
//             src="/assets/images/imgFiles/contactus.jpg"
//             alt="צור קשר"
//             className="rounded-3xl shadow-2xl w-full animate-fade-in"
//           />
//         </div>
//       </div>

//       {/* אנימציה */}
//       <style jsx>{`
//         .animate-fade-in {
//           opacity: 0;
//           animation: fadeIn 1.2s ease-out forwards;
//         }

//         @keyframes fadeIn {
//           from {
//             opacity: 0;
//             transform: translateY(20px);
//           }
//           to {
//             opacity: 1;
//             transform: translateY(0);
//           }
//         }
//       `}</style>
//     </div>
//   )
// }

// export default ContactPage














// import Link from "next/link";
// import Image from "next/image";
// const ContactPage = () => {
//   return (
//     <div className="bg-gray-50 min-h-screen flex items-center justify-center px-6 py-12">
//       <div className="w-full max-w-4xl bg-white shadow-lg rounded-lg overflow-hidden flex flex-col md:flex-row">
//         {/* Left Section: SVG Illustration */}
//         <div className="bg-[#1d75a1] p-8 md:w-1/2 flex items-center justify-center">
//          <Image
//                   src="/assets/images/imgFiles/contactus.jpg"
//                   alt="ביטוח חיים ומבנה למשכנתא"
//                   width={400}
//                   height={200}
                 
//                 />
//         </div>

//         {/* Right Section: Contact Form */}
//         <div className="p-8 md:w-1/2">
//           <h2 className="text-3xl font-extrabold text-gray-800 mb-4">
//             צור קשר
//           </h2>
//           <p className="text-gray-600 mb-8">
//             השאירו פרטים ונחזור אליכם בהקדם האפשרי להתייעצות בנושאי משכנתאות
//             ופיננסים.
//           </p>
//           <form>
//             <div className="mb-4">
//               <label
//                 htmlFor="name"
//                 className="block text-sm font-medium text-gray-700"
//               >
//                 שם מלא
//               </label>
//               <input
//                 type="text"
//                 id="name"
//                 name="name"
//                 placeholder="הזינו את שמכם המלא"
//                 className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
//                 required
//               />
//             </div>
//             <div className="mb-4">
//               <label
//                 htmlFor="phone"
//                 className="block text-sm font-medium text-gray-700"
//               >
//                 טלפון
//               </label>
//               <input
//                 type="tel"
//                 id="phone"
//                 name="phone"
//                 placeholder="הזינו את מספר הטלפון"
//                 className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
//                 required
//               />
//             </div>
//             <div className="mb-4">
//               <label
//                 htmlFor="message"
//                 className="block text-sm font-medium text-gray-700"
//               >
//                 הודעה
//               </label>
//               <textarea
//                 id="message"
//                 name="message"
//                 placeholder="כתבו הודעה..."
//                 className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
//                 rows={4}
//               ></textarea>
//             </div>
//             <button
//               type="submit"
//               className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-colors"
//             >
//               שליחה
//             </button>
//           </form>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ContactPage;

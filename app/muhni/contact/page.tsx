"use client"

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

const ContactPage = () => {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<"idle" | "success" | "error">("idle");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  // ⏳ אחרי הצלחה – מציג את ההודעה ל‑5 ש׳ ואז מעביר לעמוד ‎/muhni
  useEffect(() => {
    if (sent === "success") {
      const timer = setTimeout(() => {
        router.push("/muhni");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [sent, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      setSent(res.ok ? "success" : "error");
      if (res.ok) setForm({ name: "", email: "", phone: "", message: "" });
    } catch {
      setSent("error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-galbg py-16 px-4">
      <div className="max-w-4xl mx-auto bg-gray-50 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row-reverse relative">
        {/* שכבת טעינה */}
        {sending && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur flex flex-col items-center justify-center z-10">
            <span className="loader mb-4" />
            <p className="text-main text-lg font-semibold">שולח הודעה...</p>
          </div>
        )}

        {/* תמונה בצד שמאל */}
        <div className="hidden md:block md:w-1/2 relative rounded-l-3xl overflow-hidden">
          <Image
            src="/assets/images/imgFiles/contactus.jpg"
            alt="צור קשר"
            fill
            className="object-cover w-full h-full"
          />
        </div>

        {/* טופס בצד ימין */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center rounded-r-3xl">
          <h1 className="text-3xl md:text-4xl font-bold text-main mb-4 text-center md:text-right">צור קשר</h1>
          <p className="text-gray-700 text-md md:text-lg mb-6 text-center md:text-right leading-relaxed">
            אנחנו כאן כדי להקשיב, לייעץ וללוות אותך בדרך לחופש פיננסי...
          </p>

          <form onSubmit={handleSubmit} className="grid gap-4 w-full max-w-md mx-auto">
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="שם מלא"
              required
              className="h-11 md:h-12 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#f57c00] focus:bg-orange-50 transition-all w-full"
            />
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="אימייל"
              required
              className="h-11 md:h-12 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#f57c00] focus:bg-orange-50 transition-all w-full"
            />
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="טלפון"
              required
              className="h-11 md:h-12 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#f57c00] focus:bg-orange-50 transition-all w-full"
            />
            <textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              placeholder="איך נוכל לעזור לך?"
              rows={4}
              required
              className="p-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#f57c00] focus:bg-orange-50 transition-all w-full"
            />

            <button
              type="submit"
              disabled={sending}
              className="bg-main text-white font-semibold py-3 rounded-xl hover:bg-[#155a81] disabled:opacity-50"
            >
              {sending ? "שולח..." : "שלח הודעה"}
            </button>

            {sent === "success" && (
              <p className="text-green-700 text-center">ההודעה נשלחה – מעביר לדף הבית...</p>
            )}
            {sent === "error" && (
              <p className="text-red-700 text-center">אירעה שגיאה, נסה שוב או התקשר אלינו</p>
            )}
          </form>
        </div>
      </div>
      <style jsx>{`
        .loader {
          width: 48px;
          height: 48px;
          border: 5px solid #f3f3f3;
          border-top: 5px solid #f57c00;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default ContactPage;















// "use client"
// import Image from "next/image";


// const ContactPage = () => {
//   return (
//     <div className="min-h-screen bg-galbg py-16 px-6">
//       <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
//         {/* תוכן וטופס */}
//         <div className="space-y-8">
//           <h1 className="text-5xl font-bold text-main leading-snug">
//             צור קשר  
//           </h1>
//           <p className="text-gray-700 text-lg leading-relaxed">
//             אנחנו כאן כדי להקשיב, לייעץ וללוות אותך בדרך לחופש פיננסי. יש לך שאלה, התלבטות או פשוט רוצה לדבר? נשמח לשמוע ממך.
//           </p>

//           <div className="space-y-4 text-gray-700">
//             <div className="flex items-center gap-3">
//               <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-main" viewBox="0 0 24 24" fill="currentColor">
//                 <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.21c1.2.5 2.5.77 3.85.77a1 1 0 011 1V20a1 1 0 01-1 1C10.07 21 3 13.93 3 5a1 1 0 011-1h3.25a1 1 0 011 1c0 1.35.26 2.65.77 3.85a1 1 0 01-.21 1.11l-2.2 2.2z" />
//               </svg>
//               <a href="tel:0523684844" className="text-[#f57c00] font-medium hover:underline">052-3684844</a>
//             </div>
//             <div className="flex items-center gap-3">
//               <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-main" viewBox="0 0 32 32" fill="currentColor">
//                 <path d="M16 2C8.28 2 2 8.28 2 16c0 2.84.75 5.49 2.07 7.79L2 30l6.41-2.01C10.52 29.25 13.16 30 16 30c7.72 0 14-6.28 14-14S23.72 2 16 2zm0 26c-2.44 0-4.69-.73-6.56-1.97l-.47-.31-3.8 1.19 1.24-3.7-.31-.47C5.73 20.69 5 18.44 5 16c0-6.07 4.93-11 11-11s11 4.93 11 11-4.93 11-11 11zm6.15-8.85l-2.58-.73a1.06 1.06 0 00-1 .27l-.55.57c-.28.29-.73.37-1.1.21-1.17-.48-4.12-3.49-4.54-4.61a.88.88 0 01.21-1.03l.48-.48a.99.99 0 00.27-.96l-.78-2.7A1.01 1.01 0 0011.13 8h-.67c-.55 0-1 .45-1 1 0 5.45 4.42 10.87 10.86 10.87.55 0 1-.45 1-1v-.67c0-.46-.31-.86-.77-.95z" />
//               </svg>
//               <a href="https://wa.me/972523684844" target="_blank" className="text-[#f57c00] font-medium hover:underline">שלח הודעה עכשיו</a>
//             </div>
//             <div className="flex items-center gap-3">
//               <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-main" viewBox="0 0 24 24" fill="currentColor">
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
//               className="bg-main text-white font-semibold py-3 rounded-xl hover:bg-[#155a81] transition duration-300"
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
//   )
// }

// export default ContactPage






































// "use client"
// import Image from "next/image";


// const ContactPage = () => {
//   return (
//     <div className="min-h-screen bg-galbg py-16 px-6">
//       <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
//         {/* תוכן וטופס */}
//         <div className="space-y-8">
//           <h1 className="text-5xl font-bold text-main leading-snug">
//             צור קשר  
//           </h1>
//           <p className="text-gray-700 text-lg leading-relaxed">
//             אנחנו כאן כדי להקשיב, לייעץ וללוות אותך בדרך לחופש פיננסי. יש לך שאלה, התלבטות או פשוט רוצה לדבר? נשמח לשמוע ממך.
//           </p>

//           <div className="space-y-4 text-gray-700">
//             <div className="flex items-center gap-3">
//               <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-main" viewBox="0 0 24 24" fill="currentColor">
//                 <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.21c1.2.5 2.5.77 3.85.77a1 1 0 011 1V20a1 1 0 01-1 1C10.07 21 3 13.93 3 5a1 1 0 011-1h3.25a1 1 0 011 1c0 1.35.26 2.65.77 3.85a1 1 0 01-.21 1.11l-2.2 2.2z" />
//               </svg>
//               <a href="tel:0523684844" className="text-[#f57c00] font-medium hover:underline">052-3684844</a>
//             </div>
//             <div className="flex items-center gap-3">
//               <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-main" viewBox="0 0 32 32" fill="currentColor">
//                 <path d="M16 2C8.28 2 2 8.28 2 16c0 2.84.75 5.49 2.07 7.79L2 30l6.41-2.01C10.52 29.25 13.16 30 16 30c7.72 0 14-6.28 14-14S23.72 2 16 2zm0 26c-2.44 0-4.69-.73-6.56-1.97l-.47-.31-3.8 1.19 1.24-3.7-.31-.47C5.73 20.69 5 18.44 5 16c0-6.07 4.93-11 11-11s11 4.93 11 11-4.93 11-11 11zm6.15-8.85l-2.58-.73a1.06 1.06 0 00-1 .27l-.55.57c-.28.29-.73.37-1.1.21-1.17-.48-4.12-3.49-4.54-4.61a.88.88 0 01.21-1.03l.48-.48a.99.99 0 00.27-.96l-.78-2.7A1.01 1.01 0 0011.13 8h-.67c-.55 0-1 .45-1 1 0 5.45 4.42 10.87 10.86 10.87.55 0 1-.45 1-1v-.67c0-.46-.31-.86-.77-.95z" />
//               </svg>
//               <a href="https://wa.me/972523684844" target="_blank" className="text-[#f57c00] font-medium hover:underline">שלח הודעה עכשיו</a>
//             </div>
//             <div className="flex items-center gap-3">
//               <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-main" viewBox="0 0 24 24" fill="currentColor">
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
//               className="bg-main text-white font-semibold py-3 rounded-xl hover:bg-[#155a81] transition duration-300"
//             >
//               שלח הודעה
//             </button>
//           </form>
//         </div>

//         {/* תמונה */}
//         <div className="hidden md:block">
          
          
          
// "
          
          
          
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









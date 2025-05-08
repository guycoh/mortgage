"use client"
import Image from "next/image";


const ContactPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f9fafb] to-[#e3f2fd] py-16 px-6">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        {/* תוכן וטופס */}
        <div className="space-y-8">
          <h1 className="text-5xl font-bold text-main leading-snug">
            צור קשר  
          </h1>
          <p className="text-gray-700 text-lg leading-relaxed">
            אנחנו כאן כדי להקשיב, לייעץ וללוות אותך בדרך לחופש פיננסי. יש לך שאלה, התלבטות או פשוט רוצה לדבר? נשמח לשמוע ממך.
          </p>

          <div className="space-y-4 text-gray-700">
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-main" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.21c1.2.5 2.5.77 3.85.77a1 1 0 011 1V20a1 1 0 01-1 1C10.07 21 3 13.93 3 5a1 1 0 011-1h3.25a1 1 0 011 1c0 1.35.26 2.65.77 3.85a1 1 0 01-.21 1.11l-2.2 2.2z" />
              </svg>
              <a href="tel:0502453345" className="text-[#f57c00] font-medium hover:underline">050-2453345</a>
            </div>
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-main" viewBox="0 0 32 32" fill="currentColor">
                <path d="M16 2C8.28 2 2 8.28 2 16c0 2.84.75 5.49 2.07 7.79L2 30l6.41-2.01C10.52 29.25 13.16 30 16 30c7.72 0 14-6.28 14-14S23.72 2 16 2zm0 26c-2.44 0-4.69-.73-6.56-1.97l-.47-.31-3.8 1.19 1.24-3.7-.31-.47C5.73 20.69 5 18.44 5 16c0-6.07 4.93-11 11-11s11 4.93 11 11-4.93 11-11 11zm6.15-8.85l-2.58-.73a1.06 1.06 0 00-1 .27l-.55.57c-.28.29-.73.37-1.1.21-1.17-.48-4.12-3.49-4.54-4.61a.88.88 0 01.21-1.03l.48-.48a.99.99 0 00.27-.96l-.78-2.7A1.01 1.01 0 0011.13 8h-.67c-.55 0-1 .45-1 1 0 5.45 4.42 10.87 10.86 10.87.55 0 1-.45 1-1v-.67c0-.46-.31-.86-.77-.95z" />
              </svg>
              <a href="https://wa.me/972502453345" target="_blank" className="text-[#f57c00] font-medium hover:underline">שלח הודעה עכשיו</a>
            </div>
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-main" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 4h16v2l-8 5-8-5V4zm0 4.25l8 5 8-5V20H4V8.25z" />
              </svg>
              <a href="mailto:mmusayov@gmail.com" className="text-[#f57c00] font-medium hover:underline">mmusayov@gmail.com</a>
            </div>
          </div>

          <form className="mt-8 grid grid-cols-1 gap-4">
            <input type="text" placeholder="שם מלא" className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#f57c00] focus:bg-orange-100/40 transition duration-200" required />
            <input type="email" placeholder="אימייל" className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#f57c00] focus:bg-orange-100/40 transition duration-200" required />
            <input type="tel" placeholder="טלפון" className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#f57c00] focus:bg-orange-100/40 transition duration-200" required />
            <textarea placeholder="איך נוכל לעזור לך?" rows={5} className="p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#f57c00] focus:bg-orange-100/40 transition duration-200" required />
            <button
              type="submit"
              onClick={(e) => {
                e.preventDefault();
                alert("ההודעה נשלחה בהצלחה! נחזור אליך בהקדם 🙏");
              }}
              className="bg-main text-white font-semibold py-3 rounded-xl hover:bg-[#155a81] transition duration-300"
            >
              שלח הודעה
            </button>
          </form>
        </div>

        {/* תמונה */}
        <div className="hidden md:block">
          
          
          
"
          
          
          
          <img
            src="/assets/images/imgFiles/contactus.jpg"
            alt="צור קשר"
            className="rounded-3xl shadow-2xl w-full animate-fade-in"
          />
        </div>
      </div>

      {/* אנימציה */}
      <style jsx>{`
        .animate-fade-in {
          opacity: 0;
          animation: fadeIn 1.2s ease-out forwards;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}

export default ContactPage









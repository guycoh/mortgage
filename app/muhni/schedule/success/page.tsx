
'use client'
import { useBooking } from "@/app/context/BookingContext"
import Image from 'next/image'
import MeetingIcon from "@/public/assets/images/svg/meetingIcon"

import { useEffect, useState } from 'react'

export default function SuccessPage() {
  const { booking } = useBooking()
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    setShowConfetti(true)
    const timeout = setTimeout(() => setShowConfetti(false), 6000)
    return () => clearTimeout(timeout)
  }, [])

  if (!booking) return <p className="text-center text-gray-500">טוען פרטי פגישה...</p>

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-rose-50 to-pink-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">

      {showConfetti && (
        <div className="absolute inset-0 z-10 pointer-events-none animate-fade-in">
          <Image
            src="/assets/images/confetti.gif"
            alt="Success Animation"
            fill
            style={{ objectFit: 'cover' }}
            className="opacity-50"
          />
        </div>
      )}

      <div className="z-20 text-main w-full max-w-xl bg-white rounded-2xl shadow-2xl p-8 text-center relative">
       <MeetingIcon 
       className="mx-auto mb-4 animate-pop"
       color="#7e22ce"
       size={80}
       />
      
      
      
        <h1 className="text-3xl font-bold text-main mb-2">הפגישה תואמה בהצלחה!</h1>
        <p className="text-gray-700 text-lg mb-6">
          הי <strong>{booking.name}</strong>, קבענו עבורך פגישת זום ב־
          <strong> {booking.date} </strong> בשעה <strong>{booking.hour}</strong>.
        </p>

        <div className="bg-gradient-to-r from-green-100 to-emerald-50 border border-green-200 rounded-xl p-4 text-right text-sm leading-relaxed text-gray-600 shadow-inner">
          <p>📧 נשלחה הודעת אישור ל־<strong>{booking.email}</strong></p>
          <p>📱 ניצור איתך קשר במספר <strong>{booking.phone}</strong></p>
          <p className="mt-2 italic text-emerald-600">אנחנו כבר מחכים לשיחה שלנו ❤️</p>
        </div>

        <button
          onClick={() => window.location.href = '/muhni'}
          className="mt-6 bg-main hover:bg-green-600 text-white px-6 py-3 rounded-full transition-all text-lg shadow-md"
        >
          חזרה לדף הבית
        </button>
      </div>
    </div>
  )
}










// "use client"

// import { useSearchParams } from "next/navigation";

// export default function SuccessPage() {
//     const searchParams = useSearchParams();

//     const leadName = searchParams.get("name") || "לא סופק";
//     const phone = searchParams.get("phone") || "לא סופק";
//     const email = searchParams.get("email") || "לא סופק";
//     const date = searchParams.get("date") || "לא סופק";
//     const hour = searchParams.get("hour") || "לא סופק";

//     return (
//         <div className="flex justify-center items-center h-screen bg-gray-100">
//             <div className="max-w-lg w-full bg-white p-8 shadow-lg rounded-lg text-center">
//                 <h2 className="text-2xl font-bold text-green-600 mb-4">הפגישה שלך נקבעה בהצלחה! 🎉</h2>
//                 <p className="text-lg text-gray-700">להלן פרטי הפגישה שלך:</p>

//                 <div className="mt-6 space-y-4 text-right">
//                     <p><span className="font-semibold">שם הלקוח:</span> {leadName}</p>
//                     <p><span className="font-semibold">טלפון:</span> {phone}</p>
//                     <p><span className="font-semibold">אימייל:</span> {email}</p>
//                     <p><span className="font-semibold">תאריך הפגישה:</span> {date}</p>
//                     <p><span className="font-semibold">שעת הפגישה:</span> {hour}</p>
//                 </div>

//                 <div className="mt-6 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-right text-sm text-gray-700">
//                     <p>📌 <strong>לתשומת ליבך:</strong></p>
//                     <p>🔹 הקישור לזום יישלח כשעה לפני מועד הפגישה.</p>
//                     <p>🔹 חשוב מאוד להיות במקום שקט בפגישה וללא הסחות דעת.</p>
//                     <p>🔹 יש להצטייד בצילום תעודת זהות, 3 תלושי שכר אחרונים לשכירים / דוחות שומה אחרונים לעצמאים, פרטי הלוואות וכיו"ב.</p>
//                     <p className="mt-2 font-semibold">בהצלחה! 🚀</p>
//                 </div>

//                 <button
//                     onClick={() => window.location.href = "/home"}
//                     className="mt-6 bg-blue-500 text-white py-2 px-6 rounded-lg hover:bg-blue-600 transition"
//                 >
//                     חזור לדף הבית
//                 </button>
//             </div>
//         </div>
//     );
// }

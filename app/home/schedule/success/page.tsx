"use client"

import { useSearchParams } from "next/navigation";

export default function SuccessPage() {
    const searchParams = useSearchParams();

    const leadName = searchParams.get("name") || "לא סופק";
    const phone = searchParams.get("phone") || "לא סופק";
    const email = searchParams.get("email") || "לא סופק";
    const date = searchParams.get("date") || "לא סופק";
    const hour = searchParams.get("hour") || "לא סופק";

    return (
        <div className="flex justify-center items-center h-screen bg-gray-100">
            <div className="max-w-lg w-full bg-white p-8 shadow-lg rounded-lg text-center">
                <h2 className="text-2xl font-bold text-green-600 mb-4">הפגישה שלך נקבעה בהצלחה! 🎉</h2>
                <p className="text-lg text-gray-700">להלן פרטי הפגישה שלך:</p>

                <div className="mt-6 space-y-4 text-right">
                    <p><span className="font-semibold">שם הלקוח:</span> {leadName}</p>
                    <p><span className="font-semibold">טלפון:</span> {phone}</p>
                    <p><span className="font-semibold">אימייל:</span> {email}</p>
                    <p><span className="font-semibold">תאריך הפגישה:</span> {date}</p>
                    <p><span className="font-semibold">שעת הפגישה:</span> {hour}</p>
                </div>

                <div className="mt-6 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-right text-sm text-gray-700">
                    <p>📌 <strong>לתשומת ליבך:</strong></p>
                    <p>🔹 הקישור לזום יישלח כשעה לפני מועד הפגישה.</p>
                    <p>🔹 חשוב מאוד להיות במקום שקט בפגישה וללא הסחות דעת.</p>
                    <p>🔹 יש להצטייד בצילום תעודת זהות, 3 תלושי שכר אחרונים לשכירים / דוחות שומה אחרונים לעצמאים, פרטי הלוואות וכיו"ב.</p>
                    <p className="mt-2 font-semibold">בהצלחה! 🚀</p>
                </div>

                <button
                    onClick={() => window.location.href = "/home"}
                    className="mt-6 bg-blue-500 text-white py-2 px-6 rounded-lg hover:bg-blue-600 transition"
                >
                    חזור לדף הבית
                </button>
            </div>
        </div>
    );
}

export default function BusinessCard3DStatic() {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-800">
      <div className="w-96 p-6 rounded-2xl bg-gradient-to-tr from-gray-100 to-gray-200 shadow-[8px_8px_20px_rgba(0,0,0,0.4),-8px_-8px_20px_rgba(255,255,255,0.6)] relative">
        
        {/* לוגו עגול עם עומק */}
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-orange-500 to-yellow-400 shadow-[inset_-4px_-4px_8px_rgba(255,255,255,0.6),inset_4px_4px_8px_rgba(0,0,0,0.4)] flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl font-extrabold text-white drop-shadow-lg">G</span>
        </div>

        {/* פרטי הכרטיס */}
        <h1 className="text-2xl font-bold text-center text-gray-800 drop-shadow-sm">גיא כהן</h1>
        <p className="text-center text-orange-500 font-medium mb-6">יועץ משכנתאות</p>

        {/* כפתורים תלת ממדיים */}
        <div className="flex flex-col gap-3">
          <a
            href="tel:0501234567"
            className="w-full py-3 rounded-xl bg-gradient-to-br from-white to-gray-200 shadow-[4px_4px_8px_rgba(0,0,0,0.3),-4px_-4px_8px_rgba(255,255,255,0.8)] text-center font-semibold text-gray-800 hover:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.3),inset_-4px_-4px_8px_rgba(255,255,255,0.8)] transition"
          >
            📞 התקשר
          </a>

          <a
            href="https://wa.me/972501234567"
            target="_blank"
            className="w-full py-3 rounded-xl bg-gradient-to-br from-green-400 to-green-500 shadow-[4px_4px_8px_rgba(0,0,0,0.3),-4px_-4px_8px_rgba(255,255,255,0.6)] text-center font-semibold text-white hover:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.4),inset_-4px_-4px_8px_rgba(255,255,255,0.8)] transition"
          >
            💬 WhatsApp
          </a>

          <a
            href="mailto:guy@example.com"
            className="w-full py-3 rounded-xl bg-gradient-to-br from-blue-400 to-blue-500 shadow-[4px_4px_8px_rgba(0,0,0,0.3),-4px_-4px_8px_rgba(255,255,255,0.6)] text-center font-semibold text-white hover:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.4),inset_-4px_-4px_8px_rgba(255,255,255,0.8)] transition"
          >
            ✉️ שלח מייל
          </a>
        </div>
      </div>
    </div>
  );
}

// app/card/guy/page.tsx
export default function GuyCardPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-orange-50 p-6">
      <div className="bg-white shadow-xl rounded-2xl p-8 max-w-md text-center">
        <img
          src="/avatar-guy.jpg"
          alt="גיא כהן"
          className="w-24 h-24 rounded-full mx-auto mb-4"
        />
        <h1 className="text-2xl font-bold text-gray-800 mb-1">גיא כהן</h1>
        <p className="text-gray-600">יועץ משכנתאות בכיר</p>
        <p className="text-sm text-gray-500 mb-4">מורגי - ייעוץ משכנתאות</p>

        <div className="space-y-3">
          <a
            href="/guy-card.vcf"
            download
            className="block w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-xl transition"
          >
            📇 הורד כרטיס ביקור
          </a>
          <a
            href="https://wa.me/972501234567?text=שלום%2C%20ראיתי%20את%20הכרטיס%20שלך%20באתר%20מורגי%20ואשמח%20לשוחח"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-[#25D366] hover:bg-[#1ebe5c] text-white py-2 rounded-xl transition"
          >
            💬 שלח הודעה בוואטסאפ
          </a>
          <a
            href="tel:0501234567"
            className="block w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-xl transition"
          >
            ☎️ התקשר עכשיו
          </a>
        </div>
      </div>
    </main>
  );
}

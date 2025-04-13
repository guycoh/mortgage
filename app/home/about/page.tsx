"use client"

const About = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-white text-gray-900 px-6 py-16">
      <div className="max-w-5xl mx-auto text-center animate-fade-in">
        <h1 className="text-5xl font-bold text-[#1d75a1] mb-8 border-b-4 border-[#f57c00] inline-block pb-2 transition-all duration-700 ease-in-out">
          אודות מורגי
        </h1>

        <p className="text-lg text-gray-700 max-w-3xl mx-auto leading-relaxed animate-fade-in delay-200">
          ברוכים הבאים ל-<span className="font-semibold text-[#f57c00]">מורגי</span> – המקום שבו ידע פיננסי, שקיפות וחדשנות נפגשים.
          אנחנו לא עוד גוף ייעוץ משכנתאות – אנחנו <span className="font-bold">מהפכה</span>.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 text-right">
          <div className="bg-white rounded-2xl shadow-lg p-6 border-t-4 border-[#1d75a1] transform hover:scale-105 transition-transform duration-500">
            <h3 className="text-2xl font-bold text-[#1d75a1] mb-2">החזון שלנו</h3>
            <p className="text-gray-600 leading-relaxed">
              לבנות קהילה פיננסית חכמה – כזו שמבינה את הכסף שלה ויודעת לנהל אותו בביטחון.
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 border-t-4 border-[#1d75a1] transform hover:scale-105 transition-transform duration-500 delay-100">
            <h3 className="text-2xl font-bold text-[#1d75a1] mb-2">השיטה</h3>
            <p className="text-gray-600 leading-relaxed">
              שילוב של נתונים רשמיים, טכנולוגיה מתקדמת וחוויית משתמש שהיא פשוטה, נוחה ועוצמתית.
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 border-t-4 border-[#1d75a1] transform hover:scale-105 transition-transform duration-500 delay-200">
            <h3 className="text-2xl font-bold text-[#1d75a1] mb-2">ההבטחה שלנו</h3>
            <p className="text-gray-600 leading-relaxed">
              לעולם לא נסתפק בבערך – רק בדיוק. כי מגיע לך לדעת, לא לנחש.
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 border-t-4 border-[#1d75a1] transform hover:scale-105 transition-transform duration-500 delay-300">
            <h3 className="text-2xl font-bold text-[#1d75a1] mb-2">הכוח שלך בידיים שלך</h3>
            <p className="text-gray-600 leading-relaxed">
              המשכנתא שלך לא צריכה להיות תעלומה. אנחנו פה להפוך אותה לכלי של חופש.
            </p>
          </div>
        </div>

        <p className="mt-16 text-xl italic text-gray-800 max-w-2xl mx-auto animate-fade-in delay-500">
          זה לא רק משכנתא. זה מסע. ואנחנו נהיה שם איתך – מהשקל הראשון ועד המפתח בדלת.
        </p>
      </div>

      {/* Tailwind animation keyframes */}
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

export default About

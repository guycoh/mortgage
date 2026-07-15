import React from 'react';

export default function MortgageForAllPurposes() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased selection:bg-[#1d75a1]/20 rtl" dir="rtl">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1d75a1] via-[#1a6890] to-[#124b69] text-white py-20 lg:py-28">
        {/* Background SVGs */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        
        {/* Glowing orbs */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Hero Text */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-right">
              <span className="inline-block bg-white/10 backdrop-blur-md text-cyan-200 text-sm font-semibold px-4 py-1.5 rounded-full border border-white/20">
                פתרונות מימון חכמים
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight drop-shadow-sm">
                משכנתא לכל מטרה <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-emerald-300">
                  הופכים נכס לכסף נזיל
                </span>
              </h1>
              <p className="text-lg md:text-xl text-slate-200 max-w-2xl mx-auto lg:mx-0 font-light leading-relaxed">
                יש לכם נכס בבעלותכם? אתם יכולים לנצל את שווי השוק שלו כדי לקבל מימון בתנאים של משכנתא – לטובת סגירת חובות, שיפוץ מקיף, עזרה לילדים או כל השקעה אחרת.
              </p>
              
              {/* Trust Badges */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-6 pt-4 text-sm text-slate-300">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                  <span>ריביות אטרקטיביות מכל הבנקים</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                  <span>פריסה ארוכת טווח (עד 30 שנה)</span>
                </div>
              </div>
            </div>

            {/* Hero SVG Illustration */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-md drop-shadow-2xl filter transform hover:scale-105 transition duration-500">
                <svg viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
                  <circle cx="250" cy="250" r="220" fill="#1d75a1" fillOpacity="0.2"/>
                  <rect x="120" y="240" width="260" height="180" rx="16" fill="#ffffff" fillOpacity="0.07" stroke="#ffffff" strokeWidth="2" strokeDasharray="4 4"/>
                  {/* House Base */}
                  <path d="M160 380V250L250 170L340 250V380H160Z" fill="#ffffff" />
                  <path d="M250 170L340 250H160L250 170Z" fill="#1d75a1" />
                  {/* Door & Window */}
                  <rect x="225" y="310" width="50" height="70" rx="4" fill="#1d75a1" />
                  <circle cx="250" cy="230" r="20" fill="#e2e8f0" />
                  {/* Floating Coins / Elements */}
                  <circle cx="130" cy="180" r="25" fill="#34d399" />
                  <path d="M125 180H135M130 175V185" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                  <circle cx="370" cy="190" r="30" fill="#fbbf24" />
                  <text x="358" y="200" fill="white" fontSize="28" fontWeight="bold">₪</text>
                  {/* Modern Lines */}
                  <path d="M90 320C150 290 200 360 260 310C320 260 370 340 430 300" stroke="#22d3ee" strokeWidth="4" strokeLinecap="round" opacity="0.8"/>
                </svg>
              </div>
            </div>

          </div>
        </div>

        {/* Wave Border Bottom */}
        <div className="absolute bottom-0 left-0 right-0 w-full overflow-hidden leading-[0] transform rotate-180">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-full h-[40px] fill-slate-50">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V0C26.9,8.75,55.05,16.32,83.36,22.28,141.43,34.5,200.41,41.59,261.95,44.75A242.65,242.65,0,0,0,321.39,56.44Z"></path>
          </svg>
        </div>
      </section>

      {/* Main Content & Calculator Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* RIGHT COLUMN: Marketing Content */}
          <div className="lg:col-span-7 space-y-12">
            
            {/* Intro Grid */}
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 mb-4 flex items-center gap-3">
                <span className="w-2 h-8 bg-[#1d75a1] rounded-full"></span>
                מתי זה הפתרון הנכון עבורכם?
              </h2>
              <p className="text-slate-600 mb-8 max-w-xl">
                משכנתא לכל מטרה מאפשרת לכם לשעבד נכס קיים ולקבל תמורתו סכום כסף משמעותי בריביות נמוכות בהרבה מהלוואות סולו רגילות של הבנקים.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Benefit 1 */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition">
                  <div className="w-12 h-12 rounded-xl bg-[#1d75a1]/10 flex items-center justify-center text-[#1d75a1] mb-4">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">איחוד הלוואות וסגירת חובות</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">מחליפים את כל ההלוואות הקטנות והחונקות בהחזר חודשי אחד נמוך ומרוכז בפריסה נוחה.</p>
                </div>

                {/* Benefit 2 */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition">
                  <div className="w-12 h-12 rounded-xl bg-[#1d75a1]/10 flex items-center justify-center text-[#1d75a1] mb-4">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">שיפוץ ושדרוג הנכס</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">משקיעים בבית הקיים, מעלים את ערך הנכס שלכם ומממנים את זה בתנאי משכנתא אופטימליים.</p>
                </div>

                {/* Benefit 3 */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition">
                  <div className="w-12 h-12 rounded-xl bg-[#1d75a1]/10 flex items-center justify-center text-[#1d75a1] mb-4">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">עזרה לילדים או השקעה</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">רכישת נכס נוסף, מימון לימודים גבוהים או מתן הון ראשוני לילדים לרכישת דירה משלהם.</p>
                </div>

                {/* Benefit 4 */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition">
                  <div className="w-12 h-12 rounded-xl bg-[#1d75a1]/10 flex items-center justify-center text-[#1d75a1] mb-4">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">מינוף עסקי חכם</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">הזרקת הון לעסק קיים או פתיחת הזדמנות עסקית חדשה בריבית נמוכה משמעותית מאשראי מסחרי.</p>
                </div>
              </div>
            </div>

            {/* Regulatory Note / Informative */}
            <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200/60 flex gap-4 items-start">
              <span className="text-2xl mt-0.5">💡</span>
              <div>
                <h4 className="font-bold text-amber-900 mb-1">חשוב לדעת לגבי אחוזי מימון:</h4>
                <p className="text-sm text-amber-800 leading-relaxed">
                  על פי הנחיות בנק ישראל, במשכנתא לכל מטרה ניתן לקבל מימון של **עד 50% משווי הנכס** הנוכחי שלכם (בניכוי יתרת המשכנתא הקיימת עליו, במידה וישנה). 
                </p>
              </div>
            </div>

          </div>

          {/* LEFT COLUMN: PLACEHOLDER FOR CALCULATOR */}
          <div className="lg:col-span-5 lg:sticky lg:top-8">
            
            {/* The Container of the Calculator */}
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 relative overflow-hidden">
              
              {/* Decorative top bar with site color */}
              <div className="absolute top-0 inset-x-0 h-2 bg-[#1d75a1]"></div>

              {/* Calculator Header */}
              <div className="mb-6 text-center lg:text-right">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold text-slate-900">מחשבון אחוז מימון וזכאות</h3>
                  <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-semibold">סימולטור 2026</span>
                </div>
                <p className="text-sm text-slate-500">
                  בדקו ברגע מהו פוטנציאל המימון שלכם ומהו אחוז המימון המשוער מהנכס.
                </p>
              </div>

              {/* PLACEHOLDER WRAPPER - INSERT YOUR CALCULATOR CODE HERE */}
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[350px] text-center">
                
                {/* Embedded SVG Graphic for the Placeholder */}
                <svg className="w-20 h-20 text-slate-300 mb-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 11h.01M12 7h.01M9 11h.01M12 14h.01M15 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                
                <h4 className="text-base font-bold text-slate-700 mb-2">כאן ימוקם המחשבון שלך</h4>
                <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                  תוכל להטמיע כאן את הסטייט של ה-Inputs (שווי נכס, יתרת משכנתא, סכום מבוקש) ולחשב את הנתון: <br />
                  <span className="font-semibold text-[#1d75a1]">אחוז המימון = (יתרה + מבוקש) / שווי נכס</span>
                </p>

                {/* Example of design ready fields inside placeholder */}
                <div className="w-full mt-6 space-y-3 opacity-40 pointer-events-none">
                  <div className="h-10 bg-white rounded-lg border border-slate-200"></div>
                  <div className="h-10 bg-white rounded-lg border border-slate-200"></div>
                  <div className="h-12 bg-[#1d75a1] rounded-lg"></div>
                </div>

              </div>
              {/* END OF PLACEHOLDER */}

              {/* Calculator Footer Info */}
              <div className="mt-4 text-center">
                <p className="text-xs text-slate-400">
                  * תוצאות המחשבון הינן הערכה בלבד וכפופות לאישור סופי של הגוף המממן.
                </p>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* Footer / CTA Section */}
      <section className="bg-slate-900 text-white py-12 border-t border-slate-800">
        <div className="container mx-auto px-4 text-center space-y-6">
          <h3 className="text-2xl font-bold">צריכים עזרה מקצועית בבניית תמהיל וגיוס המימון?</h3>
          <p className="text-slate-400 max-w-xl mx-auto text-sm font-light">
            אנחנו מלווים אתכם מול כל המערכת הבנקאית וחברות הביטוח כדי להבטיח את אישור הבקשה בשיעורי המימון הגבוהים ביותר ובריביות המשתלמות ביותר בשוק.
          </p>
          <div>
            <button className="bg-[#1d75a1] hover:bg-[#238ec3] text-white font-bold px-8 py-3.5 rounded-full transition duration-300 shadow-lg hover:shadow-[#1d75a1]/30 transform hover:-translate-y-0.5">
              תיאום שיחת ייעוץ ללא התחייבות
            </button>
          </div>
        </div>
      </section>

    </div>
  );
}
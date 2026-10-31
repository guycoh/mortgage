"use client"
import React, { useState } from 'react';
import { BookOpen, ShieldCheck, Calculator, CheckCircle, ChevronLeft } from 'lucide-react';

export default function MortgagePortal() {
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // כאן תוכל להוסיף את הלוגיקה לשליחת הנתונים לשרת (API)
    setIsSubmitted(true);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Header */}
      <header className="bg-slate-900 text-white py-12 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            פורטל המשכנתאות המרכזי: ידע אובייקטיבי ששווה לכם עשרות אלפי שקלים
          </h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto">
            החלטות כלכליות חכמות מתחילות בנתונים מדויקים. כאן תמצאו את כל המידע, הכלים והמדריכים שיעזרו לכם להבין את עולם המשכנתאות – בלי אינטרסים נסתרים, ובשקיפות מלאה.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-12 space-y-16">
        
        {/* Intro Section */}
        <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-start gap-4">
            <ShieldCheck className="w-12 h-12 text-blue-600 shrink-0" />
            <div>
              <h2 className="text-2xl font-bold mb-3">למה חשוב להגיע מוכנים?</h2>
              <p className="text-slate-600 leading-relaxed">
                משכנתא היא העסקה הפיננסית הגדולה והמשמעותית ביותר שתעשו בחיים. למרות זאת, רוב הלווים מגיעים לבנק כשהם לא מכירים את כללי המשחק. הבנקאי יועץ לכם מתוך פוזיציה – המטרה שלו היא למקסם את רווחי הבנק. המטרה שלנו היא לצמצם את פערי המידע ולהעביר את הכוח בחזרה לידיים שלכם.
              </p>
            </div>
          </div>
        </section>

        {/* 3 Rules Section */}
        <section>
          <h2 className="text-3xl font-bold text-center mb-10">3 חוקי הברזל של עולם המשכנתאות</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <div className="bg-blue-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <span className="text-blue-600 font-bold text-xl">1</span>
              </div>
              <h3 className="text-xl font-bold mb-2">תמהיל לפני ריבית</h3>
              <p className="text-slate-600 text-sm">
                רוב האנשים משווים רק ריביות, אבל הסוד טמון בתמהיל. תמהיל לא נכון עם ריביות נמוכות יעלה לכם הרבה יותר מתמהיל חכם עם ריביות ממוצעות.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <div className="bg-blue-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <span className="text-blue-600 font-bold text-xl">2</span>
              </div>
              <h3 className="text-xl font-bold mb-2">הסכנה: מדד המחירים</h3>
              <p className="text-slate-600 text-sm">
                מסלולים צמודי מדד נראים מפתים בהתחלה, אבל כשהאינפלציה עולה ההחזר החודשי קופץ, והקרן עלולה לגדול למרות שאתם משלמים.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <div className="bg-blue-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <span className="text-blue-600 font-bold text-xl">3</span>
              </div>
              <h3 className="text-xl font-bold mb-2">נקודות יציאה בעתיד</h3>
              <p className="text-slate-600 text-sm">
                החיים דינמיים. בחירת מסלולים נכונה תאפשר לכם לסגור חלקים מהמשכנתא בעתיד מבלי לשלם "קנסות" בגובה עשרות אלפי שקלים.
              </p>
            </div>
          </div>
        </section>

        {/* Lead Gen Section (Neutral & Professional) */}
        <section className="bg-slate-900 rounded-3xl overflow-hidden shadow-xl">
          <div className="grid md:grid-cols-2">
            <div className="p-10 md:p-12 text-white flex flex-col justify-center">
              <Calculator className="w-10 h-10 text-blue-400 mb-6" />
              <h2 className="text-3xl font-bold mb-4">רוצים לדעת איפה אתם עומדים?</h2>
              <p className="text-slate-300 mb-6 leading-relaxed">
                קריאת חומר תיאורטי היא ההתחלה, אבל כל משכנתא צריכה להיתפר למידותיכם. 
                המומחים שלנו יעברו על הנתונים שלכם ויפיקו עבורכם תמונת מצב אובייקטיבית ללא עלות וללא התחייבות.
              </p>
              <ul className="space-y-3 text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-400" />
                  האם ניתן להוזיל משכנתא קיימת?
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-400" />
                  מה ההחזר הצפוי ברכישת דירה?
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-400" />
                  אילו מסלולים נכונים למצבכם?
                </li>
              </ul>
            </div>

            <div className="bg-white p-10 md:p-12">
              {!isSubmitted ? (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <h3 className="text-2xl font-bold text-slate-800 mb-6">קבלו דו"ח אישי וניתוח נתונים</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">שם מלא</label>
                    <input 
                      type="text" 
                      required
                      className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                      placeholder="הזן את שמך המלא"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">סכום משכנתא מבוקש / קיים</label>
                    <input 
                      type="text" 
                      required
                      className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                      placeholder="₪"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">טלפון נייד</label>
                    <input 
                      type="tel" 
                      required
                      className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                      placeholder="05X-XXXXXXX"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-lg transition-colors flex items-center justify-center gap-2 mt-4"
                  >
                    שלחו לי ניתוח נתונים אובייקטיבי
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <p className="text-xs text-center text-slate-500 mt-4">
                    המידע מועבר בצורה מאובטחת ומשמש אך ורק לצורך בדיקת הכדאיות והתאמת המסלול עבורכם.
                  </p>
                </form>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800">הפנייה התקבלה בהצלחה!</h3>
                  <p className="text-slate-600">
                    הנתונים שלך הועברו למומחים שלנו. אנו ננתח את המידע וניצור איתך קשר בהקדם עם תמונת מצב מלאה.
                  </p>
                  <button 
                    onClick={() => setIsSubmitted(false)}
                    className="text-blue-600 font-medium hover:underline mt-4"
                  >
                    חזרה לטופס
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-slate-100 py-8 text-center text-slate-500 text-sm border-t border-slate-200">
        <p>© {new Date().getFullYear()} פורטל המשכנתאות המרכזי. המידע באתר הוא אינפורמטיבי בלבד ואינו מהווה תחליף לייעוץ משכנתאות המותאם לצרכי הלקוח.</p>
      </footer>
    </div>
  );
}
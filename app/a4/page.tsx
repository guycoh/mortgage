


import ReverseMortgageCalculator from "../home/calculators/reverse_calculator/ReverseMortgageCalculator";

export default function ReverseMortgagePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased" >
      
      {/* 1. HERO SECTION (עיצוב מיליון דולר עם הגוון הדומיננטי שלך) */}
      <section className="relative bg-gradient-to-br from-[#1d75a1] via-[#165a7d] to-[#0f3f58] text-white py-24 px-4 md:py-36 overflow-hidden">
        {/* אלמנטים גרפיים יוקרתיים ברקע */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl -mr-64 -mt-64"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-3xl -ml-64 -mb-64"></div>

        <div className="max-w-5xl mx-auto text-center space-y-8 relative z-10">
          <span className="bg-amber-400/10 text-amber-300 border border-amber-400/30 px-5 py-2 rounded-full text-sm font-semibold tracking-wide backdrop-blur-sm">
            המדריך המלא והאקסקלוסיבי למשכנתא הפוכה
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight tracking-tight">
            הבית שלכם שווה מיליונים. <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-300 to-amber-100">
              הגיע הזמן שתיהנו מהכסף הזה.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-200 max-w-3xl mx-auto font-light leading-relaxed">
            בני 60 ומעלה? משכנתא הפוכה היא הפתרון הפיננסי הבטוח ביותר המאפשר לכם להפוך את קירות הבית לכסף נזיל – בלי לעזוב את הבית ובלי החזרים חודשיים מעיקים.
          </p>
          <div className="pt-4">
            <a 
              href="#calculator-section" 
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-lg px-10 py-4.5 rounded-2xl shadow-xl shadow-amber-500/10 transition-all transform hover:-translate-y-1 inline-block"
            >
              חישוב זכאות מהיר במחשבון ↓
            </a>
          </div>
        </div>
      </section>

      {/* 2. מה זה בעצם משכנתא הפוכה? (אנציקלופדיית מידע קריא ויוקרתי) */}
      <section className="max-w-5xl mx-auto py-20 px-4 space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900">להבין משכנתא הפוכה ב-3 דקות</h2>
          <p className="text-slate-500 max-w-xl mx-auto">כל המידע החשוב שאתם חייבים להכיר, בשקיפות מלאה ובגובה העיניים.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <div className="border-r-4 border-[#1d75a1] pr-4 space-y-2">
              <h3 className="text-xl font-bold text-[#1d75a1]">איך זה עובד?</h3>
              <p className="text-slate-600 leading-relaxed">
                משכנתא הפוכה היא הלוואה לכל מטרה המיועדת לבני 60 ומעלה, המוענקת כנגד שעבוד נכס קיים שבבעלותם. בשונה ממשכנתא רגילה, **אין צורך בהחזרים חודשיים שוטפים** (קרן או ריבית). החוב נפרע רק לאחר אריכות ימיכם או בעת מכירת הבית.
              </p>
            </div>
            <div className="border-r-4 border-amber-400 pr-4 space-y-2">
              <h3 className="text-xl font-bold text-slate-900">למה הכסף משמש?</h3>
              <p className="text-slate-600 leading-relaxed">
                הכסף הוא שלכם לחלוטין ולכל מטרה: סגירת חובות או משכנתא קיימת, עזרה כלכלית מיידית לילדים או לנכדים (לרכישת דירה או לימודים), שיפוץ הבית, או מימון מעבר דיור מוגן ושיפור איכות החיים.
              </p>
            </div>
          </div>

          {/* תיבת מידע מודגשת עם צבע המותג שלך */}
          <div className="bg-[#1d75a1]/5 border border-[#1d75a1]/20 p-8 rounded-3xl space-y-4">
            <h4 className="text-lg font-bold text-[#1d75a1] flex items-center gap-2">
              <span>🛡️</span> הביטחון המלא שלכם:
            </h4>
            <ul className="space-y-3 text-slate-700 text-sm leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-[#1d75a1] font-bold">✓</span>
                <span>**זכות מגורים לכל החיים:** הבית נשאר שלכם, ואף גוף פיננסי לא יכול לפנות אתכם.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#1d75a1] font-bold">✓</span>
                <span>**אין מבחני הכנסה:** לא משנה מה גובה הפנסיה שלכם או אם אתם עובדים.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#1d75a1] font-bold">✓</span>
                <span>**הגנת חוב מקסימלי:** חברת הביטוח או הבנק לעולם לא יגבו יותר משווי הנכס עצמו.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 3. 🎯 מרכז הבמה: המחשבון היוקרתי שלך */}
      <section id="calculator-section" className="bg-gradient-to-b from-slate-100 to-white py-24 px-4 border-t border-b border-slate-200/60">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <div className="inline-block bg-[#1d75a1] text-white text-xs font-bold px-3 py-1 rounded-md uppercase tracking-wider mb-2">
              סימולציה דיגיטלית מהירה
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight">כמה כסף מסתתר בקירות שלכם?</h2>
            <p className="text-slate-500 max-w-lg mx-auto">
              הזינו את שווי הנכס המוערך וגיל הלווה הצעיר ביותר כדי לראות את סכום ההלוואה המשוער שתוכלו לקבל.
            </p>
          </div>

          {/* קופסת המחשבון המעוצבת במיליון דולר ומשתלבת עם צבע האתר */}
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden p-1 md:p-1 bg-linear-to-tr from-white via-white to-[#1d75a1]/5">
            <div className="p-1 md:p-1">
              
              {/* קריאה לקומפוננטה שלך */}
              <ReverseMortgageCalculator />

            </div>
          </div>
        </div>
      </section>

      {/* 4. שאלות קריטיות - פירוק התנגדויות ופחדים של הלקוח */}
      <section className="max-w-3xl mx-auto py-24 px-4">
        <h2 className="text-3xl font-bold text-center text-slate-900 mb-4">מה קורה ביום שאחרי?</h2>
        <p className="text-slate-500 text-center max-w-md mx-auto mb-12">תשובות כנות לשאלות הרגישות ביותר שמעסיקות אתכם ואת הילדים שלכם.</p>
        
        <div className="space-y-6">
          <div className="bg-white p-7 rounded-2xl shadow-sm border border-slate-200/60 transition-all hover:border-[#1d75a1]/30">
            <h4 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
              <span className="text-[#1d75a1]">●</span> מה לגבי הירושה של הילדים?
            </h4>
            <p className="text-slate-600 text-sm leading-relaxed pr-5">
              הילדים לא מפסידים דבר. לאחר אריכות ימיכם, ניתנת לילדים תקופה של שנה שלמה להחליט: הם יכולים למכור את הבית, להחזיר לגוף המלווה את סכום המשכנתא ההפוכה, ו**כל שאר יתרת הכסף ממכירת הבית נשארת אצלם ביד**.
            </p>
          </div>

          <div className="bg-white p-7 rounded-2xl shadow-sm border border-slate-200/60 transition-all hover:border-[#1d75a1]/30">
            <h4 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
              <span className="text-[#1d75a1]">●</span> מי קובע את שווי הבית וכמה כסף מקבלים?
            </h4>
            <p className="text-slate-600 text-sm leading-relaxed pr-5">
              שווי הבית נקבע על ידי שמאי מקרקעין מוסמך. אחוז המימון (כמה כסף תקבלו מתוך שווי הבית) נקבע בעיקר לפי הגיל שלכם – ככל שהגיל מבוגר יותר, כך אחוז המימון שניתן לקבל גבוה יותר (לרוב נע בין 15% ל-50% משווי הנכס).
            </p>
          </div>

          <div className="bg-white p-7 rounded-2xl shadow-sm border border-slate-200/60 transition-all hover:border-[#1d75a1]/30">
            <h4 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
              <span className="text-[#1d75a1]">●</span> האם ניתן לפרוע את המשכנתא הזו מוקדם יותר?
            </h4>
            <p className="text-slate-600 text-sm leading-relaxed pr-5">
              בהחלט כן. בכל שלב שתרצו, תוכלו לפרוע את המשכנתא ההפוכה במלואה או בחלקה, ולרוב **ללא קנסות פירעון מוקדם**. גמישות מלאה היא חלק בלתי נפרד מהמוצר הפיננסי הזה.
            </p>
          </div>
        </div>
      </section>

      {/* 5. CONTACT FORM (הנעה לפעולה יוקרתית עם צבע מותג מלא) */}
      <section className="bg-slate-900 text-white py-20 px-4 relative overflow-hidden">
        {/* רקע עם גוון הלוגו שלך בגרסה כהה */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0f3f58] via-slate-900 to-slate-950 opacity-100"></div>

        <div className="max-w-md mx-auto text-center space-y-6 relative z-10">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold">בדיקת היתכנות ללא התחייבות</h2>
            <p className="text-slate-400 text-sm">השאירו פרטים, ומומחה מוסמך למשכנתאות הפוכות יחזור אליכם עם ניתוח ראשוני של הנכס שלכם.</p>
          </div>

          <form className="bg-white p-8 rounded-3xl shadow-2xl text-right space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">שם מלא</label>
              <input type="text" className="w-full px-4 py-3.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1d75a1] text-sm bg-slate-50" placeholder="ישראל ישראלי" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">טלפון ליצירת קשר</label>
              <input type="tel" className="w-full px-4 py-3.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1d75a1] text-sm text-left bg-slate-50" placeholder="050-0000000" dir="ltr" />
            </div>
            <button 
              type="submit" 
              className="w-full bg-[#1d75a1] hover:bg-[#165a7d] text-white font-bold py-4 rounded-xl shadow-lg shadow-[#1d75a1]/20 transition-all text-center"
            >
              בדיקת זכאות חינם
            </button>
          </form>
        </div>
      </section>

    </div>
  );
}
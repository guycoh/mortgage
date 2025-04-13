"use client"

const About = () => {
  return (
    <section className="bg-gray-50 py-12 px-6 md:px-16 text-[#4a473e] " >
      
          
      <div className="max-w-7xl mx-auto text-center">
        <h1 className="text-3xl font-semibold text-gray-800 mb-4">אודות מורגי</h1>
        <p className="text-xl text-gray-600 mb-8">
          במורגי, אנו מבינים שמשכנתא היא לא רק הלוואה, אלא צעד משמעותי בדרך לבית שלך. אנו מציעים ייעוץ מקצועי,
          פתרונות מותאמים אישית ושירות אישי שמלווה אותך בכל תהליך לקיחת המשכנתא.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="text-right">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">המשימה שלנו</h2>
            <p className="text-lg text-gray-600">
              אנחנו במורגי מחויבים להעניק לך את השירות המקצועי ביותר, תוך הבנת הצרכים האישיים שלך ויצירת פתרונות
              פיננסיים שמתאימים לך. כל לקוח הוא סיפור ייחודי, ואנחנו כאן כדי לעזור לך להפוך את החלום לבית למציאות.
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">למה לבחור בנו?</h2>
            <ul className="list-disc list-inside text-lg text-gray-600">
              <li>ייעוץ מקצועי ומדויק על פי הצרכים האישיים שלך.</li>
              <li>גישה מותאמת אישית עם תמיכה צמודה לאורך כל הדרך.</li>
              <li>פתרונות יצירתיים שמתאימים לכל מצב פיננסי.</li>
              <li>שירות מהיר ואמין שמלווה אותך בשלבי הגשת הבקשה והאישור.</li>
            </ul>
          </div>
        </div>
        <div className="mt-12">
          <p className="text-lg text-gray-600">
            בחר במורגי – בחר בתהליך פשוט, מקצועי ויעיל לקבלת המשכנתא שמתאימה לך.
          </p>
        </div>
      </div>
    </section>
  );
};

export default About;

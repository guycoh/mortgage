'use client';

import Image from 'next/image';
import Phone from "@/public/assets/images/svg/phone";
import WhatsappIcon from "@/public/assets/images/svg/whatsapp";

export default function AboutMe() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-100 via-white to-purple-50 p-6">
      <div className="max-w-6xl w-full bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row transition-all duration-700 ease-in-out animate-fade-in-up">
        
        {/* תמונה עם פרלקס קטן */}
        <div className="md:w-1/2 relative h-80 md:h-auto group overflow-hidden">
          <Image
            src="/assets/images/imgFiles/moshe.jpg"
            alt="משה מוסיוב"
            fill
            className="object-cover object-top rounded-t-3xl md:rounded-l-3xl md:rounded-t-none transform group-hover:scale-105 transition-transform duration-700 ease-in-out"
          />
        </div>

        {/* טקסט */}
        <div className="md:w-1/2 p-10 flex flex-col justify-center text-right space-y-6">
          <h1 className="text-5xl font-extrabold bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 bg-clip-text text-transparent leading-tight animate-fade-in">
            נעים מאוד, <br /> אני משה (מושון) מוסיוב
          </h1>

          <p className="text-gray-700 text-lg leading-relaxed space-y-4">
            <span className="block">
              נשוי ואב לארבעה, בעל תואר BA במנהל עסקים וביטוח ותואר MA במדיניות ציבורית ויישוב סכסוכים. יועץ משכנתאות, בעל הבנה מעמיקה במימון, פיננסים ושוק ההון.
            </span>
            <span className="block">
              הגישה שלי מתרכזת בהענקת פתרונות מותאמים אישית, תוך התמקדות בצרכים, ביכולות ובתמונת העתיד הרצויה של לקוחותיי.
            </span>
            <span className="block">
              פועל מתוך תודעת שליחות, ומשתמש בניסיוני ובכישוריי בליווי משפחות ויחידים בקבלת החלטות כלכליות כחלק מצמיחתם האישית והמשפחתית.
            </span>
            <span className="block">
              אוהב לעבוד עם אנשים ומאמין בכוחם של מערכות יחסים ושיתופי פעולה להניע הצלחות אישיות ועסקיות.
            </span>
          </p>

          {/* כפתורים */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center sm:justify-start">
            <a
              href="tel:0502453345"
              aria-label="התקשר למשה מוסיוב"
              className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-lg font-semibold py-3 px-6 rounded-full shadow-xl ring-2 ring-purple-300 hover:ring-purple-500 transition-all duration-300 w-full sm:w-auto"
            >
              <Phone size={24} color="white" />
              <span>דברו איתי</span>
            </a>
            <a
              href="https://wa.me/972502453345"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="שלח הודעת וואטסאפ למשה מוסיוב"
              className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-lg font-semibold py-3 px-6 rounded-full shadow-xl ring-2 ring-green-300 hover:ring-green-500 transition-all duration-300 w-full sm:w-auto"
            >
              <WhatsappIcon size={24} color="white" />
              <span>וואטסאפ</span>
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}

"use client";

import Image from "next/image";

const steps = [
  {
    title: "כניסה למערכת נתוני אשראי",
    image: "/assets/guides/credit-report/step1.jpg",
    description:
      "היכנסו לאתר מערכת נתוני האשראי של בנק ישראל ולחצו על 'אזור אישי'.",
  },
  {
    title: "התחברות באמצעות הזדהות ממשלתית",
    image: "/assets/guides/credit-report/step2.jpg",
    description:
      "התחברו באמצעות מערכת ההזדהות הלאומית עם שם משתמש וסיסמה.",
  },
  {
    title: "בחירת הדוח הדיגיטלי שלך",
    image: "/assets/guides/credit-report/step3.jpg",
    description:
      "לאחר הכניסה בחרו באפשרות 'הדוח הדיגיטלי שלך'.",
  },
  {
    title: "הפקת דוח ריכוז נתונים",
    image: "/assets/guides/credit-report/step4.jpg",
    description:
      "בחרו בדוח ריכוז נתונים והמשיכו לתהליך ההפקה.",
  },
  {
    title: "הורדת קובץ PDF",
    image: "/assets/guides/credit-report/step5.jpg",
    description:
      "הורידו את הדוח למחשב או לטלפון ושמרו אותו.",
  },
  {
    title: "העלאת הדוח למורגי",
    image: "/assets/guides/credit-report/step6.jpg",
    description:
      "חזרו למורגי והעלו את הקובץ לקבלת בדיקה מקצועית.",
  },
];

export default function CreditReportGuide() {
  return (
    <div className="min-h-screen bg-slate-50">

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-orange-400 to-amber-300" />

        <div className="relative max-w-6xl mx-auto px-6 py-20 text-center text-white">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 backdrop-blur">
            מדריך לקוחות Morgi
          </div>

          <h1 className="mt-6 text-4xl md:text-6xl font-black">
            איך מורידים
            <br />
            דוח נתוני אשראי?
          </h1>

          <p className="mt-6 text-lg md:text-xl max-w-2xl mx-auto">
            מדריך קצר ופשוט שיעזור לכם להפיק את דוח נתוני האשראי
            ולהעביר אותו אלינו לצורך בדיקת משכנתא או איחוד הלוואות.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <a
              href="https://www.creditdata.org.il"
              target="_blank"
              className="bg-white text-orange-600 font-bold px-8 py-4 rounded-2xl shadow-xl hover:scale-105 transition"
            >
              מעבר למערכת נתוני אשראי
            </a>

            <a
              href="#steps"
              className="bg-black/20 border border-white/30 px-8 py-4 rounded-2xl backdrop-blur hover:bg-black/30 transition"
            >
              הצגת השלבים
            </a>
          </div>
        </div>
      </section>

      {/* STEPS */}
      <section
        id="steps"
        className="max-w-6xl mx-auto px-4 py-20"
      >
        <div className="space-y-16">
          {steps.map((step, index) => (
            <div
              key={index}
              className="bg-white rounded-3xl shadow-xl overflow-hidden border border-orange-100"
            >
              <div className="grid lg:grid-cols-2">
                
                {/* IMAGE */}
                <div className="relative min-h-[280px] bg-gray-100">
                  <Image
                    src={step.image}
                    alt={step.title}
                    fill
                    className="object-cover"
                  />
                </div>

                {/* CONTENT */}
                <div className="p-8 md:p-12 flex flex-col justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-orange-500 text-white flex items-center justify-center font-black text-xl">
                    {index + 1}
                  </div>

                  <h2 className="mt-6 text-3xl font-black text-slate-800">
                    {step.title}
                  </h2>

                  <p className="mt-4 text-lg leading-8 text-slate-600">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* UPLOAD CTA */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <div className="bg-gradient-to-r from-orange-500 to-amber-400 rounded-[32px] p-10 text-center text-white shadow-2xl">
          <h2 className="text-3xl md:text-4xl font-black">
            סיימתם להוריד את הדוח?
          </h2>

          <p className="mt-4 text-lg">
            העלו אותו עכשיו למערכת Morgi ונחזור אליכם עם בדיקה מקצועית.
          </p>

          <button
            className="
            mt-8
            bg-white
            text-orange-600
            px-10
            py-4
            rounded-2xl
            font-bold
            shadow-xl
            hover:scale-105
            transition
            "
          >
            העלאת דוח נתוני אשראי
          </button>
        </div>
      </section>
    </div>
  );
}
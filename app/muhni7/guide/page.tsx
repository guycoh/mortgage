'use client';
import { useState } from "react";

import Modal from "../calculators/components/modal";
import LoanCalculator from "../calculators/simple_calculator/page";
import CostsCalculator from "../calculators/costs_calculator/page";
import PurchaseTaxForm from "../calculators/purchase_tax_calculator/page";


export default function MortgageGuide() {

  const [isPurchaseTaxModalOpen, setIsPurchaseTaxModalOpen] = useState(false);
 
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalContent, setModalContent] = useState<React.ReactNode>(null)

  const openModalWith = (content: React.ReactNode) => {
    setModalContent(content)
    setIsModalOpen(true)
  }


  return (
    <main className="bg-gradient-to-br from-purple-50 via-violet-100 to-purple-200 text-gray-700 px-6 py-12 sm:px-12 md:px-24 lg:px-32 leading-relaxed">
      <section className="max-w-4xl mx-auto space-y-12">
        <header className="text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-purple-700 mb-4 drop-shadow-md">
            🏠 המדריך המלא ללקיחת משכנתא
          </h1>
          <p className="text-lg sm:text-xl text-gray-600">
            כל מה שאתם צריכים לדעת – בגובה העיניים, באהבה ובמקצועיות.
          </p>
        </header>

        <article className="space-y-10 text-base sm:text-lg text-gray-700">
        <Section
            title="1. להבין מהי משכנתא – ולא למהר לחתום"
            content={
              <>
                <p className="mb-4 text-gray-700">
                  משכנתא היא הלוואה ענקית וארוכת טווח לצורך רכישת דירה. הבנק נותן לכם את הכסף – אבל משעבד את הנכס כבטוחה. תתייחסו לזה כמו חוזה נישואין פיננסי – חשוב להבין מה לוקחים ולמה.
                </p>
                <p className="text-gray-700 font-medium mb-4">
                  המשכנתא היא רק חלק מהתמונה. עלויות נלוות כמו מס רכישה, עו״ד, תיווך, שמאות והובלה עלולות להפתיע. אל תישארו בלי תקציב – השתמשו במחשבון מיוחד שיעזור לכם להבין את התמונה המלאה.
                </p>
                <div className="mt-2">
                   <button
                   
                    onClick={() => openModalWith(<PurchaseTaxForm />)}
                    className="bg-gray-700 text-white text-sm font-medium py-1.5 px-3 rounded-md shadow hover:bg-gray-800 transition mx-2"
                   >
                    🧾 מחשבון מס רכישה
                  </button>             
                  
                  <button
                      onClick={() => openModalWith(<CostsCalculator />)}
                      className="bg-gray-700 text-white text-sm font-medium py-1.5 px-3 rounded-md shadow hover:bg-gray-800 transition mx-2"
                    >
                      🧾 מחשבון עלויות נלוות
                  </button>
                 
                 
                
                
                
                </div>
              </>
            }
          />

          <Section
            title="2. הון עצמי – כמה צריך להביא מהבית?"
            content="בדירה ראשונה הבנק ייתן עד 75% מימון – ואת השאר אתם צריכים להביא בעצמכם. אם הדירה שווה 1.5 מיליון, אתם צריכים לפחות 375,000 ש״ח הון עצמי."
          />
          <Section
               title="3. בדיקת יכולת החזר – המציאות מדברת"
                content={
                  <>
                    <p className="text-gray-700 font-medium mb-4">
                      הבנק יבדוק שאתם יכולים לעמוד בהחזרים. כלל אצבע: לא יותר מ-40% מההכנסה הפנויה. אתם? תכוונו ל-30-35% כדי לנשום.
                    </p>
                    <button
                      onClick={() => openModalWith(<LoanCalculator />)}
                      className="bg-gray-700 text-white text-sm font-medium py-1.5 px-3 rounded-md shadow hover:bg-gray-800 transition mx-2"
                    >
                      🧾 מחשבון הלוואה
                    </button>
                  </>
                }
              />



          <Section
            title="4. מושגים שחייבים להכיר"
            content="קרן, ריבית, לוח סילוקין, אחוז מימון... זה לא סינית. פשוט שפה פיננסית שכדאי להכיר. ככל שתבינו יותר – תשלמו פחות."
          />
          <Section
            title="5. מסלולי ריבית – איפה מרוויחים או נופלים"
            content="פריים? קבועה? משתנה? לא לוקחים את כל הסיכון במסלול אחד. פזרו נכון בין המסלולים, התייעצו, ותזכרו – מה שזול היום יכול להיות יקר מחר."
          />
        
          <Section
            title="6. אישור עקרוני – לא קונים דירה בלעדיו"
            content="זה אישור מהבנק שמעיד כמה משכנתא תוכלו לקבל. חובה לקבל לפני חתימה על חוזה. אחרת? אתם מסכנים הרבה כסף."
          />
          <Section
            title="7. יועץ משכנתאות – חשוב מאוד להיעזר"
            content=" יועץ עצמאי (ולא של הבנק) יכול לחסוך לכם עשרות ואפילו אלפי ש״ח. רק ודאו שהוא מקצועי ואמין,  ."
          />
          <Section
            title="8. ביטוחים – חובה לדעת מה ולמה"
            content="תצטרכו ביטוח חיים וביטוח נכס. אל תמהרו לסגור עם הבנק – אפשר להשוות מחירים ולקבל כיסוי טוב יותר במחיר נמוך יותר."
          />
          <Section
            title="9. החתימה – הרגע האמיתי"
            content="כשתחתמו, תעברו על כל סעיף וסעיף. אל תתביישו לשאול. זו אחת ההחלטות החשובות בחיים – תנו לה את הכבוד הראוי."
          />
          <Section
            title="10. קבלת הכסף – ואז... ברוכים הבאים הביתה"
            content="אחרי שהכול מוכן – הכסף עובר, ואתם עוברים. ברכות! התחלתם דרך חדשה, בדירה שהיא באמת שלכם."
          />

          <div className="bg-purple-100 rounded-2xl p-6 sm:p-8 mt-10 shadow-inner border border-purple-200">
            <h3 className="text-2xl font-semibold text-purple-800 mb-3">לסיכום:</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>דעו כמה הון עצמי יש לכם</li>
              <li>בדקו כמה אתם יכולים להחזיר</li>
              <li>השוו ריביות בין בנקים</li>
              <li>בחרו תמהיל ריביות חכם</li>
              <li>חשוב מאוד !!! להיעזר ביועץ</li>
              <li>אל תחתמו בלי להבין – זו ההתחייבות הכי חשובה שלכם</li>
            </ul>
          </div>

          <footer className="pt-10 border-t border-purple-300 text-center text-purple-700 font-medium text-lg">
            💡 זכרו: משכנתא לוקחים עם הלב – אבל בעיקר עם הראש.
          </footer>
        </article>
      </section>
          <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                {modalContent}
          </Modal>
  
    </main>
  );
}

function Section({
  title,
  content,
}: {
  title: React.ReactNode;
  content: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-purple-700 mb-2">{title}</h2>
      <div>{content}</div>
    </div>
  );
}

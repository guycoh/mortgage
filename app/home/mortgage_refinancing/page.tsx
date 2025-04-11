"use client"
import Image from "next/image";
import Link from "next/link";

export default function MortgageRefinance() {
  return (
    <div className="bg-gray-50 min-h-screen py-12 px-6 sm:px-12 md:px-20">
      <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-2xl p-8 sm:p-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 text-center mb-6">
          מחזור משכנתא - הדרך לחסוך אלפי שקלים
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed text-center mb-6">
          מחזור משכנתא מאפשר לכם להחליף את ההלוואה הקיימת במשכנתא חדשה עם תנאים טובים יותר, ריבית נמוכה יותר,
          או החזר חודשי מופחת. התהליך עשוי להוזיל את ההוצאות החודשיות שלכם ולחסוך לכם סכומים משמעותיים לאורך השנים.
        </p>
        <Image
          src="/assets/images/imgFiles/mortgage_refinance.jpg"
          alt="מחזור משכנתא"
          width={400}
          height={200}
          className="rounded-xl mx-auto"
        />
        <div className="mt-8 space-y-6">
          <div className="bg-orange-100 p-4 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-orange-600">למה למחזר את המשכנתא?</h2>
            <ul className="list-disc list-inside text-gray-700 mt-2">
              <li>הפחתת גובה ההחזר החודשי</li>
              <li>קיצור תקופת המשכנתא</li>
              <li>שיפור תנאי הריבית</li>
              <li>מעבר למסלול ריבית קבועה או משתנה</li>
              <li>שחרור כספים לצרכים נוספים</li>
            </ul>
          </div>
          <div className="bg-blue-100 p-4 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-blue-600">איך מתבצע תהליך מחזור המשכנתא?</h2>
            <p className="text-gray-700 mt-2">
              תהליך המחזור כולל בדיקה של המשכנתא הנוכחית, השוואת הצעות חדשות, חישוב עלויות המחזור, וקבלת משכנתא חדשה
              עם תנאים טובים יותר. המומחים שלנו ילוו אתכם בכל שלב ויוודאו שתקבלו את ההחלטה הטובה ביותר.
            </p>
          </div>
          <div className="bg-green-100 p-4 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-green-600">למי מתאים מחזור משכנתא?</h2>
            <p className="text-gray-700 mt-2">
              אם לקחתם משכנתא לפני מספר שנים, אם הריבית במשק ירדה, אם יש לכם הוצאות חודשיות גבוהות או שאתם רוצים
              לקצר את תקופת המשכנתא – מחזור המשכנתא יכול להיות פתרון חכם עבורכם.
            </p>
          </div>
        </div>
        <div className="text-center mt-10">
          <Link href="/home/schedule" className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg text-lg shadow-md transition duration-300"  >
            
              קבעו פגישה עם מומחה למשכנתאות
        
          </Link>
        </div>
      </div>
    </div>
  );
}

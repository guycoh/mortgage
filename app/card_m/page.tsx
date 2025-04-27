// app/card/page.tsx
import DigitalBusinessCard from "./DigitalBusinessCard";


export const metadata = {
  title: "הכרטיס שלי - מורגי",
  description: "הכרטיס הדיגיטלי של מורגי - משרדים ברמלה ולוד",
  openGraph: {
    title: "הכרטיס שלי - מורגי",
    description: "לחצו כאן לנווט אלינו! הרצל 92 רמלה או שדרות דוד המלך 2 לוד.",
    url: "https://yourwebsite.com/card", // שנה לכתובת האמיתית שלך
    siteName: "Morgi",
    images: [
      {
        url: "https://yourwebsite.com/images/card-preview.jpg", // לינק מלא לתמונה
        width: 1200,
        height: 630,
        alt: "מורגי - משרדים בלוד וברמלה",
      },
    ],
    locale: "he_IL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "הכרטיס שלי - מורגי",
    description: "בקרו אותנו והתחילו דרך חדשה עם משכנתא חכמה!",
    images: ["https://yourwebsite.com/images/card-preview.jpg"],
  },
};

export default function CardPage() {
  return (
    <main >

      <DigitalBusinessCard/>
      {/* כאן הקומפוננטה של הכרטיס שלך */}
      
    </main>
  );
}

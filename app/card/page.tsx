// app/card/page.tsx
import DigitalBusinessCardM from "./DigitalBusinessCard";


export const metadata = {
  title: "הכרטיס שלי - משה מוסיוב",
  description: "הכרטיס הדיגיטלי של משה מוסיוב - משרדים בעפולה ",
  openGraph: {
    title: "הכרטיס שלי ",
    description: "לחצו כאן לנווט אלינו! הרב נחום לוין 7 עפולה .",
    url: "https://morg-orcin.vercel.app/", // שנה לכתובת האמיתית שלך
    siteName: "muhni",
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
    title: "הכרטיס שלי",
    description: "בקרו אותנו והתחילו דרך חדשה עם משכנתא חכמה!",
    images: ["https://yourwebsite.com/images/card-preview.jpg"],
  },
};

export default function CardPage() {
  return (
    <main >

      <DigitalBusinessCardM/>
      {/* כאן הקומפוננטה של הכרטיס שלך */}
  
      {/* ועוד תוכן */}
    </main>
  );
}

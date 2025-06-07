// app/card/page.tsx
import DigitalBusinessCard from "./DigitalBusinessCard";


export const metadata = {
  title: "הכרטיס שלי - משה מוסיוב",
  description: "הכרטיס הדיגיטלי של משה - משרדים בעפולה",
  openGraph: {
    title: "הכרטיס שלי - משה מוסיוב",
    description: "לחצו כאן לנווט אלינו! הרב נחום לוין 10 עפולה.",
    url: "https://morg-orcin.vercel.app/muhni7", // שנה לכתובת האמיתית שלך
    siteName: "muhni",
    images: [
      {
        url: "https://morg-orcin.vercel.app/assets/images/imgFiles/moshe.jpg", // לינק מלא לתמונה
        width: 1200,
        height: 630,
        alt: " משרדים בעפולה",
      },
    ],
    locale: "he_IL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "הכרטיס שלי - משה מוסיוב",
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

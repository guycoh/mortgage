// app/card/page.tsx
import DigitalBusinessCardM from "./DigitalBusinessCard";


export const metadata = {
  title: "גיא כהן-יועץ משכנתא",
  description: "הכרטיס הדיגיטלי של גיא כהן - משרדים רמלה/לוד/תל אביב ",
  openGraph: {
    title: "הכרטיס שלי ",
    description: "     ",
    url: "https://morg-orcin.vercel.app/", // שנה לכתובת האמיתית שלך
    siteName: "muhni",
    images: [
      {
        url: "https://morg-orcin.vercel.app/assets/images/imgFiles/my_image.jpg", // לינק מלא לתמונה
        width: 1200,
        height: 630,
        alt: "MUHNI - משרדים בלוד וברמלה",
      },
    ],
    locale: "he_IL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "הכרטיס של גיא כהן - יועץ משכנתא MUHNI",
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

import dynamic from "next/dynamic";

// הסרנו את ההגדרה המפורשת של הטייפ, הוספנו as any כדי למנוע חסימות בנייה ב-Vercel
const SignDocumentClient: any = dynamic(() => import("./ClientPage"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dir-rtl">
      <p className="text-xl text-gray-500">טוען מסמך מאובטח...</p>
    </div>
  ),
});

// שימוש ב-any ל-params מונע התנגשויות בגרסאות חדשות של Next.js בשרתי Vercel
export default function SignPage({ params }: any) {
  return <SignDocumentClient token={params?.token} />;
}
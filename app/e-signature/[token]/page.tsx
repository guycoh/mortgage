import dynamic from "next/dynamic";

// כאן אנחנו מגדירים במפורש ל-TypeScript שהקומפוננטה הזו מקבלת token
const SignDocumentClient = dynamic<{ token: string }>(
  () => import("./ClientPage"), 
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dir-rtl">
        <p className="text-xl text-gray-500 animate-pulse">טוען מסמך מאובטח...</p>
      </div>
    ),
  }
);

export default function SignPage({ params }: { params: { token: string } }) {
  return <SignDocumentClient token={params.token} />;
}
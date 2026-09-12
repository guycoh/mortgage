"use client";

import { use } from "react";
import dynamic from "next/dynamic";

const SignDocumentClient = dynamic(() => import("./ClientPage"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
      <p className="text-xl text-gray-500">טוען מסמך מאובטח...</p>
    </div>
  ),
});

export default function SignPage({ params }: { params: Promise<{ token: string }> }) {
  // פתיחת ה-Promise כדי לחלץ את הטוקן בבטחה
  const resolvedParams = use(params);

  return <SignDocumentClient token={resolvedParams.token} />;
}
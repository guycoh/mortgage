// app/sign/[token]/page.tsx
"use client";

import { useEffect, useState } from "react";
import SignIntro from "./SignIntro";
import SignComplete from "./SignComplete";
import SignViewer from "./SignViewer";


type Step = "intro" | "sign" | "complete";

export default function SignPage({ params }: { params: { token: string } }) {
  const [step, setStep] = useState<Step>("intro");
  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState<any>(null);

  useEffect(() => {
    fetch(`/sign/api/session/${params.token}`)
      .then(res => res.json())
      .then(data => {
        setDoc(data);
        setLoading(false);
      });
  }, [params.token]);

  if (loading) return <div className="p-10 text-center">טוען מסמך…</div>;
  if (!doc) return <div className="p-10 text-center">קישור לא תקין</div>;

  return (
    <>
      {step === "intro" && (
        <SignIntro onStart={() => setStep("sign")} doc={doc} />
      )}

      {step === "sign" && (
        <SignViewer doc={doc} onComplete={() => setStep("complete")} />
      )}

      {step === "complete" && <SignComplete />}
    </>
  );
}

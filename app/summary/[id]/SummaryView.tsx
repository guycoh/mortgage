"use client";

// The shared brief, on the client's phone. The page is BriefView itself — the
// same one the advisor presented — with the advisor's contact and the expiry.

import BriefView from "@/app/aa105test/components/BriefView";
import type { BriefPayload } from "@/app/aa105test/lib/brief";

export default function SummaryView({ payload, expiresAt }: { payload: BriefPayload; expiresAt: string }) {
  return (
    <main className="brf-root" dir="rtl">
      <BriefView doc={payload.doc} advisor={payload.advisor} expiresAt={expiresAt} mode="client" />
    </main>
  );
}

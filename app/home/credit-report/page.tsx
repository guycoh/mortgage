"use client";

import { useState } from "react";

import LoadingOverlay from "./components/LoadingOverlay";
import { parseCreditReport, ParsedCreditReport } from "./lib/parseCreditReport";
import CreditPdfUploader from "./components/CreditPdfUploader";
import { KpiRow } from "./components/KpiRow";
import { CustomerCard } from "./components/CustomerCard";
import { ScoreCard } from "./components/ScoreCard";
import { AlertsCard } from "./components/AlertsCard";
import { BanksTable } from "./components/BanksTable";

export default function Page() {
  const [data, setData] = useState<ParsedCreditReport | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (file: File) => {
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/credit-report", {
        method: "POST",
        body: formData,
        });

       const json = await res.json();
      const parsed = parseCreditReport(json.rawText);

      setData(parsed);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        <CreditPdfUploader onUpload={handleUpload} />

        {loading && <LoadingOverlay />}

        {data && (
          <>
            <KpiRow data={data} />

            <div className="grid md:grid-cols-3 gap-4">
              <CustomerCard data={data} />
              <ScoreCard score={data.score} />
              <AlertsCard data={data} />
            </div>

            <BanksTable banks={data.banks} />
          </>
        )}

      </div>
    </div>
  );
}
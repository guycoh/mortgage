"use client";

// /aa102test with no lead — the same simulator, on a blank board.
//
// It used to reopen whichever lead was looked at last out of localStorage, so
// this URL was never actually empty and two people opening the same link saw
// different boards. The lead now lives in the path (/aa102test/3) and nowhere
// else, which leaves this route free to be what it should be: a working
// surface with nothing in it yet.
//
// You can drag a report in and edit here. Saving needs a lead, because the
// server is the only store — the button says so until one is picked.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Simulator from "./Simulator";

export default function Aa100TestPage() {
  const router = useRouter();

  // ?lead=3 was the old shape; keep links people already sent working. Read
  // from location rather than useSearchParams, which would force this page to
  // carry a Suspense boundary purely for a legacy redirect.
  useEffect(() => {
    const id = Number(new URLSearchParams(window.location.search).get("lead"));
    if (Number.isFinite(id) && id > 0) router.replace(`/aa102test/${id}`);
  }, [router]);

  return <Simulator lead={null} />;
}

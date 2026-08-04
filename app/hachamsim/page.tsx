"use client";

// /hachamsim — the CEO's layout of the mix simulator, on a blank board.
//
// Same simulator as /aa102test, and deliberately NOT a fork of it: everything
// except the table itself is imported from there, so the two cannot drift on
// how a board loads, saves, imports a report or draws a chart. What differs is
// three things the CEO asked for, and they all live in this folder:
//
//   1. החזר חודשי moves up beside סכום, before מסלול — cost and size read in
//      one glance instead of at opposite ends of a twelve-column scan.
//   2. Each family's subtotal sits UNDER its rows rather than over them.
//   3. תאריך סיום gets its width back and reserves the calendar button's
//      space, so a ten-character date stops printing underneath the icon.
//
// Local only for now. /aa102test and /simulator/board are untouched.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Simulator from "./Simulator";

export default function HachamSimPage() {
  const router = useRouter();

  // ?lead=3 kept working on the original route; keep it working here too.
  useEffect(() => {
    const id = Number(new URLSearchParams(window.location.search).get("lead"));
    if (Number.isFinite(id) && id > 0) router.replace(`/hachamsim/${id}`);
  }, [router]);

  return <Simulator lead={null} />;
}

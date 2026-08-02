// /simulator/admin — the board's monitoring panel.
//
// Reached only by knowing the key: /simulator/admin/auth?key=… mints the
// cookie, and everything else — a missing cookie, a stale one, a missing
// env — renders the same 404 as any path that does not exist. No page in the
// app links here, and the simulator itself carries no trace of it.

import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ADMIN_COOKIE, verifyAdminCookie } from "../lib/admin-auth";
import { loadEvents } from "../lib/telemetry";
import { buildDashboard } from "./aggregate";
import Dashboard from "./Dashboard";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "ניטור הסימולטור",
  robots: { index: false, follow: false },
};

const WINDOWS = [7, 30, 90] as const;

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const secret = process.env.SIMULATOR_ADMIN_KEY;
  if (!secret) notFound();

  const jar = await cookies();
  if (!verifyAdminCookie(jar.get(ADMIN_COOKIE)?.value, secret)) notFound();

  const sp = await searchParams;
  const days = (WINDOWS as readonly number[]).includes(Number(sp.days))
    ? Number(sp.days)
    : 30;

  const { events, sources } = await loadEvents(days);
  const data = buildDashboard(events, days);

  return <Dashboard data={data} sources={sources} />;
}

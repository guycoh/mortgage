// /adminoam — the board's monitoring panel, behind a login.
//
// No page in the app links here. Without a valid session cookie the route
// shows a bare login card; the credentials live in env as a scrypt hash and
// the session is a signed httpOnly cookie scoped to this path.

import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ADMIN_COOKIE, verifyAdminCookie } from "@/app/simulator/lib/admin-auth";
import { loadEvents } from "@/app/simulator/lib/telemetry";
import { buildDashboard } from "./aggregate";
import Dashboard from "./Dashboard";
import Login from "./Login";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "ניטור הסימולטור",
  robots: { index: false, follow: false },
};

const WINDOWS = [7, 30, 90] as const;

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; e?: string }>;
}) {
  // Without the signing secret the panel cannot exist at all — behave like
  // any unknown path rather than half-working.
  const secret = process.env.SIMULATOR_ADMIN_KEY;
  if (!secret) notFound();

  const sp = await searchParams;
  const jar = await cookies();

  if (!verifyAdminCookie(jar.get(ADMIN_COOKIE)?.value, secret)) {
    return <Login error={sp.e} />;
  }

  const days = (WINDOWS as readonly number[]).includes(Number(sp.days))
    ? Number(sp.days)
    : 30;

  const { events, sources } = await loadEvents(days);
  const data = buildDashboard(events, days);

  return <Dashboard data={data} sources={sources} />;
}

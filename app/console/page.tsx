// /console — the simulator's monitoring panel, behind a login.
//
// No page in the app links here and the route is excluded from indexing. With
// no signing secret configured the route does not exist at all: an unconfigured
// deployment 404s rather than half-working, so a missing environment variable
// can never leave a login form standing that nothing can ever open.

import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ADMIN_COOKIE, verifyAdminCookie } from "@/app/simulator/lib/admin-auth";
import { loadEvents, loadLeadRefs, withLeadRefs } from "@/app/simulator/lib/telemetry";
import { buildDashboard } from "./aggregate";
import Console from "./Console";
import Login from "./Login";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "מוקד הסימולטור",
  robots: { index: false, follow: false, nocache: true },
};

const WINDOWS = [7, 30, 90] as const;

export default async function ConsolePage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; e?: string }>;
}) {
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

  // The events know which lead; `leads` knows who that is and which Fireberry
  // record they came in from. Joining before aggregating means every screen
  // downstream gets both without asking.
  const refs = await loadLeadRefs(
    events.map((e) => e.lead_id).filter((n): n is number => n != null)
  );
  const data = buildDashboard(withLeadRefs(events, refs), days);

  return <Console data={data} sources={sources} />;
}

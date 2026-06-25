// app/api/haglot/route.ts
import { NextResponse } from "next/server";

const RESOURCE_ID =
  "7c8255d0-49ef-49db-8904-4cf917586031";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const limit = searchParams.get("limit") || "50";
  const search = searchParams.get("search") || "";

  const url = new URL(
    "https://data.gov.il/api/3/action/datastore_search"
  );

  url.searchParams.set("resource_id", RESOURCE_ID);
  url.searchParams.set("limit", limit);

  if (search) {
    url.searchParams.set("q", search);
  }

  const res = await fetch(url.toString());
  const json = await res.json();

  return NextResponse.json(json.result);
}
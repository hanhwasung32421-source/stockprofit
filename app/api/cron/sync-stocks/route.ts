import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/auth";
import { syncStocks } from "@/lib/stocks-sync";

export const maxDuration = 60;

// 최초 1회 수동 실행:  curl -X POST -H "Authorization: Bearer $CRON_SECRET" <APP_URL>/api/cron/sync-stocks
export async function POST(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await syncStocks());
  } catch (e) {
    console.error("[sync-stocks]", e);
    return NextResponse.json({ error: String(e instanceof Error ? e.message : e) }, { status: 500 });
  }
}

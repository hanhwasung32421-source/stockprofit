import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/supabase-server";
import { cacheStocks, lookupNaver } from "@/lib/stock-lookup";
import { errorMessage } from "@/lib/errors";
import type { StockHit } from "@/lib/types";

const LIMIT = 10;

export async function GET(req: NextRequest) {
  // LIKE 와일드카드 문자 제거
  const q = (req.nextUrl.searchParams.get("q") ?? "").replace(/[%_\\]/g, "").trim().slice(0, 30);
  if (!q) return NextResponse.json({ results: [] });

  let data: StockHit[] | null;
  try {
    const res = await db().rpc("search_stocks", { q, lim: LIMIT });
    if (res.error) throw res.error;
    data = res.data;
  } catch (e) {
    console.error("[search]", e);
    return NextResponse.json({ error: errorMessage(e) }, { status: 500 });
  }
  const results: StockHit[] = (data ?? []).map((s) => ({ code: s.code, name: s.name, market: s.market }));

  // DB에 없는(또는 부족한) 종목은 외부에서 찾아 stocks에 저장 → 종목을 하나씩 추가하는 흐름 지원
  if (results.length < LIMIT) {
    const found = await lookupNaver(q);
    const seen = new Set(results.map((r) => r.code));
    const fresh = found.filter((f) => !seen.has(f.code)).slice(0, LIMIT - results.length);
    if (fresh.length) {
      await cacheStocks(fresh);
      results.push(...fresh);
    }
  }
  return NextResponse.json({ results });
}

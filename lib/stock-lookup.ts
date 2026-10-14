import { db } from "@/lib/supabase-server";
import type { StockHit } from "@/lib/types";

// 네이버 증권 자동완성(비공식)으로 종목명/코드를 찾는다.
// 종목 목록 테이블(stocks)이 비어 있어도 사이트에서 종목을 하나씩 추가할 수 있게 하는 용도.
// 찾은 종목은 stocks 테이블에 저장(캐시)해 다음부터는 DB에서 바로 검색된다.
const ENDPOINT = "https://ac.stock.naver.com/ac";
const MARKETS = new Set(["KOSPI", "KOSDAQ", "KONEX"]);

type NaverItem = { code?: string; name?: string; typeCode?: string; nationCode?: string };

export async function lookupNaver(q: string): Promise<StockHit[]> {
  try {
    const url = new URL(ENDPOINT);
    url.searchParams.set("q", q);
    url.searchParams.set("target", "stock");
    const res = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0" },
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { items?: NaverItem[] };
    const hits: StockHit[] = [];
    for (const it of json.items ?? []) {
      const code = (it.code ?? "").toUpperCase();
      if (it.nationCode !== "KOR" || !MARKETS.has(it.typeCode ?? "") || !/^[0-9A-Z]{6}$/.test(code) || !it.name) continue;
      hits.push({ code, name: it.name, market: it.typeCode! });
    }
    return hits;
  } catch (e) {
    console.error("[stock-lookup] naver failed", e);
    return [];
  }
}

export async function cacheStocks(hits: StockHit[]) {
  if (!hits.length) return;
  const { error } = await db()
    .from("stocks")
    .upsert(hits.map((h) => ({ code: h.code, name: h.name, market: h.market, updated_at: new Date().toISOString() })));
  if (error) console.error("[stock-lookup] cache failed", error);
}

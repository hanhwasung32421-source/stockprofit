import { NextResponse, connection } from "next/server";
import { db } from "@/lib/supabase-server";
import { loadHoldings, profitPct } from "@/lib/holdings";
import { getQuotes } from "@/lib/quotes";
import { isMarketOpen } from "@/lib/quotes/market-hours";
import { evaluateAlerts } from "@/lib/alerts/evaluate";


export async function GET() {
  await connection(); // 항상 요청 시점에 실행 (빌드 시 프리렌더 방지)
  try {
    const holdings = await loadHoldings();
    const { quotes, provider } = await getQuotes(holdings.map((h) => h.code));
    await evaluateAlerts(holdings, quotes);

    // 평가 후 상태를 다시 읽어 응답 (방금 발동한 알람 반영)
    const fresh = await loadHoldings();
    const { data: events } = await db()
      .from("alert_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json({
      serverTime: new Date().toISOString(),
      marketOpen: isMarketOpen(),
      provider,
      holdings: fresh.map((h) => {
        const q = quotes.get(h.code);
        return {
          ...h,
          price: q?.price ?? null,
          changePct: q?.changePct ?? null,
          stale: q ? q.stale : true,
          quotedAt: q?.quotedAt ?? null,
          profitPct: q ? profitPct(q.price, h.avg_price) : null,
        };
      }),
      events: events ?? [],
    });
  } catch (e) {
    console.error("[api/quotes]", e);
    return NextResponse.json({ error: "시세를 불러오지 못했습니다" }, { status: 500 });
  }
}

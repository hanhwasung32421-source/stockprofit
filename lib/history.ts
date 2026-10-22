import { db } from "@/lib/supabase-server";
import { T } from "@/lib/tables";
import { kstDate, profitPct } from "@/lib/holdings";
import { getQuotes } from "@/lib/quotes";
import { elapsedDays } from "@/lib/dates";

/**
 * 삭제 직전의 표 한 줄(현재가·등락률·수익률·경과일 등)을 기록 테이블에 저장한다.
 * 기록 저장이 실패해도(예: 0005 SQL 미실행) 삭제 자체는 막지 않는다.
 */
export async function snapshotHolding(id: string): Promise<void> {
  try {
    const { data: h } = await db().from(T.holdings).select(`*, stocks:${T.stocks}(name, market)`).eq("id", id).maybeSingle();
    if (!h) return;
    const { quotes } = await getQuotes([h.code]);
    const q = quotes.get(h.code);
    const avg = Number(h.avg_price);
    const boughtAt: string = h.bought_at ?? kstDate(h.created_at);
    const { error } = await db().from(T.deleted).insert({
      holding_id: h.id,
      code: h.code,
      name: h.stocks?.name ?? h.code,
      market: h.stocks?.market ?? null,
      price: q?.price ?? null,
      change_pct: q?.changePct ?? null,
      avg_price: avg,
      profit_pct: q ? profitPct(q.price, avg) : null,
      target_pct: Number(h.target_pct),
      bought_at: boughtAt,
      elapsed_days: elapsedDays(boughtAt),
      ...(h.note ? { note: h.note } : {}),
    });
    if (error) console.error("[history] snapshot failed", error);
  } catch (e) {
    console.error("[history] snapshot failed", e);
  }
}

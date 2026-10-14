import { db } from "@/lib/supabase-server";
import { profitPct, type HoldingRow } from "@/lib/holdings";
import type { CachedQuote } from "@/lib/quotes";
import { sendTelegram } from "./telegram";
import { T } from "@/lib/tables";

const REARM_BAND = 1; // %p — 경계에서 왔다갔다할 때 알람 폭탄 방지

const won = (n: number) => n.toLocaleString("ko-KR");
const sign = (n: number) => (n >= 0 ? "+" : "") + n.toFixed(2);

/**
 * 시세로 알람 조건을 평가한다. 상태 전환은 `WHERE alert_state='armed'` 조건부 UPDATE로
 * 원자적으로 처리해, 탭 폴링과 cron이 동시에 돌아도 한 번만 발송된다.
 * 반환값: 이번 호출에서 새로 발동한 holding id 목록
 */
export async function evaluateAlerts(holdings: HoldingRow[], quotes: Map<string, CachedQuote>): Promise<string[]> {
  const fired: string[] = [];

  for (const h of holdings) {
    const q = quotes.get(h.code);
    if (!q || q.stale || !h.enabled) continue;
    const pct = profitPct(q.price, h.avg_price);

    if (h.alert_state === "triggered") {
      // 수익률이 목표보다 REARM_BAND 아래로 내려가면 다시 무장
      if (pct < h.target_pct - REARM_BAND) {
        await db()
          .from(T.holdings)
          .update({ alert_state: "armed", triggered_kind: null, triggered_at: null })
          .eq("id", h.id)
          .eq("alert_state", "triggered");
      }
      continue;
    }

    if (pct < h.target_pct) continue;

    const { data: won_ } = await db()
      .from(T.holdings)
      .update({ alert_state: "triggered", triggered_kind: "target", triggered_at: new Date().toISOString() })
      .eq("id", h.id)
      .eq("alert_state", "armed")
      .select("id");
    if (!won_?.length) continue; // 다른 요청이 먼저 발동시킴

    fired.push(h.id);
    await db().from(T.alertEvents).insert({
      holding_id: h.id,
      code: h.code,
      name: h.name,
      kind: "target",
      price: q.price,
      profit_pct: pct,
    });
    await sendTelegram(
      `🔔🔴 <b>${h.name}</b> (${h.code})
목표 수익률 +${h.target_pct}% 도달
현재가 ${won(q.price)}원 · 매수단가 ${won(h.avg_price)}원
수익률 <b>${sign(pct)}%</b>`,
    );
  }
  return fired;
}

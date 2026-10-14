import { db } from "@/lib/supabase-server";
import { profitPct, type HoldingRow } from "@/lib/holdings";
import type { CachedQuote } from "@/lib/quotes";
import { sendTelegram } from "./telegram";

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
      const rearm =
        (h.triggered_kind === "target" && pct < h.target_pct - REARM_BAND) ||
        (h.triggered_kind === "stop" && h.stop_pct !== null && pct > -h.stop_pct + REARM_BAND);
      if (rearm) {
        await db()
          .from("holdings")
          .update({ alert_state: "armed", triggered_kind: null, triggered_at: null })
          .eq("id", h.id)
          .eq("alert_state", "triggered");
      }
      continue;
    }

    const kind: "target" | "stop" | null =
      pct >= h.target_pct ? "target" : h.stop_pct !== null && pct <= -h.stop_pct ? "stop" : null;
    if (!kind) continue;

    const { data: won_ } = await db()
      .from("holdings")
      .update({ alert_state: "triggered", triggered_kind: kind, triggered_at: new Date().toISOString() })
      .eq("id", h.id)
      .eq("alert_state", "armed")
      .select("id");
    if (!won_?.length) continue; // 다른 요청이 먼저 발동시킴

    fired.push(h.id);
    await db().from("alert_events").insert({
      holding_id: h.id,
      code: h.code,
      name: h.name,
      kind,
      price: q.price,
      profit_pct: pct,
    });
    const icon = kind === "target" ? "🔔🔴" : "⚠️🔵";
    const label = kind === "target" ? `목표 수익률 +${h.target_pct}% 도달` : `손절 기준 -${h.stop_pct}% 도달`;
    await sendTelegram(
      `${icon} <b>${h.name}</b> (${h.code})\n${label}\n현재가 ${won(q.price)}원 · 매수단가 ${won(h.avg_price)}원\n수익률 <b>${sign(pct)}%</b>`,
    );
  }
  return fired;
}

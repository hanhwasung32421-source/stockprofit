import { db } from "@/lib/supabase-server";
import { T } from "@/lib/tables";

export type HoldingRow = {
  id: string;
  code: string;
  name: string;
  market: string;
  avg_price: number;
  qty: number | null;
  target_pct: number;
  enabled: boolean;
  alert_state: "armed" | "triggered";
  triggered_kind: "target" | null;
  triggered_at: string | null;
  created_at: string;
  bought_at: string; // YYYY-MM-DD (추가한 날, 수정 가능)
  sort_order: number | null;
};

/** 0003_order_date.sql 실행 전(컬럼 없음)인지 판별 — 실행 전에도 앱이 죽지 않게 한다 */
export const isMissingColumn = (e: { message?: string } | null | undefined) =>
  !!e?.message && /column .* does not exist|Could not find the '.*' column/i.test(e.message);

const kstDate = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });

export async function loadHoldings(): Promise<HoldingRow[]> {
  const q = () => db().from(T.holdings).select(`*, stocks:${T.stocks}(name, market)`);
  let res = await q().order("sort_order", { ascending: true }).order("created_at", { ascending: true });
  if (isMissingColumn(res.error)) res = await q().order("created_at", { ascending: true });
  const { data, error } = res;
  if (error) throw error;
  return (data ?? []).map((h) => {
    const { stocks, ...rest } = h as Record<string, unknown> & { stocks: { name: string; market: string } | null };
    return {
      ...rest,
      avg_price: Number(h.avg_price),
      target_pct: Number(h.target_pct),
      name: stocks?.name ?? h.code,
      market: stocks?.market ?? "",
      bought_at: h.bought_at ?? kstDate(h.created_at),
      sort_order: h.sort_order ?? null,
    } as HoldingRow;
  });
}

export const profitPct = (price: number, avg: number) => ((price - avg) / avg) * 100;

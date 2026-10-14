import { db } from "@/lib/supabase-server";

export type HoldingRow = {
  id: string;
  code: string;
  name: string;
  market: string;
  avg_price: number;
  qty: number | null;
  target_pct: number;
  stop_pct: number | null;
  enabled: boolean;
  alert_state: "armed" | "triggered";
  triggered_kind: "target" | "stop" | null;
  triggered_at: string | null;
  created_at: string;
};

export async function loadHoldings(): Promise<HoldingRow[]> {
  const { data, error } = await db()
    .from("holdings")
    .select("*, stocks(name, market)")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((h) => {
    const { stocks, ...rest } = h as Record<string, unknown> & { stocks: { name: string; market: string } | null };
    return {
      ...rest,
      avg_price: Number(h.avg_price),
      target_pct: Number(h.target_pct),
      stop_pct: h.stop_pct === null ? null : Number(h.stop_pct),
      name: stocks?.name ?? h.code,
      market: stocks?.market ?? "",
    } as HoldingRow;
  });
}

export const profitPct = (price: number, avg: number) => ((price - avg) / avg) * 100;

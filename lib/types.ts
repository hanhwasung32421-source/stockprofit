export type ClientHolding = {
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
  bought_at: string;
  sort_order: number | null;
  note: string | null;
  price: number | null;
  changePct: number | null;
  stale: boolean;
  quotedAt: string | null;
  profitPct: number | null;
};

export type AlertEvent = {
  id: string;
  code: string;
  name: string;
  kind: "target";
  price: number;
  profit_pct: number;
  created_at: string;
};

export type QuotesResponse = {
  serverTime: string;
  marketOpen: boolean;
  provider: string;
  holdings: ClientHolding[];
  events: AlertEvent[];
};

/** 삭제한 종목의 삭제 당시 표 한 줄 */
export type HistoryItem = {
  id: string;
  code: string;
  name: string;
  market: string | null;
  price: number | null;
  change_pct: number | null;
  avg_price: number;
  profit_pct: number | null;
  target_pct: number;
  bought_at: string | null;
  elapsed_days: number | null;
  note?: string | null;
  deleted_at: string;
};

export type StockHit = { code: string; name: string; market: string };

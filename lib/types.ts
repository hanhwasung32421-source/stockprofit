export type ClientHolding = {
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
  kind: "target" | "stop";
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

export type StockHit = { code: string; name: string; market: string };

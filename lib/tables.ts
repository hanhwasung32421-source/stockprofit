// Supabase 프로젝트를 다른 앱과 함께 쓰더라도 이 앱의 데이터임이 분명하도록 모든 테이블/함수에 stockprofit_ 접두어를 붙인다.
export const T = {
  stocks: "stockprofit_stocks",
  holdings: "stockprofit_holdings",
  priceCache: "stockprofit_price_cache",
  alertEvents: "stockprofit_alert_events",
  kv: "stockprofit_kv",
  deleted: "stockprofit_deleted_holdings",
  searchFn: "stockprofit_search_stocks",
} as const;

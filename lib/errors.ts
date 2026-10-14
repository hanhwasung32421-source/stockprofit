/** 사용자에게 보여줄 오류 문구. 서버 환경변수 누락은 원인을 명확히 알려준다. */
export function errorMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : "";
  if (msg.includes("환경변수")) return `서버 설정 오류: ${msg}`;
  if (/fetch failed|ENOTFOUND|ECONN/i.test(msg)) return "데이터베이스에 연결하지 못했어요 (SUPABASE_URL 확인)";
  if (/relation .* does not exist|Could not find the (table|function)/i.test(msg)) return "DB 테이블이 없어요 — 0001·0003·0004 SQL(stockprofit_ 테이블)을 실행했는지 확인하세요";
  if (/column .* does not exist|Could not find the '.*' column/i.test(msg)) return "DB 업데이트가 필요해요 — supabase/migrations/0003_order_date.sql 을 SQL Editor에서 실행하세요";
  if (/Invalid API key|JWT/i.test(msg)) return "Supabase 키가 올바르지 않아요 (SUPABASE_SERVICE_ROLE_KEY 확인)";
  return "서버 오류가 발생했어요";
}

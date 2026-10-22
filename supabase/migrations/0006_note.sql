-- 종목 "비고" 칸. 종목추가/수정 창에서 입력하고 표의 종목~매수일 사이에 표시됩니다.
-- Supabase SQL Editor에 통째로 붙여넣고 Run. 여러 번 실행해도 안전합니다.
alter table stockprofit_holdings         add column if not exists note text;
alter table stockprofit_deleted_holdings add column if not exists note text;  -- 삭제 기록에도 비고 보관

-- 이 앱의 테이블/함수 이름 앞에 stockprofit_ 를 붙입니다. (데이터는 그대로 유지됨)
-- Supabase SQL Editor에 통째로 붙여넣고 Run. 여러 번 실행해도 안전합니다.
-- ⚠ 코드 배포(Vercel)와 거의 동시에 실행하세요. 이름이 바뀌는 사이에는 앱이 잠깐 오류를 낼 수 있습니다.

alter table if exists stocks       rename to stockprofit_stocks;
alter table if exists holdings     rename to stockprofit_holdings;
alter table if exists price_cache  rename to stockprofit_price_cache;
alter table if exists alert_events rename to stockprofit_alert_events;
alter table if exists kv           rename to stockprofit_kv;

-- 인덱스 이름도 맞춰 줌 (선택 사항이지만 구분이 쉬워집니다)
alter index if exists stocks_name_trgm        rename to stockprofit_stocks_name_trgm;
alter index if exists holdings_code_idx       rename to stockprofit_holdings_code_idx;
alter index if exists alert_events_created_idx rename to stockprofit_alert_events_created_idx;

-- 종목 검색 함수: 새 이름으로 다시 만들고 옛 함수는 삭제
drop function if exists search_stocks(text, int);
create or replace function stockprofit_search_stocks(q text, lim int default 10)
returns setof stockprofit_stocks language sql stable as $$
  select * from stockprofit_stocks
  where name ilike '%' || q || '%' or code like upper(q) || '%'
  order by (code = upper(q)) desc, (name ilike q || '%') desc, similarity(name, q) desc, name
  limit lim;
$$;
revoke all on function stockprofit_search_stocks(text, int) from public, anon, authenticated;

-- 확인: stockprofit_ 로 시작하는 테이블 5개가 보여야 합니다
select table_name from information_schema.tables
where table_schema = 'public' and table_name like 'stockprofit\_%' order by table_name;

-- 자주 쓰는 SQL (Supabase SQL Editor에 복붙)
-- 앱에서 종목을 추가하면 stockprofit_holdings 테이블에 자동 저장됩니다. (테이블 이름은 0004_prefix_tables.sql 에서 stockprofit_ 접두어로 변경)

-- 1) 내가 저장한 종목 + 매수가격 + 현재가 + 수익률 한눈에 보기
select
  s.name                                   as 종목명,
  h.code                                   as 종목코드,
  s.market                                 as 시장,
  h.avg_price                              as 매수가격,
  h.qty                                    as 수량,
  h.target_pct                             as 목표수익률,
  h.stop_pct                               as 손절,
  p.price                                  as 현재가,
  round((p.price - h.avg_price) / h.avg_price * 100, 2) as 수익률_pct,
  h.alert_state                            as 알림상태,
  h.created_at                             as 추가일시
from stockprofit_holdings h
join stockprofit_stocks s on s.code = h.code
left join stockprofit_price_cache p on p.code = h.code
order by h.created_at;

-- 2) 알림 발송 기록
select name as 종목명, kind as 종류, price as 가격, round(profit_pct, 2) as 수익률_pct, created_at as 시각
from stockprofit_alert_events
order by created_at desc
limit 50;

-- 3) 앱 없이 SQL로 직접 추가하고 싶을 때 (종목은 stocks에 있어야 함)
-- insert into stockprofit_holdings (code, avg_price, qty, target_pct)
-- values ('005930', 70000, 10, 10);

-- 4) 저장된 종목 이름 목록(검색 캐시) 확인
select code, name, market from stockprofit_stocks order by name limit 100;

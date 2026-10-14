-- 종목 순서(드래그 정렬) + 매수일자 컬럼. Supabase SQL Editor에 통째로 붙여넣고 Run.
-- 여러 번 실행해도 안전합니다.

-- 1) 매수일자: 기본값 = 추가한 날(한국시간)
alter table holdings add column if not exists bought_at date;
update holdings set bought_at = (created_at at time zone 'Asia/Seoul')::date where bought_at is null;
alter table holdings alter column bought_at set default ((now() at time zone 'Asia/Seoul')::date);
alter table holdings alter column bought_at set not null;

-- 2) 표시 순서: 작은 숫자가 위. 기존 종목은 추가한 순서대로 채움
alter table holdings add column if not exists sort_order integer;
update holdings h
set sort_order = r.rn
from (select id, row_number() over (order by created_at) as rn from holdings) r
where h.id = r.id and h.sort_order is null;
alter table holdings alter column sort_order set default 0;
alter table holdings alter column sort_order set not null;

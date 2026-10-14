-- 삭제한 종목의 "삭제 당시" 표 한 줄을 보관하는 기록 테이블. SQL Editor에 통째로 붙여넣고 Run.
-- 여러 번 실행해도 안전합니다.
create table if not exists stockprofit_deleted_holdings (
  id           uuid primary key default gen_random_uuid(),
  holding_id   uuid,                 -- 삭제된 원본 보유종목 id (참고용)
  code         text not null,
  name         text not null,
  market       text,
  price        numeric,              -- 삭제 당시 현재가
  change_pct   numeric,              -- 삭제 당시 등락률(전일대비 %)
  avg_price    numeric not null,     -- 매수가
  profit_pct   numeric,              -- 삭제 당시 수익률 %
  target_pct   numeric not null,     -- 목표 수익률 %
  bought_at    date,                 -- 매수일
  elapsed_days integer,              -- 삭제 당시 매수경과일 (D+N 의 N)
  deleted_at   timestamptz not null default now()
);
create index if not exists stockprofit_deleted_holdings_deleted_idx
  on stockprofit_deleted_holdings (deleted_at desc);

-- 서버(service role)만 접근. anon/authenticated는 정책이 없으므로 차단.
alter table stockprofit_deleted_holdings enable row level security;

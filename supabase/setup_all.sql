-- stockprofit 전체 DB 구조 (최종본). 새 Supabase 프로젝트의 SQL Editor에 통째로 붙여넣고 Run 한 번.
-- 0001~0006 마이그레이션을 합친 것입니다. 여러 번 실행해도 안전합니다.
-- (탭을 닫아도 오는 1분 알림용 pg_cron 설정은 별도: 0002_cron.sql)

create extension if not exists pg_trgm;

-- 종목 목록(검색 캐시)
create table if not exists stockprofit_stocks (
  code text primary key check (code ~ '^[0-9A-Z]{6}$'),
  name text not null,
  market text not null,
  isin text,
  updated_at timestamptz not null default now()
);
create index if not exists stockprofit_stocks_name_trgm on stockprofit_stocks using gin (name gin_trgm_ops);

-- 보유종목
create table if not exists stockprofit_holdings (
  id uuid primary key default gen_random_uuid(),
  code text not null references stockprofit_stocks(code),
  avg_price numeric not null check (avg_price > 0),
  qty integer check (qty is null or qty > 0),
  target_pct numeric not null check (target_pct > 0),
  enabled boolean not null default true,
  alert_state text not null default 'armed' check (alert_state in ('armed','triggered')),
  triggered_kind text check (triggered_kind in ('target','stop')),
  triggered_at timestamptz,
  created_at timestamptz not null default now(),
  bought_at date not null default ((now() at time zone 'Asia/Seoul')::date),  -- 매수일: 기본 = 추가한 날(한국시간)
  sort_order integer not null default 0,                                        -- 표시 순서 (작을수록 위)
  note text                                                                     -- 비고
);
create index if not exists stockprofit_holdings_code_idx on stockprofit_holdings(code);

-- 시세 캐시
create table if not exists stockprofit_price_cache (
  code text primary key,
  price numeric not null,
  change_pct numeric,
  quoted_at timestamptz not null default now(),
  fetched_at timestamptz not null default now()
);

-- 알림 발송 기록
create table if not exists stockprofit_alert_events (
  id uuid primary key default gen_random_uuid(),
  holding_id uuid references stockprofit_holdings(id) on delete set null,
  code text not null,
  name text not null,
  kind text not null check (kind in ('target','stop')),
  price numeric not null,
  profit_pct numeric not null,
  created_at timestamptz not null default now()
);
create index if not exists stockprofit_alert_events_created_idx on stockprofit_alert_events(created_at desc);

-- 설정/토큰 저장소
create table if not exists stockprofit_kv (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- 삭제한 종목의 삭제 당시 표 한 줄 (기록 버튼)
create table if not exists stockprofit_deleted_holdings (
  id           uuid primary key default gen_random_uuid(),
  holding_id   uuid,
  code         text not null,
  name         text not null,
  market       text,
  price        numeric,
  change_pct   numeric,
  avg_price    numeric not null,
  profit_pct   numeric,
  target_pct   numeric not null,
  bought_at    date,
  elapsed_days integer,
  note         text,
  deleted_at   timestamptz not null default now()
);
create index if not exists stockprofit_deleted_holdings_deleted_idx on stockprofit_deleted_holdings (deleted_at desc);

-- 서버(service role)만 접근. anon/authenticated는 정책이 없으므로 전부 차단.
alter table stockprofit_stocks           enable row level security;
alter table stockprofit_holdings         enable row level security;
alter table stockprofit_price_cache      enable row level security;
alter table stockprofit_alert_events     enable row level security;
alter table stockprofit_kv               enable row level security;
alter table stockprofit_deleted_holdings enable row level security;

-- 종목 검색: 이름 부분일치(trgm) + 코드 prefix
create or replace function stockprofit_search_stocks(q text, lim int default 10)
returns setof stockprofit_stocks language sql stable as $$
  select * from stockprofit_stocks
  where name ilike '%' || q || '%' or code like upper(q) || '%'
  order by (code = upper(q)) desc, (name ilike q || '%') desc, similarity(name, q) desc, name
  limit lim;
$$;
revoke all on function stockprofit_search_stocks(text, int) from public, anon, authenticated;

-- 확인: 테이블 6개가 보여야 합니다
select table_name from information_schema.tables
where table_schema = 'public' and table_name like 'stockprofit\_%' order by table_name;

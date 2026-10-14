create extension if not exists pg_trgm;

create table stocks (
  code text primary key check (code ~ '^[0-9A-Z]{6}$'),
  name text not null,
  market text not null,
  isin text,
  updated_at timestamptz not null default now()
);
create index stocks_name_trgm on stocks using gin (name gin_trgm_ops);

create table holdings (
  id uuid primary key default gen_random_uuid(),
  code text not null references stocks(code),
  avg_price numeric not null check (avg_price > 0),
  qty integer check (qty is null or qty > 0),
  target_pct numeric not null check (target_pct > 0),
  stop_pct numeric check (stop_pct is null or stop_pct > 0), -- 손절 기준(양수로 저장: 5 = -5%)
  enabled boolean not null default true,
  alert_state text not null default 'armed' check (alert_state in ('armed','triggered')),
  triggered_kind text check (triggered_kind in ('target','stop')),
  triggered_at timestamptz,
  created_at timestamptz not null default now()
);
create index holdings_code_idx on holdings(code);

create table price_cache (
  code text primary key,
  price numeric not null,
  change_pct numeric,
  quoted_at timestamptz not null default now(),  -- 시세 자체의 시각
  fetched_at timestamptz not null default now()  -- 우리가 가져온 시각 (캐시 신선도 판단)
);

create table alert_events (
  id uuid primary key default gen_random_uuid(),
  holding_id uuid references holdings(id) on delete set null,
  code text not null,
  name text not null,
  kind text not null check (kind in ('target','stop')),
  price numeric not null,
  profit_pct numeric not null,
  created_at timestamptz not null default now()
);
create index alert_events_created_idx on alert_events(created_at desc);

create table kv (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- 서버(service role)만 접근. anon/authenticated는 정책이 없으므로 전부 차단.
alter table stocks enable row level security;
alter table holdings enable row level security;
alter table price_cache enable row level security;
alter table alert_events enable row level security;
alter table kv enable row level security;

-- 종목 검색: 이름 부분일치(trgm) + 코드 prefix
create or replace function search_stocks(q text, lim int default 10)
returns setof stocks language sql stable as $$
  select * from stocks
  where name ilike '%' || q || '%' or code like upper(q) || '%'
  order by (code = upper(q)) desc, (name ilike q || '%') desc, similarity(name, q) desc, name
  limit lim;
$$;
revoke all on function search_stocks(text, int) from public, anon, authenticated;

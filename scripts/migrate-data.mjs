// 기존 Supabase(.env.local) → 새 Supabase(.env.new) 데이터 복사. 새 프로젝트에 setup_all.sql 을 먼저 실행해야 한다.
// 사용: node scripts/migrate-data.mjs        (원본은 읽기만 하고 바꾸지 않는다)
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = (file) =>
  Object.fromEntries(
    readFileSync(new URL(`../${file}`, import.meta.url), "utf8")
      .split(/\r?\n/)
      .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
      .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
  );
const mk = (e) => createClient(e.SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const oldE = env(".env.local");
const newE = env(".env.new");
if (oldE.SUPABASE_URL === newE.SUPABASE_URL) throw new Error("원본과 대상이 같은 프로젝트입니다");
const from = mk(oldE);
const to = mk(newE);

// 외래키 순서: stocks → holdings → 나머지
const plan = [
  { table: "stockprofit_stocks", pk: "code" },
  {
    table: "stockprofit_holdings",
    pk: "id",
    // 예전에 쓰던 손절(stop_pct) 컬럼은 새 구조에 없다
    map: ({ stop_pct, ...r }) => r, // eslint-disable-line no-unused-vars
  },
  { table: "stockprofit_price_cache", pk: "code" },
  { table: "stockprofit_alert_events", pk: "id" },
  { table: "stockprofit_deleted_holdings", pk: "id" },
  { table: "stockprofit_kv", pk: "key" },
];

for (const { table, pk, map } of plan) {
  const { data, error } = await from.from(table).select("*");
  if (error) throw new Error(`${table} 읽기 실패: ${error.message}`);
  const rows = (data ?? []).map((r) => (map ? map(r) : r));
  let copied = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const { error: e } = await to.from(table).upsert(chunk, { onConflict: pk });
    if (e) throw new Error(`${table} 쓰기 실패: ${e.message}`);
    copied += chunk.length;
  }
  const { count } = await to.from(table).select("*", { count: "exact", head: true });
  console.log(`${table.padEnd(32)} 원본 ${String(rows.length).padStart(3)}행 → 새 DB ${String(count).padStart(3)}행 ${count === rows.length ? "✅" : "⚠ 행 수 불일치"}`);
}
console.log("완료");

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { T } from "@/lib/tables";

let client: SupabaseClient | null = null;

/** 서버 전용 (service role). 브라우저로 내려보내지 않는다. */
export function db(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다");
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return client;
}

export async function kvGet<T>(key: string): Promise<T | null> {
  const { data } = await db().from(T.kv).select("value").eq("key", key).maybeSingle();
  return (data?.value as T) ?? null;
}

export async function kvSet(key: string, value: unknown) {
  const { error } = await db().from(T.kv).upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw error;
}

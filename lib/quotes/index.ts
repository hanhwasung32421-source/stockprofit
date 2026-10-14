import { db } from "@/lib/supabase-server";
import { isLiveWindow } from "./market-hours";
import { KisProvider } from "./kis";
import { NaverProvider } from "./naver";
import { YahooProvider } from "./yahoo";
import type { Market, Quote, QuoteProvider } from "./provider";
import { T } from "@/lib/tables";

/** 폴백이 쓰인 경우(예: 네이버 장애 → Yahoo) 최근 20초간 그 이름을 화면에 알린다 */
let fallbackName: string | null = null;
let fallbackUntil = 0;
const activeProviderName = (primary: string) => (fallbackName && Date.now() < fallbackUntil ? fallbackName : primary);

/** 앞 제공자가 못 가져온 종목은 다음 제공자로 넘기는 폴백 체인 */
class ChainProvider implements QuoteProvider {
  readonly name: string;
  constructor(private chain: QuoteProvider[]) {
    this.name = chain[0].name;
  }
  async fetchQuotes(items: { code: string; market: Market }[]): Promise<Quote[]> {
    const got = new Map<string, Quote>();
    for (const p of this.chain) {
      const rest = items.filter((i) => !got.has(i.code));
      if (!rest.length) break;
      try {
        const res = await p.fetchQuotes(rest);
        for (const q of res) got.set(q.code, q);
        if (res.length && p !== this.chain[0]) {
          fallbackName = p.name;
          fallbackUntil = Date.now() + 20_000;
        }
      } catch (e) {
        console.error(`[quotes] ${p.name} failed`, e);
      }
    }
    return [...got.values()];
  }
}

/** KIS 키가 있으면 KIS(공식·실시간) → 네이버(실시간, 비공식) → Yahoo(지연) 순 */
export function getProvider(): QuoteProvider {
  const chain: QuoteProvider[] = [];
  if (process.env.KIS_APP_KEY && process.env.KIS_APP_SECRET) chain.push(new KisProvider());
  chain.push(new NaverProvider(), new YahooProvider());
  return new ChainProvider(chain);
}

export type CachedQuote = Quote & { stale: boolean };

/**
 * 캐시 우선 시세 조회. 평일 08–19시 3초 / 그 외 5분 이내 캐시는 재사용해
 * 여러 탭·cron이 동시에 호출해도 증권사 API 호출 제한을 넘기지 않는다.
 */
export async function getQuotes(codes: string[]): Promise<{ quotes: Map<string, CachedQuote>; provider: string }> {
  const provider = getProvider();
  const unique = [...new Set(codes)];
  const quotes = new Map<string, CachedQuote>();
  if (!unique.length) return { quotes, provider: provider.name };

  const ttlMs = isLiveWindow() ? 3_000 : 5 * 60_000; // 평일 08–19시 3초, 그 외 5분
  const now = Date.now();

  const { data: cached } = await db().from(T.priceCache).select("*").in("code", unique);
  const fresh = new Set<string>();
  for (const c of cached ?? []) {
    const age = now - new Date(c.fetched_at ?? c.quoted_at).getTime();
    quotes.set(c.code, {
      code: c.code,
      price: Number(c.price),
      changePct: c.change_pct === null ? null : Number(c.change_pct),
      quotedAt: c.quoted_at,
      stale: age > ttlMs,
    });
    if (age <= ttlMs) fresh.add(c.code);
  }

  const need = unique.filter((c) => !fresh.has(c));
  if (need.length) {
    const { data: meta } = await db().from(T.stocks).select("code, market").in("code", need);
    const items = (meta ?? []).map((m) => ({ code: m.code as string, market: m.market as string }));
    try {
      const live = await provider.fetchQuotes(items);
      if (live.length) {
        const fetchedAt = new Date().toISOString();
        await db()
          .from(T.priceCache)
          .upsert(live.map((q) => ({ code: q.code, price: q.price, change_pct: q.changePct, quoted_at: q.quotedAt, fetched_at: fetchedAt })));
        for (const q of live) quotes.set(q.code, { ...q, stale: false });
      }
    } catch (e) {
      console.error("[quotes] provider failed", e); // 캐시된(stale) 값으로 degrade
    }
  }
  return { quotes, provider: activeProviderName(provider.name) };
}

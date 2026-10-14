import YahooFinance from "yahoo-finance2";
import type { Market, Quote, QuoteProvider } from "./provider";

// 비공식 API — 키가 없을 때의 폴백/개발용. 시세가 지연될 수 있다.
const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const suffix = (m: Market) => (m === "KOSDAQ" ? ".KQ" : ".KS");

export class YahooProvider implements QuoteProvider {
  readonly name = "yahoo";

  async fetchQuotes(items: { code: string; market: Market }[]): Promise<Quote[]> {
    if (!items.length) return [];
    const bySymbol = new Map(items.map((i) => [i.code + suffix(i.market), i.code]));
    const res = await yf.quote([...bySymbol.keys()], {}, { validateResult: false });
    const out: Quote[] = [];
    for (const r of res as unknown as Array<Record<string, unknown>>) {
      const code = bySymbol.get(String(r.symbol));
      const price = Number(r.regularMarketPrice);
      if (!code || !Number.isFinite(price) || price <= 0) continue;
      const t = r.regularMarketTime;
      out.push({
        code,
        price,
        changePct: typeof r.regularMarketChangePercent === "number" ? r.regularMarketChangePercent : null,
        quotedAt: t instanceof Date ? t.toISOString() : new Date().toISOString(),
      });
    }
    return out;
  }
}

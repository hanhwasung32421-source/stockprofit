import type { Market, Quote, QuoteProvider } from "./provider";

// 네이버 증권 실시간 폴링(비공식, 키 불필요, 지연 0). 응답 형식이 바뀌면 깨질 수 있어 Yahoo가 뒤에서 받쳐준다.
const ENDPOINT = process.env.NAVER_POLLING_URL ?? "https://polling.finance.naver.com/api/realtime/domestic/stock";
const FAIL_COOLDOWN_MS = 30_000; // 네이버 호출이 실패하면 30초간은 건너뛰고 바로 Yahoo로 (매번 5초 기다리지 않도록)
let failedUntil = 0;
const BATCH = 20;

type Item = {
  itemCode?: string;
  closePrice?: string;
  fluctuationsRatio?: string;
  localTradedAt?: string;
};

const num = (s: string | undefined) => Number((s ?? "").replace(/,/g, ""));

export class NaverProvider implements QuoteProvider {
  readonly name = "naver";

  async fetchQuotes(items: { code: string; market: Market }[]): Promise<Quote[]> {
    const out: Quote[] = [];
    if (Date.now() < failedUntil) return out;
    for (let i = 0; i < items.length; i += BATCH) {
      const codes = items.slice(i, i + BATCH).map((x) => x.code);
      try {
        const res = await fetch(`${ENDPOINT}/${codes.join(",")}`, {
          headers: { "user-agent": "Mozilla/5.0" },
          cache: "no-store",
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) {
          failedUntil = Date.now() + FAIL_COOLDOWN_MS;
          continue;
        }
        const json = (await res.json()) as { datas?: Item[] };
        if (!json.datas?.length) failedUntil = Date.now() + FAIL_COOLDOWN_MS; // 응답 형식이 바뀐 경우도 장애로 취급
        for (const d of json.datas ?? []) {
          const price = num(d.closePrice);
          if (!d.itemCode || !Number.isFinite(price) || price <= 0) continue;
          const chg = num(d.fluctuationsRatio);
          out.push({
            code: d.itemCode,
            price,
            changePct: Number.isFinite(chg) ? chg : null,
            quotedAt: d.localTradedAt ? new Date(d.localTradedAt).toISOString() : new Date().toISOString(),
          });
        }
      } catch (e) {
        failedUntil = Date.now() + FAIL_COOLDOWN_MS;
        console.error("[naver] fetch failed", e);
      }
    }
    return out;
  }
}

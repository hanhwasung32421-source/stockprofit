export type Market = "KOSPI" | "KOSDAQ" | "KONEX" | string;

export type Quote = {
  code: string;
  price: number;
  changePct: number | null;
  quotedAt: string; // ISO
};

export interface QuoteProvider {
  readonly name: string;
  /** 종목별 현재가 조회. 실패한 종목은 결과에서 빠진다. */
  fetchQuotes(items: { code: string; market: Market }[]): Promise<Quote[]>;
}

/** 동시 실행 수를 제한하며 map (증권사 초당 호출 제한 보호) */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

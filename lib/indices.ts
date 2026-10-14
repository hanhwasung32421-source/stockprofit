// 상단 지수 바용 데이터: 코스피·코스닥(+개인/외국인/기관 순매수), 나스닥·S&P 500
// 출처: 네이버 증권(비공식) — 가격은 폴링 API, 차트는 당일(최근 거래일) 1분봉, 순매수는 trend API.
// 서버 메모리에 짧게 캐시해 여러 탭이 열려 있어도 네이버 호출 수를 줄인다.

export type IndexId = "KOSPI" | "KOSDAQ" | "NASDAQ" | "SP500";

export type IndexData = {
  id: IndexId;
  name: string;
  kind: "domestic" | "world";
  link: string; // 클릭 시 이동 (토스증권 지수 페이지)
  price: number;
  change: number; // 전일 대비 (부호 포함)
  changePct: number; // 전일 대비 % (부호 포함)
  open: boolean; // 정규장 진행 중
  prevClose: number | null;
  pts: [number, number][]; // [개장 후 경과 분, 지수]
  span: number; // 정규장 전체 분 (코스피/코스닥/미국 모두 390)
  investors?: { personal: number; foreign: number; institution: number }; // 억원, 순매수
};

const META: Record<IndexId, { name: string; kind: "domestic" | "world"; code: string; link: string }> = {
  KOSPI: { name: "코스피", kind: "domestic", code: "KOSPI", link: "https://www.tossinvest.com/indices/KGG01P" },
  KOSDAQ: { name: "코스닥", kind: "domestic", code: "KOSDAQ", link: "https://www.tossinvest.com/indices/QGG01P" },
  NASDAQ: { name: "나스닥", kind: "world", code: ".IXIC", link: "https://www.tossinvest.com/indices/COMP.NAI" },
  SP500: { name: "S&P 500", kind: "world", code: ".INX", link: "https://www.tossinvest.com/indices/SPX.CBI" },
};
const ORDER: IndexId[] = ["KOSPI", "KOSDAQ", "NASDAQ", "SP500"];

const HEADERS = { "user-agent": "Mozilla/5.0" };
const num = (s: unknown) => Number(String(s ?? "").replace(/[,+]/g, ""));

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: HEADERS, cache: "no-store", signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return (await res.json()) as T;
}

// ---- 간단한 TTL 캐시 (실패하면 마지막 성공값을 돌려줌) ----
const cache = new Map<string, { at: number; value: unknown; inflight?: Promise<unknown> }>();
async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T | null> {
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && !hit.inflight && now - hit.at < ttlMs) return hit.value as T;
  if (hit?.inflight) return (await hit.inflight.catch(() => hit.value)) as T | null;
  const p = fn();
  cache.set(key, { at: hit?.at ?? 0, value: hit?.value ?? null, inflight: p });
  try {
    const value = await p;
    cache.set(key, { at: Date.now(), value });
    return value;
  } catch (e) {
    console.error("[indices]", key, e);
    cache.set(key, { at: hit?.at ?? 0, value: hit?.value ?? null }); // 다음 호출 때 다시 시도
    return (hit?.value as T) ?? null;
  }
}

// ---- 가격 (국내 / 해외 각 1회 호출로 일괄) ----
type Poll = { closePrice?: string; compareToPreviousClosePrice?: string; fluctuationsRatio?: string; compareToPreviousPrice?: { name?: string }; marketStatus?: string; itemCode?: string; reutersCode?: string };
type Quote = { price: number; change: number; changePct: number; open: boolean };

function toQuote(d: Poll): Quote | null {
  const price = num(d.closePrice);
  if (!Number.isFinite(price) || price <= 0) return null;
  const falling = d.compareToPreviousPrice?.name?.includes("FALL") ?? false;
  const sign = (n: number) => (falling ? -Math.abs(n) : Math.abs(n));
  const flat = d.compareToPreviousPrice?.name === "STEADY";
  return {
    price,
    change: flat ? 0 : sign(num(d.compareToPreviousClosePrice)),
    changePct: flat ? 0 : sign(num(d.fluctuationsRatio)),
    open: d.marketStatus === "OPEN",
  };
}

const domesticQuotes = () =>
  cached("poll-kr", 4_000, async () => {
    const j = await getJson<{ datas?: Poll[] }>("https://polling.finance.naver.com/api/realtime/domestic/index/KOSPI,KOSDAQ");
    return new Map((j.datas ?? []).map((d) => [d.itemCode ?? "", toQuote(d)] as const));
  });

const worldQuotes = () =>
  cached("poll-world", 20_000, async () => {
    const j = await getJson<{ datas?: Poll[] }>("https://polling.finance.naver.com/api/realtime/worldstock/index/.IXIC,.INX");
    return new Map((j.datas ?? []).map((d) => [d.reutersCode ?? "", toQuote(d)] as const));
  });

// ---- 차트: 최근 거래일 1분봉 ----
type Chart = { openTime?: string; closeTime?: string; lastClosePrice?: number; priceInfos?: { localDateTime: string; currentPrice: number }[] };
// "20261014121600" → 하루 중 분 (hh*60+mm)
const minOfDay = (s: string) => Number(s.slice(8, 10)) * 60 + Number(s.slice(10, 12));

async function chartOf(id: IndexId) {
  const m = META[id];
  const url =
    m.kind === "domestic"
      ? `https://api.stock.naver.com/chart/domestic/index/${m.code}?periodType=day`
      : `https://api.stock.naver.com/chart/foreign/index/${m.code}?periodType=day`;
  return cached(`chart-${id}`, m.kind === "domestic" ? 20_000 : 60_000, async () => {
    const j = await getJson<Chart>(url);
    const openMin = j.openTime ? minOfDay(j.openTime) : 540;
    const closeMin = j.closeTime ? minOfDay(j.closeTime) : openMin + 390;
    const all = (j.priceInfos ?? []).filter((p) => Number.isFinite(p.currentPrice));
    // 3분 간격으로 줄이되 마지막 점은 항상 포함 (전송량 절약)
    const pts: [number, number][] = all
      .map((p, i) => [i, minOfDay(p.localDateTime) - openMin, p.currentPrice] as const)
      .filter(([i], idx, arr) => i % 3 === 0 || idx === arr.length - 1)
      .map(([, t, v]) => [t, v] as [number, number]);
    return { pts, span: Math.max(closeMin - openMin, 60), prevClose: j.lastClosePrice ?? null };
  });
}

// ---- 개인/외국인/기관 순매수 (국내만) ----
const investorsOf = (id: IndexId) =>
  cached(`trend-${id}`, 15_000, async () => {
    const j = await getJson<{ personalValue?: string; foreignValue?: string; institutionalValue?: string }>(
      `https://m.stock.naver.com/api/index/${META[id].code}/trend`,
    );
    return { personal: num(j.personalValue), foreign: num(j.foreignValue), institution: num(j.institutionalValue) };
  });

export async function getIndices(): Promise<IndexData[]> {
  const [kr, world] = await Promise.all([domesticQuotes(), worldQuotes()]);
  const rows = await Promise.all(
    ORDER.map(async (id): Promise<IndexData | null> => {
      const m = META[id];
      const quote = (m.kind === "domestic" ? kr : world)?.get(m.code) ?? null;
      const [chart, inv] = await Promise.all([chartOf(id), m.kind === "domestic" ? investorsOf(id) : Promise.resolve(null)]);
      if (!quote && !chart) return null;
      const pts = chart?.pts ?? [];
      const price = quote?.price ?? pts.at(-1)?.[1] ?? 0;
      // 차트의 마지막 점을 실시간 가격으로 맞춰 숫자와 그래프가 어긋나지 않게
      if (quote && pts.length) pts[pts.length - 1] = [pts[pts.length - 1][0], price];
      const prev = chart?.prevClose ?? null;
      return {
        id,
        name: m.name,
        kind: m.kind,
        link: m.link,
        price,
        change: quote?.change ?? (prev ? price - prev : 0),
        changePct: quote?.changePct ?? (prev ? ((price - prev) / prev) * 100 : 0),
        open: quote?.open ?? false,
        prevClose: prev,
        pts,
        span: chart?.span ?? 390,
        ...(inv ? { investors: inv } : {}),
      };
    }),
  );
  return rows.filter((r): r is IndexData => r !== null);
}

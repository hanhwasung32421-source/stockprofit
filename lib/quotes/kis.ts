import { kvGet, kvSet } from "@/lib/supabase-server";
import { mapLimit, type Market, type Quote, type QuoteProvider } from "./provider";

// 한국투자증권 KIS Open API — 국내주식 현재가 (FHKST01010100)
const BASE = {
  real: "https://openapi.koreainvestment.com:9443",
  paper: "https://openapivts.koreainvestment.com:29443",
};

type Token = { token: string; expiresAt: number };
let memToken: Token | null = null;

function baseUrl() {
  return process.env.KIS_ENV === "paper" ? BASE.paper : BASE.real;
}

/** 토큰은 DB(kv)에 저장해 서버리스 인스턴스 간 공유 (재발급 제한 회피) */
async function getToken(): Promise<string> {
  const now = Date.now();
  if (memToken && memToken.expiresAt - 60_000 > now) return memToken.token;

  const stored = await kvGet<Token>("kis_token");
  if (stored && stored.token && stored.expiresAt - 60_000 > now) {
    memToken = stored;
    return stored.token;
  }

  const res = await fetch(`${baseUrl()}/oauth2/tokenP`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey: process.env.KIS_APP_KEY,
      appsecret: process.env.KIS_APP_SECRET,
    }),
  });
  const json = (await res.json()) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!res.ok || !json.access_token) throw new Error(`KIS 토큰 발급 실패: ${json.error_description ?? res.status}`);
  const token: Token = { token: json.access_token, expiresAt: now + (json.expires_in ?? 86400) * 1000 };
  memToken = token;
  await kvSet("kis_token", token);
  return token.token;
}

async function fetchOne(code: string, retry = true): Promise<Quote | null> {
  const token = await getToken();
  const url = new URL(`${baseUrl()}/uapi/domestic-stock/v1/quotations/inquire-price`);
  url.searchParams.set("FID_COND_MRKT_DIV_CODE", "J");
  url.searchParams.set("FID_INPUT_ISCD", code);
  const res = await fetch(url, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      authorization: `Bearer ${token}`,
      appkey: process.env.KIS_APP_KEY!,
      appsecret: process.env.KIS_APP_SECRET!,
      tr_id: "FHKST01010100",
      custtype: "P",
    },
    cache: "no-store",
  });
  const json = (await res.json()) as {
    rt_cd?: string;
    msg_cd?: string;
    output?: { stck_prpr?: string; prdy_ctrt?: string };
  };
  // 호출 제한(EGW00201): 짧게 쉬고 1회 재시도
  if (json.msg_cd === "EGW00201" && retry) {
    await new Promise((r) => setTimeout(r, 600));
    return fetchOne(code, false);
  }
  // 토큰 만료/무효: 캐시 폐기 후 1회 재시도
  if ((json.msg_cd === "EGW00123" || json.msg_cd === "EGW00121") && retry) {
    memToken = null;
    await kvSet("kis_token", { token: "", expiresAt: 0 });
    return fetchOne(code, false);
  }
  const price = Number(json.output?.stck_prpr);
  if (json.rt_cd !== "0" || !Number.isFinite(price) || price <= 0) return null;
  const chg = Number(json.output?.prdy_ctrt);
  return { code, price, changePct: Number.isFinite(chg) ? chg : null, quotedAt: new Date().toISOString() };
}

export class KisProvider implements QuoteProvider {
  readonly name = "kis";

  async fetchQuotes(items: { code: string; market: Market }[]): Promise<Quote[]> {
    // 모의투자는 초당 ~2회 제한이라 동시성을 낮춘다
    const limit = process.env.KIS_ENV === "paper" ? 1 : 5;
    const results = await mapLimit(items, limit, async (i) => {
      try {
        return await fetchOne(i.code);
      } catch (e) {
        console.error("[kis] fetch failed", i.code, e);
        return null;
      }
    });
    return results.filter((q): q is Quote => q !== null);
  }
}

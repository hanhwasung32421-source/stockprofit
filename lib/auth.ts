// Web Crypto 기반 HMAC 서명 쿠키 (proxy / route handler 양쪽에서 사용)
export const SESSION_COOKIE = "sp_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 30;

const enc = new TextEncoder();

async function hmac(data: string): Promise<string> {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) throw new Error("SESSION_SECRET 환경변수가 필요합니다 (16자 이상)");
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function createSessionToken(): Promise<string> {
  const exp = String(Math.floor(Date.now() / 1000) + MAX_AGE_SEC);
  return `${exp}.${await hmac(exp)}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  return safeEqual(sig, await hmac(exp));
}

export function checkPassword(input: string): boolean {
  const pw = process.env.APP_PASSWORD;
  return !!pw && safeEqual(input, pw);
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_SEC,
};

/** cron / webhook 용 Bearer 시크릿 검사 */
export function isCronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return safeEqual(req.headers.get("authorization") ?? "", `Bearer ${secret}`);
}

import { NextResponse } from "next/server";
import { SESSION_COOKIE, checkPassword, createSessionToken, sessionCookieOptions } from "@/lib/auth";

// 무차별 대입 완화: 실패 시 지연 (서버리스라 인스턴스별 best-effort)
let failures = 0;

export async function POST(req: Request) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  if (failures > 0) await new Promise((r) => setTimeout(r, Math.min(failures, 5) * 500));
  if (typeof password !== "string" || !checkPassword(password)) {
    failures++;
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다" }, { status: 401 });
  }
  failures = 0;
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await createSessionToken(), sessionCookieOptions);
  return res;
}

import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

// 로그인 없이 접근 가능한 경로 (cron/webhook은 각 핸들러에서 시크릿으로 인증)
const PUBLIC = ["/login", "/api/login", "/api/cron/", "/api/telegram/webhook"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p))) return NextResponse.next();

  if (await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|sounds/).*)"],
};

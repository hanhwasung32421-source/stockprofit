import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/supabase-server";
import { getQuotes } from "@/lib/quotes";
import { T } from "@/lib/tables";


/** 종목 추가 다이얼로그의 현재가 미리보기 / 코드 검증용 */
export async function GET(req: NextRequest) {
  const code = (req.nextUrl.searchParams.get("code") ?? "").toUpperCase();
  if (!/^[0-9A-Z]{6}$/.test(code)) return NextResponse.json({ error: "종목코드는 6자리입니다" }, { status: 400 });

  const { data: stock } = await db().from(T.stocks).select("*").eq("code", code).maybeSingle();
  if (!stock) return NextResponse.json({ error: "존재하지 않는 종목코드입니다" }, { status: 404 });

  const { quotes } = await getQuotes([code]);
  const q = quotes.get(code);
  if (!q) return NextResponse.json({ error: "현재가를 조회할 수 없습니다 (거래정지/상장폐지 가능)", stock }, { status: 422 });
  return NextResponse.json({ stock, price: q.price, changePct: q.changePct });
}

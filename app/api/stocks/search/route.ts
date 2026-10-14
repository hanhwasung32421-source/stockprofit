import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/supabase-server";


export async function GET(req: NextRequest) {
  // LIKE 와일드카드 문자 제거
  const q = (req.nextUrl.searchParams.get("q") ?? "").replace(/[%_\\]/g, "").trim().slice(0, 30);
  if (!q) return NextResponse.json({ results: [] });
  const { data, error } = await db().rpc("search_stocks", { q, lim: 10 });
  if (error) {
    console.error("[search]", error);
    return NextResponse.json({ error: "검색 실패" }, { status: 500 });
  }
  return NextResponse.json({ results: data ?? [] });
}

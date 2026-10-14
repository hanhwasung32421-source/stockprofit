import { NextResponse, connection } from "next/server";
import { getIndices } from "@/lib/indices";

/** 상단 지수 바 (코스피·코스닥·나스닥·S&P 500) */
export async function GET() {
  await connection();
  try {
    return NextResponse.json({ indices: await getIndices() });
  } catch (e) {
    console.error("[api/indices]", e);
    return NextResponse.json({ error: "지수를 불러오지 못했습니다" }, { status: 500 });
  }
}

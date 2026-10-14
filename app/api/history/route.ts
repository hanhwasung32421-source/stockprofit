import { NextResponse } from "next/server";
import { db } from "@/lib/supabase-server";
import { errorMessage } from "@/lib/errors";
import { T } from "@/lib/tables";

/** 삭제한 종목 기록 (최근 삭제 순, 최대 300건) */
export async function GET() {
  try {
    const { data, error } = await db().from(T.deleted).select("*").order("deleted_at", { ascending: false }).limit(300);
    if (error) throw error;
    return NextResponse.json({ items: data ?? [] });
  } catch (e) {
    console.error("[api/history]", e);
    return NextResponse.json({ error: errorMessage(e) }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase-server";
import { getQuotes } from "@/lib/quotes";


const createSchema = z.object({
  code: z.string().regex(/^[0-9A-Z]{6}$/),
  avg_price: z.number().positive(),
  qty: z.number().int().positive().nullable().optional(),
  target_pct: z.number().positive().max(1000),
  stop_pct: z.number().positive().max(100).nullable().optional(),
});

export async function POST(req: Request) {
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "입력값을 확인해 주세요" }, { status: 400 });
  const body = parsed.data;

  const { data: stock } = await db().from("stocks").select("code").eq("code", body.code).maybeSingle();
  if (!stock) return NextResponse.json({ error: "존재하지 않는 종목코드입니다" }, { status: 404 });

  // 실제로 시세가 조회되는 종목만 저장 (잘못된 코드 / 거래정지 방지)
  const { quotes } = await getQuotes([body.code]);
  if (!quotes.has(body.code)) {
    return NextResponse.json({ error: "현재가를 조회할 수 없는 종목입니다" }, { status: 422 });
  }

  const { data, error } = await db()
    .from("holdings")
    .insert({
      code: body.code,
      avg_price: body.avg_price,
      qty: body.qty ?? null,
      target_pct: body.target_pct,
      stop_pct: body.stop_pct ?? null,
    })
    .select()
    .single();
  if (error) {
    console.error("[holdings.create]", error);
    return NextResponse.json({ error: "저장 실패" }, { status: 500 });
  }
  return NextResponse.json({ holding: data }, { status: 201 });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase-server";

const patchSchema = z
  .object({
    avg_price: z.number().positive(),
    qty: z.number().int().positive().nullable(),
    target_pct: z.number().positive().max(1000),
    stop_pct: z.number().positive().max(100).nullable(),
    enabled: z.boolean(),
    rearm: z.boolean(),
  })
  .partial();

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "입력값을 확인해 주세요" }, { status: 400 });
  const { rearm, ...fields } = parsed.data;

  // 조건(단가/목표/손절)이 바뀌거나 사용자가 다시 켜면 알람을 재무장
  const conditionChanged = "avg_price" in fields || "target_pct" in fields || "stop_pct" in fields;
  const update: Record<string, unknown> = { ...fields };
  if (rearm || conditionChanged || fields.enabled === true) {
    update.alert_state = "armed";
    update.triggered_kind = null;
    update.triggered_at = null;
  }
  const { data, error } = await db().from("holdings").update(update).eq("id", id).select().maybeSingle();
  if (error) return NextResponse.json({ error: "수정 실패" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "종목을 찾을 수 없습니다" }, { status: 404 });
  return NextResponse.json({ holding: data });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const { error } = await db().from("holdings").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

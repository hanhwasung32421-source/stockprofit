import { NextResponse, connection } from "next/server";
import { getChatId, sendTelegram, setWebhook, telegramConfigured } from "@/lib/alerts/telegram";
import { getProvider } from "@/lib/quotes";


export async function GET() {
  await connection();
  return NextResponse.json({
    provider: getProvider().name,
    telegram: { configured: telegramConfigured(), connected: !!(await getChatId()) },
  });
}

/** action: "telegram-test" | "telegram-webhook" */
export async function POST(req: Request) {
  const { action } = (await req.json().catch(() => ({}))) as { action?: string };

  if (action === "telegram-test") {
    const ok = await sendTelegram("🔔 테스트 알림입니다. 정상적으로 연결되었어요!");
    return ok
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: "발송 실패 — 봇에게 /start 를 먼저 보내 주세요" }, { status: 400 });
  }

  if (action === "telegram-webhook") {
    if (!telegramConfigured()) return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN이 설정되지 않았습니다" }, { status: 400 });
    const origin = new URL(req.url).origin;
    const r = await setWebhook(`${origin}/api/telegram/webhook`);
    return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.description ?? "웹훅 등록 실패" }, { status: 400 });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}

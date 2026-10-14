import { NextResponse } from "next/server";
import { sendTelegram, setChatId } from "@/lib/alerts/telegram";


// 봇에게 /start 를 보내면 chat_id를 자동 저장한다.
export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const update = (await req.json().catch(() => null)) as {
    message?: { chat?: { id?: number }; text?: string };
  } | null;
  const chatId = update?.message?.chat?.id;
  const text = update?.message?.text?.trim() ?? "";
  if (chatId && text.startsWith("/start")) {
    await setChatId(chatId);
    await sendTelegram("✅ 연결되었습니다. 목표 수익률 도달 시 이 채팅으로 알려드릴게요.", chatId);
  }
  return NextResponse.json({ ok: true });
}

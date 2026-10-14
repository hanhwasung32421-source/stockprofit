import { kvGet, kvSet } from "@/lib/supabase-server";

const api = (method: string) => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`;

export const telegramConfigured = () => !!process.env.TELEGRAM_BOT_TOKEN;

export async function getChatId(): Promise<number | null> {
  return kvGet<number>("telegram_chat_id");
}

export async function setChatId(id: number) {
  await kvSet("telegram_chat_id", id);
}

export async function sendTelegram(text: string, chatId?: number): Promise<boolean> {
  if (!telegramConfigured()) return false;
  const target = chatId ?? (await getChatId());
  if (!target) return false;
  try {
    const res = await fetch(api("sendMessage"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: target, text, parse_mode: "HTML" }),
    });
    return res.ok;
  } catch (e) {
    console.error("[telegram] send failed", e);
    return false;
  }
}

export async function setWebhook(url: string): Promise<{ ok: boolean; description?: string }> {
  const res = await fetch(api("setWebhook"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url, secret_token: process.env.TELEGRAM_WEBHOOK_SECRET, allowed_updates: ["message"] }),
  });
  return res.json();
}

"use client";

import { BellRing } from "lucide-react";
import { pct, won } from "@/lib/format";
import type { AlertEvent } from "@/lib/types";

export function AlertBanner({ events, onAck }: { events: AlertEvent[]; onAck: () => void }) {
  if (!events.length) return null;
  return (
    <div role="alert" className="pulse-ring mb-4 rounded-3xl border border-up bg-up-soft p-4">
      <div className="flex items-start gap-3">
        <BellRing className="mt-0.5 shrink-0 text-up" />
        <div className="min-w-0 flex-1">
          <ul className="space-y-1">
            {events.slice(0, 5).map((e) => (
              <li key={e.id} className="text-sm font-semibold text-up">
                {e.kind === "target" ? "🔔 목표 도달" : "⚠️ 손절 기준 도달"} · {e.name}{" "}
                <span className="num">
                  {pct(Number(e.profit_pct))} (₩{won(Number(e.price))})
                </span>
              </li>
            ))}
          </ul>
        </div>
        <button onClick={onAck} className="shrink-0 rounded-xl bg-up px-4 py-2 text-sm font-bold text-white">
          확인
        </button>
      </div>
    </div>
  );
}

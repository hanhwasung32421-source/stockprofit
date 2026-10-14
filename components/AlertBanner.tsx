"use client";

import { BellRing } from "lucide-react";
import { pct, won } from "@/lib/format";
import type { AlertEvent } from "@/lib/types";

export function AlertBanner({ events, onAck }: { events: AlertEvent[]; onAck: () => void }) {
  if (!events.length) return null;
  return (
    <div role="alert" className="pulse-ring mb-2 flex items-start gap-2 rounded-lg border border-up bg-up-soft px-3 py-2">
      <BellRing size={16} className="mt-0.5 shrink-0 text-up" />
      <ul className="min-w-0 flex-1 space-y-0.5">
        {events.slice(0, 5).map((e) => (
          <li key={e.id} className="text-[13px] font-semibold text-up">
            {e.kind === "target" ? "목표 도달" : "손절 도달"} · {e.name}{" "}
            <span className="num">
              {pct(Number(e.profit_pct))} (₩{won(Number(e.price))})
            </span>
          </li>
        ))}
      </ul>
      <button onClick={onAck} className="shrink-0 rounded bg-up px-3 py-1 text-xs font-bold text-white">
        확인
      </button>
    </div>
  );
}

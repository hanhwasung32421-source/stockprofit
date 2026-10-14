"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, Minus, Pencil, RotateCcw } from "lucide-react";
import { MarketBadge } from "./StockCombobox";
import { pct, timeAgo, tone, won } from "@/lib/format";
import type { ClientHolding } from "@/lib/types";

export function HoldingCard({
  h,
  onEdit,
  onDelete,
  onToggle,
  onRearm,
}: {
  h: ClientHolding;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onRearm: () => void;
}) {
  const prev = useRef<number | null>(h.price);
  const [flash, setFlash] = useState("");
  useEffect(() => {
    if (h.price != null && prev.current != null && h.price !== prev.current) {
      setFlash(h.price > prev.current ? "flash-up" : "flash-down");
      const t = setTimeout(() => setFlash(""), 900);
      prev.current = h.price;
      return () => clearTimeout(t);
    }
    prev.current = h.price;
  }, [h.price]);

  const profit = h.profitPct;
  const progress = profit != null && profit > 0 ? Math.min(profit / h.target_pct, 1) : 0;
  const triggered = h.alert_state === "triggered";
  const targetPrice = h.avg_price * (1 + h.target_pct / 100);
  const evalAmount = h.qty && h.price ? h.price * h.qty : null;
  const pnlAmount = h.qty && h.price ? (h.price - h.avg_price) * h.qty : null;

  return (
    <article
      className={`rounded-3xl border bg-surface p-5 shadow-sm transition ${
        triggered ? "pulse-ring border-up" : "border-border"
      } ${h.enabled ? "" : "opacity-60"}`}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-lg font-bold">{h.name}</h3>
            <MarketBadge market={h.market} />
          </div>
          <div className="num text-xs text-muted">{h.code}</div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={onToggle} aria-label={h.enabled ? "알림 끄기" : "알림 켜기"} title={h.enabled ? "알림 끄기" : "알림 켜기"} className="rounded-full p-2 text-muted hover:bg-surface-2">
            {h.enabled ? <Bell size={18} /> : <BellOff size={18} />}
          </button>
          <button onClick={onEdit} aria-label="수정" className="rounded-full p-2 text-muted hover:bg-surface-2">
            <Pencil size={18} />
          </button>
          <button onClick={onDelete} aria-label={`${h.name} 삭제`} className="rounded-full p-2 text-muted hover:bg-up-soft hover:text-up">
            <Minus size={18} />
          </button>
        </div>
      </header>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <div className="text-xs text-muted">내 수익률</div>
          <div className={`num text-3xl font-extrabold ${tone(profit)}`}>{profit != null ? pct(profit) : "–"}</div>
          {pnlAmount != null && (
            <div className={`num text-sm ${tone(pnlAmount)}`}>
              {pnlAmount > 0 ? "+" : ""}
              {won(pnlAmount)}원
            </div>
          )}
        </div>
        <div className="text-right">
          <div className={`num inline-block rounded-lg px-1 text-xl font-bold ${flash}`}>{h.price != null ? `₩${won(h.price)}` : "–"}</div>
          {h.changePct != null && <div className={`num text-sm ${tone(h.changePct)}`}>전일대비 {pct(h.changePct)}</div>}
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs text-muted">
          <span>매수 ₩{won(h.avg_price)}</span>
          <span>
            목표 +{h.target_pct}% (₩{won(Math.round(targetPrice))})
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="목표 달성률">
          <div className={`h-full rounded-full transition-all duration-500 ${progress >= 1 ? "bg-up" : "bg-primary"}`} style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-xs text-muted">
          <span>{Math.round(progress * 100)}% 달성</span>
          {h.stop_pct != null && <span>손절 -{h.stop_pct}%</span>}
        </div>
      </div>

      {triggered && (
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-up-soft px-3 py-2 text-sm font-semibold text-up">
          <span>{h.triggered_kind === "stop" ? "⚠️ 손절 기준 도달" : "🔔 목표 수익률 도달!"}</span>
          <button onClick={onRearm} className="flex items-center gap-1 text-xs underline">
            <RotateCcw size={12} /> 다시 켜기
          </button>
        </div>
      )}

      <footer className="num mt-3 flex justify-between text-[11px] text-muted">
        <span>{h.qty ? `${h.qty}주 · 평가 ₩${evalAmount ? won(evalAmount) : "–"}` : "수량 미입력"}</span>
        <span>{h.stale ? "⏳ 시세 지연 중" : timeAgo(h.quotedAt)}</span>
      </footer>
    </article>
  );
}

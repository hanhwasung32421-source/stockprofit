"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, Minus, Pencil, RotateCcw } from "lucide-react";
import { pct, tone, won } from "@/lib/format";
import type { ClientHolding } from "@/lib/types";

export const COLS = "hts-grid";

export function HoldingHeader() {
  return (
    <div className={`${COLS} border-b border-border bg-surface-2 px-3 py-1.5 text-[11px] font-semibold text-muted`}>
      <div>종목</div>
      <div className="text-right">현재가</div>
      <div className="hidden text-right md:block">등락률</div>
      <div className="hidden text-right md:block">매수가</div>
      <div className="text-right">수익률</div>
      <div className="text-right">목표</div>
      <div className="hidden text-right md:block">평가손익</div>
      <div />
    </div>
  );
}

/** HTS 스타일: 한 종목 = 한 줄 */
export function HoldingRow({
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
  const pnl = h.qty && h.price ? (h.price - h.avg_price) * h.qty : null;

  return (
    <div
      className={`${COLS} border-b border-border px-3 py-2 text-[13px] transition-colors hover:bg-surface-2 ${
        triggered ? "bg-up-soft" : ""
      } ${h.enabled ? "" : "opacity-50"}`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1 truncate font-bold">
          {triggered && (
            <button onClick={onRearm} title="알림 발동됨 — 눌러서 다시 켜기" aria-label="알림 다시 켜기" className="shrink-0">
              🔔
            </button>
          )}
          <span className="truncate">{h.name}</span>
        </div>
        <div className="num text-[10px] text-muted">
          {h.code}
          <span className="hidden sm:inline"> · {h.market}</span>
          {h.qty ? ` · ${h.qty}주` : ""}
        </div>
      </div>

      <div className={`num text-right text-sm font-bold ${tone(h.changePct)}`}>
        <span className={`rounded px-1 ${flash}`}>{h.price != null ? won(h.price) : "–"}</span>
        <div className={`md:hidden text-[10px] font-normal ${tone(h.changePct)}`}>{h.changePct != null ? pct(h.changePct) : ""}</div>
      </div>

      <div className={`num hidden text-right md:block ${tone(h.changePct)}`}>{h.changePct != null ? pct(h.changePct) : "–"}</div>
      <div className="num hidden text-right text-muted md:block">{won(h.avg_price)}</div>

      <div className={`num text-right text-sm font-extrabold ${tone(profit)}`}>{profit != null ? pct(profit) : "–"}</div>

      <div className="num text-right">
        <div className="text-[11px] text-muted">
          +{h.target_pct}%{h.stop_pct != null && <span className="hidden md:inline"> / -{h.stop_pct}%</span>}
        </div>
        <div className="ml-auto mt-0.5 h-1.5 w-full max-w-20 overflow-hidden rounded-full bg-surface-2 md:bg-border" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="목표 달성률">
          <div className={`h-full rounded-full ${progress >= 1 ? "bg-up" : "bg-primary"}`} style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      <div className={`num hidden text-right md:block ${tone(pnl)}`}>
        {pnl != null ? `${pnl > 0 ? "+" : ""}${won(pnl)}` : "–"}
        {h.stale && <div className="text-[10px] text-warn">지연</div>}
      </div>

      <div className="flex justify-end gap-0.5 text-muted">
        {triggered && (
          <button onClick={onRearm} aria-label="알림 다시 켜기" title="알림 다시 켜기" className="hidden rounded p-1.5 text-up hover:bg-surface md:block">
            <RotateCcw size={15} />
          </button>
        )}
        <button onClick={onToggle} aria-label={h.enabled ? "알림 끄기" : "알림 켜기"} title={h.enabled ? "알림 끄기" : "알림 켜기"} className="rounded p-1 hover:bg-surface md:p-1.5">
          {h.enabled ? <Bell size={15} /> : <BellOff size={15} />}
        </button>
        <button onClick={onEdit} aria-label="수정" title="수정" className="rounded p-1 hover:bg-surface md:p-1.5">
          <Pencil size={15} />
        </button>
        <button onClick={onDelete} aria-label={`${h.name} 삭제`} title="삭제" className="rounded p-1 hover:bg-surface hover:text-up md:p-1.5">
          <Minus size={15} />
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { COLS } from "./HoldingRow";
import { pct, tone, won } from "@/lib/format";
import { COLUMN_DEFS, dLabel, gridVars, type ColKey } from "@/lib/columns";
import type { HistoryItem } from "@/lib/types";

const shortDate = (d: string | null) => (d ? `${d.slice(2, 4)}.${d.slice(5, 7)}.${d.slice(8, 10)}` : "–");
const cellCls = (c: ColKey) => `min-w-0 text-center ${COLUMN_DEFS[c].sm ? "" : "hidden md:block"}`;

function Cell({ c, it }: { c: ColKey; it: HistoryItem }) {
  switch (c) {
    case "name":
      return (
        <div>
          <div className="truncate font-bold">{it.name}</div>
          <div className="num text-[10px] text-muted">
            {it.code}
            {it.market ? ` · ${it.market}` : ""}
          </div>
        </div>
      );
    case "price":
      return <div className={`num text-sm font-bold ${tone(it.change_pct)}`}>{it.price != null ? won(it.price) : "–"}</div>;
    case "changePct":
      return <div className={`num ${tone(it.change_pct)}`}>{it.change_pct != null ? pct(it.change_pct) : "–"}</div>;
    case "avg_price":
      return <div className="num text-muted">{won(it.avg_price)}</div>;
    case "profitPct":
      return <div className={`num text-sm font-extrabold ${tone(it.profit_pct)}`}>{it.profit_pct != null ? pct(it.profit_pct) : "–"}</div>;
    case "target":
      return <div className="num text-[11px] text-muted">+{it.target_pct}%</div>;
    case "note":
      return <div className="truncate text-[12px]" title={it.note ?? ""}>{it.note}</div>;
    case "bought_at":
      return <div className="num text-[12px] text-muted">{shortDate(it.bought_at)}</div>;
    case "elapsed":
      return <div className="num text-[12px] font-semibold">{it.elapsed_days != null ? dLabel(it.elapsed_days) : "–"}</div>;
  }
}

/** 삭제한 종목 기록: 메인 표와 같은 구성(열 순서 포함)으로, 삭제 당시의 값을 그대로 보여준다 */
export function HistoryDialog({ open, onClose, cols }: { open: boolean; onClose: () => void; cols: ColKey[] }) {
  const [items, setItems] = useState<HistoryItem[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    let alive = true;
    fetch("/api/history")
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!alive) return;
        if (!r.ok) {
          setError(j.error ?? "기록을 불러오지 못했어요");
          setItems([]);
        } else {
          setError("");
          setItems(j.items ?? []);
        }
      })
      .catch(() => {
        if (alive) {
          setError("기록을 불러오지 못했어요");
          setItems([]);
        }
      });
    return () => {
      alive = false;
    };
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title={`삭제 기록${items ? ` (${items.length})` : ""}`} width="max-w-6xl">
      <p className="mb-2 text-[11px] text-muted">삭제한 종목의 삭제 당시 값입니다 (현재가·등락률·수익률·경과일은 삭제 시점 기준으로 고정). 최근 삭제 순.</p>
      {error && <div className="mb-2 border border-up bg-up-soft px-2 py-1.5 text-xs text-up">⚠ {error}</div>}
      <div className="overflow-hidden border border-border">
        <div style={gridVars(cols)} className={`${COLS} border-b border-border bg-surface-2 px-3 py-1.5 text-[11px] font-semibold text-muted`}>
          {cols.map((c) => (
            <div key={c} className={cellCls(c)}>
              {COLUMN_DEFS[c].label}
            </div>
          ))}
          <div className="text-center">삭제일시</div>
        </div>
        <div className="max-h-[56vh] overflow-y-auto">
          {items === null ? (
            <div className="px-3 py-6 text-center text-xs text-muted">불러오는 중…</div>
          ) : items.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted">삭제한 종목이 없습니다.</div>
          ) : (
            items.map((it) => (
              <div key={it.id} style={gridVars(cols)} className={`${COLS} border-b border-border px-3 py-2 text-[13px] last:border-b-0 hover:bg-surface-2`}>
                {cols.map((c) => (
                  <div key={c} className={cellCls(c)}>
                    <Cell c={c} it={it} />
                  </div>
                ))}
                <div className="num text-center text-[11px] text-muted">
                  {new Date(it.deleted_at).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}

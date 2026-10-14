"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, ChevronDown, ChevronUp, GripVertical, Minus, Pencil, RotateCcw } from "lucide-react";
import { pct, tone, won } from "@/lib/format";
import type { ClientHolding } from "@/lib/types";

export const COLS = "hts-grid";

export type SortKey = "name" | "price" | "changePct" | "avg_price" | "profitPct" | "target_pct" | "bought_at";
export type SortState = { key: SortKey; dir: "asc" | "desc" } | null;

/** YYYY-MM-DD → YY.MM.DD */
const shortDate = (d: string) => (d ? `${d.slice(2, 4)}.${d.slice(5, 7)}.${d.slice(8, 10)}` : "–");

function SortHead({
  label,
  k,
  sort,
  onSort,
  className = "",
}: {
  label: string;
  k: SortKey;
  sort: SortState;
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  const active = sort?.key === k;
  return (
    <div className={className}>
      <button
        onClick={() => onSort(k)}
        title="클릭: 오름차순 → 내림차순 → 원래 순서"
        className={`inline-flex items-center gap-0.5 whitespace-nowrap rounded px-0.5 py-0.5 hover:bg-border md:px-1 ${active ? "text-foreground" : ""}`}
      >
        {label}
        {active ? sort.dir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} /> : <span className="w-3" />}
      </button>
    </div>
  );
}

export function HoldingHeader({ sort, onSort }: { sort: SortState; onSort: (k: SortKey) => void }) {
  return (
    <div className={`${COLS} border-b border-border bg-surface-2 px-3 py-1 text-[11px] font-semibold text-muted`}>
      <SortHead label="종목" k="name" sort={sort} onSort={onSort} className="pl-4" />
      <SortHead label="현재가" k="price" sort={sort} onSort={onSort} className="text-right" />
      <SortHead label="등락률" k="changePct" sort={sort} onSort={onSort} className="hidden text-right md:block" />
      <SortHead label="매수가" k="avg_price" sort={sort} onSort={onSort} className="hidden text-right md:block" />
      <SortHead label="수익률" k="profitPct" sort={sort} onSort={onSort} className="text-right" />
      <SortHead label="목표" k="target_pct" sort={sort} onSort={onSort} className="text-right" />
      <SortHead label="매수일" k="bought_at" sort={sort} onSort={onSort} className="hidden text-right md:block" />
      <div />
    </div>
  );
}

/** 매수일: 클릭하면 날짜 선택으로 바뀌어 수정할 수 있다 */
function DateCell({ value, onChange, className = "" }: { value: string; onChange: (d: string) => void; className?: string }) {
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editing) {
      ref.current?.focus();
      try {
        ref.current?.showPicker?.();
      } catch {
        /* 일부 브라우저는 showPicker 미지원 */
      }
    }
  }, [editing]);

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} title="클릭해서 매수일 수정" className={`num rounded px-1 hover:bg-surface hover:underline ${className}`}>
        {shortDate(value)}
      </button>
    );
  }
  return (
    <input
      ref={ref}
      type="date"
      defaultValue={value}
      max="9999-12-31"
      onChange={(e) => {
        if (e.target.value && e.target.value !== value) {
          onChange(e.target.value);
          setEditing(false);
        }
      }}
      onBlur={() => setEditing(false)}
      onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
      className="num w-28 rounded border border-primary bg-surface px-1 text-[12px] outline-none"
      aria-label="매수일 수정"
    />
  );
}

export type DropPos = "before" | "after" | null;

/** HTS 스타일: 한 종목 = 한 줄. 줄을 잡고 위아래로 끌면 순서가 바뀐다. */
export function HoldingRow({
  h,
  dropPos,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onEdit,
  onDelete,
  onToggle,
  onRearm,
  onDateChange,
}: {
  h: ClientHolding;
  dropPos: DropPos;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onRearm: () => void;
  onDateChange: (d: string) => void;
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
  const dropCls = dropPos === "before" ? "shadow-[inset_0_2px_0_0_var(--primary)]" : dropPos === "after" ? "shadow-[inset_0_-2px_0_0_var(--primary)]" : "";

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`${COLS} cursor-grab border-b border-border px-3 py-2 text-[13px] transition-colors hover:bg-surface-2 active:cursor-grabbing ${
        triggered ? "bg-up-soft" : ""
      } ${h.enabled ? "" : "opacity-50"} ${dropCls}`}
    >
      <div className="flex min-w-0 items-center gap-1">
        <GripVertical size={14} className="shrink-0 text-muted/50" aria-hidden />
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
            <span className="md:hidden">
              {" · "}
              <DateCell value={h.bought_at} onChange={onDateChange} />
            </span>
          </div>
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

      <div className="hidden text-right text-[12px] text-muted md:block">
        <DateCell value={h.bought_at} onChange={onDateChange} />
        {h.stale && <div className="text-[10px] text-warn">시세 지연</div>}
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

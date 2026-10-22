"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Modal } from "./Modal";
import { btnGhost, btnPrimary, FieldRow, inputCls } from "./ui";
import { won } from "@/lib/format";
import type { ClientHolding } from "@/lib/types";

export function EditHoldingDialog({
  holding,
  onClose,
  onSaved,
}: {
  holding: ClientHolding | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  if (!holding) return null;
  return <EditForm key={holding.id} holding={holding} onClose={onClose} onSaved={onSaved} />;
}

function EditForm({ holding, onClose, onSaved }: { holding: ClientHolding; onClose: () => void; onSaved: () => void }) {
  const [avg, setAvg] = useState(String(holding.avg_price));
  const [target, setTarget] = useState<number | null>(holding.target_pct);
  const [note, setNote] = useState(holding.note ?? "");
  const [busy, setBusy] = useState(false);

  const avgNum = Number(avg);
  const valid = avgNum > 0 && !!target;

  async function save() {
    if (!valid || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/holdings/${holding.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ avg_price: avgNum, qty: 1, target_pct: target, note: note.trim() || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "저장하지 못했어요");
      toast.success("저장했어요");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "저장하지 못했어요");
    } finally {
      setBusy(false);
    }
  }

  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void save();
    }
  };

  return (
    <Modal open onClose={onClose} title="종목 수정" width="max-w-lg">
      <div className="flex items-baseline gap-2 border border-border bg-surface-2 px-2 py-1.5">
        <span className="text-sm font-bold">{holding.name}</span>
        <span className="num text-xs text-muted">{holding.code}</span>
      </div>
      <div className="mt-1">
        <FieldRow label="매수단가">
          <input autoFocus onFocus={(e) => e.target.select()} className={inputCls} type="number" inputMode="decimal" value={avg} onChange={(e) => setAvg(e.target.value)} onKeyDown={onEnter} aria-label="매수단가" />
        </FieldRow>
        <FieldRow label="목표수익률" hint={target && avgNum > 0 ? `목표가 ${won(Math.round(avgNum * (1 + target / 100)))}` : undefined}>
          <div className="flex items-center gap-2">
            <div className="flex w-24 shrink-0 items-center gap-1">
              <input
                className={inputCls}
                type="number"
                inputMode="decimal"
                value={target ?? ""}
                onChange={(e) => setTarget(e.target.value ? Number(e.target.value) : null)}
                onKeyDown={onEnter}
                aria-label="목표수익률(%)"
              />
              <span className="text-xs text-muted">%</span>
            </div>
          </div>
        </FieldRow>
        <FieldRow label="비고">
          <input className={`${inputCls} !font-sans`} lang="ko" value={note} maxLength={100} onChange={(e) => setNote(e.target.value)} onKeyDown={onEnter} placeholder="예: 1 2 (선택)" aria-label="비고" />
        </FieldRow>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[11px] text-muted">Enter ↵ 저장 · 조건을 바꾸면 알림이 다시 활성화됩니다</span>
        <div className="flex gap-1">
          <button onClick={onClose} className={btnGhost}>
            취소
          </button>
          <button disabled={!valid || busy} onClick={save} className={btnPrimary}>
            저장
          </button>
        </div>
      </div>
    </Modal>
  );
}

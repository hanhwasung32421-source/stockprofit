"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Modal } from "./Modal";
import { Chips, fieldCls } from "./AddHoldingDialog";
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
  const [qty, setQty] = useState(holding.qty ? String(holding.qty) : "");
  const [target, setTarget] = useState<number | null>(holding.target_pct);
  const [stop, setStop] = useState<number | null>(holding.stop_pct);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!target || !(Number(avg) > 0)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/holdings/${holding.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ avg_price: Number(avg), qty: qty ? Math.floor(Number(qty)) : null, target_pct: target, stop_pct: stop }),
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

  return (
    <Modal open onClose={onClose} title={`${holding.name} 수정`}>
      <div className="space-y-5">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">매수 단가 (원)</span>
          <input className={fieldCls} type="number" inputMode="decimal" value={avg} onChange={(e) => setAvg(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">수량 (선택)</span>
          <input className={fieldCls} type="number" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} />
        </label>
        <div>
          <span className="mb-1.5 block text-sm font-semibold">🔔 목표 수익률</span>
          <Chips values={[5, 10, 20, 30]} value={target} onChange={setTarget} prefix="+" />
          <input
            className={`${fieldCls} mt-2`}
            type="number"
            inputMode="decimal"
            value={target ?? ""}
            onChange={(e) => setTarget(e.target.value ? Number(e.target.value) : null)}
          />
        </div>
        <div>
          <span className="mb-1.5 block text-sm font-semibold">⚠️ 손절 알림</span>
          <Chips values={[5, 10, 15]} value={stop} onChange={setStop} prefix="-" none="사용 안 함" />
        </div>
        <p className="text-xs text-muted">조건을 바꾸면 알림이 다시 활성화돼요.</p>
        <button disabled={busy || !target || !(Number(avg) > 0)} onClick={save} className="w-full rounded-2xl bg-primary py-4 text-base font-bold text-primary-fg disabled:opacity-40">
          저장
        </button>
      </div>
    </Modal>
  );
}

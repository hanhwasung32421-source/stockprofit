"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Modal } from "./Modal";
import { MarketBadge, StockCombobox } from "./StockCombobox";
import { btnGhost, btnPrimary, FieldRow, inputCls } from "./ui";
import { won, pct, tone } from "@/lib/format";
import type { StockHit } from "@/lib/types";

type Preview = { price: number; changePct: number | null } | { error: string };

/** 열릴 때마다 새로 마운트되어 입력 상태가 자동 초기화된다 */
export function AddHoldingDialog({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: () => void }) {
  if (!open) return null;
  return <AddHoldingForm onClose={onClose} onAdded={onAdded} />;
}

function AddHoldingForm({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [stock, setStock] = useState<StockHit | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [avg, setAvg] = useState("");
  const [target, setTarget] = useState<number | null>(3);
  const [busy, setBusy] = useState(false);
  const targetRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<Promise<Preview> | null>(null); // 현재가 조회가 끝나기 전에 Enter가 눌려도 기다렸다가 추가

  async function choose(s: StockHit) {
    setStock(s);
    setPreview(null);
    const load = (async (): Promise<Preview> => {
      try {
        const res = await fetch(`/api/stocks/quote?code=${s.code}`);
        const json = await res.json();
        return res.ok ? { price: json.price, changePct: json.changePct } : { error: json.error ?? "현재가를 조회할 수 없어요" };
      } catch {
        return { error: "현재가를 조회할 수 없어요" };
      }
    })();
    previewRef.current = load;
    setPreview(await load);
  }

  const avgNum = Number(avg);
  const targetPrice = target && avgNum > 0 ? Math.round(avgNum * (1 + target / 100)) : null;
  const canSubmit = !!stock && preview && "price" in preview && avgNum > 0 && !!target && !busy;

  async function submit() {
    if (!stock || !target || !(avgNum > 0) || busy) return;
    setBusy(true);
    try {
      const p = await previewRef.current;
      if (!p || "error" in p) throw new Error(p && "error" in p ? p.error : "현재가를 조회할 수 없어요");
      const res = await fetch("/api/holdings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: stock.code, avg_price: avgNum, qty: 1, target_pct: target }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "추가하지 못했어요");
      toast.success(`${stock.name} 추가 완료`);
      onAdded();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "추가하지 못했어요");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="종목 추가" width="max-w-lg">
      {!stock ? (
        <StockCombobox onSelect={choose} />
      ) : (
        <div>
          {/* 종목 정보 한 줄 */}
          <div className="flex items-center justify-between border border-border bg-surface-2 px-2 py-1.5">
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="truncate text-sm font-bold">{stock.name}</span>
              <span className="num text-xs text-muted">{stock.code}</span>
              <MarketBadge market={stock.market} />
            </div>
            <button className="shrink-0 text-xs font-semibold text-primary hover:underline" onClick={() => setStock(null)}>
              종목변경
            </button>
          </div>
          <div className="num border-x border-b border-border px-2 py-1.5 text-xs">
            {!preview ? (
              <span className="text-muted">현재가 조회 중…</span>
            ) : "error" in preview ? (
              <span className="text-up">{preview.error}</span>
            ) : (
              <>
                <span className="text-muted">현재가 </span>
                <b className={`text-sm ${tone(preview.changePct)}`}>{won(preview.price)}</b>
                {preview.changePct !== null && <span className={`ml-2 ${tone(preview.changePct)}`}>{pct(preview.changePct)}</span>}
              </>
            )}
          </div>

          <div className="mt-1">
            <FieldRow label="매수단가">
              <div className="flex gap-1">
                <input
                  autoFocus
                  className={inputCls}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={avg}
                  onChange={(e) => setAvg(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && avgNum > 0) {
                      e.preventDefault();
                      targetRef.current?.focus();
                    }
                  }}
                  placeholder="원  (Enter ↵ 다음)"
                  aria-label="매수단가"
                />
                {preview && "price" in preview && (
                  <button type="button" tabIndex={-1} onClick={() => setAvg(String(preview.price))} className={`${btnGhost} shrink-0 !px-2 text-xs`}>
                    현재가
                  </button>
                )}
              </div>
            </FieldRow>

            <FieldRow label="목표수익률" hint={targetPrice ? `목표가 ${won(targetPrice)}` : undefined}>
              <div className="flex items-center gap-2">
                <div className="flex w-24 shrink-0 items-center gap-1">
                  <input
                    ref={targetRef}
                    className={inputCls}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    value={target ?? ""}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setTarget(e.target.value ? Number(e.target.value) : null)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void submit();
                      }
                    }}
                    aria-label="목표수익률(%)"
                  />
                  <span className="text-xs text-muted">%</span>
                </div>
              </div>
            </FieldRow>

          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] text-muted">목표수익률 입력 후 Enter ↵ 로 바로 추가</span>
            <div className="flex gap-1">
              <button onClick={onClose} className={btnGhost}>
                취소
              </button>
              <button disabled={!canSubmit} onClick={submit} className={btnPrimary}>
                {busy ? "추가 중…" : "추가"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

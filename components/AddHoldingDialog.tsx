"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Modal } from "./Modal";
import { MarketBadge, StockCombobox } from "./StockCombobox";
import { won, pct, tone } from "@/lib/format";
import type { StockHit } from "@/lib/types";

type Preview = { price: number; changePct: number | null } | { error: string };

const TARGET_CHIPS = [5, 10, 20, 30];
const STOP_CHIPS = [5, 10, 15];

export function Chips({
  values,
  value,
  onChange,
  prefix,
  none,
}: {
  values: number[];
  value: number | null;
  onChange: (v: number | null) => void;
  prefix: string;
  none?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {none && (
        <button type="button" onClick={() => onChange(null)} className={chipCls(value === null)}>
          {none}
        </button>
      )}
      {values.map((v) => (
        <button type="button" key={v} onClick={() => onChange(v)} className={chipCls(value === v)}>
          {prefix}
          {v}%
        </button>
      ))}
    </div>
  );
}
const chipCls = (on: boolean) =>
  `rounded-full border px-4 py-2 text-sm font-semibold transition ${
    on ? "border-primary bg-primary text-primary-fg" : "border-border bg-surface-2 text-foreground hover:border-primary"
  }`;

export const fieldCls =
  "num w-full rounded-2xl border border-border bg-surface-2 px-4 py-3 text-base outline-none focus:border-primary";

/** 열릴 때마다 새로 마운트되어 입력 상태가 자동 초기화된다 */
export function AddHoldingDialog({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: () => void }) {
  if (!open) return null;
  return <AddHoldingForm onClose={onClose} onAdded={onAdded} />;
}

function AddHoldingForm({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [stock, setStock] = useState<StockHit | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [avg, setAvg] = useState("");
  const [target, setTarget] = useState<number | null>(10);
  const [stop, setStop] = useState<number | null>(null);
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
  const stopPrice = stop && avgNum > 0 ? Math.round(avgNum * (1 - stop / 100)) : null;
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
        body: JSON.stringify({
          code: stock.code,
          avg_price: avgNum,
          qty: 1,
          target_pct: target,
          stop_pct: stop,
        }),
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
    <Modal open onClose={onClose} title="종목 추가">
      {!stock ? (
        <StockCombobox onSelect={choose} />
      ) : (
        <div className="space-y-5">
          <div className="rounded-2xl bg-surface-2 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{stock.name}</span>
                  <MarketBadge market={stock.market} />
                </div>
                <div className="num text-sm text-muted">종목코드 {stock.code}</div>
              </div>
              <button className="text-sm font-semibold text-primary" onClick={() => setStock(null)}>
                변경
              </button>
            </div>
            <div className="mt-3 text-sm">
              {!preview ? (
                <span className="text-muted">현재가 확인 중…</span>
              ) : "error" in preview ? (
                <span className="text-up">{preview.error}</span>
              ) : (
                <span>
                  현재가 <b className="num text-lg">₩{won(preview.price)}</b>{" "}
                  {preview.changePct !== null && <span className={`num ${tone(preview.changePct)}`}>{pct(preview.changePct)}</span>}
                </span>
              )}
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">매수 단가 (원) <span className="font-normal text-muted">· Enter ↵ 다음</span></span>
            <div className="flex gap-2">
              <input
                autoFocus
                className={fieldCls}
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
                placeholder="예: 70000"
              />
              {preview && "price" in preview && (
                <button type="button" tabIndex={-1} onClick={() => setAvg(String(preview.price))} className="shrink-0 rounded-2xl bg-surface-2 px-4 text-sm font-semibold text-primary">
                  현재가
                </button>
              )}
            </div>
          </label>

          <div>
            <span className="mb-1.5 block text-sm font-semibold">🔔 목표 수익률 (%) <span className="font-normal text-muted">· Enter ↵ 추가</span></span>
            <input
              ref={targetRef}
              className={fieldCls}
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
              placeholder="예: 10"
            />
            <div className="mt-2">
              <Chips values={TARGET_CHIPS} value={target} onChange={setTarget} prefix="+" />
            </div>
            {targetPrice && <p className="mt-2 text-sm text-muted">₩{won(targetPrice)} 이상이 되면 알려드려요</p>}
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-semibold">⚠️ 손절 알림 <span className="font-normal text-muted">(선택)</span></span>
            <Chips values={STOP_CHIPS} value={stop} onChange={setStop} prefix="-" none="사용 안 함" />
            {stopPrice && <p className="mt-2 text-sm text-muted">₩{won(stopPrice)} 이하로 내려가면 알려드려요</p>}
          </div>

          <button
            disabled={!canSubmit}
            onClick={submit}
            className="w-full rounded-2xl bg-primary py-4 text-base font-bold text-primary-fg disabled:opacity-40"
          >
            {busy ? "추가 중…" : "추가하기"}
          </button>
        </div>
      )}
    </Modal>
  );
}

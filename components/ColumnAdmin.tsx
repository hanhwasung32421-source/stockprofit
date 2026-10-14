"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { COLUMN_DEFS, type ColKey, type ColumnPrefs } from "@/lib/columns";
import { btnGhost, SectionTitle } from "./ui";

/** 관리자 탭: 메인 표의 구분(열) 순서와 표시 여부. 이 컴퓨터(브라우저)에만 저장된다. */
export function ColumnAdmin({
  prefs,
  onChange,
  onReset,
}: {
  prefs: ColumnPrefs;
  onChange: (p: ColumnPrefs) => void;
  onReset: () => void;
}) {
  const move = (i: number, d: -1 | 1) => {
    const order = [...prefs.order];
    const j = i + d;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    onChange({ ...prefs, order });
  };
  const toggle = (k: ColKey) =>
    onChange({ ...prefs, hidden: prefs.hidden.includes(k) ? prefs.hidden.filter((x) => x !== k) : [...prefs.hidden, k] });

  return (
    <div>
      <p className="mb-2 text-[11px] text-muted">
        메인 표의 구분(열) 순서와 표시 여부입니다. 설정은 <b className="text-foreground">이 컴퓨터(브라우저)에만</b> 저장되며 다른 컴퓨터에는 영향이 없습니다.
      </p>
      <div className="border border-border">
        <SectionTitle>구분 순서</SectionTitle>
        <div className="flex border-b border-border px-2 py-0.5 text-[11px] font-semibold text-muted">
          <span className="w-8">순서</span>
          <span className="w-10 text-center">표시</span>
          <span className="flex-1">구분</span>
          <span className="w-16 text-center">이동</span>
        </div>
        <ul>
          {prefs.order.map((k, i) => {
            const def = COLUMN_DEFS[k];
            const shown = !prefs.hidden.includes(k);
            return (
              <li key={k} className="flex items-center border-b border-border/60 px-2 py-0.5 last:border-b-0 hover:bg-surface-2">
                <span className="num w-8 text-xs text-muted">{i + 1}</span>
                <span className="w-10 text-center">
                  <input
                    type="checkbox"
                    checked={shown}
                    disabled={def.required}
                    onChange={() => toggle(k)}
                    className="h-3.5 w-3.5 accent-[var(--primary)]"
                    aria-label={`${def.label} 표시`}
                  />
                </span>
                <span className={`flex-1 ${shown ? "font-semibold" : "text-muted line-through"}`}>
                  {def.label}
                  {def.required && <span className="ml-1 text-[10px] font-normal text-muted">(고정 표시)</span>}
                </span>
                <span className="flex w-16 justify-center gap-0.5">
                  <button onClick={() => move(i, -1)} disabled={i === 0} aria-label={`${def.label} 위로`} className="rounded-sm p-1 hover:bg-border disabled:opacity-25">
                    <ArrowUp size={14} />
                  </button>
                  <button onClick={() => move(i, 1)} disabled={i === prefs.order.length - 1} aria-label={`${def.label} 아래로`} className="rounded-sm p-1 hover:bg-border disabled:opacity-25">
                    <ArrowDown size={14} />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="mt-2 flex justify-end">
        <button onClick={onReset} className={btnGhost}>
          기본값 복원
        </button>
      </div>
    </div>
  );
}

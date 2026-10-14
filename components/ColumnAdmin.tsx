"use client";

import { ArrowDown, ArrowUp, RotateCcw } from "lucide-react";
import { COLUMN_DEFS, type ColKey, type ColumnPrefs } from "@/lib/columns";

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
    <div className="space-y-3">
      <p className="text-xs text-muted">
        메인 표의 구분(열) 순서를 바꾸고 보이거나 숨길 수 있어요. 설정은 <b>이 컴퓨터(브라우저)에만</b> 저장되고, 다른 컴퓨터에는 영향이 없어요.
      </p>
      <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-surface-2">
        {prefs.order.map((k, i) => {
          const def = COLUMN_DEFS[k];
          const shown = !prefs.hidden.includes(k);
          return (
            <li key={k} className="flex items-center gap-2 px-3 py-2 text-sm">
              <span className="num w-5 text-center text-xs text-muted">{i + 1}</span>
              <label className="flex flex-1 cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={shown}
                  disabled={def.required}
                  onChange={() => toggle(k)}
                  className="h-4 w-4 accent-[var(--primary)]"
                  aria-label={`${def.label} 표시`}
                />
                <span className={shown ? "font-semibold" : "text-muted line-through"}>{def.label}</span>
                {def.required && <span className="text-[10px] text-muted">(항상 표시)</span>}
              </label>
              <button onClick={() => move(i, -1)} disabled={i === 0} aria-label={`${def.label} 위로`} className="rounded p-1.5 hover:bg-surface disabled:opacity-30">
                <ArrowUp size={16} />
              </button>
              <button onClick={() => move(i, 1)} disabled={i === prefs.order.length - 1} aria-label={`${def.label} 아래로`} className="rounded p-1.5 hover:bg-surface disabled:opacity-30">
                <ArrowDown size={16} />
              </button>
            </li>
          );
        })}
      </ul>
      <button onClick={onReset} className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:bg-surface-2">
        <RotateCcw size={14} /> 기본값으로 되돌리기
      </button>
    </div>
  );
}

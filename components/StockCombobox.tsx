"use client";

import { useEffect, useRef, useState } from "react";
import type { StockHit } from "@/lib/types";
import { inputCls } from "./ui";

const MARKET_STYLE: Record<string, string> = {
  KOSPI: "text-down",
  KOSDAQ: "text-up",
};

export function MarketBadge({ market }: { market: string }) {
  return <span className={`text-[10px] font-bold ${MARKET_STYLE[market] ?? "text-muted"}`}>{market || "-"}</span>;
}

/** 종목명/종목코드 자동완성. ↑↓ 이동, Enter 선택. 선택하면 정확한 6자리 코드를 넘긴다. */
export function StockCombobox({ onSelect }: { onSelect: (s: StockHit) => void }) {
  const [q, setQ] = useState("");
  const [result, setResult] = useState<{ term: string; hits: StockHit[]; error?: string }>({ term: "", hits: [] });
  const [active, setActive] = useState(0);
  const seq = useRef(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (!term) return;
    const my = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(term)}`);
        const json = await res.json().catch(() => ({}));
        if (my === seq.current) {
          setResult(res.ok ? { term, hits: json.results ?? [] } : { term, hits: [], error: json.error ?? "검색 중 오류가 발생했어요" });
          setActive(0);
        }
      } catch {
        if (my === seq.current) setResult({ term, hits: [], error: "서버에 연결하지 못했어요" });
      }
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  const term = q.trim();
  const hits = term ? result.hits : [];
  const loading = !!term && result.term !== term;

  // 방향키로 이동할 때 선택 줄이 보이도록 스크롤
  useEffect(() => {
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing) return; // 한글 조합 중 Enter/방향키는 무시
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && hits[active]) {
      e.preventDefault();
      onSelect(hits[active]);
    }
  };

  return (
    <div>
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={onKey}
        placeholder="종목명 또는 종목코드  (↑↓ 이동 · Enter 선택)"
        className={`${inputCls} !font-sans`}
        aria-label="종목 검색"
      />
      <div className="mt-1 border border-border">
        <div className="flex border-b border-border bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-muted">
          <span className="flex-1">종목명</span>
          <span className="w-16 text-right">코드</span>
          <span className="w-14 text-right">시장</span>
        </div>
        <ul ref={listRef} className="h-56 overflow-y-auto" role="listbox">
          {hits.map((h, i) => (
            <li key={h.code} role="option" aria-selected={i === active}>
              <button
                type="button"
                onClick={() => onSelect(h)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center border-b border-border/60 px-2 py-1 text-left text-[13px] ${
                  i === active ? "bg-primary/20 shadow-[inset_2px_0_0_var(--primary)]" : ""
                }`}
              >
                <span className="flex-1 truncate font-semibold">{h.name}</span>
                <span className="num w-16 text-right text-xs text-muted">{h.code}</span>
                <span className="w-14 text-right">
                  <MarketBadge market={h.market} />
                </span>
              </button>
            </li>
          ))}
          {!term && <li className="px-2 py-3 text-center text-xs text-muted">종목명이나 코드를 입력하세요</li>}
          {term && loading && hits.length === 0 && <li className="px-2 py-3 text-center text-xs text-muted">검색 중…</li>}
          {term && !loading && result.error && <li className="px-2 py-3 text-center text-xs text-up">⚠ {result.error}</li>}
          {term && !loading && !result.error && hits.length === 0 && (
            <li className="px-2 py-3 text-center text-xs text-muted">검색 결과가 없습니다</li>
          )}
        </ul>
      </div>
    </div>
  );
}

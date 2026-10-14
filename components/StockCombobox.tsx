"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import type { StockHit } from "@/lib/types";

const MARKET_STYLE: Record<string, string> = {
  KOSPI: "bg-down-soft text-down",
  KOSDAQ: "bg-up-soft text-up",
};

export function MarketBadge({ market }: { market: string }) {
  return (
    <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${MARKET_STYLE[market] ?? "bg-surface-2 text-muted"}`}>
      {market || "-"}
    </span>
  );
}

/** 종목명/종목코드 자동완성. 선택하면 onSelect로 정확한 6자리 코드를 넘긴다. */
export function StockCombobox({ onSelect }: { onSelect: (s: StockHit) => void }) {
  const [q, setQ] = useState("");
  const [result, setResult] = useState<{ term: string; hits: StockHit[] }>({ term: "", hits: [] });
  const [active, setActive] = useState(0);
  const seq = useRef(0);

  useEffect(() => {
    const term = q.trim();
    if (!term) return;
    const my = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(term)}`);
        const json = await res.json();
        if (my === seq.current) {
          setResult({ term, hits: json.results ?? [] });
          setActive(0);
        }
      } catch {
        if (my === seq.current) setResult({ term, hits: [] });
      }
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  const term = q.trim();
  const hits = term ? result.hits : [];
  const loading = !!term && result.term !== term;

  const onKey = (e: React.KeyboardEvent) => {
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
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface-2 px-4 py-3 focus-within:border-primary">
        <Search size={18} className="text-muted" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
          placeholder="종목명 또는 종목코드 (예: 삼성전자, 005930)"
          className="w-full bg-transparent text-base outline-none placeholder:text-muted"
          aria-label="종목 검색"
        />
      </div>
      <ul className="mt-2 max-h-72 overflow-y-auto" role="listbox">
        {hits.map((h, i) => (
          <li key={h.code} role="option" aria-selected={i === active}>
            <button
              type="button"
              onClick={() => onSelect(h)}
              onMouseEnter={() => setActive(i)}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left ${i === active ? "bg-surface-2" : ""}`}
            >
              <span className="font-medium">{h.name}</span>
              <span className="flex items-center gap-2">
                <MarketBadge market={h.market} />
                <span className="num text-sm text-muted">{h.code}</span>
              </span>
            </button>
          </li>
        ))}
        {term && !loading && hits.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-muted">검색 결과가 없어요. 종목명을 다시 확인해 주세요.</li>
        )}
      </ul>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import type { StockHit } from "@/lib/types";
import { inputCls } from "./ui";
import { engToKor } from "@/lib/hangul";

const MARKET_STYLE: Record<string, string> = {
  KOSPI: "text-down",
  KOSDAQ: "text-up",
};

export function MarketBadge({ market }: { market: string }) {
  return <span className={`text-[10px] font-bold ${MARKET_STYLE[market] ?? "text-muted"}`}>{market || "-"}</span>;
}

/** 종목명/종목코드 자동완성. ↑↓ 이동, Enter 선택. 선택하면 정확한 6자리 코드를 넘긴다. */
export function StockCombobox({ onSelect }: { onSelect: (s: StockHit) => void }) {
  // 입력은 항상 한글이 기본: 한/영 상태와 상관없이 영문 자판으로 쳐도 한글로 조합된다.
  // raw = 실제로 친 키(영문 포함), 화면에 보이는 값 q = 한글 모드면 raw를 한글로 조합한 결과.
  const [raw, setRaw] = useState("");
  const [mode, setMode] = useState<"ko" | "en">("ko");
  const q = mode === "ko" ? engToKor(raw) : raw;
  const [result, setResult] = useState<{ term: string; hits: StockHit[]; error?: string }>({ term: "", hits: [] });
  const [active, setActive] = useState(0);
  const seq = useRef(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (!term) return;
    const my = ++seq.current;
    // 한글로 조합한 결과가 없으면 영문 그대로(KODEX, NAVER 등)도 한 번 더 찾아본다
    const rawTerm = mode === "ko" && /^[A-Za-z0-9 ]+$/.test(raw.trim()) && raw.trim() !== term ? raw.trim() : null;
    const t = setTimeout(async () => {
      try {
        const search = async (x: string) => {
          const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(x)}`);
          const json = await res.json().catch(() => ({}));
          return { ok: res.ok, hits: (json.results ?? []) as StockHit[], error: json.error as string | undefined };
        };
        let r = await search(term);
        if (r.ok && r.hits.length === 0 && rawTerm) r = await search(rawTerm);
        if (my === seq.current) {
          setResult(r.ok ? { term, hits: r.hits } : { term, hits: [], error: r.error ?? "검색 중 오류가 발생했어요" });
          setActive(0);
        }
      } catch {
        if (my === seq.current) setResult({ term, hits: [], error: "서버에 연결하지 못했어요" });
      }
    }, 180);
    return () => clearTimeout(t);
  }, [q, raw, mode]);

  const term = q.trim();
  const hits = term ? result.hits : [];
  const loading = !!term && result.term !== term;

  // 방향키로 이동할 때 선택 줄이 보이도록 스크롤
  useEffect(() => {
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return; // 한글 조합 중 Enter/방향키는 무시

    // 한글 모드: 영문 키를 한글 자모로 조합 (커서가 맨 끝이거나 전체 선택일 때)
    if (mode === "ko" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const el = e.currentTarget;
      const atEnd = el.selectionStart === el.value.length && el.selectionEnd === el.value.length;
      const allSelected = el.value.length > 0 && el.selectionStart === 0 && el.selectionEnd === el.value.length;
      if (/^[A-Za-z]$/.test(e.key) && (atEnd || allSelected)) {
        e.preventDefault();
        const ch = e.key;
        setRaw((r) => (allSelected ? "" : r) + ch);
        return;
      }
      if (e.key === "Backspace" && atEnd && el.value.length > 0 && raw) {
        e.preventDefault();
        setRaw((r) => r.slice(0, -1)); // 자모 단위로 지움: 삼 → 사 → ㅅ
        return;
      }
    }
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
      <div className="flex gap-1">
        <input
          autoFocus
          lang="ko"
          value={q}
          onChange={(e) => setRaw(e.target.value)}
          onKeyDown={onKey}
          placeholder="종목명 또는 종목코드  (↑↓ 이동 · Enter 선택)"
          className={`${inputCls} !font-sans`}
          aria-label="종목 검색"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            setMode((m) => (m === "ko" ? "en" : "ko"));
            setRaw(q); // 모드를 바꿔도 지금 보이는 글자는 그대로 유지
          }}
          title={mode === "ko" ? "한글 입력 (영문 키도 한글로 조합) — 눌러서 영문 입력으로" : "영문 입력 — 눌러서 한글 입력으로"}
          className="h-8 w-10 shrink-0 rounded-sm border border-border bg-surface text-xs font-bold hover:bg-surface-2"
        >
          {mode === "ko" ? "한" : "A"}
        </button>
      </div>
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

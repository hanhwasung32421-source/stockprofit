import { useCallback, useSyncExternalStore } from "react";
import type { SortKey, SortState } from "@/lib/columns";

// 표 정렬 설정을 컴퓨터(브라우저)별로 기억한다.
// 저장된 값이 없으면 기본값 = 매수일 오름차순 (맨 아래가 가장 최근).
// "none"이면 정렬 없이 저장된 수동 순서(드래그)를 쓴다.
export const DEFAULT_SORT: SortState = { key: "bought_at", dir: "asc" };
const KEY = "sp_sort";
const KEYS = new Set<SortKey>(["name", "price", "changePct", "avg_price", "profitPct", "target_pct", "note", "bought_at", "elapsed"]);

const listeners = new Set<() => void>();
let cacheRaw: string | null | undefined;
let cacheVal: SortState = DEFAULT_SORT;

function snapshot(): SortState {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    /* 저장소 접근 불가 — 기본값 */
  }
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    cacheVal = DEFAULT_SORT;
    if (raw === "none") cacheVal = null;
    else if (raw) {
      try {
        const o = JSON.parse(raw) as { key?: SortKey; dir?: string };
        if (o.key && KEYS.has(o.key) && (o.dir === "asc" || o.dir === "desc")) cacheVal = { key: o.key, dir: o.dir };
      } catch {
        /* 손상된 값 — 기본값 */
      }
    }
  }
  return cacheVal;
}

export function useSortPref(): [SortState, (s: SortState) => void] {
  const sort = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      const onStorage = (e: StorageEvent) => e.key === KEY && cb();
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(cb);
        window.removeEventListener("storage", onStorage);
      };
    },
    snapshot,
    () => DEFAULT_SORT,
  );
  const set = useCallback((s: SortState) => {
    try {
      localStorage.setItem(KEY, s ? JSON.stringify(s) : "none");
    } catch {
      /* 무시 */
    }
    listeners.forEach((l) => l());
  }, []);
  return [sort, set];
}

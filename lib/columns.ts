import { useCallback, useSyncExternalStore } from "react";
import type { ClientHolding } from "@/lib/types";
import { elapsedDays } from "@/lib/dates";

export { elapsedDays, dLabel } from "@/lib/dates";

// 메인 표의 "구분(열)" 정의와, 컴퓨터(브라우저)별 순서/표시 설정.
// 설정은 Supabase가 아니라 이 브라우저의 localStorage에 저장된다 → 컴퓨터마다 따로 기억.

export type ColKey = "name" | "price" | "changePct" | "avg_price" | "profitPct" | "target" | "bought_at" | "elapsed";
export type SortKey = "name" | "price" | "changePct" | "avg_price" | "profitPct" | "target_pct" | "bought_at" | "elapsed";

export type SortState = { key: SortKey; dir: "asc" | "desc" } | null;

type ColDef = {
  label: string;
  md: string; // 데스크톱 grid 너비 (모든 열 동일 폭 → 구분 간격 일정)
  sm?: string; // 모바일 grid 너비 (없으면 모바일에서는 숨김)
  sort: SortKey;
  align: "center";
  required?: boolean; // 숨길 수 없음
};

export const COLUMN_DEFS: Record<ColKey, ColDef> = {
  name: { label: "종목", md: "minmax(0,1fr)", sm: "minmax(0,1fr)", sort: "name", align: "center", required: true },
  price: { label: "현재가", md: "minmax(0,1fr)", sm: "minmax(0,1fr)", sort: "price", align: "center" },
  changePct: { label: "등락률", md: "minmax(0,1fr)", sort: "changePct", align: "center" },
  avg_price: { label: "매수가", md: "minmax(0,1fr)", sort: "avg_price", align: "center" },
  profitPct: { label: "수익률", md: "minmax(0,1fr)", sm: "minmax(0,1fr)", sort: "profitPct", align: "center" },
  target: { label: "목표", md: "minmax(0,1fr)", sm: "minmax(0,1fr)", sort: "target_pct", align: "center" },
  bought_at: { label: "매수일", md: "minmax(0,1fr)", sort: "bought_at", align: "center" },
  elapsed: { label: "매수경과일", md: "minmax(0,1fr)", sort: "elapsed", align: "center" },
};

export const DEFAULT_ORDER: ColKey[] = ["name", "price", "changePct", "avg_price", "profitPct", "target", "bought_at", "elapsed"];
const ALL = new Set<string>(DEFAULT_ORDER);

export type ColumnPrefs = { order: ColKey[]; hidden: ColKey[] };
export const DEFAULT_PREFS: ColumnPrefs = { order: DEFAULT_ORDER, hidden: [] };

const KEY = "sp_columns";

/** 저장된 값에서 알 수 없는 열은 버리고, 새로 생긴 열은 기본 위치에 끼워 넣는다 */
function normalize(raw: unknown): ColumnPrefs {
  const o = (raw ?? {}) as { order?: unknown; hidden?: unknown };
  const order = (Array.isArray(o.order) ? o.order : []).filter((k): k is ColKey => typeof k === "string" && ALL.has(k));
  const unique = [...new Set(order)];
  for (const k of DEFAULT_ORDER) if (!unique.includes(k)) unique.push(k);
  const hidden = (Array.isArray(o.hidden) ? o.hidden : []).filter(
    (k): k is ColKey => typeof k === "string" && ALL.has(k) && !COLUMN_DEFS[k as ColKey].required,
  );
  return { order: unique, hidden: [...new Set(hidden)] };
}

// useSyncExternalStore는 같은 값이면 같은 참조를 돌려줘야 하므로 원문 문자열 기준으로 캐시
let cacheRaw: string | null | undefined;
let cacheVal: ColumnPrefs = DEFAULT_PREFS;
const listeners = new Set<() => void>();

function snapshot(): ColumnPrefs {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    /* 저장소 접근 불가 — 기본값 */
  }
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    try {
      cacheVal = raw ? normalize(JSON.parse(raw)) : DEFAULT_PREFS;
    } catch {
      cacheVal = DEFAULT_PREFS;
    }
  }
  return cacheVal;
}

export function useColumnPrefs(): { prefs: ColumnPrefs; save: (p: ColumnPrefs) => void; reset: () => void } {
  const prefs = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      const onStorage = (e: StorageEvent) => e.key === KEY && cb(); // 같은 컴퓨터의 다른 탭과도 동기화
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(cb);
        window.removeEventListener("storage", onStorage);
      };
    },
    snapshot,
    () => DEFAULT_PREFS,
  );
  const save = useCallback((p: ColumnPrefs) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(normalize(p)));
    } catch {
      /* 무시 */
    }
    listeners.forEach((l) => l());
  }, []);
  const reset = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* 무시 */
    }
    listeners.forEach((l) => l());
  }, []);
  return { prefs, save, reset };
}

export const visibleCols = (p: ColumnPrefs): ColKey[] => p.order.filter((k) => !p.hidden.includes(k));

/** 표시할 열 목록 → 행/헤더가 공유하는 grid 템플릿 (CSS 변수) */
export function gridVars(cols: ColKey[]): React.CSSProperties {
  const md = [...cols.map((c) => COLUMN_DEFS[c].md), "144px"].join(" ");
  const sm = [...cols.filter((c) => COLUMN_DEFS[c].sm).map((c) => COLUMN_DEFS[c].sm), "92px"].join(" ");
  return { "--cols-md": md, "--cols-sm": sm } as React.CSSProperties;
}

export function sortValue(h: ClientHolding, key: SortKey): string | number | null {
  switch (key) {
    case "name":
      return h.name;
    case "bought_at":
      return h.bought_at;
    case "elapsed":
      return elapsedDays(h.bought_at);
    case "target_pct":
      return h.target_pct;
    default:
      return h[key];
  }
}

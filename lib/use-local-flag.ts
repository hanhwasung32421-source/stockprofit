import { useCallback, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function read(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false; // 저장소 접근 불가(시크릿 모드 등) — 기본값
  }
}

/** localStorage 불리언 플래그. 서버 렌더에서는 false (하이드레이션 안전). */
export function useLocalFlag(key: string): [boolean, (v: boolean) => void] {
  const value = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => read(key),
    () => false,
  );
  const set = useCallback(
    (v: boolean) => {
      try {
        localStorage.setItem(key, v ? "1" : "0");
      } catch {
        /* 무시 */
      }
      emit();
    },
    [key],
  );
  return [value, set];
}

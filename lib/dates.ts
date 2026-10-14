// 서버/클라이언트 모두에서 쓰는 순수 날짜 유틸 (React 의존 없음)

/** 매수일 기준 경과일 (한국시간 날짜 기준, 매수 당일 = 0) */
export function elapsedDays(boughtAt: string, now = new Date()): number {
  const today = now.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  return Math.round((Date.parse(today) - Date.parse(boughtAt)) / 86_400_000);
}

export const dLabel = (n: number) => (n >= 0 ? `D+${n}` : `D${n}`);

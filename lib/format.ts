export const won = (n: number) => n.toLocaleString("ko-KR", { maximumFractionDigits: 0 });

export const pct = (n: number, digits = 2) => `${n > 0 ? "+" : ""}${n.toFixed(digits)}%`;

/** 상승(+)=빨강, 하락(-)=파랑 */
export const tone = (n: number | null | undefined) =>
  n == null || n === 0 ? "text-foreground" : n > 0 ? "text-up" : "text-down";

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "-";
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 5) return "방금";
  if (s < 60) return `${s}초 전`;
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  return `${Math.floor(s / 3600)}시간 전`;
}

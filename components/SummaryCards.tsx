import { pct, tone, won } from "@/lib/format";
import type { ClientHolding } from "@/lib/types";

/** 한 줄 요약 바 (수량이 입력된 종목만 합계에 반영) */
export function SummaryCards({ holdings }: { holdings: ClientHolding[] }) {
  const rows = holdings.filter((h) => h.qty && h.price);
  const cost = rows.reduce((s, h) => s + h.avg_price * h.qty!, 0);
  const value = rows.reduce((s, h) => s + h.price! * h.qty!, 0);
  const diff = value - cost;
  const rate = cost > 0 ? (diff / cost) * 100 : null;

  const items = [
    { label: "매수", value: rows.length ? won(cost) : "–", cls: "" },
    { label: "평가", value: rows.length ? won(value) : "–", cls: "" },
    { label: "손익", value: rate != null ? `${diff > 0 ? "+" : ""}${won(diff)} (${pct(rate)})` : "–", cls: tone(diff) },
  ];
  return (
    <section className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-lg border border-border bg-surface px-3 py-2 text-[13px]" aria-label="요약">
      <span className="text-xs font-semibold text-muted">종목 {holdings.length}</span>
      {items.map((it) => (
        <span key={it.label} className="num">
          <span className="mr-1.5 text-xs text-muted">{it.label}</span>
          <b className={it.cls}>{it.value}</b>
        </span>
      ))}
      {!rows.length && holdings.length > 0 && <span className="text-[11px] text-muted">수량을 입력하면 금액 합계가 표시돼요</span>}
    </section>
  );
}

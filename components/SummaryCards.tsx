import { pct, tone, won } from "@/lib/format";
import type { ClientHolding } from "@/lib/types";

export function SummaryCards({ holdings }: { holdings: ClientHolding[] }) {
  // 수량이 입력된 종목만 금액 합계에 반영
  const rows = holdings.filter((h) => h.qty && h.price);
  const cost = rows.reduce((s, h) => s + h.avg_price * h.qty!, 0);
  const value = rows.reduce((s, h) => s + h.price! * h.qty!, 0);
  const diff = value - cost;
  const rate = cost > 0 ? (diff / cost) * 100 : null;

  const items = [
    { label: "총 매수금액", value: rows.length ? `₩${won(cost)}` : "–", cls: "" },
    { label: "총 평가금액", value: rows.length ? `₩${won(value)}` : "–", cls: "" },
    {
      label: "총 수익",
      value: rate != null ? `${diff > 0 ? "+" : ""}${won(diff)}원 (${pct(rate)})` : "–",
      cls: tone(diff),
    },
  ];
  return (
    <section className="grid gap-3 sm:grid-cols-3" aria-label="요약">
      {items.map((it) => (
        <div key={it.label} className="rounded-3xl border border-border bg-surface p-4 shadow-sm">
          <div className="text-xs text-muted">{it.label}</div>
          <div className={`num mt-1 text-xl font-bold ${it.cls}`}>{it.value}</div>
        </div>
      ))}
      {!rows.length && holdings.length > 0 && (
        <p className="text-xs text-muted sm:col-span-3">수량을 입력한 종목이 있으면 금액 합계가 표시돼요.</p>
      )}
    </section>
  );
}

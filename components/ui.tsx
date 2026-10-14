// HTS 스타일 공용 UI 조각: 각진 모서리, 얇은 테두리, 작은 글씨, 라벨-값 한 줄 폼

export const inputCls =
  "num h-8 w-full rounded-sm border border-border bg-background px-2 text-[13px] outline-none focus:border-primary";

export const btnPrimary =
  "h-8 rounded-sm bg-primary px-4 text-[13px] font-bold text-primary-fg hover:opacity-90 disabled:opacity-40";

export const btnGhost =
  "h-8 rounded-sm border border-border bg-surface px-3 text-[13px] font-semibold hover:bg-surface-2 disabled:opacity-40";

/** 라벨(왼쪽, 고정폭) + 입력(오른쪽) 한 줄 */
export function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 border-b border-border py-1.5 last:border-b-0">
      <div className="w-20 shrink-0 text-xs font-semibold text-muted">{label}</div>
      <div className="min-w-0 flex-1">{children}</div>
      {hint && <div className="num hidden shrink-0 text-[11px] text-muted sm:block">{hint}</div>}
    </div>
  );
}

/** 섹션 제목 줄 */
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="border-b border-border bg-surface-2 px-2 py-1 text-xs font-bold text-muted">{children}</h3>;
}

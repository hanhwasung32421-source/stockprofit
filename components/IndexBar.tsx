"use client";

import { useEffect, useId, useRef, useState } from "react";
import useSWR from "swr";
import { tone } from "@/lib/format";
import type { IndexData } from "@/lib/indices";

const fetcher = async (url: string): Promise<{ indices: IndexData[] }> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("fetch failed");
  return res.json();
};

const fmt = (n: number, d = 2) => n.toLocaleString("ko-KR", { minimumFractionDigits: d, maximumFractionDigits: d });
const signed = (n: number, d = 2) => (n > 0 ? "+" : n < 0 ? "-" : "") + fmt(Math.abs(n), d);
const signedInt = (n: number) => (n > 0 ? "+" : n < 0 ? "-" : "") + Math.abs(n).toLocaleString("ko-KR");

/** 값이 바뀌면 잠깐 배경이 깜빡이는 클래스를 돌려준다 */
function useFlash(value: number) {
  const prev = useRef(value);
  const [cls, setCls] = useState("");
  useEffect(() => {
    if (value === prev.current) return;
    const c = value > prev.current ? "flash-up" : "flash-down";
    prev.current = value;
    setCls(c);
    const t = setTimeout(() => setCls(""), 900);
    return () => clearTimeout(t);
  }, [value]);
  return cls;
}

/** 당일 흐름 영역 차트 (전일 종가 점선). 가로 = 정규장 시간 전체, 선은 현재 시각까지만 그려진다. */
function Spark({ d, className = "" }: { d: IndexData; className?: string }) {
  const gid = useId().replace(/:/g, "");
  if (d.pts.length < 2) return <div className={className} />;
  const vals = d.pts.map((p) => p[1]);
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  if (d.prevClose != null) {
    lo = Math.min(lo, d.prevClose);
    hi = Math.max(hi, d.prevClose);
  }
  const range = hi - lo || 1;
  const X = (t: number) => Math.min(Math.max(t / d.span, 0), 1) * 100;
  const Y = (v: number) => 38 - ((v - lo) / range) * 34; // 위아래 여백 2~4
  const line = d.pts.map(([t, v], i) => `${i ? "L" : "M"}${X(t).toFixed(2)},${Y(v).toFixed(2)}`).join(" ");
  const lastX = X(d.pts[d.pts.length - 1][0]);
  const firstX = X(d.pts[0][0]);
  const area = `${line} L${lastX.toFixed(2)},40 L${firstX.toFixed(2)},40 Z`;
  const color = d.change > 0 ? "var(--up)" : d.change < 0 ? "var(--down)" : "var(--muted)";
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className={className} role="img" aria-label={`${d.name} 당일 차트`} style={{ color }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.38" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      {d.prevClose != null && (
        <line x1="0" x2="100" y1={Y(d.prevClose)} y2={Y(d.prevClose)} stroke="var(--muted)" strokeOpacity="0.45" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" strokeWidth="1" />
      )}
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Investors({ inv }: { inv: NonNullable<IndexData["investors"]> }) {
  const items = [
    ["개인", inv.personal],
    ["외국인", inv.foreign],
    ["기관", inv.institution],
  ] as const;
  return (
    <div className="flex gap-5 text-xs">
      {items.map(([label, v]) => (
        <span key={label} className="num flex flex-col leading-tight">
          <span className="text-muted">{label}</span>
          <b className={tone(v)}>{signedInt(v)}</b>
        </span>
      ))}
    </div>
  );
}

/** 코스피/코스닥: 큰 카드 — 왼쪽 수치, 오른쪽에 카드 높이만큼 큰 차트, 아래에 개인/외국인/기관 */
function BigCard({ d }: { d: IndexData }) {
  const flash = useFlash(d.price);
  return (
    <a
      href={d.link}
      target="_blank"
      rel="noopener noreferrer"
      title={`${d.name} — 토스증권에서 보기`}
      className="block min-w-0 rounded-lg border border-border bg-surface px-3.5 py-3 transition-colors hover:bg-surface-2"
    >
      <div className="grid grid-cols-1 gap-y-2 md:grid-cols-[auto_1fr] md:gap-x-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">{d.name}</span>
            <span className={`rounded px-1.5 py-px text-[10px] font-semibold ${d.open ? "bg-up-soft text-up" : "bg-surface-2 text-muted"}`}>{d.open ? "장중" : "장마감"}</span>
          </div>
          <div className={`num mt-1.5 inline-block rounded px-0.5 text-[26px] font-extrabold leading-none ${tone(d.change)} ${flash}`}>{fmt(d.price)}</div>
          <div className={`num mt-1.5 text-[13px] font-semibold ${tone(d.change)}`}>
            {signed(d.change)} ({fmt(Math.abs(d.changePct))}%)
          </div>
        </div>
        {/* 카드 높이를 꽉 채우는 큰 차트 */}
        <Spark d={d} className="h-20 w-full md:h-full md:min-h-[112px]" />
      </div>
      {d.investors && (
        <div className="mt-2.5 border-t border-border/60 pt-2">
          <Investors inv={d.investors} />
        </div>
      )}
    </a>
  );
}

/** 나스닥/S&P 500: 작은 카드 */
function SmallCard({ d }: { d: IndexData }) {
  const flash = useFlash(d.price);
  return (
    <a
      href={d.link}
      target="_blank"
      rel="noopener noreferrer"
      title={`${d.name} — 토스증권에서 보기`}
      className="flex min-w-0 flex-col gap-1 rounded-lg border border-border bg-surface px-3 py-2 transition-colors hover:bg-surface-2 md:flex-row md:items-center md:justify-between md:gap-2"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1 text-[11px]">
          <span className="whitespace-nowrap font-semibold">{d.name}</span>
          {!d.open && <span className="whitespace-nowrap text-[10px] text-muted">마감</span>}
        </div>
        <div className={`num inline-block rounded px-0.5 text-[13px] font-bold leading-tight ${tone(d.change)} ${flash}`}>{fmt(d.price)}</div>
        <div className={`num text-[11px] ${tone(d.change)}`}>
          {signed(d.change)} ({fmt(Math.abs(d.changePct))}%)
        </div>
      </div>
      <Spark d={d} className="h-10 w-full md:h-14 md:w-28 md:shrink-0" />
    </a>
  );
}

/** 화면 맨 위 지수 바. live=false(갱신 시간 밖)이면 자동 갱신 없이 마지막 값만 보여준다. */
export function IndexBar({ live }: { live: boolean }) {
  const { data } = useSWR("/api/indices", fetcher, { refreshInterval: live ? 7_000 : 0, keepPreviousData: true, dedupingInterval: 2_000 });
  const list = data?.indices ?? [];
  const by = (id: string) => list.find((x) => x.id === id);
  const kospi = by("KOSPI");
  const kosdaq = by("KOSDAQ");
  const world = list.filter((x) => x.kind === "world");

  if (!data) {
    return (
      <div className="mb-2 grid gap-2 md:grid-cols-[1fr_1fr_minmax(240px,0.7fr)]" aria-hidden>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[140px] animate-pulse rounded-lg bg-surface-2" />
        ))}
      </div>
    );
  }
  return (
    <section aria-label="주요 지수" className="mb-2 grid grid-cols-2 gap-2 md:grid-cols-[1fr_1fr_minmax(240px,0.7fr)]">
      {kospi && <BigCard d={kospi} />}
      {kosdaq && <BigCard d={kosdaq} />}
      <div className="col-span-2 grid grid-cols-2 gap-2 md:col-span-1 md:grid-cols-1">
        {world.map((w) => (
          <SmallCard key={w.id} d={w} />
        ))}
      </div>
    </section>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Plus, Settings } from "lucide-react";
import { AddHoldingDialog } from "./AddHoldingDialog";
import { EditHoldingDialog } from "./EditHoldingDialog";
import { HoldingHeader, HoldingRow } from "./HoldingRow";
import { SummaryCards } from "./SummaryCards";
import { AlertBanner } from "./AlertBanner";
import { SettingsSheet } from "./SettingsSheet";
import { notifyBrowser, playAlarm, stopAlarm, unlockAudio } from "@/lib/alarm";
import { pct, timeAgo } from "@/lib/format";
import { useLocalFlag } from "@/lib/use-local-flag";
import { APP_VERSION } from "@/lib/version";
import type { AlertEvent, ClientHolding, QuotesResponse } from "@/lib/types";

const fetcher = async (url: string): Promise<QuotesResponse> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "시세를 불러오지 못했어요");
  return res.json();
};

const ls = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* 저장 불가 환경 — 무시 */
    }
  },
};

export function Dashboard() {
  const { data, error, isLoading, mutate } = useSWR<QuotesResponse>("/api/quotes", fetcher, {
    refreshInterval: (d) => (d?.marketOpen ? 5_000 : 30_000),
    keepPreviousData: true,
    dedupingInterval: 2_000,
  });

  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editing, setEditing] = useState<ClientHolding | null>(null);
  const [soundOn, setSoundOn] = useLocalFlag("sp_sound");
  const [pending, setPending] = useState<AlertEvent[]>([]); // 확인 전 알림 배너
  const known = useRef<Set<string> | null>(null);
  const [, tick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000); // "n초 전" 갱신
    return () => clearInterval(t);
  }, []);

  // 새 알림 이벤트 감지: 첫 로드엔 소리 없이 배너만, 이후 새 이벤트는 소리+팝업
  useEffect(() => {
    if (!data) return;
    if (known.current === null) {
      known.current = new Set(data.events.map((e) => e.id));
      const lastAck = ls.get("sp_last_ack") ?? "";
      setPending(data.events.filter((e) => e.created_at > lastAck));
      return;
    }
    const fresh = data.events.filter((e) => !known.current!.has(e.id));
    if (!fresh.length) return;
    fresh.forEach((e) => known.current!.add(e.id));
    setPending((p) => [...fresh, ...p]);
    for (const e of fresh) {
      notifyBrowser(`${e.kind === "target" ? "🔔 목표 도달" : "⚠️ 손절 기준 도달"} · ${e.name}`, `수익률 ${pct(Number(e.profit_pct))}`);
    }
    if (soundOn) void playAlarm();
  }, [data, soundOn]);

  const ack = useCallback(() => {
    stopAlarm();
    ls.set("sp_last_ack", new Date().toISOString());
    setPending([]);
  }, []);

  async function changeSound(on: boolean) {
    setSoundOn(on);
    if (on) {
      unlockAudio();
      if (typeof Notification !== "undefined" && Notification.permission === "default") await Notification.requestPermission();
      void playAlarm(1); // 테스트음
    } else stopAlarm();
  }

  async function patch(h: ClientHolding, body: object) {
    const res = await fetch(`/api/holdings/${h.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) toast.error("변경하지 못했어요");
    await mutate();
  }

  async function remove(h: ClientHolding) {
    const res = await fetch(`/api/holdings/${h.id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("삭제하지 못했어요");
    await mutate();
    toast(`${h.name} 삭제됨`, {
      duration: 6000,
      action: {
        label: "되돌리기",
        onClick: async () => {
          await fetch("/api/holdings", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ code: h.code, avg_price: h.avg_price, qty: h.qty, target_pct: h.target_pct, stop_pct: h.stop_pct }),
          });
          mutate();
        },
      },
    });
  }

  const holdings = data?.holdings ?? [];
  const lastQuoted = holdings.map((h) => h.quotedAt).filter(Boolean).sort().pop();

  return (
    <div className="mx-auto max-w-6xl px-2 pb-10 pt-2 sm:px-4">
      <header className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-base font-extrabold">📈 수익률 알리미</h1>
          {data && (
            <span className={`flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold ${data.marketOpen ? "bg-up-soft text-up" : "bg-surface-2 text-muted"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${data.marketOpen ? "animate-pulse bg-up" : "bg-muted"}`} />
              {data.marketOpen ? "장중" : "장마감"}
            </span>
          )}
          <span className="num hidden text-[11px] text-muted sm:inline">{lastQuoted ? `시세 ${timeAgo(lastQuoted)}` : ""}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-bold text-primary-fg hover:opacity-90"
          >
            <Plus size={16} strokeWidth={3} /> 종목추가
          </button>
          <button onClick={() => setSettingsOpen(true)} aria-label="알림 설정" className="rounded-lg p-2 hover:bg-surface-2">
            <Settings size={18} />
          </button>
        </div>
      </header>

      {!soundOn && (
        <button onClick={() => changeSound(true)} className="mb-2 w-full rounded-lg border border-dashed border-primary bg-down-soft px-3 py-1.5 text-left text-xs font-semibold text-primary">
          🔔 소리·팝업 알림 켜기 <span className="font-normal text-muted">— 목표 도달 시 바로 알려드려요</span>
        </button>
      )}

      <AlertBanner events={pending} onAck={ack} />

      {error && !data && <div className="mb-2 rounded-lg bg-up-soft px-3 py-2 text-xs text-up">{error instanceof Error ? error.message : "시세를 불러오지 못했어요"} (자동으로 다시 시도합니다)</div>}
      {data?.provider === "yahoo" && (
        <div className="mb-2 rounded-lg bg-surface-2 px-3 py-1.5 text-[11px] text-muted">
          ⚠️ 네이버 증권 시세를 가져오지 못해 Yahoo Finance(지연 시세)를 쓰고 있어요.
        </div>
      )}

      {isLoading && !data ? (
        <div className="space-y-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-surface-2" />
          ))}
        </div>
      ) : holdings.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface px-4 py-10 text-center">
          <p className="text-sm font-semibold">등록한 종목이 없어요</p>
          <p className="mt-1 text-xs text-muted">위의 <b>+ 종목추가</b>를 눌러 종목과 매수가, 목표 수익률을 입력하세요.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <SummaryCards holdings={holdings} />
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <HoldingHeader />
            {holdings.map((h) => (
              <HoldingRow
                key={h.id}
                h={h}
                onEdit={() => setEditing(h)}
                onDelete={() => remove(h)}
                onToggle={() => patch(h, { enabled: !h.enabled })}
                onRearm={() => patch(h, { rearm: true })}
              />
            ))}
          </div>
        </div>
      )}

      <footer className="num mt-6 text-center text-[11px] text-muted">v{APP_VERSION}</footer>

      <AddHoldingDialog open={addOpen} onClose={() => setAddOpen(false)} onAdded={() => mutate()} />
      <EditHoldingDialog holding={editing} onClose={() => setEditing(null)} onSaved={() => mutate()} />
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} events={data?.events ?? []} soundOn={soundOn} onSoundChange={changeSound} />
    </div>
  );
}

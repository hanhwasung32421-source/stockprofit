"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Modal } from "./Modal";
import { ColumnAdmin } from "./ColumnAdmin";
import type { ColumnPrefs } from "@/lib/columns";
import { pct, won } from "@/lib/format";
import type { AlertEvent } from "@/lib/types";

type Settings = { provider: string; telegram: { configured: boolean; connected: boolean } };

async function post(action: string, okMsg: string) {
  const res = await fetch("/api/settings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) });
  const json = await res.json();
  if (res.ok) toast.success(okMsg);
  else toast.error(json.error ?? "실패했어요");
}

export function SettingsSheet({
  open,
  onClose,
  events,
  soundOn,
  onSoundChange,
  colPrefs,
  onColPrefs,
  onColReset,
}: {
  open: boolean;
  onClose: () => void;
  events: AlertEvent[];
  soundOn: boolean;
  onSoundChange: (on: boolean) => void;
  colPrefs: ColumnPrefs;
  onColPrefs: (p: ColumnPrefs) => void;
  onColReset: () => void;
}) {
  const [tab, setTab] = useState<"alert" | "admin">("alert");
  const [s, setS] = useState<Settings | null>(null);
  useEffect(() => {
    if (open) fetch("/api/settings").then((r) => r.json()).then(setS).catch(() => setS(null));
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="설정">
      <div role="tablist" className="mb-4 flex gap-1 rounded-xl bg-surface-2 p-1 text-sm font-semibold">
        {(
          [
            ["alert", "🔔 알림"],
            ["admin", "🛠 관리자 (구분 순서)"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`flex-1 rounded-lg px-3 py-2 ${tab === k ? "bg-surface shadow-sm" : "text-muted"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "admin" ? (
        <ColumnAdmin prefs={colPrefs} onChange={onColPrefs} onReset={onColReset} />
      ) : (
      <div className="space-y-6">
        <section>
          <h3 className="mb-2 text-sm font-bold">🔊 브라우저 알림</h3>
          <div className="flex items-center justify-between rounded-2xl bg-surface-2 p-4">
            <div className="text-sm">
              <div className="font-semibold">소리 + 팝업 알림</div>
              <div className="text-xs text-muted">탭이 열려 있을 때 울려요</div>
            </div>
            <button
              onClick={() => onSoundChange(!soundOn)}
              role="switch"
              aria-checked={soundOn}
              className={`relative h-7 w-12 rounded-full transition ${soundOn ? "bg-primary" : "bg-border"}`}
            >
              <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${soundOn ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-bold">✈️ 텔레그램 (탭을 닫아도 알림)</h3>
          <div className="space-y-3 rounded-2xl bg-surface-2 p-4 text-sm">
            {!s ? (
              <span className="text-muted">불러오는 중…</span>
            ) : !s.telegram.configured ? (
              <p className="text-muted">서버에 <code>TELEGRAM_BOT_TOKEN</code> 환경변수가 설정되지 않았어요.</p>
            ) : (
              <>
                <ol className="list-decimal space-y-1 pl-5 text-muted">
                  <li>아래 “웹훅 등록” 버튼을 한 번 누르세요</li>
                  <li>텔레그램에서 내 봇에게 <b>/start</b> 를 보내세요</li>
                  <li>“테스트 메시지”로 확인하세요</li>
                </ol>
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-2.5 w-2.5 rounded-full ${s.telegram.connected ? "bg-green-500" : "bg-border"}`} />
                  {s.telegram.connected ? "연결됨" : "아직 연결되지 않음"}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => post("telegram-webhook", "웹훅을 등록했어요")} className="flex-1 rounded-xl border border-border bg-surface py-2.5 font-semibold">
                    웹훅 등록
                  </button>
                  <button onClick={() => post("telegram-test", "테스트 메시지를 보냈어요")} className="flex-1 rounded-xl bg-primary py-2.5 font-semibold text-primary-fg">
                    테스트 메시지
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-bold">🕘 알림 기록</h3>
          {events.length === 0 ? (
            <p className="rounded-2xl bg-surface-2 p-4 text-sm text-muted">아직 발송된 알림이 없어요.</p>
          ) : (
            <ul className="divide-y divide-border rounded-2xl bg-surface-2 text-sm">
              {events.map((e) => (
                <li key={e.id} className="flex justify-between gap-2 px-4 py-3">
                  <span>
                    {e.kind === "target" ? "🔔" : "⚠️"} {e.name}{" "}
                    <span className="num text-muted">{pct(Number(e.profit_pct))} · ₩{won(Number(e.price))}</span>
                  </span>
                  <span className="num shrink-0 text-xs text-muted">
                    {new Date(e.created_at).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="text-xs text-muted">시세 제공: {s?.provider === "kis" ? "한국투자증권 KIS (실시간)" : s?.provider === "naver" ? "네이버 증권 (실시간, 비공식 · 장애 시 Yahoo로 자동 전환)" : s?.provider === "yahoo" ? "Yahoo Finance (지연될 수 있음)" : "–"}</section>
      </div>
      )}
    </Modal>
  );
}

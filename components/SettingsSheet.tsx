"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Modal } from "./Modal";
import { ColumnAdmin } from "./ColumnAdmin";
import { btnGhost, SectionTitle } from "./ui";
import { playAlarm, stopAlarm, unlockAudio } from "@/lib/alarm";
import type { ColumnPrefs } from "@/lib/columns";
import { pct, tone, won } from "@/lib/format";
import type { AlertEvent } from "@/lib/types";

type Settings = { provider: string; telegram: { configured: boolean; connected: boolean } };

async function post(action: string, okMsg: string) {
  const res = await fetch("/api/settings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) });
  const json = await res.json();
  if (res.ok) toast.success(okMsg);
  else toast.error(json.error ?? "실패했어요");
}

const PROVIDER_LABEL: Record<string, string> = {
  kis: "한국투자증권 KIS (실시간)",
  naver: "네이버 증권 (실시간·비공식, 장애 시 Yahoo 자동 전환)",
  yahoo: "Yahoo Finance (지연 시세)",
};

/** 한 줄짜리 항목: 이름 | 값/조작 */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border/60 px-2 py-1.5 last:border-b-0">
      <span className="text-xs text-muted">{label}</span>
      <div className="flex items-center gap-1">{children}</div>
    </div>
  );
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
    <Modal open={open} onClose={onClose} title="설정" width="max-w-lg">
      {/* HTS 스타일 탭: 평평한 탭 + 활성 탭 밑줄 */}
      <div role="tablist" className="-mx-3 -mt-3 mb-3 flex border-b border-border bg-surface-2 px-3 text-[13px] font-semibold">
        {(
          [
            ["alert", "알림"],
            ["admin", "관리자 (구분 순서)"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`-mb-px border-b-2 px-4 py-1.5 ${tab === k ? "border-primary text-foreground" : "border-transparent text-muted hover:text-foreground"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "admin" ? (
        <ColumnAdmin prefs={colPrefs} onChange={onColPrefs} onReset={onColReset} />
      ) : (
        <div className="space-y-3">
          <section className="border border-border">
            <SectionTitle>브라우저 알림 (탭이 열려 있을 때 · 알람이 울리면 10초간 소리)</SectionTitle>
            <Row label="소리 + 팝업 알림">
              <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold">
                <input type="checkbox" checked={soundOn} onChange={(e) => onSoundChange(e.target.checked)} className="h-3.5 w-3.5 accent-[var(--primary)]" />
                {soundOn ? "사용" : "사용 안 함"}
              </label>
              <button
                onClick={async () => {
                  stopAlarm();
                  if (!(await unlockAudio()) || !playAlarm(3)) toast.error("브라우저가 소리를 막고 있어요 — 화면을 한 번 클릭한 뒤 다시 눌러 주세요");
                }}
                className={`${btnGhost} !h-7 !px-2 text-xs`}
              >
                소리 테스트
              </button>
            </Row>
          </section>

          <section className="border border-border">
            <SectionTitle>텔레그램 (탭을 닫아도 알림)</SectionTitle>
            {!s ? (
              <div className="px-2 py-2 text-xs text-muted">불러오는 중…</div>
            ) : !s.telegram.configured ? (
              <div className="px-2 py-2 text-xs text-muted">
                서버에 <code>TELEGRAM_BOT_TOKEN</code> 환경변수가 없습니다.
              </div>
            ) : (
              <>
                <Row label="연결 상태">
                  <span className={`inline-block h-2 w-2 rounded-full ${s.telegram.connected ? "bg-green-500" : "bg-border"}`} />
                  <span className="text-xs font-semibold">{s.telegram.connected ? "연결됨" : "연결 안 됨"}</span>
                </Row>
                <Row label="동작">
                  <button onClick={() => post("telegram-webhook", "웹훅을 등록했어요")} className={`${btnGhost} !h-7 !px-2 text-xs`}>
                    웹훅 등록
                  </button>
                  <button onClick={() => post("telegram-test", "테스트 메시지를 보냈어요")} className={`${btnGhost} !h-7 !px-2 text-xs`}>
                    테스트 메시지
                  </button>
                </Row>
              </>
            )}
          </section>

          <section className="border border-border">
            <SectionTitle>알림 기록 (최근 20건)</SectionTitle>
            {events.length === 0 ? (
              <div className="px-2 py-2 text-xs text-muted">발송된 알림이 없습니다.</div>
            ) : (
              <div className="max-h-44 overflow-y-auto">
                <div className="flex border-b border-border px-2 py-0.5 text-[11px] font-semibold text-muted">
                  <span className="flex-1">종목</span>
                  <span className="w-10">구분</span>
                  <span className="w-16 text-right">수익률</span>
                  <span className="w-20 text-right">가격</span>
                  <span className="w-24 text-right">시각</span>
                </div>
                {events.map((e) => (
                  <div key={e.id} className="num flex border-b border-border/60 px-2 py-0.5 text-xs last:border-b-0">
                    <span className="flex-1 truncate font-sans font-semibold">{e.name}</span>
                    <span className="w-10 font-sans">목표</span>
                    <span className={`w-16 text-right ${tone(Number(e.profit_pct))}`}>{pct(Number(e.profit_pct))}</span>
                    <span className="w-20 text-right">{won(Number(e.price))}</span>
                    <span className="w-24 text-right text-muted">
                      {new Date(e.created_at).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="text-[11px] text-muted">시세 제공: {s ? (PROVIDER_LABEL[s.provider] ?? s.provider) : "–"}</div>
        </div>
      )}
    </Modal>
  );
}

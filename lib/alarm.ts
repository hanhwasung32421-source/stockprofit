// 외부 음원 없이 WebAudio로 알람음을 만든다.
// 브라우저 정책: 사용자가 페이지를 한 번이라도 클릭/키 입력한 뒤에만 소리가 난다 (새로고침하면 다시 잠김).
// 그래서 첫 사용자 동작에서 오디오를 풀어두고(unlockAudio), 알람이 울릴 때 바로 재생한다.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let stopTimer: ReturnType<typeof setTimeout> | null = null;

export const ALARM_SECONDS = 10; // 알람음 지속 시간

/** 오디오를 준비하고(최초 사용자 동작 안에서 호출) 재생 가능 여부를 돌려준다 */
export async function unlockAudio(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") await ctx.resume();
  } catch {
    return false;
  }
  return ctx.state === "running";
}

export const isAudioReady = () => ctx?.state === "running";

function beep(dest: AudioNode, at: number, freq: number, dur = 0.18) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.5, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(gain).connect(dest);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

/**
 * 띠링-띠링-띠리링 패턴을 seconds 초 동안 반복 재생한다 (기본 10초).
 * 전체를 오디오 시계에 미리 예약하므로, 탭이 백그라운드여서 타이머가 느려져도 끊기지 않는다.
 * 소리를 시작하지 못하면(오디오가 잠겨 있음) false.
 */
export function playAlarm(seconds = ALARM_SECONDS): boolean {
  if (!ctx) return false;
  if (ctx.state === "suspended") void ctx.resume();
  if (ctx.state !== "running") return false;
  stopAlarm();
  const out = ctx.createGain();
  out.connect(ctx.destination);
  master = out;
  const start = ctx.currentTime + 0.05;
  const CYCLE = 1.4;
  for (let t = 0; t + 0.8 <= seconds; t += CYCLE) {
    beep(out, start + t, 880);
    beep(out, start + t + 0.22, 1175);
    beep(out, start + t + 0.44, 1568, 0.3);
  }
  stopTimer = setTimeout(stopAlarm, seconds * 1000 + 500);
  return true;
}

export function stopAlarm() {
  if (stopTimer) clearTimeout(stopTimer);
  stopTimer = null;
  if (master && ctx) {
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.disconnect();
  }
  master = null;
}

export function notifyBrowser(title: string, body: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, tag: title });
  } catch {
    /* 일부 모바일 브라우저는 생성자를 막는다 */
  }
}

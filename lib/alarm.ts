// 외부 음원 없이 WebAudio로 알람음을 만든다. 브라우저 정책상 사용자 클릭 이후에만 소리가 난다.
let ctx: AudioContext | null = null;
let stopFlag = false;

export function unlockAudio() {
  if (typeof window === "undefined") return;
  ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  if (ctx.state === "suspended") void ctx.resume();
}

function beep(at: number, freq: number, dur = 0.18) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.35, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

/** 띠링-띠링 패턴을 몇 번 반복 (사용자가 확인을 누르면 중단) */
export async function playAlarm(repeats = 4) {
  if (!ctx) return;
  stopFlag = false;
  for (let i = 0; i < repeats && !stopFlag; i++) {
    const t = ctx.currentTime + 0.05;
    beep(t, 880);
    beep(t + 0.22, 1175);
    beep(t + 0.44, 1568, 0.3);
    await new Promise((r) => setTimeout(r, 1500));
  }
}

export function stopAlarm() {
  stopFlag = true;
}

export function notifyBrowser(title: string, body: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, tag: title });
  } catch {
    /* 일부 모바일 브라우저는 생성자를 막는다 */
  }
}

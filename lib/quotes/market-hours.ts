const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function kstParts(date = new Date()) {
  const k = new Date(date.getTime() + KST_OFFSET_MS);
  return { day: k.getUTCDay(), minutes: k.getUTCHours() * 60 + k.getUTCMinutes() };
}

/** 평일 09:00–15:30 (KST). 공휴일은 판별하지 않는다(휴장일엔 시세가 변하지 않아 무해). */
export function isMarketOpen(date = new Date()): boolean {
  const { day, minutes } = kstParts(date);
  return day >= 1 && day <= 5 && minutes >= 9 * 60 && minutes <= 15 * 60 + 30;
}

/** 시세 자동 갱신 시간: 매일 08:00–19:00 (KST). 이 시간 밖에는 화면이 자동으로 갱신하지 않는다. */
export function isRefreshHours(date = new Date()): boolean {
  const { minutes } = kstParts(date);
  return minutes >= 8 * 60 && minutes < 19 * 60;
}

/** 서버 캐시용: 평일 08:00–19:00 에만 시세를 새로 가져온다 (주말엔 값이 변하지 않음) */
export function isLiveWindow(date = new Date()): boolean {
  const { day } = kstParts(date);
  return day >= 1 && day <= 5 && isRefreshHours(date);
}

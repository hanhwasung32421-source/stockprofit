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

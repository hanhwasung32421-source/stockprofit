// 푸시 후 실제 홈페이지(Vercel)에 새 버전이 반영됐는지 확인한다.
// 사용: node scripts/verify-deploy.mjs [버전]   (버전 생략 시 lib/version.ts 의 값)
// 환경변수 SITE_URL 로 주소 변경 가능. 최대 6분(15초 간격) 기다린다.
import { readFileSync } from "node:fs";

const site = process.env.SITE_URL ?? "https://stockprofit.vercel.app";
const version =
  process.argv[2] ?? /APP_VERSION = "([^"]+)"/.exec(readFileSync(new URL("../lib/version.ts", import.meta.url), "utf8"))?.[1];
if (!version) throw new Error("버전을 찾지 못했습니다");

const deadline = Date.now() + 6 * 60_000;
let live = "(없음)";
for (;;) {
  try {
    const res = await fetch(`${site}/?cb=${Date.now()}`, { cache: "no-store" });
    const html = await res.text();
    live = /v(?:<!-- -->)?(\d{4}-\d{2}-\d{2}-\d+)/.exec(html)?.[1] ?? `(HTTP ${res.status}, 버전 표시 없음)`;
    if (res.ok && live === version) {
      const api = await fetch(`${site}/api/quotes`, { cache: "no-store" });
      console.log(`✅ 실제 홈페이지 반영 확인: v${live} (${site}) · /api/quotes HTTP ${api.status}`);
      process.exit(api.ok ? 0 : 2);
    }
  } catch (e) {
    live = `(접속 오류: ${e.message})`;
  }
  if (Date.now() > deadline) break;
  console.log(`… 대기 중 — 현재 홈페이지 버전: ${live}, 기다리는 버전: ${version}`);
  await new Promise((r) => setTimeout(r, 15_000));
}
console.log(`❌ 6분 안에 반영되지 않음 — 홈페이지: ${live}, 기대: ${version}. Vercel 배포 상태/빌드 로그를 확인하세요.`);
process.exit(1);

# 📈 수익률 알리미

보유 종목 + 매수단가 + 목표 수익률을 등록하면, 실시간 시세로 수익률을 계산해 목표 도달 시 브라우저 소리/팝업과 텔레그램으로 알려주는 1인용 웹앱.
Next.js 16 · Supabase(서울) · Vercel(`icn1` 서울).

## 설정 순서

1. **Supabase** 프로젝트 생성 (Region: *Northeast Asia – Seoul*)
   - SQL Editor에서 `supabase/migrations/0001_init.sql` 실행
   - Database → Extensions에서 `pg_cron`, `pg_net` 활성화 (배포 후 `0002_cron.sql` 실행용)
2. **환경변수** — `.env.example`을 `.env.local`로 복사해 채우기
   - `KIS_APP_KEY/SECRET` 이 없으면 Yahoo Finance(지연 시세)로 자동 폴백 → 계좌 없이도 먼저 써볼 수 있음
   - `DATA_GO_KR_KEY`: 공공데이터포털 "금융위원회_KRX상장종목정보" 활용신청 후 발급
3. **종목 목록 적재(최초 1회)**
   ```bash
   curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/sync-stocks
   ```
4. `npm run dev` → http://localhost:3000
5. **Vercel 배포**: 저장소 연결, 환경변수 등록. `vercel.json`의 `regions: ["icn1"]`로 함수가 서울에서 실행됨.
   배포 후 응답 헤더 `x-vercel-id`에 `icn1`이 있는지 확인.
6. **탭을 닫아도 알림**: `supabase/migrations/0002_cron.sql`의 `<APP_URL>`, `<CRON_SECRET>`을 바꿔 실행(1분마다 체크).
7. **텔레그램**: @BotFather로 봇 생성 → `TELEGRAM_BOT_TOKEN` 등록 → 앱의 ⚙ 설정에서 "웹훅 등록" → 봇에게 `/start`.

## 구조
- `lib/quotes/*` — `QuoteProvider` (KIS / Yahoo), DB 캐시(장중 3초)로 호출 제한 보호
- `lib/alerts/evaluate.ts` — 알람 평가 (조건부 UPDATE로 중복 발송 방지, 목표 −1%p 아래로 내려가면 재무장)
- `proxy.ts` — 비밀번호 쿠키 인증 (Next 16의 middleware 후속)
- Supabase는 서버(service role)에서만 접근, 모든 테이블 RLS ON(정책 없음)

-- 배포 후 Supabase SQL Editor에서 <APP_URL>, <CRON_SECRET>을 바꿔 한 번만 실행하세요.
-- (Dashboard > Database > Extensions 에서 pg_cron, pg_net 활성화 필요)
-- 평일 장중(KST 09:00–15:30 = UTC 00:00–06:30) 1분마다 알람 체크
select cron.schedule('stock-check', '* 0-6 * * 1-5', $$
  select net.http_post(
    url := 'https://<APP_URL>/api/cron/check',
    headers := '{"Authorization":"Bearer <CRON_SECRET>"}'::jsonb
  );
$$);
-- 매일 새벽 4시 KST(UTC 19:00) 종목 목록 동기화
select cron.schedule('stock-sync', '0 19 * * *', $$
  select net.http_post(
    url := 'https://<APP_URL>/api/cron/sync-stocks',
    headers := '{"Authorization":"Bearer <CRON_SECRET>"}'::jsonb
  );
$$);

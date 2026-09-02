-- GOLD JACKET Active Check hourly maintenance runner.
--
-- Vercel Hobby rejects sub-daily Vercel Cron schedules.
-- Supabase pg_cron owns the hourly trigger instead.
--
-- Secrets are stored in Supabase Vault by the deployment script:
--   gold_jacket_active_check_cron_secret
--   gold_jacket_active_check_base_url

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault;

do $$
declare
  existing_job bigint;
begin
  select jobid
  into existing_job
  from cron.job
  where jobname =
    'gold-jacket-active-check-reminders'
  limit 1;

  if existing_job is not null then
    perform cron.unschedule(
      existing_job
    );
  end if;
end
$$;

select cron.schedule(
  'gold-jacket-active-check-reminders',
  '0 * * * *',
  $job$
    select net.http_get(
      url := (
        select decrypted_secret
        from vault.decrypted_secrets
        where name =
          'gold_jacket_active_check_base_url'
        limit 1
      ) ||
        '/api/cron/active-check-reminders',

      headers :=
        jsonb_build_object(
          'Authorization',
          'Bearer ' || (
            select decrypted_secret
            from vault.decrypted_secrets
            where name =
              'gold_jacket_active_check_cron_secret'
            limit 1
          )
        ),

      timeout_milliseconds :=
        10000
    );
  $job$
);

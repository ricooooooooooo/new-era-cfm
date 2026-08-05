-- Refresh Supabase/PostgREST after the prize-pot table migration.
select pg_notification_queue_usage();
notify pgrst, 'reload schema';

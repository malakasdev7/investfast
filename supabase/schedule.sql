-- Executar uma vez por projeto. 06:00 UTC corresponde a 03:00 em São Paulo.
create extension if not exists pg_cron;
select cron.schedule('investfast-recurring','0 6 * * *','select private.recurring_job()');

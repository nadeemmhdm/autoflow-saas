-- Fixes flagged by `supabase get_advisors --type security` after migration 002.
-- handle_new_user must only ever run via the auth.users trigger, never be
-- directly callable through the REST API by anon or authenticated roles.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- log_audit_event is for authenticated users logging their own actions only.
revoke execute on function public.log_audit_event(text, jsonb) from public, anon;
grant execute on function public.log_audit_event(text, jsonb) to authenticated;

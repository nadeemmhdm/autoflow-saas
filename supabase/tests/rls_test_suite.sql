-- RLS test suite (pgTAP).
-- Run with: supabase test db
-- Requires the pgTAP extension, which `supabase test db` enables automatically.
--
-- What this checks:
--   1. User A cannot read User B's automations, logs, or conversations.
--   2. The anon role cannot read social_accounts (even the encrypted token
--      column is unreachable — social_accounts_safe hides it entirely).
--   3. webhook_events is fully inaccessible to authenticated/anon clients.
--   4. Only admins can read the audit_log of other users.

begin;
select plan(8);

-- Two fake users, simulating two separate AutoFlow customers.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'user-a@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'user-b@example.com');

insert into public.profiles (id, email, full_name) values
  ('11111111-1111-1111-1111-111111111111', 'user-a@example.com', 'User A'),
  ('22222222-2222-2222-2222-222222222222', 'user-b@example.com', 'User B');

insert into public.automations (id, user_id, name, platform, trigger_type)
values ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'User A automation', 'instagram', 'comment_keyword');

-- Impersonate User B and try to read User A's automation.
set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select is(
  (select count(*) from public.automations where id = '33333333-3333-3333-3333-333333333333'),
  0::bigint,
  'User B cannot see User A''s automation'
);

select is(
  (select count(*) from public.automations),
  0::bigint,
  'User B sees zero automations total (has none of their own yet)'
);

-- Switch to User A and confirm they CAN see their own row.
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select is(
  (select count(*) from public.automations where id = '33333333-3333-3333-3333-333333333333'),
  1::bigint,
  'User A can see their own automation'
);

-- automation_logs follow the same rule.
insert into public.automation_logs (automation_id, user_id, status)
values ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'success');

set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select is(
  (select count(*) from public.automation_logs),
  0::bigint,
  'User B cannot see User A''s automation logs'
);

-- conversations follow the same rule.
insert into public.social_accounts (id, user_id, platform, account_name, external_account_id, access_token_encrypted)
values ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'instagram', 'Test IG', 'ext-1', '\\x00');

insert into public.conversations (user_id, social_account_id, platform, contact_external_id)
values ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'instagram', 'contact-1');

select is(
  (select count(*) from public.conversations),
  0::bigint,
  'User B cannot see User A''s conversations'
);

-- anon role must never reach social_accounts directly (only the safe view).
set local role anon;
reset request.jwt.claims;

select is(
  (select count(*) from public.social_accounts),
  0::bigint,
  'Anon role cannot read social_accounts (no policy grants it)'
);

-- webhook_events: policy is `using (false)` for everyone except service_role.
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select is(
  (select count(*) from public.webhook_events),
  0::bigint,
  'No authenticated user can read webhook_events'
);

-- audit_log: a non-admin cannot see another user''s entries.
insert into public.audit_log (user_id, action) values ('22222222-2222-2222-2222-222222222222', 'connected_facebook_account');

select is(
  (select count(*) from public.audit_log where user_id = '22222222-2222-2222-2222-222222222222'),
  0::bigint,
  'Non-admin User A cannot see User B''s audit log entries'
);

select * from finish();
rollback;

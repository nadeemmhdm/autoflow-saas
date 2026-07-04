-- AutoFlow core schema
-- Applied to Supabase project krvtztfmeyznmglelwfr.
-- Re-run this against a fresh Supabase project via:
--   supabase db push
-- or paste it into the SQL editor.

create extension if not exists pgcrypto;

-- =========================================
-- PROFILES (extends auth.users)
-- =========================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'user' check (role in ('user','admin')),
  plan text not null default 'free' check (plan in ('free','pro','business')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);
create policy "profiles_admin_all" on public.profiles
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================
-- CONNECTED SOCIAL ACCOUNTS
-- =========================================
create table public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null check (platform in ('instagram','facebook','whatsapp')),
  account_name text not null,
  external_account_id text not null,
  access_token_encrypted bytea not null,
  token_expires_at timestamptz,
  webhook_verified boolean not null default false,
  status text not null default 'active' check (status in ('active','expired','revoked','error')),
  scopes text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, platform, external_account_id)
);
alter table public.social_accounts enable row level security;

create policy "social_accounts_owner_all" on public.social_accounts
  for all using (auth.uid() = user_id);

create view public.social_accounts_safe as
  select id, user_id, platform, account_name, external_account_id,
         token_expires_at, webhook_verified, status, scopes, created_at, updated_at
  from public.social_accounts;

alter view public.social_accounts_safe set (security_invoker = true);

-- =========================================
-- AUTOMATIONS (drag & drop flow definitions)
-- =========================================
create table public.automations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  social_account_id uuid references public.social_accounts(id) on delete set null,
  name text not null,
  platform text not null check (platform in ('instagram','facebook','whatsapp')),
  trigger_type text not null check (trigger_type in ('comment_keyword','dm_keyword','story_reply','new_dm','post_mention')),
  status text not null default 'draft' check (status in ('draft','active','paused')),
  flow_definition jsonb not null default '{"nodes":[],"edges":[]}'::jsonb,
  daily_limit integer not null default 500,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.automations enable row level security;

create policy "automations_owner_all" on public.automations
  for all using (auth.uid() = user_id);

-- =========================================
-- AUTOMATION RUN LOGS
-- =========================================
create table public.automation_logs (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.automations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  trigger_payload jsonb,
  action_taken text,
  status text not null check (status in ('success','failed','skipped','rate_limited')),
  error_message text,
  created_at timestamptz not null default now()
);
alter table public.automation_logs enable row level security;

create policy "automation_logs_owner_select" on public.automation_logs
  for select using (auth.uid() = user_id);

-- =========================================
-- API KEYS
-- =========================================
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  key_name text not null,
  key_prefix text not null,
  key_hash text not null,
  scopes text[] not null default '{read}',
  last_used_at timestamptz,
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.api_keys enable row level security;

create policy "api_keys_owner_all" on public.api_keys
  for all using (auth.uid() = user_id);

-- =========================================
-- RAW WEBHOOK EVENTS
-- =========================================
create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('instagram','facebook','whatsapp')),
  event_type text,
  payload jsonb not null,
  processed boolean not null default false,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.webhook_events enable row level security;
create policy "webhook_events_no_client_access" on public.webhook_events
  for all using (false);

-- =========================================
-- AUDIT LOG
-- =========================================
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  ip_address text,
  user_agent text,
  metadata jsonb,
  created_at timestamptz not null default now()
);
alter table public.audit_log enable row level security;

create policy "audit_log_owner_select" on public.audit_log
  for select using (auth.uid() = user_id);
create policy "audit_log_admin_select" on public.audit_log
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create index idx_social_accounts_user on public.social_accounts(user_id);
create index idx_automations_user on public.automations(user_id);
create index idx_automations_status on public.automations(status) where status = 'active';
create index idx_automation_logs_automation on public.automation_logs(automation_id);
create index idx_webhook_events_processed on public.webhook_events(processed) where processed = false;
create index idx_api_keys_prefix on public.api_keys(key_prefix);

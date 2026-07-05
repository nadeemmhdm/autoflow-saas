-- Conversations (inbox, human handoff, cooldown), webhook replay protection,
-- hourly limits, API key expiry. Applied to project krvtztfmeyznmglelwfr.

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  social_account_id uuid not null references public.social_accounts(id) on delete cascade,
  platform text not null check (platform in ('instagram','facebook','whatsapp')),
  contact_external_id text not null,
  contact_name text,
  tags text[] not null default '{}',
  notes text,
  automation_paused boolean not null default false,
  last_event_at timestamptz,
  last_automation_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (social_account_id, contact_external_id)
);
alter table public.conversations enable row level security;
create policy "conversations_owner_all" on public.conversations
  for all using (auth.uid() = user_id);
create index idx_conversations_user on public.conversations(user_id);

alter table public.automation_logs
  add column conversation_id uuid references public.conversations(id) on delete set null;
create index idx_automation_logs_conversation on public.automation_logs(conversation_id);

alter table public.webhook_events
  add column event_id text;
create unique index uniq_webhook_events_platform_event
  on public.webhook_events(platform, event_id)
  where event_id is not null;

alter table public.automations
  add column hourly_limit integer not null default 100,
  add column template_key text;

alter table public.api_keys
  add column expires_at timestamptz;

create or replace function public.log_audit_event(p_action text, p_metadata jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log (user_id, action, metadata)
  values (auth.uid(), p_action, p_metadata);
end;
$$;

grant execute on function public.log_audit_event(text, jsonb) to authenticated;
